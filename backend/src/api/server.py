from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
home_env = Path.home() / ".koda" / ".env"
if home_env.exists():
    load_dotenv(home_env)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router
from .auth import router as auth_router
from ..db.database import init_db

app = FastAPI(title="Koda API", version="1.0.0")

@app.on_event("startup")
def startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Koda API", "version": "1.0.0"}
