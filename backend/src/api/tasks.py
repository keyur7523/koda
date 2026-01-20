"""Task history API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from ..db.database import get_db
from ..db.models import User, TaskHistory
from .auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    task: str
    repo_url: Optional[str] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    pr_url: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    task: str
    repo_url: Optional[str]
    status: str
    pr_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[TaskResponse])
async def get_task_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's task history (last 20)."""
    tasks = (
        db.query(TaskHistory)
        .filter(TaskHistory.user_id == current_user.id)
        .order_by(TaskHistory.created_at.desc())
        .limit(20)
        .all()
    )
    return tasks


@router.post("/", response_model=dict)
async def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task record."""
    task_id = str(uuid.uuid4())
    
    task = TaskHistory(
        id=task_id,
        user_id=current_user.id,
        task=task_data.task,
        repo_url=task_data.repo_url,
        status="running",
    )
    
    db.add(task)
    db.commit()
    
    return {"id": task_id}


@router.patch("/{task_id}", response_model=dict)
async def update_task(
    task_id: str,
    update_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update task status and/or PR URL."""
    task = (
        db.query(TaskHistory)
        .filter(TaskHistory.id == task_id, TaskHistory.user_id == current_user.id)
        .first()
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if update_data.status:
        task.status = update_data.status
    if update_data.pr_url:
        task.pr_url = update_data.pr_url
    
    db.commit()
    
    return {"success": True}

