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

@app.command()
def run(
    task: str = typer.Argument(..., help="Task to execute"),
    path: str = typer.Option(None, "--path", "-p", help="Path to repository (defaults to current directory)"),
):
    """Run a coding task on a codebase."""
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
        agent = Agent(headless=False)
        agent.run(task)
    finally:
        os.chdir(original_dir)

@app.command()
def init():
    """Initialize Koda in the current directory."""
    koda_dir = Path.cwd() / ".koda"
    
    if koda_dir.exists():
        console.print(f"[warning]Koda already initialized in {koda_dir.absolute()}[/warning]")
        raise typer.Exit()
    
    koda_dir.mkdir(parents=True)
    config_file = koda_dir / "config.json"
    config_file.write_text("{}")
    
    console.print(f"[success]✓ Initialized Koda in {koda_dir.absolute()}[/success]")

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
