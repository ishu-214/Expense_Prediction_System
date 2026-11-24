import pytest
from datetime import date, datetime
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.database.session import SessionLocal, Base, engine
from app.models.models import User, Category, Transaction, Budget, FinancialGoal
from app.ml.categorizer import categorizer
from app.ml.anomaly_detector import anomaly_detector
from app.ml.expense_predictor import expense_predictor
from app.ml.recommendation_engine import recommendation_engine

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_password_hashing():
    pwd = "SecurePassword@123"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_creation_and_decoding():
    user_id = 999
    token = create_access_token(subject=user_id)
    assert isinstance(token, str)
    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == str(user_id)

def test_ml_categorizer_predictions():
    # Test food classification
    res_food = categorizer.predict("Swiggy food order dinner pizza delivery")
    assert res_food["category"] == "Food"
    assert res_food["confidence"] > 0.15

    # Test transportation
    res_trans = categorizer.predict("Uber cab ride airport commute transit")
    assert res_trans["category"] == "Transportation"

    # Test entertainment
    res_ent = categorizer.predict("Netflix monthly streaming subscription")
    assert res_ent["category"] == "Entertainment"

    # Test rent
    res_rent = categorizer.predict("Monthly apartment flat house rent")
    assert res_rent["category"] == "Rent"

    # Test metrics
    metrics = categorizer.get_metrics()
    assert metrics["accuracy"] >= 0.85
    assert metrics["f1_score"] >= 0.85

def test_anomaly_detector():
    # Setup mock expenses
    class MockTx:
        def __init__(self, amount, cat_id, tx_type="expense"):
            self.amount = amount
            self.category_id = cat_id
            self.transaction_type = tx_type

    history = [
        MockTx(400, 1),
        MockTx(550, 1),
        MockTx(350, 1),
        MockTx(480, 1),
        MockTx(600, 1),
    ]

    # Normal transaction: ₹500
    eval_normal = anomaly_detector.evaluate_single_transaction(500.0, 1, history, "Food")
    assert eval_normal["is_anomaly"] is False

    # Outlier transaction: ₹12,000 (over 20x average)
    eval_outlier = anomaly_detector.evaluate_single_transaction(12000.0, 1, history, "Food")
    assert eval_outlier["is_anomaly"] is True
    assert eval_outlier["anomaly_score"] > 0.5
    assert "Food" in eval_outlier["anomaly_reason"]

def test_ml_expense_predictor(db):
    categories_map = {c.id: c.name for c in db.query(Category).all()}

    # 1. Test clean empty state (0 transactions)
    empty_summary = expense_predictor.predict_user_expenses([], categories_map)
    assert empty_summary["next_month_predicted_total"] == 0.0
    assert empty_summary["confidence_score"] == 0.0
    assert len(empty_summary["weekly_forecasts"]) == 4

    # 2. Test with sample transactions
    from app.utils.seeder import seed_demo_data_for_user
    test_user = User(
        full_name="ML Test User",
        email="ml_test_runner@financeai.com",
        password_hash=get_password_hash("Test@123"),
        role="user",
        preferred_currency="INR"
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    try:
        seed_demo_data_for_user(db, test_user)
        txs = db.query(Transaction).filter(Transaction.user_id == test_user.id).all()
        summary = expense_predictor.predict_user_expenses(txs, categories_map)
        assert summary["next_month_predicted_total"] > 0
        assert len(summary["weekly_forecasts"]) == 4
        assert len(summary["category_predictions"]) > 0
        assert summary["confidence_score"] > 0.5
    finally:
        db.query(Transaction).filter(Transaction.user_id == test_user.id).delete()
        db.query(Budget).filter(Budget.user_id == test_user.id).delete()
        db.query(User).filter(User.id == test_user.id).delete()
        db.commit()

def test_recommendation_engine(db):
    categories_map = {c.id: c.name for c in db.query(Category).all()}

    # 1. Test empty onboarding recommendation
    empty_recs = recommendation_engine.generate_recommendations([], [], categories_map)
    assert len(empty_recs) == 1
    assert empty_recs[0]["estimated_savings"] == 0.0

    # 2. Test with sample user
    from app.utils.seeder import seed_demo_data_for_user
    test_user = User(
        full_name="Rec Test User",
        email="rec_test_runner@financeai.com",
        password_hash=get_password_hash("Test@123"),
        role="user",
        preferred_currency="INR"
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    try:
        seed_demo_data_for_user(db, test_user)
        txs = db.query(Transaction).filter(Transaction.user_id == test_user.id).all()
        budgets = db.query(Budget).filter(Budget.user_id == test_user.id).all()
        recs = recommendation_engine.generate_recommendations(txs, budgets, categories_map)
        assert len(recs) > 0
        first_rec = recs[0]
        assert "recommendation_title" in first_rec
        assert "estimated_savings" in first_rec
        assert first_rec["estimated_savings"] >= 0
    finally:
        db.query(Transaction).filter(Transaction.user_id == test_user.id).delete()
        db.query(Budget).filter(Budget.user_id == test_user.id).delete()
        db.query(User).filter(User.id == test_user.id).delete()
        db.commit()

def test_user_and_budget_crud(db):
    test_email = "testuser_crud@financeai.com"
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        db.delete(existing)
        db.commit()

    user = User(
        full_name="CRUD Test User",
        email=test_email,
        password_hash=get_password_hash("Test@123"),
        role="user",
        preferred_currency="INR"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    assert user.id is not None

    # Add transaction
    cat = db.query(Category).first()
    tx = Transaction(
        user_id=user.id,
        title="Test Supermarket",
        amount=1500.0,
        transaction_type="expense",
        category_id=cat.id if cat else None,
        transaction_date=date.today(),
        payment_method="UPI"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    assert tx.id is not None
    assert tx.amount == 1500.0

    # Add Goal
    goal = FinancialGoal(
        user_id=user.id,
        goal_name="Emergency Reserve",
        target_amount=50000.0,
        current_amount=15000.0,
        target_date=date(2026, 12, 31)
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    assert goal.id is not None
    assert goal.goal_name == "Emergency Reserve"

    # Cleanup test user
    db.delete(user)
    db.commit()
