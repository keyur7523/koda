from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: str

class UserCreate(UserBase):
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    tokens_used: int
    tokens_limit: int
    is_premium: bool
    has_anthropic_key: bool
    has_openai_key: bool
    has_github: bool  # Whether user has GitHub linked (can create PRs)
    created_at: datetime

    class Config:
        from_attributes = True

# Repo schemas
class RepoBase(BaseModel):
    repo_name: str
    repo_url: str

class RepoResponse(RepoBase):
    id: int
    default_branch: str
    last_synced: Optional[datetime] = None

    class Config:
        from_attributes = True

class ConnectRepoRequest(BaseModel):
    github_repo_id: str
    repo_name: str
    repo_url: str
    default_branch: Optional[str] = "main"

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[int] = None

# API Key schemas
class ApiKeyUpdate(BaseModel):
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

