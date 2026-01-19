from .file_ops import read_file, write_file, delete_file, list_directory, search_code
from .terminal import run_command
from .indexer_tools import index_symbols, find_symbol

# Map tool names to their implementations
TOOLS = {
    "read_file": read_file,
    "write_file": write_file,
    "delete_file": delete_file,
    "list_directory": list_directory,
    "search_code": search_code,
    "run_command": run_command,
    "index_symbols": index_symbols,
    "find_symbol": find_symbol,
}

# Tools that are read-only (safe during understanding phase)
READ_ONLY_TOOLS = {"read_file", "list_directory", "search_code", "run_command", "index_symbols", "find_symbol"}

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
        "name": "delete_file",
        "description": "Delete a file from the filesystem",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to repo root"}
            },
            "required": ["path"]
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
    {
        "name": "search_code",
        "description": "Search for a string/pattern in files. Returns matching lines with file paths and line numbers. Use this to find relevant code without reading entire files.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The text or pattern to search for"},
                "file_pattern": {"type": "string", "description": "File pattern to search (e.g., '*.py', '*.ts'). Defaults to '*' for all files."}
            },
            "required": ["query"]
        }
    },
    {
        "name": "run_command",
        "description": "Run a shell command and return output",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to execute"}
            },
            "required": ["command"]
        }
    },
    {
        "name": "index_symbols",
        "description": "Get a summary of code symbols (classes, functions, methods) in the codebase. Use this to understand code structure quickly.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "description": "Filter by kind: 'class', 'function', 'method', 'import'. Omit for summary."
                }
            },
            "required": []
        }
    },
    {
        "name": "find_symbol",
        "description": "Search for symbols by name. Returns matching classes, functions, methods with their locations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Symbol name to search for (partial match)"}
            },
            "required": ["name"]
        }
    },
]


def get_tool_schemas(readonly: bool = False) -> list[dict]:
    """Return tool definitions in Anthropic's tool format.
    
    Args:
        readonly: If True, only return read-only tools (no write_file)
    """
    if readonly:
        return [t for t in TOOL_SCHEMAS if t["name"] in READ_ONLY_TOOLS]
    return TOOL_SCHEMAS


def execute_tool(name: str, **kwargs) -> str:
    """Execute a tool by name with given arguments."""
    if name not in TOOLS:
        return f"Error: Unknown tool '{name}'"
    return TOOLS[name](**kwargs)