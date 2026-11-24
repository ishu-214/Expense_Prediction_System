from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Category, User
from app.schemas.schemas import CategoryCreate, CategoryUpdate, CategoryResponse
from app.api.deps import get_current_user, get_current_active_admin

router = APIRouter(prefix="/categories", tags=["Categories"])

DEFAULT_CATEGORIES = [
    # Expense Categories
    {"name": "Food", "category_type": "expense", "description": "Groceries, restaurants, snacks, cafe", "color": "#f97316", "icon": "Utensils"},
    {"name": "Shopping", "category_type": "expense", "description": "Clothing, gadgets, retail goods", "color": "#ec4899", "icon": "ShoppingBag"},
    {"name": "Transportation", "category_type": "expense", "description": "Fuel, cabs, public transit, flights", "color": "#3b82f6", "icon": "Car"},
    {"name": "Healthcare", "category_type": "expense", "description": "Medicine, doctor visits, hospital", "color": "#ef4444", "icon": "HeartPulse"},
    {"name": "Entertainment", "category_type": "expense", "description": "Movies, streaming, games, outings", "color": "#8b5cf6", "icon": "Film"},
    {"name": "Education", "category_type": "expense", "description": "Courses, books, tuition, school fees", "color": "#06b6d4", "icon": "GraduationCap"},
    {"name": "Utilities", "category_type": "expense", "description": "Electricity, water, internet, phone", "color": "#eab308", "icon": "Zap"},
    {"name": "Rent", "category_type": "expense", "description": "House rent, office lease, PG fee", "color": "#14b8a6", "icon": "Home"},
    {"name": "Travel", "category_type": "expense", "description": "Hotels, vacations, flights, holiday", "color": "#6366f1", "icon": "Plane"},
    {"name": "Investment", "category_type": "expense", "description": "Stocks, mutual funds, gold, crypto", "color": "#10b981", "icon": "TrendingUp"},
    {"name": "Other Expense", "category_type": "expense", "description": "Miscellaneous or unclassified expenditures", "color": "#64748b", "icon": "Tag"},
    {"name": "Other", "category_type": "expense", "description": "General miscellaneous transactions", "color": "#64748b", "icon": "Tag"},

    # Dedicated Income Categories
    {"name": "Salary", "category_type": "income", "description": "Monthly paycheck, stipend, wages", "color": "#10b981", "icon": "Briefcase"},
    {"name": "Freelance & Consulting", "category_type": "income", "description": "Client gigs, project milestones, consulting", "color": "#06b6d4", "icon": "Laptop"},
    {"name": "Business Revenue", "category_type": "income", "description": "Business sales, commercial earnings", "color": "#3b82f6", "icon": "Store"},
    {"name": "Investments & Dividends", "category_type": "income", "description": "Stock dividends, capital gains, interest", "color": "#8b5cf6", "icon": "TrendingUp"},
    {"name": "Incentives & Bonus", "category_type": "income", "description": "Performance incentives, bonuses, rewards", "color": "#f59e0b", "icon": "Award"},
    {"name": "Rental Income", "category_type": "income", "description": "Property rent, lease earnings", "color": "#14b8a6", "icon": "Home"},
    {"name": "Gifts & Allowance", "category_type": "income", "description": "Family gifts, pocket money, grants", "color": "#ec4899", "icon": "Gift"},
    {"name": "Other Income", "category_type": "income", "description": "Refunds, cashbacks, other earnings", "color": "#22c55e", "icon": "DollarSign"}
]

def ensure_default_categories(db: Session):
    for cat_data in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not existing:
            cat = Category(**cat_data)
            db.add(cat)
    db.commit()

@router.get("", response_model=List[CategoryResponse])
def get_categories(
    category_type: Optional[str] = Query(None, pattern="^(expense|income)$"),
    db: Session = Depends(get_db)
):
    ensure_default_categories(db)
    query = db.query(Category)
    if category_type:
        query = query.filter(Category.category_type == category_type)
    return query.order_by(Category.name).all()

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    existing = db.query(Category).filter(Category.name.ilike(cat_in.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    category = Category(**cat_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(
    cat_id: int,
    cat_in: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    category = db.query(Category).filter(Category.id == cat_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = cat_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(category, field, val)

    db.commit()
    db.refresh(category)
    return category

@router.delete("/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    category = db.query(Category).filter(Category.id == cat_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return None
