import typer
from pathlib import Path
from ..agent.orchestrator import Agent

app = typer.Typer()

@app.command()
def init():
    koda_dir = Path.cwd() / ".koda"

    if koda_dir.exists():
        typer.echo(f"Koda already initialized in {koda_dir.absolute()}")
        raise typer.Exit()

    koda_dir.mkdir(parents=True)

    config_file = koda_dir / "config.json"
    config_file.write_text("{}")

    typer.echo(f"Initialized Koda in {koda_dir.absolute()}")

@app.command()
def run(task: str):
    agent = Agent()
    agent.run(task)


if __name__ == "__main__":
    app()