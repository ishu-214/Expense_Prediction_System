from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Transaction, Category, User
from app.schemas.schemas import PredictionSummary, CategoryPredictionItem
from app.api.deps import get_current_user
from app.ml.expense_predictor import expense_predictor

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.get("/expenses", response_model=PredictionSummary)
def get_expense_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    categories_map = {c.id: c.name for c in db.query(Category).all()}
    
    summary = expense_predictor.predict_user_expenses(user_txs, categories_map)
    return summary

@router.get("/categories", response_model=List[CategoryPredictionItem])
def get_category_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    categories_map = {c.id: c.name for c in db.query(Category).all()}
    
    summary = expense_predictor.predict_user_expenses(user_txs, categories_map)
    return summary["category_predictions"]

@router.get("/savings")
def get_savings_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    categories_map = {c.id: c.name for c in db.query(Category).all()}
    
    summary = expense_predictor.predict_user_expenses(user_txs, categories_map)
    return {
        "expected_income": summary["expected_income"],
        "predicted_expenses": summary["next_month_predicted_total"],
        "predicted_savings": summary["predicted_savings"],
        "savings_rate_predicted": round((summary["predicted_savings"] / max(summary["expected_income"], 1.0)) * 100, 1),
        "trend_direction": summary["trend_direction"]
    }
