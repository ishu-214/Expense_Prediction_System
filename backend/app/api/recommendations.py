from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Recommendation, Transaction, Budget, Category, User
from app.schemas.schemas import RecommendationResponse, RecommendationStatusUpdate
from app.api.deps import get_current_user
from app.ml.recommendation_engine import recommendation_engine

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("", response_model=List[RecommendationResponse])
def get_recommendations(
    status: Optional[str] = Query("active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Recommendation).filter(Recommendation.user_id == current_user.id)
    if status and status != "all":
        query = query.filter(Recommendation.status == status)

    recs = query.order_by(Recommendation.id.desc()).all()

    if not recs and (not status or status == "active"):
        # Generate on the fly
        generate_user_recommendations(db, current_user)
        recs = db.query(Recommendation).filter(
            Recommendation.user_id == current_user.id,
            Recommendation.status == "active"
        ).order_by(Recommendation.id.desc()).all()

    return recs

@router.get("/waste-analysis")
def get_waste_and_leak_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    categories = {c.id: c.name for c in db.query(Category).all()}

    expenses = [t for t in all_txs if t.transaction_type == "expense"]
    total_expense = sum(t.amount for t in expenses)

    # Discretionary categories (Shopping, Entertainment, Travel, Other)
    disc_names = ["shopping", "entertainment", "travel", "other", "other expense"]
    discretionary_txs = [t for t in expenses if categories.get(t.category_id, "").lower() in disc_names]
    discretionary_total = sum(t.amount for t in discretionary_txs)
    disc_percentage = round((discretionary_total / max(total_expense, 1.0)) * 100, 1) if total_expense > 0 else 0.0

    # Anomalies
    anomaly_txs = [t for t in expenses if t.is_anomaly]
    anomaly_total = sum(t.amount for t in anomaly_txs)

    # Top discretionary / potential leak items
    leak_items = []
    for t in sorted(discretionary_txs, key=lambda x: x.amount, reverse=True)[:5]:
        leak_items.append({
            "id": t.id,
            "title": t.title,
            "amount": round(t.amount, 2),
            "category": categories.get(t.category_id, "Other"),
            "date": str(t.transaction_date),
            "is_anomaly": t.is_anomaly
        })

    return {
        "total_expense": round(total_expense, 2),
        "discretionary_total": round(discretionary_total, 2),
        "discretionary_percentage": disc_percentage,
        "anomaly_count": len(anomaly_txs),
        "anomaly_total": round(anomaly_total, 2),
        "leaks": leak_items,
        "waste_status": "High Discretionary" if disc_percentage > 35 else ("Moderate" if disc_percentage > 15 else "Disciplined")
    }

@router.post("/generate", response_model=List[RecommendationResponse])
def generate_recommendations_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return generate_user_recommendations(db, current_user)

def generate_user_recommendations(db: Session, current_user: User) -> List[Recommendation]:
    # Clear old active recommendations
    db.query(Recommendation).filter(
        Recommendation.user_id == current_user.id,
        Recommendation.status == "active"
    ).delete()

    user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    user_budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    categories_map = {c.id: c.name for c in db.query(Category).all()}

    generated = recommendation_engine.generate_recommendations(
        transactions=user_txs,
        budgets=user_budgets,
        categories_map=categories_map
    )

    new_objects = []
    for g in generated:
        rec = Recommendation(
            user_id=current_user.id,
            recommendation_title=g["recommendation_title"],
            description=g["description"],
            estimated_savings=g["estimated_savings"],
            priority=g["priority"],
            status="active",
            supporting_data=g.get("supporting_data")
        )
        db.add(rec)
        new_objects.append(rec)

    db.commit()
    for o in new_objects:
        db.refresh(o)
    return new_objects

@router.put("/{rec_id}/status", response_model=RecommendationResponse)
def update_recommendation_status(
    rec_id: int,
    status_in: RecommendationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rec = db.query(Recommendation).filter(
        Recommendation.id == rec_id,
        Recommendation.user_id == current_user.id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = status_in.status.lower()
    db.commit()
    db.refresh(rec)
    return rec
