import json
from typing import Any
from .state import AgentState, Phase
from .change_manager import ChangeManager
from ..llm import chat, chat_with_tools
from .tool_executor import execute_tool
from ..tools.registry import get_tool_schemas
from ..tools.file_ops import set_change_manager
from ..cli.theme import console, spinner, print_summary
from ..cli.diff_display import display_staged_changes
from ..db.token_tracker import TokenTracker, TokenLimitExceeded
from ..utils.repo_cache import get_cached_summary, save_summary


class Agent:
    def __init__(
        self,
        headless: bool = False,
        callbacks: dict | None = None,
        api_key: str | None = None,
        user_id: int | None = None,
        task_description: str = "",
        repo_path: str | None = None
    ):
        self._state = AgentState(phase=Phase.IDLE)
        self._change_manager: ChangeManager | None = None
        self._headless = headless
        self._callbacks = callbacks or {}
        self._api_key = api_key  # User's API key (None = use server's key)
        self._user_id = user_id  # For token tracking
        self._task_description = task_description
        self._repo_path = repo_path  # Path to cloned repository
        
        # Set up token tracking for free tier users (no API key)
        self._token_tracker: TokenTracker | None = None
        self._on_usage = None
        if user_id and not api_key:  # Free tier user
            self._token_tracker = TokenTracker(user_id)
            self._on_usage = lambda input_t, output_t: self._token_tracker.record_usage(
                input_t, output_t, self._task_description
            )

    @property
    def change_manager(self) -> ChangeManager | None:
        return self._change_manager

    def _emit(self, event: str, data: Any):
        """Emit an event to registered callbacks."""
        if event in self._callbacks:
            self._callbacks[event](data)

    def _execute_with_tools(self, prompt: str, readonly: bool = False, show_tools: bool = True, phase: str = "executing") -> str:
        """Execute a prompt with tool support, handling tool calls in a loop.
        
        Args:
            prompt: The prompt to send to Claude
            readonly: If True, only allow read-only tools (no write_file)
            show_tools: If True, print tool execution details
            phase: Phase hint for model selection ("understanding", "planning", "executing")
        """
        messages = [{"role": "user", "content": prompt}]
        tools = get_tool_schemas(readonly=readonly)
        
        # In headless mode, never show tools
        if self._headless:
            show_tools = False
        
        while True:
            response = chat_with_tools(messages, tools, api_key=self._api_key, on_usage=self._on_usage, phase=phase)
            
            if response.stop_reason == "end_turn":
                # Extract final text response
                for block in response.content:
                    if hasattr(block, 'text'):
                        return block.text
                return ""
            
            elif response.stop_reason == "tool_use":
                # Add assistant's response to messages
                messages.append({"role": "assistant", "content": response.content})
                
                # Process each tool call
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        tool_name = block.name
                        tool_args = block.input
                        
                        # Emit tool_call event
                        self._emit("tool_call", {"name": tool_name, "args": tool_args})
                        
                        if show_tools:
                            args_str = str(tool_args)
                            if len(args_str) > 60:
                                args_str = args_str[:60] + "..."
                            console.print(f"  [tool]→[/tool] [muted]{tool_name}[/muted]([path]{args_str}[/path])")
                        
                        result = execute_tool(tool_name, tool_args)
                        
                        # Emit tool_result event
                        self._emit("tool_result", {"name": tool_name, "result": result})
                        
                        if show_tools:
                            result_preview = result[:80] + "..." if len(result) > 80 else result
                            result_preview = result_preview.replace("\n", " ")
                            console.print(f"  [success]←[/success] [muted]{result_preview}[/muted]")
                        
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result
                        })
                
                # Add tool results to messages
                messages.append({"role": "user", "content": tool_results})
            
            else:
                # Unexpected stop reason
                return f"Unexpected stop reason: {response.stop_reason}"
    
    def run(self, task: str) -> None:
        # Create change manager for staging file writes
        self._change_manager = ChangeManager()
        
        try:
            self._run_task(task)
        except TokenLimitExceeded as e:
            # Token limit exceeded during execution
            self._state.phase = Phase.ERROR
            self._state.error = str(e)
            self._emit("phase_change", self._state.phase.value)
            self._emit("error", str(e))
            if not self._headless:
                console.print(f"\n[error]✗ {str(e)}[/error]")
            # Disable change staging
            set_change_manager(None)
            return
    
    def _run_task(self, task: str) -> None:
        """Internal method that runs the task (can raise TokenLimitExceeded)."""
        # === UNDERSTANDING PHASE ===
        self._state.phase = Phase.UNDERSTANDING
        self._state.task = task
        self._emit("phase_change", self._state.phase.value)
        
        if not self._headless:
            console.print(f"\n[heading]Understanding task:[/heading] {task}\n")
        
        # Check for cached summary (token optimization)
        cached_summary = None
        if self._repo_path:
            cached_summary = get_cached_summary(self._repo_path)
        
        if cached_summary:
            summary = cached_summary
            if not self._headless:
                console.print("[muted]Using cached codebase summary[/muted]")
                console.print(f"\n[heading]Codebase Summary:[/heading]")
                console.print(f"[muted]{summary}[/muted]\n")
            self._emit("cache_hit", True)
        else:
            understanding_prompt = f"""The user wants to: {task}

Explore the codebase to understand its structure.
Use list_directory and read_file to understand what exists.
Do NOT create or modify any files - just observe.
Then summarize what you found."""
            
            # Use Haiku for understanding phase (cheaper, faster)
            if self._headless:
                summary = self._execute_with_tools(understanding_prompt, readonly=True, show_tools=False, phase="understanding")
            else:
                with spinner("Exploring codebase..."):
                    summary = self._execute_with_tools(understanding_prompt, readonly=True, show_tools=False, phase="understanding")
                console.print(f"\n[heading]Codebase Summary:[/heading]")
                console.print(f"[muted]{summary}[/muted]\n")
            
            # Cache the summary for future tasks
            if self._repo_path:
                save_summary(self._repo_path, summary)
        
        # Emit summary event
        self._emit("summary", summary)
        
        # === PLANNING PHASE ===
        self._state.phase = Phase.PLANNING
        self._emit("phase_change", self._state.phase.value)
        
        planning_prompt = f"""Based on what you learned about the codebase, create a plan to: {task}

Return your plan as a JSON array of steps. Each step should be an object with:
- "description": what to do
- "tool": which tool to use (read_file, write_file, list_directory, or null if no tool needed)

Example:
[
  {{"description": "Create hello.txt with greeting", "tool": "write_file"}},
  {{"description": "Verify file was created", "tool": "read_file"}}
]

Return ONLY valid JSON, no markdown, no explanation."""
        
        # Use Sonnet for planning (smarter model)
        if self._headless:
            response = chat(planning_prompt, api_key=self._api_key, on_usage=self._on_usage, phase="planning")
        else:
            with spinner("Generating plan..."):
                response = chat(planning_prompt, api_key=self._api_key, on_usage=self._on_usage, phase="planning")
        
        # Parse JSON response
        try:
            json_str = response.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("\n", 1)[1]
            if json_str.endswith("```"):
                json_str = json_str.rsplit("```", 1)[0]
            json_str = json_str.strip()
            
            steps = json.loads(json_str)
            self._state.plan = [{"description": step["description"], "tool": step.get("tool")} for step in steps]
        except (json.JSONDecodeError, KeyError) as e:
            if not self._headless:
                console.print(f"[error]✗[/error] Failed to parse plan as JSON: {e}")
                console.print(f"[muted]Raw response: {response[:200]}...[/muted]")
            self._state.plan = []
            self._state.error = f"Failed to parse plan: {e}"
            return
        
        # Emit plan event
        self._emit("plan", self._state.plan)
        
        if not self._headless:
            console.print(f"\n[heading]Plan:[/heading]")
            for i, step in enumerate(steps, 1):
                tool_info = f" [muted][{step.get('tool', 'none')}][/muted]" if step.get('tool') else ""
                console.print(f"  [accent]{i}.[/accent] {step['description']}{tool_info}")

        # === EXECUTING PHASE ===
        self._state.phase = Phase.EXECUTING
        self._emit("phase_change", self._state.phase.value)
        
        if not self._headless:
            console.print(f"\n[heading]Executing plan...[/heading]\n")
        
        # Enable change staging for file writes
        set_change_manager(self._change_manager)
        
        execution_context = []
        
        for i, step in enumerate(steps, 1):
            desc = step["description"]
            
            # Emit step_start event
            self._emit("step_start", {"step": i, "description": desc})
            
            if not self._headless:
                console.print(f"[heading]━━━ Step {i}: {desc} ━━━[/heading]")
            
            context_str = "\n".join(execution_context) if execution_context else "None yet"
            
            execute_prompt = f"""Execute this step: {desc}

Previous steps completed:
{context_str}

Use the appropriate tool to complete this step. Be precise and only do what's asked."""
            
            result = self._execute_with_tools(execute_prompt, readonly=False, show_tools=not self._headless)
            
            # Emit step_complete event
            self._emit("step_complete", {"step": i, "description": desc, "result": result})
            
            if not self._headless:
                console.print(f"[success]✓[/success] {result}\n")
            
            execution_context.append(f"Step {i}: {desc} → {result[:200]}")
        
        # Disable change staging
        set_change_manager(None)

        # === APPROVAL PHASE ===
        staged = self._change_manager.get_staged_changes()
        if not staged:
            self._state.phase = Phase.COMPLETE
            self._emit("phase_change", self._state.phase.value)
            if not self._headless:
                print_summary(changes_applied=0)
            return
        
        self._state.phase = Phase.AWAITING_APPROVAL
        self._emit("phase_change", self._state.phase.value)
        
        # In headless mode, stop here and let caller handle approval
        if self._headless:
            return
        
        # CLI mode: display diff and prompt for approval
        display_staged_changes(staged, self._change_manager.get_diff())
        
        # Prompt user for approval
        num_changes = len(staged)
        while True:
            answer = console.input("\n[accent]Apply these changes?[/accent] [muted][y/n]:[/muted] ").strip().lower()
            if answer in ("y", "yes"):
                self._change_manager.apply_all()
                self._state.phase = Phase.COMPLETE
                self._emit("phase_change", self._state.phase.value)
                print_summary(changes_applied=num_changes)
                return
            elif answer in ("n", "no"):
                self._change_manager.discard_all()
                self._state.phase = Phase.COMPLETE
                self._emit("phase_change", self._state.phase.value)
                print_summary(changes_applied=0, changes_rejected=num_changes)
                return
            else:
                console.print("[warning]Please enter 'y' or 'n'.[/warning]")
    
    def get_state(self) -> AgentState:
        return self._state
