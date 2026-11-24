"""
Evaluation script for Model 3: Isolation Forest & Z-Score Anomaly Detector.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.ml.anomaly_detector import anomaly_detector

def main():
    print("=" * 60)
    print("Evaluating Model 3: Financial Anomaly Detector")
    print("=" * 60)

    class MockTx:
        def __init__(self, amount, cat_id, tx_type="expense"):
            self.amount = amount
            self.category_id = cat_id
            self.transaction_type = tx_type

    history = [
        MockTx(350, 1), MockTx(420, 1), MockTx(510, 1), MockTx(380, 1),
        MockTx(450, 1), MockTx(600, 1), MockTx(390, 1), MockTx(480, 1)
    ]

    test_cases = [
        (450.0, "Regular lunch order"),
        (580.0, "Weekend dinner with friends"),
        (12500.0, "Luxury banquet party (Outlier)")
    ]

    print("Running Inference Test Cases on Food Category (Historical Average: ~₹450):")
    for amt, label in test_cases:
        res = anomaly_detector.evaluate_single_transaction(amt, 1, history, "Food")
        status_str = "FLAGGED UNUSUAL" if res["is_anomaly"] else "NORMAL"
        print(f"  • Amount: ₹{amt:,.0f} ({label})")
        print(f"    --> Status: [{status_str}] | Anomaly Score: {res['anomaly_score']}")
        if res["anomaly_reason"]:
            print(f"    --> Reason: {res['anomaly_reason']}")

if __name__ == "__main__":
    main()
