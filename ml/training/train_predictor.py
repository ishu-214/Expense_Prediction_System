"""
Standalone script to train, evaluate and benchmark Model 2: Expense Forecasting Regressor.
Compares Linear Regression vs. Random Forest Regressor using chronological split.
"""
import os
import sys
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.ml.expense_predictor import expense_predictor

def main():
    print("=" * 60)
    print("Training Model 2: Chronological Expense Predictor")
    print("=" * 60)

    metrics = expense_predictor.get_metrics()
    print("Benchmark Model Performance:")
    print(f"  • Selected Model: {metrics['model_selected']}")
    print(f"  • MAE (Mean Absolute Error):  ₹{metrics['mae']}")
    print(f"  • RMSE (Root Mean Sq Error):  ₹{metrics['rmse']}")
    print(f"  • MAPE:                       {metrics['mape']}%")
    print(f"  • R² Score:                   {metrics['r2_score']}")
    print(f"  • Artifact Path:              {expense_predictor.model_path}")

if __name__ == "__main__":
    main()
