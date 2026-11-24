import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Personal Finance Management & Expense Prediction System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Secret Key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "finance-ai-super-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database URL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./finance.db"
    )
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # ML Models path
    ML_MODELS_DIR: str = os.getenv(
        "ML_MODELS_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../ml/saved_models"))
        if os.path.exists(os.path.abspath(os.path.join(os.path.dirname(__file__), "../ml/saved_models")))
        else os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/saved_models"))
    )

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="allow"
    )

settings = Settings()
