"""Repository summary cache for token optimization.

Caches codebase summaries to avoid re-exploring unchanged repos.
Cache key is based on repo path + latest commit hash.
"""
import json
import hashlib
import subprocess
from pathlib import Path

CACHE_DIR = Path.home() / ".koda" / "cache"


def get_cache_key(repo_path: str) -> str:
    """Generate cache key from repo path + latest commit hash."""
    # Get latest commit hash
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=5
        )
        commit = result.stdout.strip() if result.returncode == 0 else "unknown"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        commit = "unknown"
    
    # Create unique key from path + commit
    key_str = f"{repo_path}:{commit}"
    return hashlib.md5(key_str.encode()).hexdigest()


def get_cached_summary(repo_path: str) -> str | None:
    """Return cached summary if it exists and is valid.
    
    Args:
        repo_path: Path to the repository
        
    Returns:
        Cached summary string, or None if no cache exists
    """
    try:
        key = get_cache_key(repo_path)
        cache_file = CACHE_DIR / f"{key}.json"
        
        if cache_file.exists():
            data = json.loads(cache_file.read_text())
            return data.get("summary")
    except (json.JSONDecodeError, OSError):
        pass
    
    return None


def save_summary(repo_path: str, summary: str) -> None:
    """Cache the repository summary.
    
    Args:
        repo_path: Path to the repository
        summary: Summary text to cache
    """
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        key = get_cache_key(repo_path)
        cache_file = CACHE_DIR / f"{key}.json"
        
        cache_data = {
            "summary": summary,
            "repo_path": repo_path,
        }
        cache_file.write_text(json.dumps(cache_data, indent=2))
    except OSError:
        # Silently fail - caching is optional optimization
        pass


def clear_cache(repo_path: str | None = None) -> int:
    """Clear cached summaries.
    
    Args:
        repo_path: If provided, clear only cache for this repo.
                   If None, clear all caches.
    
    Returns:
        Number of cache files removed
    """
    if not CACHE_DIR.exists():
        return 0
    
    removed = 0
    
    if repo_path:
        # Clear specific repo cache
        key = get_cache_key(repo_path)
        cache_file = CACHE_DIR / f"{key}.json"
        if cache_file.exists():
            cache_file.unlink()
            removed = 1
    else:
        # Clear all caches
        for cache_file in CACHE_DIR.glob("*.json"):
            cache_file.unlink()
            removed += 1
    
    return removed

