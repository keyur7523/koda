import os
import httpx
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db.models import User, ConnectedRepo
from ..db.schemas import RepoResponse, ConnectRepoRequest
from .auth import get_current_user

router = APIRouter(prefix="/repos", tags=["repos"])


@router.get("/github", response_model=List[dict])
async def list_github_repos(user: User = Depends(get_current_user)):
    """List user's GitHub repositories."""
    # You'll need to store GitHub access token - for now, re-auth
    # This is a simplification; production would store encrypted token
    raise HTTPException(501, "GitHub token refresh not implemented yet")


@router.get("/", response_model=List[RepoResponse])
async def list_connected_repos(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's connected repositories."""
    repos = db.query(ConnectedRepo).filter(ConnectedRepo.user_id == user.id).all()
    return repos


@router.post("/connect", response_model=RepoResponse)
async def connect_repo(
    request: ConnectRepoRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect a GitHub repository."""
    # Check if already connected
    existing = db.query(ConnectedRepo).filter(
        ConnectedRepo.user_id == user.id,
        ConnectedRepo.repo_name == request.repo_name
    ).first()
    
    if existing:
        raise HTTPException(400, "Repository already connected")
    
    repo = ConnectedRepo(
        user_id=user.id,
        github_repo_id=request.github_repo_id,
        repo_name=request.repo_name,
        repo_url=request.repo_url,
        default_branch=request.default_branch or "main",
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    
    return repo


@router.delete("/{repo_id}")
async def disconnect_repo(
    repo_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect a repository."""
    repo = db.query(ConnectedRepo).filter(
        ConnectedRepo.id == repo_id,
        ConnectedRepo.user_id == user.id
    ).first()
    
    if not repo:
        raise HTTPException(404, "Repository not found")
    
    db.delete(repo)
    db.commit()
    
    return {"message": "Repository disconnected"}

