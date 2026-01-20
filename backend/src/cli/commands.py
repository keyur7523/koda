import typer
import os
from pathlib import Path
from ..agent.orchestrator import Agent
from .theme import console, print_banner, print_summary

app = typer.Typer(
    name="koda",
    help="AI coding agent that understands your codebase",
    add_completion=False,
    no_args_is_help=True,
)

# Global config directory
KODA_HOME = Path.home() / ".koda"
KODA_ENV_FILE = KODA_HOME / ".env"


def get_api_key() -> str | None:
    """
    Get the Anthropic API key from config or environment.
    
    Checks in order:
    1. ~/.koda/.env file (ANTHROPIC_API_KEY=...)
    2. Environment variable ANTHROPIC_API_KEY
    
    Returns:
        API key string or None if not found
    """
    # Check ~/.koda/.env
    if KODA_ENV_FILE.exists():
        try:
            content = KODA_ENV_FILE.read_text()
            for line in content.strip().split("\n"):
                if line.startswith("ANTHROPIC_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if key:
                        return key
        except Exception:
            pass
    
    # Check environment variable
    return os.getenv("ANTHROPIC_API_KEY")


def validate_api_key(key: str) -> bool:
    """Validate that an API key has the correct format."""
    return key.startswith("sk-ant-") and len(key) > 20


def save_api_key(key: str) -> None:
    """Save API key to ~/.koda/.env"""
    KODA_HOME.mkdir(parents=True, exist_ok=True)
    
    # Read existing content (if any)
    existing_lines = []
    if KODA_ENV_FILE.exists():
        content = KODA_ENV_FILE.read_text()
        for line in content.strip().split("\n"):
            # Skip existing ANTHROPIC_API_KEY line
            if not line.startswith("ANTHROPIC_API_KEY="):
                existing_lines.append(line)
    
    # Add new key
    existing_lines.append(f'ANTHROPIC_API_KEY="{key}"')
    
    # Write back
    KODA_ENV_FILE.write_text("\n".join(existing_lines) + "\n")

@app.command()
def run(
    task: str = typer.Argument(..., help="Task to execute"),
    path: str = typer.Option(None, "--path", "-p", help="Path to repository (defaults to current directory)"),
):
    """Run a coding task on a codebase."""
    # Check for API key first
    api_key = get_api_key()
    if not api_key:
        console.print("[warning]No API key found.[/warning]")
        console.print("Run [accent]koda init[/accent] to set up your API key.\n")
        raise typer.Exit(1)
    
    # Use current directory if no path specified
    repo_path = Path(path).resolve() if path else Path.cwd()
    
    if not repo_path.is_dir():
        console.print(f"[error]✗ Directory not found: {repo_path}[/error]")
        raise typer.Exit(1)
    
    # Change to repo directory
    original_dir = os.getcwd()
    os.chdir(repo_path)
    
    try:
        print_banner()
        console.print(f"[muted]Working in: {repo_path}[/muted]\n")
        # Pass the API key to the agent
        agent = Agent(headless=False, api_key=api_key)
        agent.run(task)
    finally:
        os.chdir(original_dir)

@app.command()
def init():
    """Initialize Koda and configure your API key."""
    from rich.panel import Panel
    from rich.text import Text
    
    # Print setup header
    title = Text()
    title.append("◆ ", style="accent")
    title.append("KODA Setup", style="bold white")
    
    console.print()
    console.print(Panel(
        "[muted]Configure your API key[/muted]",
        title=title,
        border_style="accent",
        width=50,
        padding=(0, 1),
    ))
    console.print()
    
    # Check if already configured
    existing_key = get_api_key()
    if existing_key:
        console.print(f"[success]✓[/success] API key already configured")
        console.print(f"[muted]  Key: {existing_key[:12]}...{existing_key[-4:]}[/muted]")
        
        reconfigure = typer.confirm("\nDo you want to update your API key?", default=False)
        if not reconfigure:
            console.print("\n[muted]No changes made.[/muted]")
            raise typer.Exit()
        console.print()
    
    # Prompt for API key
    console.print("Enter your Anthropic API key")
    console.print("[muted]Get one at: https://console.anthropic.com/settings/keys[/muted]\n")
    
    while True:
        api_key = typer.prompt("API key", hide_input=False)
        api_key = api_key.strip()
        
        if not api_key:
            console.print("[error]✗ API key cannot be empty[/error]")
            continue
        
        if not validate_api_key(api_key):
            console.print("[error]✗ Invalid API key format (should start with sk-ant-)[/error]")
            continue
        
        break
    
    # Save the key
    save_api_key(api_key)
    
    console.print()
    console.print(f"[success]✓ API key saved to {KODA_ENV_FILE}[/success]")
    console.print()
    console.print("[muted]You're all set! Run [accent]koda run \"your task\"[/accent] to get started.[/muted]")
    console.print()
    
    # Also create local .koda directory if not exists
    local_koda_dir = Path.cwd() / ".koda"
    if not local_koda_dir.exists():
        local_koda_dir.mkdir(parents=True)
        config_file = local_koda_dir / "config.json"
        config_file.write_text("{}")
        console.print(f"[muted]Created local config: {local_koda_dir}[/muted]")

@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind"),
    port: int = typer.Option(8000, "--port", "-p", help="Port to bind"),
):
    """Start the Koda API server for the web UI."""
    import uvicorn
    from ..api.server import app as fastapi_app
    
    console.print(f"[accent]◆ Koda[/accent] API server starting...")
    console.print(f"[muted]Open http://localhost:{port} for web UI[/muted]\n")
    uvicorn.run(fastapi_app, host=host, port=port)

@app.command()
def version():
    """Show Koda version."""
    console.print("[accent]◆ Koda[/accent] v0.1.0")

if __name__ == "__main__":
    app()
