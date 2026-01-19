from rich.panel import Panel
from rich.syntax import Syntax
from .theme import console, COLORS


def display_staged_changes(changes: list, diff_text: str):
    """Display staged changes with a styled diff view."""
    
    # Summary header
    console.print()
    console.print(Panel(
        f"[accent]{len(changes)}[/accent] file(s) staged for changes",
        title="[heading]📝 Staged Changes[/heading]",
        border_style="accent",
    ))
    
    # File list
    console.print()
    for change in changes:
        icon = {"create": "🆕", "modify": "📝", "delete": "🗑️"}.get(change.change_type.value, "📄")
        color = {"create": "accent", "modify": "info", "delete": "error"}.get(change.change_type.value, "secondary")
        console.print(f"  {icon} [{color}]{change.change_type.value.upper()}[/{color}] [path]{change.path}[/path]")
    
    # Diff with syntax highlighting
    if diff_text.strip():
        console.print()
        console.print(Syntax(diff_text, "diff", theme="monokai", line_numbers=False))
    
    console.print()

