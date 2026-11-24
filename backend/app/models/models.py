from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # "user", "admin"
    preferred_currency = Column(String(10), default="INR", nullable=False)  # "USD", "INR", "EUR", etc.
    initial_balance = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("FinancialGoal", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("SystemActivity", back_populates="user", cascade="all, delete-orphan")
    issues = relationship("ReportedIssue", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    category_type = Column(String(20), default="expense", nullable=False)  # "expense", "income"
    description = Column(String(255), nullable=True)
    color = Column(String(20), default="#6366f1", nullable=True)
    icon = Column(String(50), default="Tag", nullable=True)

    # Relationships
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(20), nullable=False)  # "income", "expense"
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    transaction_date = Column(Date, nullable=False, index=True)
    payment_method = Column(String(50), default="UPI", nullable=False)  # UPI, Credit Card, Debit Card, Cash, Net Banking
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_anomaly = Column(Boolean, default=False, nullable=False)
    anomaly_score = Column(Float, default=0.0, nullable=True)
    anomaly_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    monthly_limit = Column(Float, nullable=False)
    month = Column(Integer, nullable=False)  # 1 - 12
    year = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_name = Column(String(150), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0, nullable=False)
    target_date = Column(Date, nullable=False)
    status = Column(String(30), default="in_progress", nullable=False)  # in_progress, achieved, cancelled
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="goals")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_period = Column(String(50), nullable=False)  # e.g. "2026-12", "week_1"
    predicted_amount = Column(Float, nullable=False)
    prediction_type = Column(String(50), default="monthly_total", nullable=False)  # monthly_total, category_breakdown, weekly
    model_name = Column(String(100), default="RandomForestRegressor", nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    confidence_score = Column(Float, default=0.85, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="predictions")
    category = relationship("Category")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recommendation_title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    estimated_savings = Column(Float, default=0.0, nullable=False)
    priority = Column(String(20), default="medium", nullable=False)  # high, medium, low
    status = Column(String(20), default="active", nullable=False)  # active, applied, dismissed
    supporting_data = Column(Text, nullable=True)  # JSON or text description of supporting numbers
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="recommendations")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="system", nullable=False)  # budget_alert, anomaly, goal, prediction, system
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="notifications")


class UserCategoryCorrection(Base):
    __tablename__ = "user_category_corrections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    predicted_category_id = Column(Integer, nullable=True)
    corrected_category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SystemActivity(Base):
    __tablename__ = "system_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(80), nullable=False, index=True)  # USER_LOGIN, TRANSACTION_CREATED, CATEGORY_CREATED, etc.
    entity_type = Column(String(50), nullable=False)  # user, transaction, budget, category, ml_model, issue, system
    details = Column(Text, nullable=False)
    ip_address = Column(String(50), nullable=True, default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="activities")


class ReportedIssue(Base):
    __tablename__ = "reported_issues"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(60), default="General", nullable=False)  # Bug, Feature Request, ML Accuracy, UI Glitch, Account
    severity = Column(String(20), default="medium", nullable=False)  # low, medium, high, critical
    status = Column(String(20), default="open", nullable=False)  # open, in_progress, resolved, closed
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="issues")
