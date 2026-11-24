import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    def __init__(self):
        self.metrics = {
            "model_name": "Isolation Forest & Robust Statistical Z-Score",
            "contamination_rate": 0.05,
            "status": "active"
        }

    def detect_anomalies(
        self,
        transactions: List[Any],
        categories_map: Dict[int, str]
    ) -> List[Dict[str, Any]]:
        """
        Evaluates a list of transactions against user spending history
        and flags unusual transactions with clear, non-alarmist explanations.
        """
        expenses = [t for t in transactions if t.transaction_type == "expense"]
        if len(expenses) < 5:
            # Insufficient baseline data for statistical or ML anomaly detection
            return []

        # Group spending by category to compute category averages and standard deviations
        category_stats: Dict[int, Dict[str, float]] = {}
        for cat_id in set(t.category_id for t in expenses if t.category_id is not None):
            cat_amounts = [t.amount for t in expenses if t.category_id == cat_id]
            if cat_amounts:
                category_stats[cat_id] = {
                    "mean": float(np.mean(cat_amounts)),
                    "std": float(np.std(cat_amounts)) if len(cat_amounts) > 1 else float(np.mean(cat_amounts) * 0.5),
                    "median": float(np.median(cat_amounts)),
                    "count": len(cat_amounts)
                }

        # Global stats across all expenses
        all_amounts = [t.amount for t in expenses]
        global_mean = float(np.mean(all_amounts))
        global_std = float(np.std(all_amounts)) if len(all_amounts) > 1 else global_mean * 0.5

        # Fit an Isolation Forest on amount and log-amount features
        X_iso = np.array([[a, np.log1p(a)] for a in all_amounts])
        iso_forest = IsolationForest(contamination=0.05, random_state=42)
        iso_preds = iso_forest.fit_predict(X_iso)  # -1 for anomaly, 1 for normal
        iso_scores = iso_forest.score_samples(X_iso)  # lower score means more anomalous

        anomalies = []
        for idx, t in enumerate(expenses):
            is_anomaly = False
            reasons = []
            anomaly_score = 0.0

            # 1. Isolation forest evaluation
            if iso_preds[idx] == -1:
                # Raw score is typically between -0.8 and 0.0, normalize to [0, 1]
                normalized_score = round(float(np.clip(-iso_scores[idx], 0.0, 1.0)), 2)
                anomaly_score = max(anomaly_score, normalized_score)

            # 2. Category-level statistical Z-score check
            cat_id = t.category_id
            cat_name = categories_map.get(cat_id, "General")
            if cat_id in category_stats:
                stat = category_stats[cat_id]
                mean_val = stat["mean"]
                if stat["count"] >= 3 and t.amount > (mean_val * 2.8) and t.amount > 1000:
                    is_anomaly = True
                    ratio = round(t.amount / max(mean_val, 1.0), 1)
                    reasons.append(f"Amount is {ratio}x higher than your average {cat_name} expense (₹{round(mean_val, 0):,})")
                    anomaly_score = max(anomaly_score, min(0.6 + (ratio * 0.08), 0.98))

            # 3. Global outlier check (e.g. 3.5 standard deviations above global mean)
            if t.amount > (global_mean + (3.5 * global_std)) and t.amount > 5000:
                is_anomaly = True
                reasons.append(f"Significantly exceeds your typical overall transaction amount (Mean: ₹{round(global_mean, 0):,})")
                anomaly_score = max(anomaly_score, 0.85)

            # Isolation Forest anomaly confirmation
            if iso_preds[idx] == -1 and not reasons and t.amount > global_mean * 2:
                is_anomaly = True
                reasons.append("Unusual spending pattern detected compared to historical clusters")

            if is_anomaly:
                anomalies.append({
                    "transaction_id": t.id,
                    "title": t.title,
                    "amount": t.amount,
                    "category_name": cat_name,
                    "date": str(t.transaction_date),
                    "anomaly_score": round(anomaly_score, 2),
                    "anomaly_reason": "; ".join(reasons)
                })

        return anomalies

    def evaluate_single_transaction(
        self,
        amount: float,
        category_id: Optional[int],
        user_expenses: List[Any],
        category_name: str = "General",
        transaction_type: str = "expense"
    ) -> Dict[str, Any]:
        """
        Real-time check when a single new transaction is created, updated, or imported.
        Supports anomaly detection for both unusually high expenses and unusually high income.
        """
        is_anomaly = False
        reasons = []
        score = 0.0

        tx_type = (transaction_type or "expense").lower()

        if tx_type == "income":
            incomes = [t.amount for t in user_expenses if getattr(t, "transaction_type", "expense") == "income"]
            if incomes:
                inc_median = float(np.median(incomes))
                if amount >= (inc_median * 3.0) and amount >= 5000:
                    is_anomaly = True
                    ratio = round(amount / max(inc_median, 1.0), 1)
                    reasons.append(f"Unusually high income (+₹{amount:,.0f}) is {ratio}x higher than typical credit (₹{round(inc_median, 0):,})")
                    score = min(0.65 + (ratio * 0.05), 0.95)
            # High absolute income spike check
            if amount >= 10000 and (not incomes or amount >= float(np.median(incomes)) * 2.0):
                is_anomaly = True
                if not reasons:
                    reasons.append(f"Substantial single credit of +₹{amount:,.0f} detected")
                score = max(score, 0.85)

        else:  # expense
            expenses = [t.amount for t in user_expenses if getattr(t, "transaction_type", "expense") == "expense"]
            cat_amounts = [t.amount for t in user_expenses if getattr(t, "category_id", None) == category_id and getattr(t, "transaction_type", "expense") == "expense"]

            # Category-level outlier check using robust median
            if cat_amounts:
                cat_median = float(np.median(cat_amounts))
                if amount >= (cat_median * 2.5) and amount >= 1000:
                    is_anomaly = True
                    ratio = round(amount / max(cat_median, 1.0), 1)
                    reasons.append(f"Amount is {ratio}x higher than your average {category_name} expense (₹{round(cat_median, 0):,})")
                    score = min(0.65 + (ratio * 0.05), 0.95)

            # Check against routine daily spending baseline (ignoring giant capital outliers)
            routine_expenses = [x for x in expenses if x <= 5000]
            if routine_expenses and amount >= float(np.median(routine_expenses)) * 3.0 and amount >= 3000:
                is_anomaly = True
                ratio = round(amount / max(float(np.median(routine_expenses)), 1.0), 1)
                if not reasons:
                    reasons.append(f"Expense of ₹{amount:,.0f} is {ratio}x higher than your routine daily spending (₹{round(float(np.median(routine_expenses)), 0):,})")
                score = max(score, 0.85)

            # Global expense outlier check using robust median
            if expenses and len(expenses) >= 3:
                exp_median = float(np.median(expenses))
                if amount >= (exp_median * 3.0) and amount >= 3000:
                    is_anomaly = True
                    ratio = round(amount / max(exp_median, 1.0), 1)
                    if not reasons:
                        reasons.append(f"Amount (₹{amount:,.0f}) is {ratio}x higher than your typical expense median (₹{round(exp_median, 0):,})")
                    score = max(score, 0.85)

            # Absolute high value single expense check
            if amount >= 12000:
                is_anomaly = True
                if not reasons:
                    reasons.append(f"High-value expenditure of ₹{amount:,.0f} significantly exceeds regular transaction amounts")
                score = max(score, 0.90)

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(score, 2) if is_anomaly else 0.0,
            "anomaly_reason": "; ".join(reasons) if reasons else None
        }

    def get_metrics(self) -> Dict[str, Any]:
        return self.metrics

# Global singleton
anomaly_detector = AnomalyDetector()
