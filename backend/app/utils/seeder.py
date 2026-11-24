from datetime import datetime, timedelta, date
import random
from sqlalchemy.orm import Session
from app.models.models import (
    User, Category, Transaction, Budget, FinancialGoal, Notification, Recommendation
)
from app.ml.anomaly_detector import anomaly_detector
from app.ml.recommendation_engine import recommendation_engine

SAMPLE_MERCHANTS = [
    # (Title, CategoryName, AmountRange, Type, PaymentMethod)
    ("Monthly Salary - Tech Corp", "Salary", (75000, 85000), "income", "Bank Transfer"),
    ("Freelance Web Design Consulting", "Salary", (15000, 25000), "income", "Net Banking"),
    ("Apartment Monthly Rent", "Rent", (22000, 22000), "expense", "Net Banking"),
    ("Electricity Board Bill Payment", "Utilities", (1400, 2600), "expense", "UPI"),
    ("Broadband Fiber Internet Bill", "Utilities", (999, 999), "expense", "UPI"),
    ("Mobile Postpaid Unlimited Plan", "Utilities", (499, 799), "expense", "UPI"),
    ("Piped Cooking Gas PNG Bill", "Utilities", (650, 950), "expense", "UPI"),
    ("Zomato Dinner Delivery", "Food", (320, 850), "expense", "UPI"),
    ("Swiggy Grocery Delivery", "Food", (450, 1400), "expense", "UPI"),
    ("Supermarket Ration & Supplies", "Food", (2200, 4800), "expense", "Debit Card"),
    ("Starbucks Coffee & Snacks", "Food", (380, 720), "expense", "UPI"),
    ("Dominos Pizza Weekend Order", "Food", (650, 1200), "expense", "UPI"),
    ("Amazon Online Electronics Purchase", "Shopping", (850, 3500), "expense", "Credit Card"),
    ("Myntra Casual Apparel Shopping", "Shopping", (1200, 4200), "expense", "Credit Card"),
    ("Zara Autumn Jacket & Denim", "Shopping", (2900, 6500), "expense", "Credit Card"),
    ("Uber Daily Office Commute", "Transportation", (220, 480), "expense", "UPI"),
    ("Petrol Refuel Shell Station", "Transportation", (1800, 2500), "expense", "Credit Card"),
    ("Metro Smartcard Monthly Auto-Topup", "Transportation", (800, 1000), "expense", "UPI"),
    ("Apollo Pharmacy Prescription Medicines", "Healthcare", (450, 1850), "expense", "UPI"),
    ("Dental Checkup & Cleaning", "Healthcare", (1500, 2500), "expense", "UPI"),
    ("Netflix 4K Ultra Subscription", "Entertainment", (649, 649), "expense", "Credit Card"),
    ("Spotify Premium Family Plan", "Entertainment", (179, 179), "expense", "Credit Card"),
    ("PVR Cinemas Movie Tickets & Popcorn", "Entertainment", (750, 1500), "expense", "Credit Card"),
    ("Udemy Advanced Machine Learning Course", "Education", (499, 999), "expense", "Debit Card"),
    ("Zerodha Equity & ETF SIP", "Investment", (5000, 10000), "expense", "Net Banking"),
    ("Groww Mutual Fund Index Fund SIP", "Investment", (5000, 5000), "expense", "Net Banking")
]

