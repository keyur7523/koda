import json
from .state import AgentState, Phase
from .change_manager import ChangeManager
from ..llm import chat, chat_with_tools
from .tool_executor import execute_tool
from ..tools.registry import get_tool_schemas
from ..tools.file_ops import set_change_manager
from ..cli.theme import console, spinner, print_summary
from ..cli.diff_display import display_staged_changes


class Agent:
    def __init__(self):
        self._state = AgentState(phase=Phase.IDLE)

    def _execute_with_tools(self, prompt: str, readonly: bool = False, show_tools: bool = True) -> str:
        """Execute a prompt with tool support, handling tool calls in a loop.
        
        Args:
            prompt: The prompt to send to Claude
            readonly: If True, only allow read-only tools (no write_file)
            show_tools: If True, print tool execution details
        """
        messages = [{"role": "user", "content": prompt}]
        tools = get_tool_schemas(readonly=readonly)
        
        while True:
            response = chat_with_tools(messages, tools)
            
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
                        if show_tools:
                            args_str = str(block.input)
                            if len(args_str) > 60:
                                args_str = args_str[:60] + "..."
                            console.print(f"  [tool]→[/tool] [muted]{block.name}[/muted]([path]{args_str}[/path])")
                        
                        result = execute_tool(block.name, block.input)
                        
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
        
        # === UNDERSTANDING PHASE ===
        self._state.phase = Phase.UNDERSTANDING
        self._state.task = task
        console.print(f"\n[heading]Understanding task:[/heading] {task}\n")
        
        understanding_prompt = f"""The user wants to: {task}

Explore the codebase to understand its structure.
Use list_directory and read_file to understand what exists.
Do NOT create or modify any files - just observe.
Then summarize what you found."""
        
        with spinner("Exploring codebase..."):
            summary = self._execute_with_tools(understanding_prompt, readonly=True, show_tools=False)
        
        console.print(f"\n[heading]Codebase Summary:[/heading]")
        console.print(f"[muted]{summary}[/muted]\n")
        
        # === PLANNING PHASE ===
        self._state.phase = Phase.PLANNING
        
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
        
        with spinner("Generating plan..."):
            response = chat(planning_prompt)
        
        # Parse JSON response
        try:
            json_str = response.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("\n", 1)[1]
            if json_str.endswith("```"):
                json_str = json_str.rsplit("```", 1)[0]
            json_str = json_str.strip()
            
            steps = json.loads(json_str)
            self._state.plan = [step["description"] for step in steps]
        except (json.JSONDecodeError, KeyError) as e:
            console.print(f"[error]✗[/error] Failed to parse plan as JSON: {e}")
            console.print(f"[muted]Raw response: {response[:200]}...[/muted]")
            self._state.plan = []
            return
        
        console.print(f"\n[heading]Plan:[/heading]")
        for i, step in enumerate(steps, 1):
            tool_info = f" [muted][{step.get('tool', 'none')}][/muted]" if step.get('tool') else ""
            console.print(f"  [accent]{i}.[/accent] {step['description']}{tool_info}")

        # === EXECUTING PHASE ===
        self._state.phase = Phase.EXECUTING
        console.print(f"\n[heading]Executing plan...[/heading]\n")
        
        # Enable change staging for file writes
        set_change_manager(self._change_manager)
        
        execution_context = []
        
        for i, step in enumerate(steps, 1):
            desc = step["description"]
            console.print(f"[heading]━━━ Step {i}: {desc} ━━━[/heading]")
            
            context_str = "\n".join(execution_context) if execution_context else "None yet"
            
            execute_prompt = f"""Execute this step: {desc}

Previous steps completed:
{context_str}

Use the appropriate tool to complete this step. Be precise and only do what's asked."""
            
            result = self._execute_with_tools(execute_prompt, readonly=False, show_tools=True)
            console.print(f"[success]✓[/success] {result}\n")
            
            execution_context.append(f"Step {i}: {desc} → {result[:200]}")
        
        # Disable change staging
        set_change_manager(None)

        # === APPROVAL PHASE ===
        self._state.phase = Phase.AWAITING_APPROVAL
        
        staged = self._change_manager.get_staged_changes()
        if not staged:
            self._state.phase = Phase.COMPLETE
            print_summary(changes_applied=0)
            return
        
        # Display styled diff
        display_staged_changes(staged, self._change_manager.get_diff())
        
        # Prompt user for approval
        num_changes = len(staged)
        while True:
            answer = console.input("\n[accent]Apply these changes?[/accent] [muted][y/n]:[/muted] ").strip().lower()
            if answer in ("y", "yes"):
                self._change_manager.apply_all()
                self._state.phase = Phase.COMPLETE
                print_summary(changes_applied=num_changes)
                return
            elif answer in ("n", "no"):
                self._change_manager.discard_all()
                self._state.phase = Phase.COMPLETE
                print_summary(changes_applied=0, changes_rejected=num_changes)
                return
            else:
                console.print("[warning]Please enter 'y' or 'n'.[/warning]")
    
    def get_state(self) -> AgentState:
        return self._state
