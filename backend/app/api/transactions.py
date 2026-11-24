import io
import csv
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from app.database.session import get_db
from app.models.models import (
    Transaction, Category, User, Budget, Notification, UserCategoryCorrection
)
from app.schemas.schemas import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    TransactionListResponse, CSVPreviewResponse, CSVConfirmRequest
)
from app.api.deps import get_current_user
from app.api.budgets import check_and_create_budget_alert
from app.ml.categorizer import categorizer
from app.ml.anomaly_detector import anomaly_detector

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sort_by: str = Query("date", pattern="^(date|amount)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.title.ilike(search_pattern),
                Transaction.description.ilike(search_pattern)
            )
        )

    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type.lower())

    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)

    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)

    # Sorting
    sort_field = Transaction.amount if sort_by == "amount" else Transaction.transaction_date
    if sort_order == "asc":
        query = query.order_by(asc(sort_field), asc(Transaction.id))
    else:
        query = query.order_by(desc(sort_field), desc(Transaction.id))

    total = query.count()
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return TransactionListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Auto-categorize if no category assigned or default selected
    category_id = tx_in.category_id
    if not category_id:
        pred = categorizer.predict(f"{tx_in.title} {tx_in.description or ''}")
        pred_cat = db.query(Category).filter(Category.name.ilike(pred["category"])).first()
        if pred_cat:
            category_id = pred_cat.id

    # Evaluate for anomaly using historical transactions
    user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    cat_name = "General"
    if category_id:
        cat_obj = db.query(Category).filter(Category.id == category_id).first()
        if cat_obj:
            cat_name = cat_obj.name

    anomaly_eval = anomaly_detector.evaluate_single_transaction(
        amount=tx_in.amount,
        category_id=category_id,
        user_expenses=user_txs,
        category_name=cat_name,
        transaction_type=tx_in.transaction_type
    )

    tx = Transaction(
        user_id=current_user.id,
        title=tx_in.title,
        amount=tx_in.amount,
        transaction_type=tx_in.transaction_type.lower(),
        category_id=category_id,
        transaction_date=tx_in.transaction_date,
        payment_method=tx_in.payment_method or "UPI",
        description=tx_in.description,
        notes=tx_in.notes,
        is_anomaly=anomaly_eval["is_anomaly"],
        anomaly_score=anomaly_eval["anomaly_score"],
        anomaly_reason=anomaly_eval["anomaly_reason"]
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    # Check budget alert
    if tx.transaction_type == "expense" and category_id:
        tx_month = tx.transaction_date.month
        tx_year = tx.transaction_date.year
        budget = db.query(Budget).filter(
            Budget.user_id == current_user.id,
            Budget.category_id == category_id,
            Budget.month == tx_month,
            Budget.year == tx_year
        ).first()

        if budget:
            total_spent = sum(
                t.amount for t in db.query(Transaction).filter(
                    Transaction.user_id == current_user.id,
                    Transaction.category_id == category_id,
                    Transaction.transaction_type == "expense"
                ).all()
                if t.transaction_date.month == tx_month and t.transaction_date.year == tx_year
            )
            check_and_create_budget_alert(
                db, current_user.id, category_id, total_spent, budget.monthly_limit, cat_name
            )

    if tx.is_anomaly:
        notif = Notification(
            user_id=current_user.id,
            notification_title="Unusual Transaction Detected",
            message=f"Review transaction '{tx.title}' for ₹{tx.amount:,.0f}: {tx.anomaly_reason}",
            notification_type="anomaly"
        )
        db.add(notif)
        db.commit()

    return tx

@router.get("/{tx_id}", response_model=TransactionResponse)
def get_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    tx_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_dict = tx_in.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        if val is not None:
            setattr(tx, key, val)

    # Re-evaluate anomaly detection
    user_txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.id != tx.id
    ).all()
    cat_name = "General"
    if tx.category_id:
        cat_obj = db.query(Category).filter(Category.id == tx.category_id).first()
        if cat_obj:
            cat_name = cat_obj.name

    anomaly_eval = anomaly_detector.evaluate_single_transaction(
        amount=tx.amount,
        category_id=tx.category_id,
        user_expenses=user_txs,
        category_name=cat_name,
        transaction_type=tx.transaction_type
    )
    tx.is_anomaly = anomaly_eval["is_anomaly"]
    tx.anomaly_score = anomaly_eval["anomaly_score"]
    tx.anomaly_reason = anomaly_eval["anomaly_reason"]

    db.commit()
    db.refresh(tx)

    # Check budget alert for updated transaction
    if tx.transaction_type == "expense" and tx.category_id:
        tx_month = tx.transaction_date.month
        tx_year = tx.transaction_date.year
        budget = db.query(Budget).filter(
            Budget.user_id == current_user.id,
            Budget.category_id == tx.category_id,
            Budget.month == tx_month,
            Budget.year == tx_year
        ).first()

        if budget:
            total_spent = sum(
                t.amount for t in db.query(Transaction).filter(
                    Transaction.user_id == current_user.id,
                    Transaction.category_id == tx.category_id,
                    Transaction.transaction_type == "expense"
                ).all()
                if t.transaction_date.month == tx_month and t.transaction_date.year == tx_year
            )
            check_and_create_budget_alert(
                db, current_user.id, tx.category_id, total_spent, budget.monthly_limit, cat_name
            )

    # If anomaly, alert
    if tx.is_anomaly:
        notif = db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.notification_type == "anomaly",
            Notification.notification_title == "Unusual Transaction Detected",
            Notification.message.like(f"%'{tx.title}'%")
        ).first()
        msg = f"Review transaction '{tx.title}' for ₹{tx.amount:,.0f}: {tx.anomaly_reason}"
        if not notif:
            notif = Notification(
                user_id=current_user.id,
                notification_title="Unusual Transaction Detected",
                message=msg,
                notification_type="anomaly",
                is_read=False
            )
            db.add(notif)
        else:
            notif.message = msg
            notif.is_read = False
        db.commit()

    return tx

