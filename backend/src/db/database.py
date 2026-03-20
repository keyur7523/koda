import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# Check for DATABASE_URL environment variable (for production PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Production: Use PostgreSQL
    # Render provides DATABASE_URL starting with "postgres://" but SQLAlchemy needs "postgresql://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    print(f"Using PostgreSQL database")
else:
    # Development: Use SQLite
    DB_PATH = Path.home() / ".koda" / "koda.db"
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Set secure permissions on the .koda directory (owner-only access)
    try:
        os.chmod(DB_PATH.parent, 0o700)  # rwx------
    except OSError:
        pass  # May fail on some systems, non-critical

    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    print(f"Using SQLite database at {DB_PATH}")

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
    """Initialize database tables and add any missing columns."""
    Base.metadata.create_all(bind=engine)
    _migrate_missing_columns()


def _migrate_missing_columns():
    """Add columns defined in models but missing from the database.

    This handles the case where new columns are added to models after
    the tables were already created (create_all only creates new tables,
    not new columns on existing tables).
    """
    inspector = inspect(engine)
    for table_name, table in Base.metadata.tables.items():
        if not inspector.has_table(table_name):
            continue
        existing = {col["name"] for col in inspector.get_columns(table_name)}
        for column in table.columns:
            if column.name not in existing:
                col_type = column.type.compile(engine.dialect)
                with engine.begin() as conn:
                    conn.execute(
                        text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}')
                    )
                print(f"Added missing column {table_name}.{column.name}")

