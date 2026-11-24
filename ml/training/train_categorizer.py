"""
Standalone script to train and evaluate Model 1: Automatic Expense Categorizer
Uses TF-IDF Vectorization with Logistic Regression and cross-validation.
"""
import os
import sys

# Ensure backend app is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.ml.categorizer import categorizer, SEED_DATA

def main():
    print("=" * 60)
    print("Training Model 1: Automatic Expense Categorizer")
    print("=" * 60)
    print(f"Dataset Size: {len(SEED_DATA)} labeled financial descriptions")
    
    metrics = categorizer.train()
    
    print("\nModel Evaluation Results:")
    print(f"  • Overall Accuracy: {metrics['accuracy'] * 100:.2f}%")
    print(f"  • Precision:        {metrics['precision'] * 100:.2f}%")
    print(f"  • Recall:           {metrics['recall'] * 100:.2f}%")
    print(f"  • Weighted F1:      {metrics['f1_score']:.4f}")
    print(f"  • Saved Model Path: {categorizer.model_path}")

    # Test sample inference
    test_queries = [
        "Swiggy lunch delivery biryani",
        "Uber cab fare to international airport",
        "Netflix monthly 4K subscription",
        "Monthly rent for apartment owner",
        "Airtel broadband WiFi fiber bill",
        "Apollo pharmacy antibiotics prescription",
        "Zerodha mutual fund equity SIP investment",
        "Employer monthly salary direct credit"
    ]

    print("\nSample Real-Time Categorization Inference:")
    for q in test_queries:
        pred = categorizer.predict(q)
        print(f"  Query: '{q}'")
        print(f"    --> Predicted: {pred['category']} (Confidence: {pred['confidence'] * 100:.1f}%)")
        alts = ", ".join([f"{a['category']} ({a['probability']*100:.0f}%)" for a in pred['alternatives'][:2]])
        print(f"    --> Alternatives: {alts}")

if __name__ == "__main__":
    main()
