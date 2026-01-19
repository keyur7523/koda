from .file_ops import read_file, write_file, list_directory

# Map tool names to their implementations
TOOLS = {
    "read_file": read_file,
    "write_file": write_file,
    "list_directory": list_directory,
}

# Tool schemas in Anthropic's format
TOOL_SCHEMAS = [
    {
        "name": "read_file",
        "description": "Read the contents of a file",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to repo root"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write content to a file. Creates parent directories if needed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to repo root"},
                "content": {"type": "string", "description": "Content to write to the file"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "list_directory",
        "description": "List contents of a directory",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path relative to repo root"}
            },
            "required": ["path"]
        }
    },
]


def get_tool_schemas() -> list[dict]:
    """Return tool definitions in Anthropic's tool format."""
    return TOOL_SCHEMAS


def execute_tool(name: str, **kwargs) -> str:
    """Execute a tool by name with given arguments."""
    if name not in TOOLS:
        return f"Error: Unknown tool '{name}'"
    return TOOLS[name](**kwargs)