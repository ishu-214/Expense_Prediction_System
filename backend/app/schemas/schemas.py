from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field

# ----------------- User Schemas -----------------
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    preferred_currency: Optional[str] = "INR"
    initial_balance: Optional[float] = 0.0

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    preferred_currency: Optional[str] = None
    initial_balance: Optional[float] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Auth Token Schemas -----------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None

# ----------------- Category Schemas -----------------
class CategoryBase(BaseModel):
    name: str
    category_type: str = "expense"
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"
    icon: Optional[str] = "Tag"

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    category_type: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True

# ----------------- Transaction Schemas -----------------
class TransactionBase(BaseModel):
    title: str
    amount: float
    transaction_type: str  # "income" or "expense"
    category_id: Optional[int] = None
    transaction_date: date
    payment_method: Optional[str] = "UPI"
    description: Optional[str] = None
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    transaction_type: Optional[str] = None
    category_id: Optional[int] = None
    transaction_date: Optional[date] = None
    payment_method: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    is_anomaly: bool = False
    anomaly_score: Optional[float] = 0.0
    anomaly_reason: Optional[str] = None
    created_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    limit: int
    total_pages: int

# ----------------- Budget Schemas -----------------
class BudgetBase(BaseModel):
    category_id: int
    monthly_limit: float
    month: int = Field(..., ge=1, le=12)
    year: int

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    monthly_limit: Optional[float] = None
    month: Optional[int] = None
    year: Optional[int] = None

class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    created_at: datetime
    category: Optional[CategoryResponse] = None
    spent_amount: Optional[float] = 0.0
    remaining_amount: Optional[float] = 0.0
    utilization_percentage: Optional[float] = 0.0
    is_exceeded: Optional[bool] = False

    class Config:
        from_attributes = True

# ----------------- Financial Goal Schemas -----------------
class GoalBase(BaseModel):
    goal_name: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    target_date: date
    status: Optional[str] = "in_progress"

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    goal_name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[date] = None
    status: Optional[str] = None

class GoalResponse(GoalBase):
    id: int
    user_id: int
    created_at: datetime
    progress_percentage: float = 0.0
    remaining_amount: float = 0.0

    class Config:
        from_attributes = True

# ----------------- Prediction Schemas -----------------
class PredictionItem(BaseModel):
    period: str
    predicted_amount: float
    confidence_interval: Optional[Dict[str, float]] = None

class CategoryPredictionItem(BaseModel):
    category_id: int
    category_name: str
    predicted_amount: float
    percentage_of_total: float

class PredictionSummary(BaseModel):
    next_month_predicted_total: float
    predicted_savings: float
    expected_income: float
    model_name: str
    mae: Optional[float] = None
    rmse: Optional[float] = None
    weekly_forecasts: List[PredictionItem]
    category_predictions: List[CategoryPredictionItem]
    historical_vs_predicted: List[Dict[str, Any]]
    trend_direction: str  # "increasing", "decreasing", "stable"
    confidence_score: float

# ----------------- Recommendation Schemas -----------------
class RecommendationResponse(BaseModel):
    id: int
    recommendation_title: str
    description: str
    estimated_savings: float
    priority: str  # high, medium, low
    status: str    # active, applied, dismissed
    supporting_data: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RecommendationStatusUpdate(BaseModel):
    status: str

# ----------------- Notification Schemas -----------------
class NotificationResponse(BaseModel):
    id: int
    notification_title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Analytics & Reports Schemas -----------------
class MonthlyStat(BaseModel):
    month: str
    income: float
    expense: float
    savings: float
    savings_rate: float

class CategorySpending(BaseModel):
    category_id: int
    category_name: str
    color: str
    amount: float
    percentage: float

class DashboardAnalytics(BaseModel):
    initial_balance: float = 0.0
    total_balance: float
    total_income: float
    total_expenses: float
    monthly_savings: float
    savings_rate: float
    budget_utilization: float
    unusual_transactions_count: int
    recent_transactions: List[TransactionResponse]
    monthly_trend: List[MonthlyStat]
    category_breakdown: List[CategorySpending]
    ai_insights: List[str]

# ----------------- CSV Import Schemas -----------------
class CSVTransactionPreview(BaseModel):
    date: str
    title: str
    amount: float
    transaction_type: str
    predicted_category: str
    predicted_category_id: Optional[int] = None
    confidence: float
    payment_method: str
    description: Optional[str] = None
    is_duplicate: bool = False

class CSVPreviewResponse(BaseModel):
    total_rows: int
    duplicates_detected: int
    transactions: List[CSVTransactionPreview]

class CSVConfirmTransaction(BaseModel):
    date: str
    title: str
    amount: float
    transaction_type: str
    category_id: int
    payment_method: str
    description: Optional[str] = None

class CSVConfirmRequest(BaseModel):
    transactions: List[CSVConfirmTransaction]

# ----------------- Admin Schemas -----------------
class AdminUserResponse(UserResponse):
    transaction_count: int
    total_spent: float
    last_active: Optional[datetime] = None

class AdminAnalyticsResponse(BaseModel):
    total_users: int
    active_users: int
    total_transactions: int
    total_income_processed: float
    total_expenses_processed: float
    total_predictions_generated: int
    anomalies_detected: int
    system_status: str

class ModelPerformanceResponse(BaseModel):
    categorization_model: Dict[str, Any]
    expense_prediction_model: Dict[str, Any]
    anomaly_detection_model: Dict[str, Any]
    recommendation_engine: Optional[Dict[str, Any]] = None

class SystemActivityResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    details: str
    ip_address: Optional[str] = None
    created_at: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class ReportedIssueCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = "General"
    severity: Optional[str] = "medium"

class ReportedIssueUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    admin_notes: Optional[str] = None

class ReportedIssueResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    description: str
    category: str
    severity: str
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    reporter_email: Optional[str] = None
    reporter_name: Optional[str] = None

    class Config:
        from_attributes = True

class AdminUserRoleUpdate(BaseModel):
    role: str

class AdminUsageStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_transactions_count: int
    total_volume_inflow: float
    total_volume_outflow: float
    net_platform_cashflow: float
    anomaly_rate_percentage: float
    monthly_trend: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]
    payment_method_distribution: List[Dict[str, Any]]

