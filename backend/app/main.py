import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.api import (
    auth, transactions, budgets, goals, predictions, recommendations,
    analytics, categories, notifications, admin, demo
)
from app.api.categories import ensure_default_categories
from app.models.models import User
from app.core.security import get_password_hash
from app.utils.seeder import seed_demo_data_for_user

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_default_categories(db)
        
        # Check if default admin user exists
        admin_user = db.query(User).filter(User.email == "admin@financeai.com").first()
        if not admin_user:
            admin_user = User(
                full_name="System Administrator",
                email="admin@financeai.com",
                password_hash=get_password_hash("Admin@123"),
                role="admin",
                preferred_currency="INR"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
    finally:
        db.close()

# Initialize DB synchronously
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Advanced AI-Powered Personal Finance Management and Expense Prediction REST API"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(transactions.router, prefix=settings.API_V1_STR)
app.include_router(budgets.router, prefix=settings.API_V1_STR)
app.include_router(goals.router, prefix=settings.API_V1_STR)
app.include_router(predictions.router, prefix=settings.API_V1_STR)
app.include_router(recommendations.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(categories.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(demo.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
