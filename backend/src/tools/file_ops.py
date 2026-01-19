from pathlib import Path

def read_file(path: str) -> str:
    """Read and return contents of a file."""
    file_path = Path(path)
    
    if not file_path.exists():
        return f"Error: File '{path}' not found."
    
    if not file_path.is_file():
        return f"Error: '{path}' is not a file."
    
    return file_path.read_text()

def write_file(path: str, content: str) -> str:
    """Write content to a file. Returns success message."""
    file_path = Path(path)
    
    # Create parent directories if they don't exist
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    file_path.write_text(content)
    return f"Successfully wrote to '{path}'."

def list_directory(path: str) -> str:
    """List contents of a directory. Returns formatted string."""
    dir_path = Path(path)
    
    if not dir_path.exists():
        return f"Error: Directory '{path}' not found."
    
    if not dir_path.is_dir():
        return f"Error: '{path}' is not a directory."
    
    items = sorted(dir_path.iterdir())
    
    if not items:
        return f"Directory '{path}' is empty."
    
    lines = []
    for item in items:
        prefix = "📁 " if item.is_dir() else "📄 "
        lines.append(f"{prefix}{item.name}")
    
    return "\n".join(lines)