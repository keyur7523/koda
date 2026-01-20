from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)  # Null for OAuth users
    
    # OAuth fields
    github_id = Column(String, unique=True, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    # API key (encrypted)
    anthropic_api_key = Column(Text, nullable=True)
    openai_api_key = Column(Text, nullable=True)
    
    # GitHub OAuth token (encrypted) - for creating PRs
    github_access_token = Column(Text, nullable=True)
    
    # Token tracking
    tokens_used = Column(Integer, default=0)
    tokens_limit = Column(Integer, default=50000)  # Free tier: 50k tokens (one-time)
    is_premium = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    repos = relationship("ConnectedRepo", back_populates="user")
    sessions = relationship("UserSession", back_populates="user")
    task_history = relationship("TaskHistory", back_populates="user")

class ConnectedRepo(Base):
    __tablename__ = "connected_repos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    github_repo_id = Column(String, index=True)
    repo_name = Column(String)  # e.g., "owner/repo"
    repo_url = Column(String)
    default_branch = Column(String, default="main")
    
    # Local clone path on server
    local_path = Column(String, nullable=True)
    last_synced = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="repos")

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="sessions")

class TokenUsage(Base):
    __tablename__ = "token_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    tokens_used = Column(Integer)
    task_description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(String, primary_key=True)  # UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task = Column(Text, nullable=False)
    repo_url = Column(String, nullable=True)
    status = Column(String, default="running")  # running, complete, error
    pr_url = Column(String, nullable=True)  # if PR was created
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="task_history")

