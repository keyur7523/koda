import subprocess


def run_command(command: str, timeout: int = 30) -> str:
    """Run a shell command and return output.
    
    - Captures stdout and stderr
    - Timeout after N seconds (default 30)
    - Returns error message if command fails
    - Limits output to 2000 characters
    """
    max_output_length = 2000
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        # Combine stdout and stderr
        output = result.stdout + result.stderr
        
        # Add return code info if non-zero
        if result.returncode != 0:
            output = f"[Exit code: {result.returncode}]\n{output}"
        
        # Truncate if too long
        if len(output) > max_output_length:
            output = output[:max_output_length] + f"\n\n... (truncated, {len(output)} total characters)"
        
        return output.strip() if output.strip() else "(no output)"
        
    except subprocess.TimeoutExpired:
        return f"Error: Command timed out after {timeout} seconds"
    except Exception as e:
        return f"Error: {str(e)}"

