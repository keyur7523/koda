import os
import httpx
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext

from ..db.database import get_db
from ..db.models import User, UserSession
from ..db.schemas import UserResponse, Token

router = APIRouter(prefix="/auth", tags=["auth"])

# Config
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Helper functions
def create_access_token(user_id: int) -> str:
    """Create a JWT token for a user."""
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        "sub": str(user_id),
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[int]:
    """Verify a JWT token and return user_id."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
        return user_id
    except (JWTError, ValueError):
        return None

def get_current_user(
    token: str = None,
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

# GitHub OAuth routes
@router.get("/github")
async def github_login():
    """Redirect to GitHub OAuth."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&scope=user:email,repo"
    )
    return RedirectResponse(url=github_auth_url)

@router.get("/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    """Handle GitHub OAuth callback."""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_response.json()
    
    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data.get("error_description", "OAuth failed"))
    
    access_token = token_data.get("access_token")
    
    # Get user info from GitHub
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
        github_user = user_response.json()
    
    github_id = str(github_user["id"])
    username = github_user["login"]
    email = github_user.get("email")
    avatar_url = github_user.get("avatar_url")
    
    # Find or create user
    user = db.query(User).filter(User.github_id == github_id).first()
    
    if not user:
        # Check if username exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            username = f"{username}_{github_id[:6]}"
        
        user = User(
            github_id=github_id,
            username=username,
            email=email,
            avatar_url=avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user info
        user.avatar_url = avatar_url
        user.email = email or user.email
        user.last_login = datetime.utcnow()
        db.commit()
    
    # Create JWT token
    jwt_token = create_access_token(user.id)
    
    # Redirect to frontend with token
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={jwt_token}")

@router.get("/me", response_model=UserResponse)
async def get_me(db: Session = Depends(get_db), token: str = None):
    """Get current user info."""
    user = get_current_user(token, db)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        avatar_url=user.avatar_url,
        tokens_used=user.tokens_used,
        tokens_limit=user.tokens_limit,
        is_premium=user.is_premium,
        has_anthropic_key=bool(user.anthropic_api_key),
        has_openai_key=bool(user.openai_api_key),
        created_at=user.created_at,
    )

@router.post("/logout")
async def logout():
    """Logout user (client should delete token)."""
    return {"message": "Logged out successfully"}