def seed_demo_data_for_user(db: Session, user: User) -> int:
    # Fetch categories
    categories = {c.name: c for c in db.query(Category).all()}
    now = datetime.now()

    # Clear existing demo data for this user
    db.query(Transaction).filter(Transaction.user_id == user.id).delete()
    db.query(Budget).filter(Budget.user_id == user.id).delete()
    db.query(FinancialGoal).filter(FinancialGoal.user_id == user.id).delete()
    db.query(Notification).filter(Notification.user_id == user.id).delete()
    db.query(Recommendation).filter(Recommendation.user_id == user.id).delete()
    db.commit()

    created_txs = []
    # Generate 5 months of realistic history (150 days)
    for day_offset in range(140, -1, -1):
        tx_date = (now - timedelta(days=day_offset)).date()
        is_payday = (tx_date.day == 1)
        is_mid_month = (tx_date.day == 15)
        is_weekend = tx_date.weekday() in (5, 6)

        # 1. Salary on 1st of month
        if is_payday:
            sal_cat = categories.get("Salary")
            sal_tx = Transaction(
                user_id=user.id,
                title="Monthly Salary - Tech Corp",
                amount=82000.0,
                transaction_type="income",
                category_id=sal_cat.id if sal_cat else None,
                transaction_date=tx_date,
                payment_method="Bank Transfer",
                description="Monthly payroll credit direct deposit",
                is_anomaly=False
            )
            db.add(sal_tx)
            created_txs.append(sal_tx)

            # Rent payment on 2nd
            rent_cat = categories.get("Rent")
            rent_tx = Transaction(
                user_id=user.id,
                title="Apartment Monthly Rent",
                amount=22000.0,
                transaction_type="expense",
                category_id=rent_cat.id if rent_cat else None,
                transaction_date=tx_date + timedelta(days=1),
                payment_method="Net Banking",
                description="Lease payment for 2BHK flat",
                is_anomaly=False
            )
            db.add(rent_tx)
            created_txs.append(rent_tx)

        # 2. Side consulting income on 15th (some months)
        if is_mid_month and day_offset in (15, 75, 135):
            sal_cat = categories.get("Salary")
            side_tx = Transaction(
                user_id=user.id,
                title="Freelance Consulting Milestone",
                amount=18500.0,
                transaction_type="income",
                category_id=sal_cat.id if sal_cat else None,
                transaction_date=tx_date,
                payment_method="Net Banking",
                description="UI/UX Architecture consulting payout",
                is_anomaly=False
            )
            db.add(side_tx)
            created_txs.append(side_tx)

        # 3. Daily / regular expenses
        # 60% chance of 1-3 expenses per day
        if random.random() < 0.65:
            num_txs = random.randint(1, 3)
            for _ in range(num_txs):
                merchant_info = random.choice(SAMPLE_MERCHANTS)
                if merchant_info[3] == "income":
                    continue  # Income handled separately
                
                cat_obj = categories.get(merchant_info[1])
                amt = float(random.randint(merchant_info[2][0], merchant_info[2][1]))

                tx = Transaction(
                    user_id=user.id,
                    title=merchant_info[0],
                    amount=amt,
                    transaction_type="expense",
                    category_id=cat_obj.id if cat_obj else None,
                    transaction_date=tx_date,
                    payment_method=merchant_info[4],
                    description=f"{merchant_info[0]} payment",
                    is_anomaly=False
                )
                db.add(tx)
                created_txs.append(tx)

    # Add 1-2 realistic unusual transactions for anomaly testing
    food_cat = categories.get("Food")
    unusual_tx1 = Transaction(
        user_id=user.id,
        title="Luxury Resort Gala Banquet Dinner",
        amount=14500.0,
        transaction_type="expense",
        category_id=food_cat.id if food_cat else None,
        transaction_date=(now - timedelta(days=6)).date(),
        payment_method="Credit Card",
        description="Annual reunion celebratory dinner",
        is_anomaly=True,
        anomaly_score=0.92,
        anomaly_reason="Amount is 8.5x higher than your average Food expense (₹1,700)"
    )
    db.add(unusual_tx1)
    created_txs.append(unusual_tx1)

    db.commit()

    # Create monthly budgets for current month
    cur_m = now.month
    cur_y = now.year
    default_budgets = [
        ("Food", 15000.0),
        ("Shopping", 10000.0),
        ("Transportation", 6000.0),
        ("Utilities", 5000.0),
        ("Entertainment", 4000.0),
        ("Rent", 22000.0),
        ("Healthcare", 3000.0)
    ]
    for cat_name, limit in default_budgets:
        c = categories.get(cat_name)
        if c:
            b = Budget(
                user_id=user.id,
                category_id=c.id,
                monthly_limit=limit,
                month=cur_m,
                year=cur_y
            )
            db.add(b)

    # Create financial goals
    goal1 = FinancialGoal(
        user_id=user.id,
        goal_name="Emergency Reserve Fund (6 Months)",
        target_amount=150000.0,
        current_amount=95000.0,
        target_date=(now + timedelta(days=180)).date(),
        status="in_progress"
    )
    goal2 = FinancialGoal(
        user_id=user.id,
        goal_name="New High-Performance MacBook Pro",
        target_amount=180000.0,
        current_amount=72000.0,
        target_date=(now + timedelta(days=90)).date(),
        status="in_progress"
    )
    goal3 = FinancialGoal(
        user_id=user.id,
        goal_name="Annual Family Vacation Fund",
        target_amount=80000.0,
        current_amount=56000.0,
        target_date=(now + timedelta(days=120)).date(),
        status="in_progress"
    )
    db.add_all([goal1, goal2, goal3])

    # Initial notifications
    notif1 = Notification(
        user_id=user.id,
        notification_title="Unusual Expense Detected",
        message="Review transaction 'Luxury Resort Gala Banquet Dinner' for ₹14,500: Amount is 8.5x higher than your Food average.",
        notification_type="anomaly"
    )
    notif2 = Notification(
        user_id=user.id,
        notification_title="Goal Milestone Achieved",
        message="You have achieved 63% of your 'Emergency Reserve Fund' savings target! Keep it up.",
        notification_type="goal"
    )
    db.add_all([notif1, notif2])
    db.commit()

    return len(created_txs)
