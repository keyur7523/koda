from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query, Depends
from pydantic import BaseModel
from typing import Optional
import asyncio
from ..agent.orchestrator import Agent
from ..agent.state import Phase
from .streaming import StreamingCallback
from .auth import verify_token, get_user_api_key, get_current_user
from ..db.database import SessionLocal, get_db
from ..db.models import User
from ..db.token_tracker import check_token_limit
from ..utils.repo_manager import get_repo_manager, RepoError
from ..utils.github_client import (
    create_pr_for_changes, 
    GitHubError, 
    GitHubAuthError, 
    GitHubRateLimitError,
    GitHubNotFoundError
)
from ..utils.encryption import decrypt
from ..tools.file_ops import set_working_dir
from sqlalchemy.orm import Session

router = APIRouter()


def get_user_from_token(token: str) -> Optional[User]:
    """Validate token and return user from database."""
    user_id = verify_token(token)
    if not user_id:
        return None
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        return user
    finally:
        db.close()

class TaskRequest(BaseModel):
    task: str
    repo_path: Optional[str] = "."

class ApprovalRequest(BaseModel):
    approved: bool
    repo_url: Optional[str] = None
    branch: Optional[str] = "main"
    task_description: Optional[str] = None

class ApprovalResponse(BaseModel):
    success: bool
    message: str
    pr_url: Optional[str] = None
    pr_number: Optional[int] = None

# Store agent state (in production, use proper session management)
_current_agent: Optional[Agent] = None
_current_repo_info: Optional[dict] = None  # Store repo info for PR creation

