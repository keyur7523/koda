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


@router.get("/github")
async def list_github_repos(user: User = Depends(get_current_user)):
    """List user's GitHub repositories using stored access token."""
    if not user.github_access_token:
        raise HTTPException(400, "GitHub account not linked. Connect GitHub in Settings first.")

    from ..utils.encryption import decrypt

    try:
        github_token = decrypt(user.github_access_token)
    except ValueError:
        raise HTTPException(400, "GitHub token could not be decrypted. Please re-link your GitHub account.")

    # Fetch repos from GitHub API (up to 100, sorted by recent push)
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user/repos",
            params={
                "sort": "pushed",
                "direction": "desc",
                "per_page": 100,
                "type": "owner",
            },
            headers={
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/json",
            },
        )

    if response.status_code == 401:
        raise HTTPException(401, "GitHub token expired. Please re-link your GitHub account in Settings.")
    if response.status_code != 200:
        raise HTTPException(502, f"GitHub API error: {response.status_code}")

    repos = response.json()
    return [
        {
            "id": repo["id"],
            "name": repo["full_name"],
            "url": repo["html_url"],
            "default_branch": repo["default_branch"],
            "private": repo["private"],
            "description": repo.get("description"),
            "updated_at": repo.get("pushed_at"),
        }
        for repo in repos
    ]


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

