from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import FinancialGoal, User, Notification, SystemActivity
from app.schemas.schemas import GoalCreate, GoalUpdate, GoalResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/goals", tags=["Financial Goals"])

def notify_goal_achieved(db: Session, goal: FinancialGoal, current_user: User):
    """
    Triggers congratulations alert for user and milestone alert for admins.
    """
    # 1. Notify user
    existing_user_notif = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.notification_type == "goal",
        Notification.notification_title == f"Goal Achieved: {goal.goal_name} 🎯"
    ).first()
    if not existing_user_notif:
        user_notif = Notification(
            user_id=current_user.id,
            notification_title=f"Goal Achieved: {goal.goal_name} 🎯",
            message=f"Congratulations! You've achieved your savings target of ₹{goal.target_amount:,.0f} for '{goal.goal_name}'.",
            notification_type="goal",
            is_read=False
        )
        db.add(user_notif)

    # 2. Notify all administrators
    admins = db.query(User).filter(User.role == "admin").all()
    for adm in admins:
        existing_adm_notif = db.query(Notification).filter(
            Notification.user_id == adm.id,
            Notification.notification_type == "goal",
            Notification.notification_title == f"User Milestone: {goal.goal_name} Achieved"
        ).first()
        if not existing_adm_notif:
            adm_notif = Notification(
                user_id=adm.id,
                notification_title=f"User Milestone: {goal.goal_name} Achieved",
                message=f"User '{current_user.full_name or current_user.email}' successfully achieved their savings goal '{goal.goal_name}' (Target: ₹{goal.target_amount:,.0f}).",
                notification_type="goal",
                is_read=False
            )
            db.add(adm_notif)

    # 3. Log into System Activity Audit Trail
    activity = SystemActivity(
        user_id=current_user.id,
        action="GOAL_ACHIEVED",
        entity_type="goal",
        details=f"User {current_user.email} achieved savings target of ₹{goal.target_amount:,.0f} for '{goal.goal_name}'."
    )
    db.add(activity)
    db.commit()

def format_goal_response(goal: FinancialGoal) -> dict:
    progress = 0.0
    if goal.target_amount > 0:
        progress = round(min((goal.current_amount / goal.target_amount) * 100, 100.0), 1)
    remaining = max(goal.target_amount - goal.current_amount, 0.0)

    return {
        "id": goal.id,
        "user_id": goal.user_id,
        "goal_name": goal.goal_name,
        "target_amount": goal.target_amount,
        "current_amount": goal.current_amount,
        "target_date": goal.target_date,
        "status": goal.status,
        "created_at": goal.created_at,
        "progress_percentage": progress,
        "remaining_amount": round(remaining, 2)
    }

@router.get("", response_model=List[GoalResponse])
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goals = db.query(FinancialGoal).filter(
        FinancialGoal.user_id == current_user.id
    ).order_by(FinancialGoal.target_date.asc()).all()
    return [format_goal_response(g) for g in goals]

@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    init_status = goal_in.status or "in_progress"
    curr_amt = goal_in.current_amount or 0.0
    if init_status != "cancelled" and curr_amt >= goal_in.target_amount:
        init_status = "achieved"

    goal = FinancialGoal(
        user_id=current_user.id,
        goal_name=goal_in.goal_name,
        target_amount=goal_in.target_amount,
        current_amount=curr_amt,
        target_date=goal_in.target_date,
        status=init_status
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    if goal.status == "achieved":
        notify_goal_achieved(db, goal, current_user)

    return format_goal_response(goal)

@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal_in: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id,
        FinancialGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    prev_status = goal.status
    update_dict = goal_in.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if val is not None:
            setattr(goal, field, val)

    # If status explicitly passed as cancelled or already cancelled, stay cancelled
    if (goal_in.status and goal_in.status.lower() == "cancelled") or goal.status == "cancelled":
        goal.status = "cancelled"
    else:
        # Check if target reached
        if goal.current_amount >= goal.target_amount:
            goal.status = "achieved"
        elif goal.status == "achieved" and goal.current_amount < goal.target_amount:
            goal.status = "in_progress"

    db.commit()
    db.refresh(goal)

    # If transitioned to achieved, notify user and admin
    if goal.status == "achieved" and prev_status != "achieved":
        notify_goal_achieved(db, goal, current_user)

    return format_goal_response(goal)

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id,
        FinancialGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return None
