from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional
import asyncio
from ..agent.orchestrator import Agent
from ..agent.state import Phase
from .streaming import StreamingCallback

router = APIRouter()

class TaskRequest(BaseModel):
    task: str
    repo_path: Optional[str] = "."

class ApprovalRequest(BaseModel):
    approved: bool

# Store agent state (in production, use proper session management)
_current_agent: Optional[Agent] = None

@router.post("/task")
async def run_task(request: TaskRequest):
    global _current_agent
    _current_agent = Agent(headless=True)  # API mode: no CLI prompts
    
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

@router.post("/approve")
async def approve_changes(request: ApprovalRequest):
    global _current_agent
    
    if not _current_agent or not _current_agent.change_manager:
        raise HTTPException(status_code=400, detail="No pending changes")
    
    if request.approved:
        result = _current_agent.change_manager.apply_all()
    else:
        result = _current_agent.change_manager.discard_all()
    
    return {"success": True, "message": result}

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.websocket("/ws/task")
async def websocket_task(websocket: WebSocket):
    await websocket.accept()
    
    try:
        # Receive task from client
        data = await websocket.receive_json()
        task = data.get("task", "")
        
        if not task:
            await websocket.send_json({"type": "error", "data": {"message": "No task provided"}})
            return
        
        # Create callback handler
        callback = StreamingCallback(websocket)
        
        # Create agent with callbacks
        agent = Agent(
            headless=True,
            callbacks={
                "phase_change": callback.on_phase_change,
                "tool_call": lambda d: callback.on_tool_call(d["name"], d["args"]),
                "tool_result": lambda d: callback.on_tool_result(d["name"], d["result"]),
                "summary": callback.on_summary,
                "plan": callback.on_plan,
            }
        )
        
        # Store for approval endpoint
        global _current_agent
        _current_agent = agent
        
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
        print("Client disconnected")
    except Exception as e:
        await websocket.send_json({"type": "error", "data": {"message": str(e)}})
