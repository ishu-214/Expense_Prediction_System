from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User
from app.api.deps import get_current_user
from app.utils.seeder import seed_demo_data_for_user

router = APIRouter(prefix="/demo", tags=["Demo Data Seeder"])

@router.post("/seed")
def seed_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = seed_demo_data_for_user(db, current_user)
    return {
        "message": f"Successfully loaded {count} realistic demonstration transactions, budgets, goals, and insights for {current_user.full_name}."
    }
