from .state import AgentState, Phase
from ..llm import chat

class Agent:
    def __init__(self):
        self._state = AgentState(phase=Phase.IDLE)
    
    def run(self, task: str) -> None:
        self._state.phase = Phase.UNDERSTANDING
        self._state.task = task
        print(f"Understanding task: {task}")
        
        self._state.phase = Phase.PLANNING
        print("Generating plan...")
        
        prompt = f""" You are a coding assistant. The user wants you to: {task}
   
   Generate a step-by-step plan to accomplish this task.
   Return ONLY a numbered list of steps, nothing else.
   Keep it to 3-5 steps maximum."""
        
        response = chat(prompt)
        steps = [line.strip() for line in response.strip().split('\n') if line.strip()]
        self._state.plan = steps
        
        print("\nPlan:")
        for step in steps:
            print(f"  {step}")

        self._state.phase = Phase.COMPLETE
        print("Agent run complete.")
    
    def get_state(self) -> AgentState:
        return self._state