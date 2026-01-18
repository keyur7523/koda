import typer
from cli.commands import app
from src.llm import chat

if __name__ == "__main__":
    app()
    response = chat("What is the capital of France?")
    print(response)