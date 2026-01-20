"""
GitHub API client for creating branches, commits, and pull requests.
Uses the GitHub REST API v3.
"""
import httpx
import base64
import re
from datetime import datetime
from typing import Optional
from dataclasses import dataclass


class GitHubError(Exception):
    """Custom exception for GitHub API errors."""
    
    def __init__(self, message: str, status_code: int = 0, error_type: str = "unknown"):
        super().__init__(message)
        self.status_code = status_code
        self.error_type = error_type


class GitHubAuthError(GitHubError):
    """Authentication/authorization errors (401, 403)."""
    pass


class GitHubRateLimitError(GitHubError):
    """Rate limit exceeded (429)."""
    pass


class GitHubNotFoundError(GitHubError):
    """Resource not found (404)."""
    pass


@dataclass
class PRResult:
    """Result of creating a pull request."""
    url: str
    number: int
    html_url: str
    branch_name: str


class GitHubClient:
    """Client for GitHub API operations."""
    
    BASE_URL = "https://api.github.com"
    
    def __init__(self, access_token: str):
        """
        Initialize GitHub client with user's access token.
        
        Args:
            access_token: GitHub OAuth access token
        """
        self.token = access_token
        self._client: Optional[httpx.Client] = None
    
    @property
    def client(self) -> httpx.Client:
        """Lazy initialization of HTTP client."""
        if self._client is None:
            self._client = httpx.Client(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                timeout=30.0,
            )
        return self._client
    
    def __del__(self):
        """Clean up HTTP client."""
        if self._client:
            self._client.close()
    
    def _handle_response(self, response: httpx.Response, action: str) -> dict:
        """Handle API response and raise appropriate errors."""
        if response.status_code >= 400:
            try:
                error_data = response.json()
                raw_message = error_data.get("message", "Unknown error")
            except Exception:
                raw_message = response.text or f"HTTP {response.status_code}"
            
            # Map to user-friendly error messages
            user_message = self._get_user_friendly_error(
                response.status_code, raw_message, action
            )
            
            # Raise specific exception types
            if response.status_code == 401:
                raise GitHubAuthError(
                    user_message, response.status_code, "auth_expired"
                )
            elif response.status_code == 403:
                if "rate limit" in raw_message.lower():
                    raise GitHubRateLimitError(
                        user_message, response.status_code, "rate_limited"
                    )
                raise GitHubAuthError(
                    user_message, response.status_code, "no_permission"
                )
            elif response.status_code == 404:
                raise GitHubNotFoundError(
                    user_message, response.status_code, "not_found"
                )
            elif response.status_code == 422:
                # Unprocessable entity - often "reference already exists"
                raise GitHubError(
                    user_message, response.status_code, "validation_failed"
                )
            elif response.status_code == 429:
                raise GitHubRateLimitError(
                    user_message, response.status_code, "rate_limited"
                )
            else:
                raise GitHubError(
                    user_message, response.status_code, "unknown"
                )
        
        return response.json() if response.text else {}
    
    def _get_user_friendly_error(self, status_code: int, raw_message: str, action: str) -> str:
        """Convert GitHub API errors to user-friendly messages."""
        raw_lower = raw_message.lower()
        
        # Authentication errors
        if status_code == 401 or "bad credentials" in raw_lower:
            return "GitHub session expired. Please re-login with GitHub."
        
        # Permission errors
        if status_code == 403:
            if "rate limit" in raw_lower:
                return "GitHub API rate limit exceeded. Please wait a few minutes and try again."
            if "push" in raw_lower or "protected" in raw_lower:
                return "No push access to this repository. Check your permissions."
            return "No permission to access this repository. Check your GitHub permissions."
        
        # Not found
        if status_code == 404:
            if "branch" in action.lower():
                return f"Branch not found. Make sure the branch exists."
            if "repo" in action.lower():
                return "Repository not found or you don't have access."
            return f"Resource not found: {action}"
        
        # Validation errors (422)
        if status_code == 422:
            if "reference already exists" in raw_lower:
                return "A branch with this name already exists. Please try again."
            return f"Validation failed: {raw_message}"
        
        # Rate limit
        if status_code == 429 or "rate limit" in raw_lower:
            return "GitHub API rate limit exceeded. Please wait a few minutes and try again."
        
        # Default: include raw message for debugging
        return f"Failed to {action}: {raw_message}"
    
    def get_default_branch(self, owner: str, repo: str) -> str:
        """Get the default branch of a repository."""
        response = self.client.get(f"/repos/{owner}/{repo}")
        data = self._handle_response(response, "get repository info")
        return data.get("default_branch", "main")
    
    def get_branch_sha(self, owner: str, repo: str, branch: str) -> str:
        """Get the SHA of a branch's latest commit."""
        response = self.client.get(f"/repos/{owner}/{repo}/git/refs/heads/{branch}")
        data = self._handle_response(response, f"get branch '{branch}'")
        return data["object"]["sha"]
    
    def create_branch(
        self,
        owner: str,
        repo: str,
        branch_name: str,
        from_branch: str = "main"
    ) -> bool:
        """
        Create a new branch from a base branch.
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch_name: Name for the new branch
            from_branch: Base branch to create from (default: main)
            
        Returns:
            True if branch was created successfully
        """
        # Get SHA of the base branch
        base_sha = self.get_branch_sha(owner, repo, from_branch)
        
        # Create the new branch
        response = self.client.post(
            f"/repos/{owner}/{repo}/git/refs",
            json={
                "ref": f"refs/heads/{branch_name}",
                "sha": base_sha,
            }
        )
        self._handle_response(response, f"create branch '{branch_name}'")
        return True
    
    def get_file_sha(self, owner: str, repo: str, path: str, branch: str) -> Optional[str]:
        """Get the SHA of an existing file (needed for updates)."""
        try:
            response = self.client.get(
                f"/repos/{owner}/{repo}/contents/{path}",
                params={"ref": branch}
            )
            if response.status_code == 404:
                return None
            data = self._handle_response(response, f"get file '{path}'")
            return data.get("sha")
        except GitHubError:
            return None
    
    def commit_file(
        self,
        owner: str,
        repo: str,
        branch: str,
        path: str,
        content: str,
        message: str,
        file_sha: Optional[str] = None
    ) -> str:
        """
        Commit a single file to a branch.
        
        Args:
            owner: Repository owner
            repo: Repository name  
            branch: Branch to commit to
            path: File path in repository
            content: File content
            message: Commit message
            file_sha: SHA of existing file (for updates)
            
        Returns:
            Commit SHA
        """
        # Base64 encode the content
        encoded_content = base64.b64encode(content.encode()).decode()
        
        payload = {
            "message": message,
            "content": encoded_content,
            "branch": branch,
        }
        
        if file_sha:
            payload["sha"] = file_sha
        
        response = self.client.put(
            f"/repos/{owner}/{repo}/contents/{path}",
            json=payload
        )
        data = self._handle_response(response, f"commit file '{path}'")
        return data["commit"]["sha"]
    
    def delete_file(
        self,
        owner: str,
        repo: str,
        branch: str,
        path: str,
        message: str,
        file_sha: str
    ) -> str:
        """
        Delete a file from a branch.
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch: Branch to delete from
            path: File path to delete
            message: Commit message
            file_sha: SHA of the file to delete
            
        Returns:
            Commit SHA
        """
        response = self.client.delete(
            f"/repos/{owner}/{repo}/contents/{path}",
            json={
                "message": message,
                "sha": file_sha,
                "branch": branch,
            }
        )
        data = self._handle_response(response, f"delete file '{path}'")
        return data["commit"]["sha"]
    
    def commit_changes(
        self,
        owner: str,
        repo: str,
        branch: str,
        changes: list[dict],
        message: str
    ) -> list[str]:
        """
        Commit multiple file changes to a branch.
        
        Each change should be a dict with:
        - path: File path
        - changeType: "create", "modify", or "delete"
        - newContent: Content for create/modify (not needed for delete)
        
        Args:
            owner: Repository owner
            repo: Repository name
            branch: Branch to commit to
            changes: List of changes to commit
            message: Commit message
            
        Returns:
            List of commit SHAs
        """
        commit_shas = []
        
        for i, change in enumerate(changes):
            path = change["path"]
            change_type = change.get("changeType", "modify")
            content = change.get("newContent", "")
            
            # Get existing file SHA if needed
            file_sha = self.get_file_sha(owner, repo, path, branch)
            
            # Generate individual commit message
            action = {"create": "Add", "modify": "Update", "delete": "Delete"}.get(change_type, "Update")
            file_message = f"{message}\n\n{action}: {path}"
            
            if change_type == "delete":
                if not file_sha:
                    print(f"Warning: File '{path}' doesn't exist, skipping delete")
                    continue
                sha = self.delete_file(owner, repo, branch, path, file_message, file_sha)
            else:
                sha = self.commit_file(
                    owner, repo, branch, path, content, file_message, file_sha
                )
            
            commit_shas.append(sha)
        
        return commit_shas
    
    def create_pull_request(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        head: str,
        base: str = "main"
    ) -> PRResult:
        """
        Create a pull request.
        
        Args:
            owner: Repository owner
            repo: Repository name
            title: PR title
            body: PR description
            head: Branch with changes
            base: Target branch (default: main)
            
        Returns:
            PRResult with URL and details
        """
        response = self.client.post(
            f"/repos/{owner}/{repo}/pulls",
            json={
                "title": title,
                "body": body,
                "head": head,
                "base": base,
            }
        )
        data = self._handle_response(response, "create pull request")
        
        return PRResult(
            url=data["url"],
            number=data["number"],
            html_url=data["html_url"],
            branch_name=head,
        )


