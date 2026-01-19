from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import difflib


class ChangeType(Enum):
    CREATE = "create"
    MODIFY = "modify"
    DELETE = "delete"


@dataclass
class StagedChange:
    path: str
    change_type: ChangeType
    new_content: str
    original_content: str | None = None


class ChangeManager:
    def __init__(self):
        self._staged: list[StagedChange] = []
    
    def stage_write(self, path: str, content: str) -> str:
        """Stage a file write. Don't actually write yet."""
        file_path = Path(path)
        
        # Check if file exists to determine CREATE vs MODIFY
        if file_path.exists():
            original_content = file_path.read_text()
            change_type = ChangeType.MODIFY
        else:
            original_content = None
            change_type = ChangeType.CREATE
        
        # Check if we already have a staged change for this path
        for i, change in enumerate(self._staged):
            if change.path == path:
                # Update existing staged change
                self._staged[i] = StagedChange(
                    path=path,
                    change_type=change_type,
                    new_content=content,
                    original_content=change.original_content  # Keep original
                )
                return f"[STAGED] Updated staged changes for '{path}'"
        
        # Store the new change
        self._staged.append(StagedChange(
            path=path,
            change_type=change_type,
            new_content=content,
            original_content=original_content
        ))
        
        action = "create" if change_type == ChangeType.CREATE else "modify"
        return f"[STAGED] Will {action} '{path}' (not yet applied)"
    
    def stage_delete(self, path: str) -> str:
        """Stage a file deletion. Don't actually delete yet."""
        file_path = Path(path)
        
        if not file_path.exists():
            return f"Error: File '{path}' does not exist"
        
        original_content = file_path.read_text()
        
        self._staged.append(StagedChange(
            path=path,
            change_type=ChangeType.DELETE,
            new_content="",
            original_content=original_content
        ))
        
        return f"[STAGED] Will delete '{path}' (not yet applied)"
    
    def get_staged_changes(self) -> list[StagedChange]:
        """Return all staged changes."""
        return self._staged.copy()
    
    def apply_all(self) -> str:
        """Apply all staged changes to disk."""
        if not self._staged:
            return "No changes to apply."
        
        applied = []
        for change in self._staged:
            file_path = Path(change.path)
            
            if change.change_type == ChangeType.DELETE:
                file_path.unlink()
                applied.append(f"Deleted: {change.path}")
            else:
                # CREATE or MODIFY
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(change.new_content)
                action = "Created" if change.change_type == ChangeType.CREATE else "Modified"
                applied.append(f"{action}: {change.path}")
        
        count = len(self._staged)
        self._staged.clear()
        
        return f"Applied {count} change(s):\n" + "\n".join(applied)
    
    def discard_all(self) -> str:
        """Discard all staged changes."""
        count = len(self._staged)
        self._staged.clear()
        return f"Discarded {count} staged change(s)."
    
    def get_diff(self) -> str:
        """Return a unified diff of all changes."""
        if not self._staged:
            return "No staged changes."
        
        diffs = []
        for change in self._staged:
            if change.change_type == ChangeType.CREATE:
                # New file - show all lines as additions
                new_lines = change.new_content.splitlines(keepends=True)
                diff = difflib.unified_diff(
                    [],
                    new_lines,
                    fromfile=f"/dev/null",
                    tofile=change.path,
                    lineterm=""
                )
            elif change.change_type == ChangeType.DELETE:
                # Deleted file - show all lines as removals
                old_lines = (change.original_content or "").splitlines(keepends=True)
                diff = difflib.unified_diff(
                    old_lines,
                    [],
                    fromfile=change.path,
                    tofile="/dev/null",
                    lineterm=""
                )
            else:
                # Modified file
                old_lines = (change.original_content or "").splitlines(keepends=True)
                new_lines = change.new_content.splitlines(keepends=True)
                diff = difflib.unified_diff(
                    old_lines,
                    new_lines,
                    fromfile=f"a/{change.path}",
                    tofile=f"b/{change.path}",
                    lineterm=""
                )
            
            diffs.append("".join(diff))
        
        return "\n".join(diffs)
    
    def summary(self) -> str:
        """Return a brief summary of staged changes."""
        if not self._staged:
            return "No staged changes."
        
        creates = sum(1 for c in self._staged if c.change_type == ChangeType.CREATE)
        modifies = sum(1 for c in self._staged if c.change_type == ChangeType.MODIFY)
        deletes = sum(1 for c in self._staged if c.change_type == ChangeType.DELETE)
        
        parts = []
        if creates:
            parts.append(f"{creates} file(s) to create")
        if modifies:
            parts.append(f"{modifies} file(s) to modify")
        if deletes:
            parts.append(f"{deletes} file(s) to delete")
        
        return f"Staged: {', '.join(parts)}"