@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return None

@router.post("/upload-csv", response_model=CSVPreviewResponse)
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = content.decode("latin1")
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to decode CSV file format")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file appears to be empty or missing header row")

    # Dynamic column identification
    field_lower = {f.strip().lower(): f for f in reader.fieldnames}
    
    date_col = next((field_lower[k] for k in ["date", "transaction date", "txn date", "value date"] if k in field_lower), None)
    title_col = next((field_lower[k] for k in ["description", "narration", "title", "particulars", "remarks", "merchant", "details"] if k in field_lower), None)
    amount_col = next((field_lower[k] for k in ["amount", "txn amount", "transaction amount", "withdrawal", "debit", "credit"] if k in field_lower), None)
    type_col = next((field_lower[k] for k in ["type", "transaction type", "cr/dr", "d/c"] if k in field_lower), None)

    if not title_col or not amount_col:
        raise HTTPException(
            status_code=400,
            detail="Could not detect required columns. CSV must contain at least description/title and amount columns."
        )

    categories = {c.name.lower(): c.id for c in db.query(Category).all()}
    existing_user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    existing_keys = set(f"{t.transaction_date}_{t.title.lower()}_{round(t.amount, 2)}" for t in existing_user_txs)

    preview_items = []
    duplicates = 0

    for row in reader:
        raw_title = (row.get(title_col) or "Unnamed Transaction").strip()
        raw_amount_str = (row.get(amount_col) or "0").replace(",", "").replace("$", "").replace("₹", "").strip()
        
        try:
            amount_val = abs(float(raw_amount_str))
        except ValueError:
            continue

        if amount_val <= 0:
            continue

        # Date parsing
        date_str = str(date.today())
        if date_col and row.get(date_col):
            raw_date = row.get(date_col).strip()
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d %b %Y"):
                try:
                    parsed_d = datetime.strptime(raw_date, fmt).date()
                    date_str = str(parsed_d)
                    break
                except ValueError:
                    pass

        # Determine transaction type
        tx_type = "expense"
        if type_col and row.get(type_col):
            val = row.get(type_col).strip().lower()
            if "cr" in val or "credit" in val or "income" in val or "deposit" in val:
                tx_type = "income"
        elif "salary" in raw_title.lower() or "dividend" in raw_title.lower() or "interest credit" in raw_title.lower():
            tx_type = "income"

        # Predict category
        pred = categorizer.predict(raw_title, amount=amount_val)
        pred_cat_name = pred["category"]
        pred_cat_id = categories.get(pred_cat_name.lower())

        # Duplicate check
        key = f"{date_str}_{raw_title.lower()}_{round(amount_val, 2)}"
        is_dup = key in existing_keys
        if is_dup:
            duplicates += 1

        preview_items.append({
            "date": date_str,
            "title": raw_title,
            "amount": amount_val,
            "transaction_type": tx_type,
            "predicted_category": pred_cat_name,
            "predicted_category_id": pred_cat_id,
            "confidence": pred["confidence"],
            "payment_method": "Bank Transfer",
            "description": raw_title,
            "is_duplicate": is_dup
        })

    return CSVPreviewResponse(
        total_rows=len(preview_items),
        duplicates_detected=duplicates,
        transactions=preview_items
    )