def generate_branch_name(task_summary: str) -> str:
    """
    Generate a branch name from a task summary.
    
    Format: koda/{sanitized-task}-{timestamp}
    """
    # Sanitize task summary: lowercase, replace spaces with hyphens, remove special chars
    sanitized = re.sub(r'[^a-zA-Z0-9\s-]', '', task_summary.lower())
    sanitized = re.sub(r'\s+', '-', sanitized.strip())
    sanitized = sanitized[:40]  # Limit length
    
    # Add timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    
    return f"koda/{sanitized}-{timestamp}"


def create_pr_for_changes(
    access_token: str,
    owner: str,
    repo: str,
    changes: list[dict],
    task_description: str,
    base_branch: str = "main"
) -> PRResult:
    """
    High-level function to create a PR with all changes.
    
    Args:
        access_token: GitHub OAuth access token
        owner: Repository owner
        repo: Repository name
        changes: List of file changes
        task_description: Original task description (used for PR body)
        base_branch: Target branch
        
    Returns:
        PRResult with PR URL and details
    """
    client = GitHubClient(access_token)
    
    # Generate branch name
    branch_name = generate_branch_name(task_description)
    
    # Create branch from base
    client.create_branch(owner, repo, branch_name, base_branch)
    
    # Commit all changes
    commit_message = f"feat: {task_description[:50]}"
    client.commit_changes(owner, repo, branch_name, changes, commit_message)
    
    # Create PR
    pr_title = f"🤖 Koda: {task_description[:80]}"
    pr_body = f"""## Task Description
{task_description}

---

## Changes
{_format_changes_summary(changes)}

---

*This PR was created automatically by [Koda](https://github.com/your-org/koda), an AI coding agent.*
"""
    
    return client.create_pull_request(
        owner, repo, pr_title, pr_body, branch_name, base_branch
    )


def _format_changes_summary(changes: list[dict]) -> str:
    """Format a summary of changes for the PR body."""
    lines = []
    for change in changes:
        path = change["path"]
        change_type = change.get("changeType", "modify")
        icon = {"create": "🆕", "modify": "📝", "delete": "🗑️"}.get(change_type, "📄")
        lines.append(f"- {icon} `{path}` ({change_type})")
    return "\n".join(lines) if lines else "No file changes"

