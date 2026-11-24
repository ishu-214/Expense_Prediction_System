from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Budget, Category, Transaction, User, Notification
from app.schemas.schemas import BudgetCreate, BudgetUpdate, BudgetResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets"])

def check_and_create_budget_alert(db: Session, user_id: int, category_id: int, spent: float, limit: float, cat_name: str):
    if spent > limit:
        # Check if an alert for this category already exists to prevent duplicate rows while keeping message updated
        existing = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.notification_type == "budget_alert",
            Notification.notification_title == f"Budget Exceeded: {cat_name}"
        ).first()
        msg = f"You have spent ₹{spent:,.0f} on {cat_name}, exceeding your monthly budget limit of ₹{limit:,.0f}."
        if not existing:
            notif = Notification(
                user_id=user_id,
                notification_title=f"Budget Exceeded: {cat_name}",
                message=msg,
                notification_type="budget_alert",
                is_read=False
            )
            db.add(notif)
        else:
            existing.message = msg
            existing.is_read = False
            existing.created_at = datetime.utcnow()
        db.commit()

@router.get("", response_model=List[BudgetResponse])
def get_budgets(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == target_month,
        Budget.year == target_year
    ).all()

    # If no budgets set specifically for target month, check if user has budgets configured from a previous month and roll forward
    if not budgets:
        all_user_budgets = db.query(Budget).filter(
            Budget.user_id == current_user.id
        ).order_by(Budget.year.desc(), Budget.month.desc()).all()

        seen_cats = set()
        for prev_b in all_user_budgets:
            if prev_b.category_id not in seen_cats:
                seen_cats.add(prev_b.category_id)
                new_b = Budget(
                    user_id=current_user.id,
                    category_id=prev_b.category_id,
                    monthly_limit=prev_b.monthly_limit,
                    month=target_month,
                    year=target_year
                )
                db.add(new_b)
        if seen_cats:
            db.commit()
            budgets = db.query(Budget).filter(
                Budget.user_id == current_user.id,
                Budget.month == target_month,
                Budget.year == target_year
            ).all()

    # Calculate actual spending for each budget's category in that month/year
    results = []
    for b in budgets:
        # Sum actual expenses for this category in target month/year
        actual_spent = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == b.category_id,
            Transaction.transaction_type == "expense"
        ).all()
        spent = sum(t.amount for t in actual_spent if t.transaction_date.month == target_month and t.transaction_date.year == target_year)
        remaining = max(b.monthly_limit - spent, 0.0)
        util_pct = round((spent / max(b.monthly_limit, 1.0)) * 100, 1)

        is_ex = spent > b.monthly_limit

        b_dict = {
            "id": b.id,
            "user_id": b.user_id,
            "category_id": b.category_id,
            "monthly_limit": b.monthly_limit,
            "month": b.month,
            "year": b.year,
            "created_at": b.created_at,
            "category": b.category,
            "spent_amount": round(spent, 2),
            "remaining_amount": round(remaining, 2),
            "utilization_percentage": util_pct,
            "is_exceeded": is_ex
        }
        results.append(b_dict)

    return results

@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if budget already exists for this category/month/year
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == budget_in.category_id,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A budget for this category and month already exists. Update it instead."
        )

    cat = db.query(Category).filter(Category.id == budget_in.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    budget = Budget(
        user_id=current_user.id,
        category_id=budget_in.category_id,
        monthly_limit=budget_in.monthly_limit,
        month=budget_in.month,
        year=budget_in.year
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)

    # Compute spent
    actual_spent = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category_id == budget.category_id,
        Transaction.transaction_type == "expense"
    ).all()
    spent = sum(t.amount for t in actual_spent if t.transaction_date.month == budget.month and t.transaction_date.year == budget.year)

    if spent > budget.monthly_limit:
        cat_name = budget.category.name if budget.category else "Category"
        check_and_create_budget_alert(db, current_user.id, budget.category_id, spent, budget.monthly_limit, cat_name)

    return {
        "id": budget.id,
        "user_id": budget.user_id,
        "category_id": budget.category_id,
        "monthly_limit": budget.monthly_limit,
        "month": budget.month,
        "year": budget.year,
        "created_at": budget.created_at,
        "category": budget.category,
        "spent_amount": round(spent, 2),
        "remaining_amount": round(max(budget.monthly_limit - spent, 0.0), 2),
        "utilization_percentage": round((spent / max(budget.monthly_limit, 1.0)) * 100, 1),
        "is_exceeded": spent > budget.monthly_limit
    }

@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if budget_in.monthly_limit is not None:
        budget.monthly_limit = budget_in.monthly_limit
    if budget_in.month is not None:
        budget.month = budget_in.month
    if budget_in.year is not None:
        budget.year = budget_in.year

    db.commit()
    db.refresh(budget)

    actual_spent = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category_id == budget.category_id,
        Transaction.transaction_type == "expense"
    ).all()
    spent = sum(t.amount for t in actual_spent if t.transaction_date.month == budget.month and t.transaction_date.year == budget.year)

    if spent > budget.monthly_limit:
        cat_name = budget.category.name if budget.category else "Category"
        check_and_create_budget_alert(db, current_user.id, budget.category_id, spent, budget.monthly_limit, cat_name)

    return {
        "id": budget.id,
        "user_id": budget.user_id,
        "category_id": budget.category_id,
        "monthly_limit": budget.monthly_limit,
        "month": budget.month,
        "year": budget.year,
        "created_at": budget.created_at,
        "category": budget.category,
        "spent_amount": round(spent, 2),
        "remaining_amount": round(max(budget.monthly_limit - spent, 0.0), 2),
        "utilization_percentage": round((spent / max(budget.monthly_limit, 1.0)) * 100, 1),
        "is_exceeded": spent > budget.monthly_limit
    }

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
    return None
