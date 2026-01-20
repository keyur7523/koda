"""
Repository Manager for cloning and managing GitHub repositories.

Workspace structure:
~/.koda/workspaces/
  └── user_{user_id}/
      └── {owner}_{repo}/
          └── (cloned files)
"""

import subprocess
import os
import re
import shutil
from pathlib import Path
from typing import Optional


class RepoError(Exception):
    """Custom exception for repo operations."""
    pass


class RepoManager:
    """Manages cloning and updating GitHub repositories."""
    
    def __init__(self, workspace_dir: Optional[str] = None):
        """Initialize the repo manager.
        
        Args:
            workspace_dir: Base directory for workspaces. 
                          Defaults to ~/.koda/workspaces
        """
        self.workspace_dir = Path(workspace_dir or os.path.expanduser("~/.koda/workspaces"))
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
    
    def parse_github_url(self, url: str) -> tuple[str, str, Optional[str]]:
        """Extract (owner, repo, branch) from GitHub URL.
        
        Supports:
        - https://github.com/owner/repo
        - https://github.com/owner/repo.git
        - https://github.com/owner/repo/tree/branch
        
        Returns:
            Tuple of (owner, repo_name, branch or None)
        
        Raises:
            RepoError: If URL is not a valid GitHub URL
        """
        # Regex to parse GitHub URLs
        pattern = r'^https?://github\.com/([^/]+)/([^/.]+)(?:\.git)?(?:/tree/([^/]+))?'
        match = re.match(pattern, url.strip(), re.IGNORECASE)
        
        if not match:
            raise RepoError(f"Invalid GitHub URL: {url}")
        
        owner, repo, branch = match.groups()
        return owner, repo, branch
    
    def get_user_workspace(self, user_id: int) -> Path:
        """Get the workspace directory for a user."""
        user_dir = self.workspace_dir / f"user_{user_id}"
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir
    
    def get_repo_dir_name(self, owner: str, repo: str) -> str:
        """Get sanitized directory name for a repo."""
        # Sanitize to avoid path traversal
        owner_safe = re.sub(r'[^a-zA-Z0-9_-]', '_', owner)
        repo_safe = re.sub(r'[^a-zA-Z0-9_-]', '_', repo)
        return f"{owner_safe}_{repo_safe}"
    
    def get_repo_path(self, repo_url: str, user_id: int, branch: str = "main") -> Path:
        """Return path to repo. Clone if doesn't exist, pull if exists.
        
        Args:
            repo_url: GitHub repository URL
            user_id: User ID for workspace isolation
            branch: Branch to checkout (default: main)
            
        Returns:
            Path to the local repository
            
        Raises:
            RepoError: If clone or pull fails
        """
        owner, repo, url_branch = self.parse_github_url(repo_url)
        
        # Use branch from URL if provided, otherwise use the parameter
        actual_branch = url_branch or branch
        
        user_workspace = self.get_user_workspace(user_id)
        repo_dir_name = self.get_repo_dir_name(owner, repo)
        repo_path = user_workspace / repo_dir_name
        
        if repo_path.exists():
            # Repo already exists, pull latest
            self.pull_latest(repo_path, actual_branch)
        else:
            # Clone the repo
            self.clone_repo(repo_url, user_id, actual_branch)
        
        return repo_path
    
    def clone_repo(self, repo_url: str, user_id: int, branch: str = "main") -> Path:
        """Shallow clone a repository.
        
        Args:
            repo_url: GitHub repository URL
            user_id: User ID for workspace isolation
            branch: Branch to checkout
            
        Returns:
            Path to the cloned repository
            
        Raises:
            RepoError: If clone fails
        """
        owner, repo, url_branch = self.parse_github_url(repo_url)
        actual_branch = url_branch or branch
        
        user_workspace = self.get_user_workspace(user_id)
        repo_dir_name = self.get_repo_dir_name(owner, repo)
        target_path = user_workspace / repo_dir_name
        
        # Remove if exists (fresh clone)
        if target_path.exists():
            shutil.rmtree(target_path)
        
        # Construct normalized clone URL
        clone_url = f"https://github.com/{owner}/{repo}.git"
        
        # Clone with depth 1 (shallow) for speed
        cmd = [
            "git", "clone",
            "--depth", "1",
            "--single-branch",
            "-b", actual_branch,
            clone_url,
            str(target_path)
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout
            )
            
            if result.returncode != 0:
                error_msg = result.stderr.strip() or result.stdout.strip()
                
                # Check for common errors
                if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
                    raise RepoError(f"Repository not found: {repo_url}")
                elif "could not read" in error_msg.lower() or "authentication" in error_msg.lower():
                    raise RepoError(f"Cannot access repository. It may be private: {repo_url}")
                elif "remote branch" in error_msg.lower():
                    raise RepoError(f"Branch '{actual_branch}' not found in {repo_url}")
                else:
                    raise RepoError(f"Clone failed: {error_msg}")
            
            return target_path
            
        except subprocess.TimeoutExpired:
            # Clean up partial clone
            if target_path.exists():
                shutil.rmtree(target_path)
            raise RepoError(f"Clone timed out. The repository may be too large: {repo_url}")
        except FileNotFoundError:
            raise RepoError("Git is not installed or not in PATH")
    
    def pull_latest(self, repo_path: Path, branch: str = "main") -> bool:
        """Pull latest changes for a repository.
        
        Args:
            repo_path: Path to the local repository
            branch: Branch to pull
            
        Returns:
            True if pull succeeded
            
        Raises:
            RepoError: If pull fails
        """
        if not repo_path.exists():
            raise RepoError(f"Repository path does not exist: {repo_path}")
        
        try:
            # First, reset any local changes
            subprocess.run(
                ["git", "reset", "--hard", f"origin/{branch}"],
                cwd=str(repo_path),
                capture_output=True,
                timeout=30
            )
            
            # Pull latest
            result = subprocess.run(
                ["git", "pull", "origin", branch],
                cwd=str(repo_path),
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                error_msg = result.stderr.strip() or result.stdout.strip()
                # Pull failed - might need fresh clone
                raise RepoError(f"Pull failed: {error_msg}")
            
            return True
            
        except subprocess.TimeoutExpired:
            raise RepoError("Pull timed out")
        except FileNotFoundError:
            raise RepoError("Git is not installed or not in PATH")
    
    def delete_repo(self, repo_url: str, user_id: int) -> bool:
        """Delete a cloned repository.
        
        Args:
            repo_url: GitHub repository URL
            user_id: User ID
            
        Returns:
            True if deleted, False if didn't exist
        """
        owner, repo, _ = self.parse_github_url(repo_url)
        
        user_workspace = self.get_user_workspace(user_id)
        repo_dir_name = self.get_repo_dir_name(owner, repo)
        repo_path = user_workspace / repo_dir_name
        
        if repo_path.exists():
            shutil.rmtree(repo_path)
            return True
        
        return False


# Singleton instance for convenience
_repo_manager: Optional[RepoManager] = None


def get_repo_manager() -> RepoManager:
    """Get or create the singleton RepoManager instance."""
    global _repo_manager
    if _repo_manager is None:
        _repo_manager = RepoManager()
    return _repo_manager

