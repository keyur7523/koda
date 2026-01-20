import os
import httpx
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import bcrypt

from ..db.database import get_db
from ..db.models import User, UserSession
from ..db.schemas import UserResponse, Token

router = APIRouter(prefix="/auth", tags=["auth"])

# Security scheme
security = HTTPBearer()

# Config
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# Password hashing helpers
def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())

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
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user from Authorization header."""
    token = credentials.credentials
    
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
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
            github_access_token=encrypt(access_token),  # Store encrypted GitHub token
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user info and GitHub token
        user.avatar_url = avatar_url
        user.email = email or user.email
        user.github_access_token = encrypt(access_token)  # Update encrypted GitHub token
        user.last_login = datetime.utcnow()
        db.commit()
    
    # Create JWT token
    jwt_token = create_access_token(user.id)
    
    # Redirect to frontend with token
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={jwt_token}")


# Google OAuth routes
@router.get("/google")
async def google_login():
    """Redirect to Google OAuth."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
    
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_response.json()
    
    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data.get("error_description", "Google OAuth failed"))
    
    access_token = token_data.get("access_token")
    
    # Get user info from Google
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
        google_user = user_response.json()
    
    google_id = str(google_user["id"])
    email = google_user.get("email")
    name = google_user.get("name", "")
    picture = google_user.get("picture")
    
    # Try to find existing user by Google ID
    user = db.query(User).filter(User.google_id == google_id).first()
    
    if not user and email:
        # Try to find by email (link accounts)
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link Google to existing account
            user.google_id = google_id
            if not user.avatar_url:
                user.avatar_url = picture
            db.commit()
    
    if not user:
        # Create new user
        # Generate username from email or name
        username = email.split("@")[0] if email else name.replace(" ", "").lower()
        
        # Check if username exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            username = f"{username}_{google_id[:6]}"
        
        user = User(
            google_id=google_id,
            username=username,
            email=email,
            avatar_url=picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user info
        user.avatar_url = picture or user.avatar_url
        user.email = email or user.email
        user.last_login = datetime.utcnow()
        db.commit()
    
    # Create JWT token
    jwt_token = create_access_token(user.id)
    
    # Redirect to frontend with token
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/auth/callback?token={jwt_token}")


@router.get("/github/link")
async def github_link_start(state: str = None):
    """
    Start GitHub OAuth flow to link GitHub to existing account.
    The 'state' parameter should contain the user's JWT token.
    """
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    # Include state (JWT token) in OAuth request to identify user on callback
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&scope=user:email,repo"
        f"&state={state or ''}"
    )
    return RedirectResponse(url=github_auth_url)


@router.get("/github/link/callback")
async def github_link_callback(
    code: str, 
    state: str = None,
    db: Session = Depends(get_db)
):
    """
    Handle GitHub OAuth callback for linking to existing account.
    The 'state' parameter contains the user's JWT token.
    """
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Verify the user's JWT token from state
    if not state:
        return RedirectResponse(
            url=f"{frontend_url}/settings?error=Missing+authentication+state"
        )
    
    user_id = verify_token(state)
    if not user_id:
        return RedirectResponse(
            url=f"{frontend_url}/settings?error=Invalid+or+expired+session"
        )
    
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(
            url=f"{frontend_url}/settings?error=User+not+found"
        )
    
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
        return RedirectResponse(
            url=f"{frontend_url}/settings?error={token_data.get('error_description', 'OAuth+failed')}"
        )
    
    access_token = token_data.get("access_token")
    
    # Get GitHub user info
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
    
    # Check if this GitHub account is already linked to another user
    existing_github_user = db.query(User).filter(
        User.github_id == github_id,
        User.id != user.id
    ).first()
    
    if existing_github_user:
        return RedirectResponse(
            url=f"{frontend_url}/settings?error=GitHub+account+already+linked+to+another+user"
        )
    
    # Import encrypt here to avoid circular imports at top
    from ..utils.encryption import encrypt
    
    # Link GitHub to user's account
    user.github_id = github_id
    user.github_access_token = encrypt(access_token)
    if not user.avatar_url:
        user.avatar_url = github_user.get("avatar_url")
    db.commit()
    
    # Redirect back to settings with success
    return RedirectResponse(
        url=f"{frontend_url}/settings?github_linked=true"
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user)
):
    """Get current user info."""
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
        has_github=bool(user.github_access_token),
        created_at=user.created_at,
    )

@router.post("/logout")
async def logout():
    """Logout user (client should delete token)."""
    return {"message": "Logged out successfully"}

from pydantic import BaseModel, EmailStr
from ..utils.encryption import encrypt, decrypt


# Email Auth schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: UserResponse


def _create_auth_response(user: User, db: Session) -> dict:
    """Helper to create auth response with token and user data."""
    token = create_access_token(user.id)
    return {
        "token": token,
        "user": UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            avatar_url=user.avatar_url,
            tokens_used=user.tokens_used,
            tokens_limit=user.tokens_limit,
            is_premium=user.is_premium,
            has_anthropic_key=bool(user.anthropic_api_key),
            has_openai_key=bool(user.openai_api_key),
            has_github=bool(user.github_access_token),
            created_at=user.created_at,
        )
    }


@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new user with email and password."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Derive username from email if not provided
    username = request.username
    if not username:
        username = request.email.split('@')[0]
    
    # Check if username exists
    existing_username = db.query(User).filter(User.username == username).first()
    if existing_username:
        # Add random suffix
        import random
        username = f"{username}_{random.randint(1000, 9999)}"
    
    # Hash password
    hashed_password = hash_password(request.password)
    
    # Create user
    user = User(
        email=request.email,
        username=username,
        hashed_password=hashed_password,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return _create_auth_response(user, db)


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login with email and password."""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user has a password (might be OAuth-only user)
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses social login. Please sign in with GitHub."
        )
    
    # Verify password
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return _create_auth_response(user, db)

class ApiKeyRequest(BaseModel):
    api_key: str

@router.post("/api-key")
async def save_api_key(
    request: ApiKeyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save user's Anthropic API key (encrypted at rest)."""
    # Encrypt the API key before storing
    user.anthropic_api_key = encrypt(request.api_key)
    db.commit()
    
    return {"success": True}


@router.delete("/api-key")
async def remove_api_key(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove user's API key."""
    user.anthropic_api_key = None
    user.openai_api_key = None
    db.commit()
    
    return {"success": True, "message": "API key removed"}


@router.delete("/account")
async def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete user account and all associated data."""
    user_id = user.id
    
    # Delete associated data
    from ..db.models import ConnectedRepo, UserSession, TokenUsage
    db.query(TokenUsage).filter(TokenUsage.user_id == user_id).delete()
    db.query(UserSession).filter(UserSession.user_id == user_id).delete()
    db.query(ConnectedRepo).filter(ConnectedRepo.user_id == user_id).delete()
    
    # Delete user
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": "Account deleted"}


def get_user_api_key(user: User, provider: str = "anthropic") -> Optional[str]:
    """
    Get decrypted API key for a user.
    
    SECURITY: Only call this when making actual API calls to LLM providers.
    Never log or return this value to the frontend.
    
    Args:
        user: The user object from database
        provider: "anthropic" or "openai"
        
    Returns:
        Decrypted API key or None if not set
    """
    if provider == "anthropic" and user.anthropic_api_key:
        return decrypt(user.anthropic_api_key)
    elif provider == "openai" and user.openai_api_key:
        return decrypt(user.openai_api_key)
    return None

