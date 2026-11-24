import io
import csv
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Transaction, Category, Budget, User
from app.schemas.schemas import DashboardAnalytics, MonthlyStat, CategorySpending
from app.api.deps import get_current_user
from app.ml.insights_engine import insights_engine
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=DashboardAnalytics)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    cur_m = now.month
    cur_y = now.year

    all_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    categories = db.query(Category).all()
    cat_map = {c.id: c.name for c in categories}
    cat_color_map = {c.id: c.color for c in categories}
    user_budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()

    user_initial = getattr(current_user, 'initial_balance', 0.0) or 0.0
    total_income = sum(t.amount for t in all_txs if t.transaction_type == "income")
    total_expenses = sum(t.amount for t in all_txs if t.transaction_type == "expense")
    total_balance = user_initial + total_income - total_expenses

    # Current month metrics
    cur_month_income = sum(t.amount for t in all_txs if t.transaction_type == "income" and t.transaction_date.month == cur_m and t.transaction_date.year == cur_y)
    cur_month_expense = sum(t.amount for t in all_txs if t.transaction_type == "expense" and t.transaction_date.month == cur_m and t.transaction_date.year == cur_y)
    monthly_savings = max(cur_month_income - cur_month_expense, 0.0)
    savings_rate = round((monthly_savings / max(cur_month_income, 1.0)) * 100, 1) if cur_month_income > 0 else 0.0

    # Budget utilization for current month
    cur_budgets = [b for b in user_budgets if b.month == cur_m and b.year == cur_y]
    total_budget_limit = sum(b.monthly_limit for b in cur_budgets)
    if total_budget_limit > 0:
        budget_utilization = round((cur_month_expense / total_budget_limit) * 100, 1)
    else:
        budget_utilization = 0.0

    # Unusual transactions count
    unusual_count = sum(1 for t in all_txs if t.is_anomaly and t.transaction_type == "expense")

    # Recent 6 transactions
    recent = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.transaction_date.desc(), Transaction.id.desc()).limit(6).all()

    # Monthly trend (last 6 months)
    monthly_trend: List[MonthlyStat] = []
    for i in range(5, -1, -1):
        target_date = now - timedelta(days=i * 30)
        m = target_date.month
        y = target_date.year
        m_str = target_date.strftime("%b %Y")

        m_inc = sum(t.amount for t in all_txs if t.transaction_type == "income" and t.transaction_date.month == m and t.transaction_date.year == y)
        m_exp = sum(t.amount for t in all_txs if t.transaction_type == "expense" and t.transaction_date.month == m and t.transaction_date.year == y)
        m_sav = max(m_inc - m_exp, 0.0)
        m_rate = round((m_sav / max(m_inc, 1.0)) * 100, 1) if m_inc > 0 else 0.0

        monthly_trend.append(MonthlyStat(
            month=m_str,
            income=round(m_inc, 2),
            expense=round(m_exp, 2),
            savings=round(m_sav, 2),
            savings_rate=m_rate
        ))

    # Category breakdown (overall expenses)
    cat_expenses: Dict[int, float] = {}
    for t in all_txs:
        if t.transaction_type == "expense":
            cid = t.category_id or 0
            cat_expenses[cid] = cat_expenses.get(cid, 0.0) + t.amount

    category_breakdown: List[CategorySpending] = []
    for cid, amt in cat_expenses.items():
        cname = cat_map.get(cid, "Uncategorized")
        color = cat_color_map.get(cid, "#64748b")
        pct = round((amt / max(total_expenses, 1.0)) * 100, 1)
        category_breakdown.append(CategorySpending(
            category_id=cid,
            category_name=cname,
            color=color,
            amount=round(amt, 2),
            percentage=pct
        ))
    category_breakdown.sort(key=lambda x: x.amount, reverse=True)

    # Dynamic AI insights
    insights = insights_engine.generate_insights(all_txs, user_budgets, cat_map)

    return DashboardAnalytics(
        initial_balance=round(user_initial, 2),
        total_balance=round(total_balance, 2),
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        monthly_savings=round(monthly_savings, 2),
        savings_rate=savings_rate,
        budget_utilization=budget_utilization,
        unusual_transactions_count=unusual_count,
        recent_transactions=recent,
        monthly_trend=monthly_trend,
        category_breakdown=category_breakdown,
        ai_insights=insights
    )

