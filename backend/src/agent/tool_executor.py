from ..tools.registry import TOOLS


def execute_tool(name: str, inputs: dict) -> str:
    """Execute a tool by name with given inputs. Return result as string."""
    if name not in TOOLS:
        return f"Error: Unknown tool '{name}'"
    
    try:
        tool_fn = TOOLS[name]
        result = tool_fn(**inputs)
        return result
    except Exception as e:
        return f"Error executing {name}: {str(e)}"