from datetime import datetime
from typing import List, Dict, Any
import pandas as pd
import numpy as np

class InsightsEngine:
    def generate_insights(
        self,
        transactions: List[Any],
        budgets: List[Any],
        categories_map: Dict[int, str]
    ) -> List[str]:
        expenses = [t for t in transactions if t.transaction_type == "expense"]
        incomes = [t for t in transactions if t.transaction_type == "income"]

        if not expenses and not incomes:
            return [
                "Welcome to FinanceAI! Add your first transactions or upload a CSV bank statement to generate intelligent financial insights.",
                "Set monthly budgets across categories to keep your spending disciplined.",
                "Create savings goals to monitor your target milestones with automatic progress tracking."
            ]

        insights = []
        now = datetime.now()
        current_month = now.month
        current_year = now.year

        total_income = sum(t.amount for t in incomes)
        total_expense = sum(t.amount for t in expenses)

        # 1. Savings rate insight
        if total_income > 0:
            savings = max(total_income - total_expense, 0)
            rate = round((savings / total_income) * 100, 1)
            if rate >= 30:
                insights.append(f"Outstanding financial discipline: Your savings rate is currently {rate}%, well above the standard 20% benchmark.")
            elif rate >= 15:
                insights.append(f"Healthy savings trajectory: You are currently saving {rate}% of your total recorded income.")
            else:
                insights.append(f"Savings alert: Your savings rate is {rate}%. Consider curtailing non-essential discretionary expenses to build a 20% safety cushion.")

        # 2. Category proportion insight
        records = []
        for t in expenses:
            records.append({
                "amount": float(t.amount),
                "category_id": t.category_id,
                "category_name": categories_map.get(t.category_id, "Other"),
                "date": pd.to_datetime(t.transaction_date),
                "month": pd.to_datetime(t.transaction_date).month,
                "year": pd.to_datetime(t.transaction_date).year
            })
        
        if records:
            df = pd.DataFrame(records)
            cat_sum = df.groupby("category_name")["amount"].sum().sort_values(ascending=False)
            if not cat_sum.empty:
                top_cat = cat_sum.index[0]
                top_amt = cat_sum.iloc[0]
                pct = round((top_amt / max(total_expense, 1)) * 100, 1)
                insights.append(f"Major cost driver: {top_cat} constitutes your largest expense share at {pct}% (₹{round(top_amt, 0):,}).")

            # 3. Month-over-month trend comparison
            cur_month_df = df[(df["month"] == current_month) & (df["year"] == current_year)]
            prev_m = 12 if current_month == 1 else current_month - 1
            prev_y = current_year - 1 if current_month == 1 else current_year
            prev_month_df = df[(df["month"] == prev_m) & (df["year"] == prev_y)]

            if not cur_month_df.empty and not prev_month_df.empty:
                cur_total = cur_month_df["amount"].sum()
                prev_total = prev_month_df["amount"].sum()
                if prev_total > 0:
                    diff_pct = round(((cur_total - prev_total) / prev_total) * 100, 1)
                    if diff_pct > 10:
                        insights.append(f"Spending acceleration: Current month spending is running {diff_pct}% higher than the corresponding period last month.")
                    elif diff_pct < -10:
                        insights.append(f"Positive cost reduction: Current month expenditures are down {abs(diff_pct)}% compared to last month.")

        # 4. Budget health check
        over_budget_cats = []
        approaching_cats = []
        for b in budgets:
            cname = categories_map.get(b.category_id, "Category")
            cat_exp = sum(t.amount for t in expenses if t.category_id == b.category_id and t.transaction_date.month == b.month and t.transaction_date.year == b.year)
            if cat_exp > b.monthly_limit:
                over_budget_cats.append(cname)
            elif cat_exp >= (b.monthly_limit * 0.85):
                approaching_cats.append(cname)

        if over_budget_cats:
            insights.append(f"Budget overspend: Budgets for {', '.join(over_budget_cats)} have exceeded their allocated monthly thresholds.")
        elif approaching_cats:
            insights.append(f"Budget notification: {', '.join(approaching_cats)} spending is within 15% of its monthly limit.")

        # 5. Anomaly insight
        anomalies_count = sum(1 for t in expenses if getattr(t, "is_anomaly", False))
        if anomalies_count > 0:
            insights.append(f"Audit flag: {anomalies_count} unusual transaction{'s have' if anomalies_count > 1 else ' has'} been flagged for review based on deviation from historical baselines.")

        return insights[:5]

# Global singleton
insights_engine = InsightsEngine()
