"""Token usage tracking for free tier users."""
from datetime import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import User, TokenUsage


class TokenTracker:
    """Tracks token usage for a user across LLM calls."""
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.session_tokens = 0  # Tokens used in current session
    
    def record_usage(self, input_tokens: int, output_tokens: int, task_description: str = ""):
        """Record token usage after an LLM call."""
        total = input_tokens + output_tokens
        self.session_tokens += total
        
        db = SessionLocal()
        try:
            # Update user's total
            user = db.query(User).filter(User.id == self.user_id).first()
            if user:
                user.tokens_used += total
                
                # Record in audit table
                usage_record = TokenUsage(
                    user_id=self.user_id,
                    tokens_used=total,
                    task_description=task_description[:200] if task_description else "",
                )
                db.add(usage_record)
                db.commit()
                
                print(f"Token usage recorded: +{total} (input={input_tokens}, output={output_tokens}), total={user.tokens_used}")
        finally:
            db.close()
    
    def get_remaining(self) -> int:
        """Get remaining tokens for the user."""
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).first()
            if user:
                return max(0, user.tokens_limit - user.tokens_used)
            return 0
        finally:
            db.close()


def check_token_limit(user: User) -> tuple[bool, str]:
    """
    Check if user can run tasks based on token limits.
    
    Returns:
        (can_run, error_message)
    """
    # Users with their own API key bypass limits
    if user.anthropic_api_key or user.openai_api_key:
        return True, ""
    
    # Free tier check
    if user.tokens_used >= user.tokens_limit:
        return False, f"Free tier limit reached ({user.tokens_limit:,} tokens). Add your API key to continue."
    
    remaining = user.tokens_limit - user.tokens_used
    if remaining < 1000:  # Warning if low
        print(f"Warning: User {user.username} has only {remaining} tokens remaining")
    
    return True, ""

