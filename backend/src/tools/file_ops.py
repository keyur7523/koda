from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..agent.change_manager import ChangeManager


# Global change manager reference (set by orchestrator)
_change_manager: "ChangeManager | None" = None

# Global working directory (set by orchestrator when working on a repo)
_working_dir: Path = Path(".")


def set_change_manager(manager: "ChangeManager | None") -> None:
    """Set the global change manager for staging writes."""
    global _change_manager
    _change_manager = manager


def set_working_dir(path: Path | str | None) -> None:
    """Set the global working directory for file operations.
    
    Args:
        path: Path to use as root for all file operations.
              None or "." resets to current directory.
    """
    global _working_dir
    if path is None or str(path) == ".":
        _working_dir = Path(".")
    else:
        _working_dir = Path(path)


def get_working_dir() -> Path:
    """Get the current working directory for file operations."""
    return _working_dir


def _resolve_path(path: str) -> Path:
    """Resolve a path relative to the working directory.
    
    Prevents path traversal attacks by ensuring the resolved path
    stays within the working directory.
    """
    # Convert to Path and resolve relative to working dir
    resolved = (_working_dir / path).resolve()
    
    # Ensure path stays within working directory
    try:
        resolved.relative_to(_working_dir.resolve())
    except ValueError:
        raise ValueError(f"Path '{path}' would escape the working directory")
    
    return resolved


def read_file(path: str, change_manager: "ChangeManager | None" = None) -> str:
    """Read and return contents of a file.
    
    If change_manager is provided (or global _change_manager is set),
    check for staged changes first and return staged content if available.
    """
    # Use provided change_manager or fall back to global
    manager = change_manager or _change_manager
    
    # Check for staged changes first
    if manager is not None:
        for change in manager.get_staged_changes():
            if change.path == path:
                return change.new_content
    
    # No staged change, read from disk
    try:
        file_path = _resolve_path(path)
    except ValueError as e:
        return f"Error: {e}"
    
    if not file_path.exists():
        return f"Error: File '{path}' not found."
    
    if not file_path.is_file():
        return f"Error: '{path}' is not a file."
    
    return file_path.read_text()


def write_file(path: str, content: str, change_manager: "ChangeManager | None" = None) -> str:
    """Write content to a file. Returns success message.
    
    If change_manager is provided (or global _change_manager is set), 
    stage the change instead of writing directly.
    """
    # Use provided change_manager or fall back to global
    manager = change_manager or _change_manager
    
    try:
        file_path = _resolve_path(path)
    except ValueError as e:
        return f"Error: {e}"
    
    if manager is not None:
        # Stage the change instead of writing
        change_type = "MODIFY" if file_path.exists() else "CREATE"
        manager.stage_write(path, content)
        return f"Staged: {change_type} {path} ({len(content)} bytes)"
    
    # No change manager - write directly (legacy behavior)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content)
    return f"Successfully wrote to '{path}'."


def delete_file(path: str, change_manager: "ChangeManager | None" = None) -> str:
    """Delete a file. Returns success message.
    
    If change_manager is provided (or global _change_manager is set), 
    stage the deletion instead of deleting directly.
    """
    # Use provided change_manager or fall back to global
    manager = change_manager or _change_manager
    
    try:
        file_path = _resolve_path(path)
    except ValueError as e:
        return f"Error: {e}"
    
    if not file_path.exists():
        return f"Error: File '{path}' not found."
    
    if not file_path.is_file():
        return f"Error: '{path}' is not a file."
    
    if manager is not None:
        # Stage the deletion instead of deleting
        manager.stage_delete(path)
        return f"Staged: DELETE {path}"
    
    # No change manager - delete directly (legacy behavior)
    file_path.unlink()
    return f"Successfully deleted '{path}'."


def list_directory(path: str) -> str:
    """List contents of a directory. Returns formatted string."""
    try:
        dir_path = _resolve_path(path)
    except ValueError as e:
        return f"Error: {e}"
    
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


def search_code(query: str, file_pattern: str = "*") -> str:
    """Search for a string/pattern in files.
    
    Returns matching lines with file paths and line numbers.
    Skips venv/, __pycache__/, .git/, node_modules/.
    Limits results to 20 matches.
    """
    # Directories to skip
    skip_dirs = {"venv", "__pycache__", ".git", "node_modules", ".venv", "dist", "build"}
    
    results = []
    max_results = 20
    
    def should_skip(path: Path) -> bool:
        """Check if path should be skipped."""
        for part in path.parts:
            if part in skip_dirs:
                return True
        return False
    
    def search_in_file(file_path: Path, rel_path: Path) -> None:
        """Search for query in a single file."""
        nonlocal results
        try:
            content = file_path.read_text(errors="ignore")
            for line_num, line in enumerate(content.splitlines(), 1):
                if query.lower() in line.lower():
                    # Truncate long lines
                    display_line = line.strip()
                    if len(display_line) > 100:
                        display_line = display_line[:100] + "..."
                    # Show relative path for cleaner output
                    results.append(f"{rel_path}:{line_num}: {display_line}")
                    if len(results) >= max_results:
                        return
        except Exception:
            pass  # Skip files that can't be read
    
    # Search recursively from working directory
    root = _working_dir.resolve()
    
    for file_path in root.rglob(file_pattern):
        if len(results) >= max_results:
            break
        if file_path.is_file() and not should_skip(file_path):
            # Get relative path for display
            try:
                rel_path = file_path.relative_to(root)
            except ValueError:
                rel_path = file_path
            search_in_file(file_path, rel_path)
    
    if not results:
        return f"No matches found for '{query}' in {file_pattern} files."
    
    result_text = "\n".join(results)
    if len(results) >= max_results:
        result_text += f"\n\n(Limited to {max_results} results)"
    
    return result_text