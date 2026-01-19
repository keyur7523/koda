import typer
from pathlib import Path
from ..agent.orchestrator import Agent
from .theme import console, print_banner

app = typer.Typer()

@app.command()
def init():
    koda_dir = Path.cwd() / ".koda"

    if koda_dir.exists():
        console.print(f"[muted]Koda already initialized in[/muted] [path]{koda_dir.absolute()}[/path]")
        raise typer.Exit()

    koda_dir.mkdir(parents=True)

    config_file = koda_dir / "config.json"
    config_file.write_text("{}")

    console.print(f"[success]✓[/success] Initialized Koda in [path]{koda_dir.absolute()}[/path]")

@app.command()
def run(task: str):
    print_banner()
    agent = Agent()
    agent.run(task)


if __name__ == "__main__":
    app()