@router.get("/reports")
def get_detailed_report(
    period: str = Query("monthly", pattern="^(daily|weekly|monthly|annual)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.transaction_date.asc()).all()
    categories = {c.id: c.name for c in db.query(Category).all()}

    # Group based on period
    grouped: Dict[str, Dict[str, float]] = {}
    for t in all_txs:
        if period == "daily":
            key = str(t.transaction_date)
        elif period == "weekly":
            # Week string: YYYY-Www
            key = f"{t.transaction_date.year}-W{t.transaction_date.isocalendar()[1]:02d}"
        elif period == "monthly":
            key = t.transaction_date.strftime("%Y-%m")
        else: # annual
            key = str(t.transaction_date.year)

        if key not in grouped:
            grouped[key] = {"income": 0.0, "expense": 0.0, "savings": 0.0}

        if t.transaction_type == "income":
            grouped[key]["income"] += t.amount
        else:
            grouped[key]["expense"] += t.amount

    report_items = []
    for k, v in sorted(grouped.items()):
        inc = v["income"]
        exp = v["expense"]
        sav = max(inc - exp, 0.0)
        report_items.append({
            "period": k,
            "income": round(inc, 2),
            "expense": round(exp, 2),
            "savings": round(sav, 2),
            "savings_rate": round((sav / max(inc, 1.0)) * 100, 1) if inc > 0 else 0.0
        })

    return {
        "period_type": period,
        "total_records": len(report_items),
        "data": report_items
    }

@router.get("/export/csv")
def export_transactions_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.transaction_date.desc()).all()
    categories = {c.id: c.name for c in db.query(Category).all()}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Title", "Amount", "Type", "Category", "Payment Method", "Description", "Unusual Transaction", "Anomaly Reason"])

    for t in txs:
        writer.writerow([
            t.id,
            str(t.transaction_date),
            t.title,
            t.amount,
            t.transaction_type,
            categories.get(t.category_id, "Other"),
            t.payment_method,
            t.description or "",
            "Yes" if t.is_anomaly else "No",
            t.anomaly_reason or ""
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=finance_ai_transactions_{date.today()}.csv"}
    )

@router.get("/export/pdf")
def export_financial_report_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    categories = {c.id: c.name for c in db.query(Category).all()}

    total_income = sum(t.amount for t in all_txs if t.transaction_type == "income")
    total_expenses = sum(t.amount for t in all_txs if t.transaction_type == "expense")
    net_savings = total_income - total_expenses

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Header
    p.setFillColor(colors.HexColor("#4f46e5"))
    p.rect(0, height - 80, width, 80, stroke=0, fill=1)

    p.setFillColor(colors.white)
    p.setFont("Helvetica-Bold", 20)
    p.drawString(40, height - 48, "FinanceAI - Financial Analytics Report")

    p.setFont("Helvetica", 10)
    p.drawString(40, height - 68, f"Generated for: {current_user.full_name} ({current_user.email}) | Date: {date.today()}")

    # Summary Card
    p.setFillColor(colors.HexColor("#1e293b"))
    p.setFont("Helvetica-Bold", 14)
    p.drawString(40, height - 120, "Executive Financial Summary")

    p.setFont("Helvetica", 11)
    p.drawString(40, height - 145, f"Total Income Processed:   INR {total_income:,.2f}")
    p.drawString(40, height - 165, f"Total Expenses Recorded:  INR {total_expenses:,.2f}")
    p.drawString(40, height - 185, f"Net Cumulative Balance:   INR {net_savings:,.2f}")
    savings_rate = (net_savings / max(total_income, 1.0)) * 100 if total_income > 0 else 0
    p.drawString(40, height - 205, f"Overall Savings Rate:     {savings_rate:.1f}%")

    # Table Header
    p.setFont("Helvetica-Bold", 12)
    p.drawString(40, height - 245, "Recent Financial Transactions")

    y = height - 270
    p.setFillColor(colors.HexColor("#f1f5f9"))
    p.rect(40, y - 5, width - 80, 20, stroke=0, fill=1)

    p.setFillColor(colors.HexColor("#0f172a"))
    p.setFont("Helvetica-Bold", 9)
    p.drawString(45, y, "Date")
    p.drawString(120, y, "Title")
    p.drawString(270, y, "Category")
    p.drawString(390, y, "Type")
    p.drawString(470, y, "Amount (INR)")

    p.setFont("Helvetica", 9)
    recent_txs = sorted(all_txs, key=lambda x: x.transaction_date, reverse=True)[:15]

    for t in recent_txs:
        y -= 20
        if y < 50:
            p.showPage()
            y = height - 50

        p.drawString(45, y, str(t.transaction_date))
        p.drawString(120, y, (t.title[:22] + "..") if len(t.title) > 22 else t.title)
        p.drawString(270, y, categories.get(t.category_id, "Other")[:18])
        p.drawString(390, y, t.transaction_type.capitalize())
        amt_str = f"INR {t.amount:,.2f}"
        p.drawString(470, y, amt_str)

    p.showPage()
    p.save()

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=financial_report_{date.today()}.pdf"}
    )