@router.post("/confirm-csv")
def confirm_csv_import(
    confirm_data: CSVConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    created_count = 0
    categories_map = {c.id: c.name for c in db.query(Category).all()}
    user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    for item in confirm_data.transactions:
        try:
            tx_date = datetime.strptime(item.date, "%Y-%m-%d").date()
        except Exception:
            tx_date = date.today()

        anomaly_eval = anomaly_detector.evaluate_single_transaction(
            amount=item.amount,
            category_id=item.category_id,
            user_expenses=user_txs,
            category_name=categories_map.get(item.category_id, "General"),
            transaction_type=item.transaction_type
        )

        tx = Transaction(
            user_id=current_user.id,
            title=item.title,
            amount=item.amount,
            transaction_type=item.transaction_type.lower(),
            category_id=item.category_id,
            transaction_date=tx_date,
            payment_method=item.payment_method or "Bank Transfer",
            description=item.description,
            is_anomaly=anomaly_eval["is_anomaly"],
            anomaly_score=anomaly_eval["anomaly_score"],
            anomaly_reason=anomaly_eval["anomaly_reason"]
        )
        db.add(tx)
        created_count += 1

    db.commit()

    # Re-evaluate budget alerts for imported expenses
    processed_budgets = set()
    for item in confirm_data.transactions:
        if item.transaction_type.lower() == "expense" and item.category_id:
            try:
                tx_date = datetime.strptime(item.date, "%Y-%m-%d").date()
            except Exception:
                tx_date = date.today()
            key = (item.category_id, tx_date.month, tx_date.year)
            if key not in processed_budgets:
                processed_budgets.add(key)
                b = db.query(Budget).filter(
                    Budget.user_id == current_user.id,
                    Budget.category_id == item.category_id,
                    Budget.month == tx_date.month,
                    Budget.year == tx_date.year
                ).first()
                if b:
                    total_spent = sum(
                        t.amount for t in db.query(Transaction).filter(
                            Transaction.user_id == current_user.id,
                            Transaction.category_id == item.category_id,
                            Transaction.transaction_type == "expense"
                        ).all()
                        if t.transaction_date.month == tx_date.month and t.transaction_date.year == tx_date.year
                    )
                    c_name = categories_map.get(item.category_id, "Category")
                    check_and_create_budget_alert(db, current_user.id, item.category_id, total_spent, b.monthly_limit, c_name)

    return {"message": f"Successfully imported {created_count} transactions"}

@router.post("/correct-category")
def correct_transaction_category(
    transaction_id: int,
    corrected_category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    old_cat_id = tx.category_id
    tx.category_id = corrected_category_id
    db.commit()

    # Log user correction for ML retraining loop
    corr = UserCategoryCorrection(
        user_id=current_user.id,
        transaction_title=tx.title,
        description=tx.description,
        amount=tx.amount,
        predicted_category_id=old_cat_id,
        corrected_category_id=corrected_category_id
    )
    db.add(corr)
    db.commit()

    if tx.transaction_type == "expense" and corrected_category_id:
        tx_month = tx.transaction_date.month
        tx_year = tx.transaction_date.year
        b = db.query(Budget).filter(
            Budget.user_id == current_user.id,
            Budget.category_id == corrected_category_id,
            Budget.month == tx_month,
            Budget.year == tx_year
        ).first()
        if b:
            total_spent = sum(
                t.amount for t in db.query(Transaction).filter(
                    Transaction.user_id == current_user.id,
                    Transaction.category_id == corrected_category_id,
                    Transaction.transaction_type == "expense"
                ).all()
                if t.transaction_date.month == tx_month and t.transaction_date.year == tx_year
            )
            cat_obj = db.query(Category).filter(Category.id == corrected_category_id).first()
            c_name = cat_obj.name if cat_obj else "Category"
            check_and_create_budget_alert(db, current_user.id, corrected_category_id, total_spent, b.monthly_limit, c_name)

    return {"message": "Category updated and correction logged for model retraining"}