if False:
    # Disabled: REST task execution endpoint. Use WebSocket /api/ws/task instead.
    @router.post("/task")
    async def run_task(
        request: TaskRequest,
        user: User = Depends(get_current_user),
    ):
        global _current_agent
        # Require user API key for tasks
        user_api_key = get_user_api_key(user, provider="anthropic")
        if not user_api_key:
            raise HTTPException(
                status_code=400,
                detail="Please add your Anthropic API key in Settings to run tasks."
            )

        _current_agent = Agent(
            headless=True,  # API mode: no CLI prompts
            api_key=user_api_key,
            user_id=user.id,
            task_description=request.task,
            repo_path=request.repo_path,
        )
        
        # For now, run synchronously (we'll add streaming later)
        try:
            _current_agent.run(request.task)
            
            state = _current_agent.get_state()
            changes = []
            
            if _current_agent.change_manager:
                for change in _current_agent.change_manager.get_staged_changes():
                    changes.append({
                        "path": change.path,
                        "changeType": change.change_type.value,
                        "newContent": change.new_content,
                        "originalContent": change.original_content,
                    })
            
            return {
                "phase": state.phase.value,
                "task": state.task,
                "plan": state.plan or [],
                "error": state.error,
                "changes": changes,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/approve", response_model=ApprovalResponse)
async def approve_changes(
    request: ApprovalRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    global _current_agent, _current_repo_info
    
    if not _current_agent or not _current_agent.change_manager:
        raise HTTPException(status_code=400, detail="No pending changes")
    
    changes = _current_agent.change_manager.get_staged_changes()
    
    if not request.approved:
        # Reject: discard all changes
        result = _current_agent.change_manager.discard_all()
        return ApprovalResponse(success=True, message=result)
    
    # Approved: create PR if repo info available
    repo_url = request.repo_url or (_current_repo_info or {}).get("repo_url")
    branch = request.branch or (_current_repo_info or {}).get("branch", "main")
    task_desc = request.task_description or (_current_repo_info or {}).get("task", "Koda changes")
    
    if not repo_url:
        # No repo URL - just apply locally (CLI mode)
        result = _current_agent.change_manager.apply_all()
        return ApprovalResponse(success=True, message=result)
    
    # Check if user has GitHub token
    if not user.github_access_token:
        raise HTTPException(
            status_code=400,
            detail="GitHub token not available. Please re-authenticate with GitHub to create PRs."
        )
    
    try:
        # Decrypt GitHub token
        github_token = decrypt(user.github_access_token)
        
        # Parse repo URL to get owner/repo
        from ..utils.repo_manager import get_repo_manager
        repo_manager = get_repo_manager()
        owner, repo_name, _ = repo_manager.parse_github_url(repo_url)
        
        # Convert staged changes to the format expected by github_client
        changes_for_pr = []
        for change in changes:
            changes_for_pr.append({
                "path": change.path,
                "changeType": change.change_type.value,
                "newContent": change.new_content,
            })
        
        # Create PR
        pr_result = create_pr_for_changes(
            access_token=github_token,
            owner=owner,
            repo=repo_name,
            changes=changes_for_pr,
            task_description=task_desc,
            base_branch=branch,
        )
        
        # Discard local staged changes (they're now in the PR)
        _current_agent.change_manager.discard_all()
        
        return ApprovalResponse(
            success=True,
            message="PR created!",
            pr_url=pr_result.html_url,
            pr_number=pr_result.number,
        )
        
    except GitHubAuthError as e:
        # Auth errors: expired token or no permission
        raise HTTPException(status_code=401, detail=str(e))
    except GitHubRateLimitError as e:
        # Rate limit: use 429
        raise HTTPException(status_code=429, detail=str(e))
    except GitHubNotFoundError as e:
        # Not found
        raise HTTPException(status_code=404, detail=str(e))
    except GitHubError as e:
        # Other GitHub errors (validation, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating PR: {str(e)}")


@router.get("/changes/diff")
async def get_changes_diff(
    user: User = Depends(get_current_user)
):
    """Get unified diff of all staged changes."""
    global _current_agent
    
    if not _current_agent or not _current_agent.change_manager:
        raise HTTPException(status_code=400, detail="No pending changes")
    
    diff = _current_agent.change_manager.get_diff()
    return {"diff": diff}


@router.get("/changes/patch")
async def get_changes_patch(
    user: User = Depends(get_current_user)
):
    """
    Get a .patch file for all staged changes.
    Returns the diff as a downloadable file.
    """
    from fastapi.responses import PlainTextResponse
    
    global _current_agent
    
    if not _current_agent or not _current_agent.change_manager:
        raise HTTPException(status_code=400, detail="No pending changes")
    
    diff = _current_agent.change_manager.get_diff()
    
    # Return as downloadable patch file
    return PlainTextResponse(
        content=diff,
        media_type="text/x-patch",
        headers={
            "Content-Disposition": "attachment; filename=koda-changes.patch"
        }
    )


@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.websocket("/ws/task")
async def websocket_task(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    # Validate authentication before accepting connection
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return
    
    user = get_user_from_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return
    
    await websocket.accept()
    
    # Log authenticated connection
    print(f"WebSocket authenticated: user_id={user.id}, username={user.username}, has_api_key={bool(user.anthropic_api_key)}")
    
    try:
        # Receive task from client
        data = await websocket.receive_json()
        task = data.get("task", "")
        repo_url = data.get("repo_url")
        branch = data.get("branch", "main")
        
        if not task:
            await websocket.send_json({"type": "error", "data": {"message": "No task provided"}})
            return
        
        # Refresh user from DB to get latest token count
        db = SessionLocal()
        try:
            fresh_user = db.query(User).filter(User.id == user.id).first()
            if not fresh_user:
                await websocket.send_json({"type": "error", "data": {"message": "User not found"}})
                return
            user = fresh_user
        finally:
            db.close()
        
        # Get user's API key - REQUIRED
        user_api_key = get_user_api_key(user, provider="anthropic")

        # Require API key to run tasks
        if not user_api_key:
            # Check if user has a key saved but decryption failed
            if user.anthropic_api_key:
                # Key exists in DB but couldn't be decrypted
                print(f"User {user.id} has encrypted key but decryption returned None")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Your API key could not be loaded. Please remove and re-add your key in Settings.",
                        "code": "API_KEY_DECRYPT_FAILED"
                    }
                })
            else:
                # No key saved at all
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Please add your Anthropic API key in Settings to run tasks.",
                        "code": "API_KEY_REQUIRED"
                    }
                })
            return
        
        # Clone or update repository if repo_url provided
        repo_path = None
        if repo_url:
            try:
                await websocket.send_json({
                    "type": "phase",
                    "data": {"phase": "cloning"}
                })
                
                repo_manager = get_repo_manager()
                # Run clone in thread pool to not block
                loop = asyncio.get_event_loop()
                repo_path = await loop.run_in_executor(
                    None,
                    repo_manager.get_repo_path,
                    repo_url,
                    user.id,
                    branch
                )
                
                # Set working directory for file operations
                set_working_dir(repo_path)
                
                print(f"Repository ready: {repo_path}")
                
            except RepoError as e:
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": str(e),
                        "code": "REPO_CLONE_FAILED"
                    }
                })
                return
        
        # Create callback handler
        callback = StreamingCallback(websocket)
        
        # Create agent with callbacks
        # Pass user's API key if available, otherwise agent will use server's key
        agent = Agent(
            headless=True,
            api_key=user_api_key,  # User's key or None (falls back to server's key)
            user_id=user.id,  # For token tracking
            task_description=task,
            repo_path=str(repo_path) if repo_path else None,
            callbacks={
                "phase_change": callback.on_phase_change,
                "tool_call": lambda d: callback.on_tool_call(d["name"], d["args"]),
                "tool_result": lambda d: callback.on_tool_result(d["name"], d["result"]),
                "summary": callback.on_summary,
                "plan": callback.on_plan,
            }
        )
        
        # Store for approval endpoint (with user context)
        global _current_agent, _current_repo_info
        _current_agent = agent
        _current_repo_info = {
            "repo_url": repo_url,
            "branch": branch,
            "task": task,
            "user_id": user.id,
        }
        
        # Run in thread pool to not block
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, agent.run, task)
        
        # Send final state with changes
        changes = []
        if agent.change_manager:
            for change in agent.change_manager.get_staged_changes():
                changes.append({
                    "path": change.path,
                    "changeType": change.change_type.value,
                    "newContent": change.new_content,
                    "originalContent": change.original_content,
                })
        
        await websocket.send_json({
            "type": "complete",
            "data": {
                "phase": agent.get_state().phase.value,
                "changes": changes,
            }
        })
        
    except WebSocketDisconnect:
        print(f"Client disconnected (user: {user.username})")
    except Exception as e:
        await websocket.send_json({"type": "error", "data": {"message": str(e)}})
    finally:
        # Reset working directory
        set_working_dir(None)
