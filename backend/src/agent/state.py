from enum import Enum
from dataclasses import dataclass
from typing import Optional

class Phase(Enum):
    IDLE = "idle"
    UNDERSTANDING = "understanding"
    PLANNING = "planning"
    EXECUTING = "executing"
    VERIFYING = "verifying"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETE = "complete"
    ERROR = "error"

@dataclass
class AgentState:
    phase: Phase
    task: Optional[str] = None
    plan: Optional[list[str]] = None
    error: Optional[str] = None