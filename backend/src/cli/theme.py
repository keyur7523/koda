from rich.console import Console
from rich.theme import Theme
from rich.spinner import Spinner
from rich.live import Live
from rich.panel import Panel
from rich.text import Text
from contextlib import contextmanager

# Koda color palette - Slate + Emerald
COLORS = {
    "primary": "#2d3436",      # Charcoal (backgrounds, text)
    "accent": "#00b894",       # Emerald green (highlights, success)
    "secondary": "#b2bec3",    # Light gray (muted text)
    "error": "#d63031",        # Red (errors)
    "warning": "#fdcb6e",      # Yellow (warnings)
    "info": "#74b9ff",         # Blue (info)
}

# Create Rich theme
koda_theme = Theme({
    "accent": COLORS["accent"],
    "secondary": COLORS["secondary"],
    "error": COLORS["error"],
    "warning": COLORS["warning"],
    "info": COLORS["info"],
    "success": COLORS["accent"],
    "muted": COLORS["secondary"],
    "heading": f"bold {COLORS['accent']}",
    "tool": "bold #81ecec",           # Lighter cyan for tool names
    "path": "italic #dfe6e9",         # Light for file paths
})

# Global console instance
console = Console(theme=koda_theme)


@contextmanager
def spinner(message: str):
    """Show a spinner while work is being done."""
    with Live(
        Spinner("dots", text=f" [accent]{message}[/accent]"),
        console=console,
        transient=True,  # Disappears when done
    ) as live:
        yield live


def print_banner():
    """Print the Koda welcome banner."""
    title = Text()
    title.append("◆ ", style="accent")
    title.append("KODA", style="bold white")
    
    console.print()
    console.print(Panel(
        "[muted]AI Coding Agent[/muted]",
        title=title,
        border_style="accent",
        width=40,
        padding=(0, 1),
    ))
    console.print()


def print_summary(changes_applied: int, changes_rejected: int = 0):
    """Print completion summary."""
    console.print()
    if changes_applied > 0:
        console.print(Panel(
            f"[accent]✓[/accent] Applied [accent]{changes_applied}[/accent] change(s)",
            title="[bold white]Complete[/bold white]",
            border_style="accent",
            width=40,
        ))
    elif changes_rejected > 0:
        console.print(Panel(
            f"[warning]⊘[/warning] Discarded [warning]{changes_rejected}[/warning] change(s)",
            title="[bold white]Complete[/bold white]",
            border_style="warning",
            width=40,
        ))
    else:
        console.print(Panel(
            "[muted]No changes needed[/muted]",
            title="[bold white]Complete[/bold white]",
            border_style="secondary",
            width=40,
        ))
    console.print()


if __name__ == "__main__":
    import time
    
    console.print("[heading]Koda[/heading] - AI Coding Agent\n")
    
    with spinner("Understanding codebase..."):
        time.sleep(2)
    console.print("[success]✓[/success] Understanding complete\n")
    
    with spinner("Generating plan..."):
        time.sleep(1.5)
    console.print("[success]✓[/success] Plan generated")

