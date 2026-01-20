import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# Database file location
DB_PATH = Path.home() / ".koda" / "koda.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Set secure permissions on the .koda directory (owner-only access)
# This protects the database containing encrypted API keys
try:
    os.chmod(DB_PATH.parent, 0o700)  # rwx------
except OSError:
    pass  # May fail on some systems, non-critical

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)

