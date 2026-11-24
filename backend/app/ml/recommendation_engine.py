from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

class RecommendationEngine:
    def __init__(self):
        pass

    def generate_recommendations(
        self,
        transactions: List[Any],
        budgets: List[Any],
        categories_map: Dict[int, str]
    ) -> List[Dict[str, Any]]:
        """
        Generates personalized, non-generic saving recommendations
        derived directly from user's transaction patterns and budgets.
        """
        expenses = [t for t in transactions if t.transaction_type == "expense"]
        incomes = [t for t in transactions if t.transaction_type == "income"]

        if not expenses:
            return [
                {
                    "recommendation_title": "Start Tracking Your Expenses",
                    "description": "Log your daily transactions or upload your bank CSV to unlock AI financial recommendations and budget optimizations.",
                    "estimated_savings": 0.0,
                    "priority": "low",
                    "status": "active",
                    "supporting_data": "Initial onboarding baseline"
                }
            ]

        recommendations = []
        now = datetime.now()
        current_month = now.month
        current_year = now.year

        # Convert expenses to pandas dataframe for pattern mining
        records = []
        for t in expenses:
            records.append({
                "id": t.id,
                "title": (t.title or "").strip().lower(),
                "amount": float(t.amount),
                "category_id": t.category_id,
                "category_name": categories_map.get(t.category_id, "Other"),
                "date": pd.to_datetime(t.transaction_date),
                "month": pd.to_datetime(t.transaction_date).month,
                "year": pd.to_datetime(t.transaction_date).year
            })
        df = pd.DataFrame(records)

        # -------------------------------------------------------------
        # 1. Budget Utilization Analysis: Over-budget categories
        # -------------------------------------------------------------
        for b in budgets:
            cat_name = categories_map.get(b.category_id, "Budget Category")
            spent_in_cat = df[(df["category_id"] == b.category_id) & (df["month"] == b.month) & (df["year"] == b.year)]["amount"].sum()
            
            if spent_in_cat > b.monthly_limit:
                excess = spent_in_cat - b.monthly_limit
                pct_over = round(((spent_in_cat - b.monthly_limit) / b.monthly_limit) * 100, 1)
                recommendations.append({
                    "recommendation_title": f"Reduce Excess Spending in {cat_name}",
                    "description": f"You have exceeded your {cat_name} monthly budget by ₹{round(excess, 0):,} ({pct_over}% over budget). Capping discretionary items in this category for the remainder of the month will safeguard your savings.",
                    "estimated_savings": round(excess, 2),
                    "priority": "high",
                    "status": "active",
                    "supporting_data": f"Monthly limit: ₹{b.monthly_limit:,.0f} | Actual spent: ₹{spent_in_cat:,.0f}"
                })
            elif spent_in_cat > (b.monthly_limit * 0.85):
                margin = b.monthly_limit - spent_in_cat
                recommendations.append({
                    "recommendation_title": f"{cat_name} Budget Approaching Limit",
                    "description": f"You have utilized {round((spent_in_cat/b.monthly_limit)*100, 1)}% of your {cat_name} budget. Only ₹{round(margin, 0):,} remains.",
                    "estimated_savings": round(b.monthly_limit * 0.15, 2),
                    "priority": "medium",
                    "status": "active",
                    "supporting_data": f"Monthly limit: ₹{b.monthly_limit:,.0f} | Spent: ₹{spent_in_cat:,.0f}"
                })

        # -------------------------------------------------------------
        # 2. Month-over-Month Category Creep (e.g., Food or Shopping spiked > 20%)
        # -------------------------------------------------------------
        prev_month = 12 if current_month == 1 else current_month - 1
        prev_year = current_year - 1 if current_month == 1 else current_year

        current_month_df = df[(df["month"] == current_month) & (df["year"] == current_year)]
        prev_month_df = df[(df["month"] == prev_month) & (df["year"] == prev_year)]

        if not prev_month_df.empty and not current_month_df.empty:
            for cat_id, cat_name in categories_map.items():
                cur_sum = current_month_df[current_month_df["category_id"] == cat_id]["amount"].sum()
                prev_sum = prev_month_df[prev_month_df["category_id"] == cat_id]["amount"].sum()

                if prev_sum > 1000 and cur_sum > (prev_sum * 1.20):
                    spike_pct = round(((cur_sum - prev_sum) / prev_sum) * 100, 1)
                    diff = cur_sum - prev_sum
                    # Discretionary categories
                    priority = "high" if cat_name in ["Food", "Shopping", "Entertainment", "Travel"] else "medium"
                    recommendations.append({
                        "recommendation_title": f"Manage Sharp Surge in {cat_name} Expenses",
                        "description": f"Your {cat_name} spending grew by {spike_pct}% (an additional ₹{round(diff, 0):,}) compared to last month. Returning closer to your previous baseline could yield substantial monthly savings.",
                        "estimated_savings": round(diff * 0.7, 2),
                        "priority": priority,
                        "status": "active",
                        "supporting_data": f"Previous month: ₹{prev_sum:,.0f} | Current month: ₹{cur_sum:,.0f}"
                    })

        # -------------------------------------------------------------
        # 3. Recurring Subscriptions & Fixed Discretionary Charges
        # -------------------------------------------------------------
        subscription_keywords = ["netflix", "spotify", "prime", "hotstar", "youtube", "gym", "membership", "disney", "apple", "cloud"]
        recurring_charges = []
        for title, group in df.groupby("title"):
            is_sub = any(k in title for k in subscription_keywords)
            if is_sub or len(group) >= 2:
                # Check if amounts are virtually identical (within 5%)
                amt_std = group["amount"].std()
                if len(group) >= 2 and (pd.isna(amt_std) or amt_std < 100):
                    avg_amt = group["amount"].mean()
                    recurring_charges.append((title.title(), avg_amt, len(group)))

        if recurring_charges:
            total_sub_monthly = sum(r[1] for r in recurring_charges)
            sub_names = ", ".join([r[0] for r in recurring_charges[:3]])
            recommendations.append({
                "recommendation_title": "Audit Recurring Subscriptions & Memberships",
                "description": f"Detected {len(recurring_charges)} repeating payments including {sub_names}, totaling ~₹{round(total_sub_monthly, 0):,}/month. Auditing or consolidating unused services can save up to ₹{round(total_sub_monthly * 12 * 0.35, 0):,} annually.",
                "estimated_savings": round(total_sub_monthly * 0.35, 2),
                "priority": "medium",
                "status": "active",
                "supporting_data": f"Identified {len(recurring_charges)} recurring billing items"
            })

        # -------------------------------------------------------------
        # 4. Savings Rate Optimization (< 20% vs Strong Savings >= 20%)
        # -------------------------------------------------------------
        total_income_val = sum(t.amount for t in incomes)
        total_expense_val = sum(t.amount for t in expenses)
        if total_income_val > 0:
            savings_val = max(total_income_val - total_expense_val, 0)
            savings_rate = (savings_val / total_income_val) * 100

            if savings_rate < 20.0:
                target_savings = total_income_val * 0.20
                deficit = target_savings - savings_val
                recommendations.append({
                    "recommendation_title": "Elevate Monthly Savings Toward 20% Benchmark",
                    "description": f"Your current savings rate is {round(savings_rate, 1)}%, below the recommended 20% personal finance benchmark. Trimming discretionary dining and impulsive shopping by ₹{round(deficit, 0):,} will get your finances on a resilient track.",
                    "estimated_savings": round(deficit, 2),
                    "priority": "high",
                    "status": "active",
                    "supporting_data": f"Income: ₹{total_income_val:,.0f} | Current Savings: ₹{savings_val:,.0f} ({savings_rate:.1f}%)"
                })
            else:
                target_savings = round(total_income_val * 0.20, 2)
                recommendations.append({
                    "recommendation_title": "Automate 20% Wealth & Emergency Allocation",
                    "description": f"Great job maintaining a {round(savings_rate, 1)}% savings rate! To protect these gains, set up an automatic transfer of ₹{round(target_savings, 0):,} (20% rule) into a high-yield emergency reserve or index SIP right when income arrives.",
                    "estimated_savings": target_savings,
                    "priority": "medium",
                    "status": "active",
                    "supporting_data": f"Monthly income: ₹{total_income_val:,.0f} | Net saved: ₹{savings_val:,.0f}"
                })
        else:
            recommendations.append({
                "recommendation_title": "Record Monthly Salary or Regular Incomes",
                "description": "Log your incoming cash flow to activate automated 50/30/20 savings benchmarking, debt-to-income checks, and AI forecasting.",
                "estimated_savings": 0.0,
                "priority": "medium",
                "status": "active",
                "supporting_data": "No income records detected for current cycle"
            })

        # -------------------------------------------------------------
        # 5. Food & Dining Out Optimization
        # -------------------------------------------------------------
        food_cat_id = None
        for cid, name in categories_map.items():
            if name.lower() == "food":
                food_cat_id = cid
                break

        if food_cat_id:
            food_total = df[df["category_id"] == food_cat_id]["amount"].sum()
            if food_total > 0 and (food_total >= 3000 or (food_total / max(total_expense_val, 1.0)) >= 0.25):
                potential_cook_save = food_total * 0.20
                recommendations.append({
                    "recommendation_title": "Optimize Food Delivery & Dining Out Frequency",
                    "description": f"Food expenditures stand at ₹{round(food_total, 0):,}. Preparing home-cooked meals twice more per week can conserve an estimated 20% of your dining budget.",
                    "estimated_savings": round(potential_cook_save, 2),
                    "priority": "medium",
                    "status": "active",
                    "supporting_data": f"Total Food expenditure: ₹{food_total:,.0f}"
                })

        # -------------------------------------------------------------
        # 6. Discretionary Shopping & 48-Hour Pause Rule
        # -------------------------------------------------------------
        disc_cat_ids = [cid for cid, name in categories_map.items() if name.lower() in ["shopping", "entertainment", "travel"]]
        if disc_cat_ids:
            disc_total = df[df["category_id"].isin(disc_cat_ids)]["amount"].sum()
            if disc_total > 500:
                disc_save = round(disc_total * 0.25, 2)
                recommendations.append({
                    "recommendation_title": "Apply 48-Hour Pause on Discretionary Shopping",
                    "description": f"Detected ₹{round(disc_total, 0):,} in non-essential shopping and entertainment. Delaying impulsive purchases by 48 hours curbs emotional buying and saves an estimated 25%.",
                    "estimated_savings": disc_save,
                    "priority": "medium",
                    "status": "active",
                    "supporting_data": f"Discretionary purchases: ₹{disc_total:,.0f}"
                })

        # -------------------------------------------------------------
        # 7. Uncovered Categories (Categories with spending but NO budget)
        # -------------------------------------------------------------
        budgeted_cat_ids = set(b.category_id for b in budgets)
        unbudgeted_with_spend = []
        for cid, group in df.groupby("category_id"):
            if cid not in budgeted_cat_ids:
                cname = categories_map.get(cid, "Other")
                tot = group["amount"].sum()
                unbudgeted_with_spend.append((cname, tot, cid))

        if unbudgeted_with_spend:
            unbudgeted_with_spend.sort(key=lambda x: x[1], reverse=True)
            top_unbudgeted = unbudgeted_with_spend[:3]
            names_str = ", ".join([f"{u[0]} (₹{round(u[1], 0):,})" for u in top_unbudgeted])
            potential_guard_save = round(sum(u[1] for u in top_unbudgeted) * 0.15, 2)
            recommendations.append({
                "recommendation_title": f"Establish Budget Caps for Unprotected Categories",
                "description": f"You currently have active expenditures without budget limits in {names_str}. Setting monthly thresholds for these categories ensures complete financial guardrails and saves an estimated 15%.",
                "estimated_savings": max(potential_guard_save, 300.0),
                "priority": "high",
                "status": "active",
                "supporting_data": f"Uncapped categories: {len(unbudgeted_with_spend)}"
            })

        # -------------------------------------------------------------
        # 8. Dedicated Healthcare & Medical Contingency Fund
        # -------------------------------------------------------------
        health_cat_ids = [cid for cid, name in categories_map.items() if "health" in name.lower() or "medical" in name.lower()]
        if health_cat_ids:
            health_spent = df[df["category_id"].isin(health_cat_ids)]["amount"].sum()
            if health_spent > 0:
                recommendations.append({
                    "recommendation_title": "Establish a Dedicated Medical Contingency Buffer",
                    "description": f"Medical and pharmacy expenditures stand at ₹{round(health_spent, 0):,}. Medical costs are inherently unpredictable; ring-fencing a dedicated health reserve prevents unexpected clinic visits from derailing your monthly savings.",
                    "estimated_savings": round(min(health_spent * 0.5, 500.0), 2),
                    "priority": "medium",
                    "status": "active",
                    "supporting_data": f"Total healthcare spend: ₹{health_spent:,.0f}"
                })

        # -------------------------------------------------------------
        # 9. Transportation & Commute Efficiency
        # -------------------------------------------------------------
        trans_cat_ids = [cid for cid, name in categories_map.items() if "transport" in name.lower() or "travel" in name.lower()]
        if trans_cat_ids:
            trans_spent = df[df["category_id"].isin(trans_cat_ids)]["amount"].sum()
            if trans_spent >= 300:
                recommendations.append({
                    "recommendation_title": "Consolidate Commuting & Transit Overhead",
                    "description": f"Transportation spending stands at ₹{round(trans_spent, 0):,}. Utilizing monthly transit passes, carpooling, or route planning can reduce monthly commuting expenses by up to 20%.",
                    "estimated_savings": round(trans_spent * 0.20, 2),
                    "priority": "low",
                    "status": "active",
                    "supporting_data": f"Transit expenses: ₹{trans_spent:,.0f}"
                })

        # -------------------------------------------------------------
        # 10. 3-Month Emergency Living Expense Cushion Target
        # -------------------------------------------------------------
        if total_expense_val > 0:
            target_emergency = round(total_expense_val * 3, 0)
            recommendations.append({
                "recommendation_title": f"Target a 3-Month Emergency Safety Cushion (₹{target_emergency:,.0f})",
                "description": f"Based on your current monthly living expenses of ~₹{round(total_expense_val, 0):,}, your recommended 3-month survival fund is ₹{target_emergency:,.0f}. Funneling your monthly surplus into this cushion guarantees financial resilience against unexpected events.",
                "estimated_savings": round(min(total_expense_val * 0.25, 1000.0), 2),
                "priority": "medium",
                "status": "active",
                "supporting_data": f"Monthly expense baseline: ₹{total_expense_val:,.0f}"
            })

        # Sort recommendations by priority (high first, then medium, then low)
        priority_order = {"high": 1, "medium": 2, "low": 3}
        recommendations.sort(key=lambda r: priority_order.get(r["priority"], 2))

        return recommendations[:6]

# Global singleton
recommendation_engine = RecommendationEngine()
