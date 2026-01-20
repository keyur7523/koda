# Koda - AI Coding Agent

<p align="center">
  <strong>An agentic coding assistant that understands codebases, plans changes, and executes tasks with human-in-the-loop approval.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#how-it-works">How It Works</a>
</p>

---

## Overview

Koda is a full-stack AI coding agent that helps developers complete coding tasks through natural language. Unlike simple code generators, Koda follows a structured **agentic workflow**:

1. **Understands** the codebase structure and context
2. **Plans** a sequence of steps to accomplish the task
3. **Executes** the plan using tools (file operations, terminal commands)
4. **Awaits approval** before applying changes

This human-in-the-loop design ensures safety and gives developers full control over what changes are applied to their codebase.

## Features

### Agentic Workflow
- **Multi-phase orchestration**: Understanding → Planning → Executing → Approval
- **Tool use**: File read/write, directory listing, code search, terminal commands
- **Streaming execution**: Real-time visibility into agent reasoning and actions
- **Change staging**: All modifications are staged for review before applying

### Security-First Design
- **Encrypted API keys**: User API keys encrypted at rest using Fernet (AES-128-CBC)
- **Human-in-the-loop**: No changes applied without explicit user approval
- **Scoped file access**: Agent operates within designated repository boundaries
- **JWT authentication**: Secure session management with token expiration

### Developer Experience
- **GitHub integration**: Clone repositories, create branches, and open pull requests
- **Monaco diff editor**: Visual diff review with syntax highlighting
- **Dark/light themes**: System-aware theme with manual toggle
- **Keyboard shortcuts**: Power-user friendly navigation
- **Real-time streaming**: WebSocket-based live updates during task execution

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Auth Flow  │  │  Dashboard  │  │  Agent Stream + Diff    │  │
│  │  (OAuth)    │  │  (Task UI)  │  │  (Monaco Editor)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                    WebSocket │ (Real-time streaming)             │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                         Backend (FastAPI)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Auth API   │  │  WebSocket  │  │  GitHub Integration     │  │
│  │  (JWT/OAuth)│  │  Handler    │  │  (Clone, PR Creation)   │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │                    Agent Orchestrator                      │  │
│  │  ┌─────────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │  │
│  │  │Understanding│→ │ Planning │→ │ Executing │→ │Approval│ │  │
│  │  │  (Haiku)    │  │ (Sonnet) │  │ (Sonnet)  │  │        │ │  │
│  │  └─────────────┘  └──────────┘  └───────────┘  └────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │                      Tool Registry                         │  │
│  │  read_file │ write_file │ list_dir │ search │ run_command │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │                    Change Manager                          │  │
│  │         (Stages changes, generates diffs, applies)         │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │    PostgreSQL       │
                    │  (Users, Sessions,  │
                    │   Encrypted Keys)   │
                    └─────────────────────┘
```

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and builds
- **TailwindCSS v4** for styling
- **Zustand** for state management
- **React Query** for server state
- **Monaco Editor** for code diff visualization
- **Framer Motion** for animations
- **WebSocket** for real-time streaming

### Backend
- **FastAPI** with async support
- **SQLAlchemy** with PostgreSQL (production) / SQLite (development)
- **Anthropic SDK** for Claude API integration
- **Tree-sitter** for code parsing and symbol extraction
- **Fernet** (cryptography) for API key encryption
- **JWT** for authentication
- **WebSocket** for streaming agent execution

### Infrastructure
- **Vercel** for frontend hosting
- **Render** for backend hosting
- **Render PostgreSQL** for persistent database

## How It Works

### 1. Understanding Phase
The agent explores the codebase using read-only tools to understand its structure:

```python
# Uses Claude 3.5 Haiku for fast, cost-effective exploration
summary = self._execute_with_tools(
    understanding_prompt,
    readonly=True,  # Only read operations allowed
    phase="understanding"
)
```

### 2. Planning Phase
Based on understanding, the agent creates a structured execution plan:

```python
# Uses Claude Sonnet 4 for smarter planning
response = chat(
    planning_prompt,
    api_key=self._api_key,
    phase="planning"
)
# Returns JSON array of steps with tool assignments
```

### 3. Execution Phase
The agent executes each step, with all file writes staged (not applied):

```python
# Changes are staged, not written directly
class ChangeManager:
    def stage_write(self, path: str, content: str):
        # Stores change for later approval
        self._staged_changes.append(FileChange(...))
```

### 4. Approval Phase
User reviews staged changes with visual diff before applying:

```typescript
// Frontend shows Monaco diff editor
<DiffEditor
  original={change.originalContent}
  modified={change.newContent}
  language={detectLanguage(change.path)}
/>
```

### Tool Use Pattern

The agent uses a **tool loop** pattern for complex tasks:

```python
while True:
    response = chat_with_tools(messages, tools, api_key=self._api_key)

    if response.stop_reason == "end_turn":
        return extract_text(response)

    elif response.stop_reason == "tool_use":
        # Execute tools and continue conversation
        for tool_call in response.tool_calls:
            result = execute_tool(tool_call.name, tool_call.input)
            messages.append(tool_result(result))
```

### Available Tools

| Tool | Description | Phase |
|------|-------------|-------|
| `read_file` | Read file contents with line limits | All |
| `write_file` | Stage file creation/modification | Execute |
| `delete_file` | Stage file deletion | Execute |
| `list_directory` | List directory contents | All |
| `search_code` | Grep-like pattern search | All |
| `run_command` | Execute shell commands (30s timeout) | Execute |
| `index_symbols` | Parse Python symbols (Tree-sitter) | Understanding |

## Security Considerations

### API Key Protection
```python
# Keys encrypted before storage
user.anthropic_api_key = encrypt(api_key)  # Fernet AES-128-CBC

# Keys decrypted only when making API calls
decrypted_key = decrypt(user.anthropic_api_key)
# Never logged, never returned to frontend
```

### Human-in-the-Loop
- All file modifications are **staged**, not applied directly
- User must explicitly approve changes via UI
- Visual diff review before any changes are made
- Option to reject all changes

### Authentication
- JWT tokens with 7-day expiration
- OAuth integration (GitHub, Google)
- Secure session management

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (for production)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
export JWT_SECRET_KEY="your-secret-key"
export ANTHROPIC_API_KEY="sk-ant-..."  # Optional: for server-side key

# Run development server
uvicorn src.api.server:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
echo "VITE_API_URL=http://localhost:8000" > .env
echo "VITE_WS_URL=ws://localhost:8000/api/ws/task" >> .env

# Run development server
npm run dev
```

### Production Deployment

**Backend (Render):**
- Set `DATABASE_URL` to PostgreSQL connection string
- Set `ENCRYPTION_KEY` for API key encryption
- Set `JWT_SECRET_KEY` for auth tokens
- Set `FRONTEND_URL` for CORS

**Frontend (Vercel):**
- Set `VITE_API_URL` to backend URL (https)
- Set `VITE_WS_URL` to WebSocket URL (wss)

## Project Structure

```
koda/
├── frontend/
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   │   ├── agent/     # Agent stream, approval flow
│   │   │   ├── code/      # Monaco diff editor
│   │   │   └── layouts/   # Header, sidebar, main layout
│   │   ├── contexts/      # Auth context
│   │   ├── hooks/         # Custom hooks (WebSocket, shortcuts)
│   │   ├── pages/         # Route pages
│   │   ├── stores/        # Zustand stores
│   │   └── types/         # TypeScript definitions
│   └── package.json
│
├── backend/
│   └── src/
│       ├── agent/         # Orchestrator, state, change manager
│       ├── api/           # FastAPI routes, auth, WebSocket
│       ├── cli/           # CLI commands (typer)
│       ├── db/            # SQLAlchemy models, database
│       ├── indexer/       # Tree-sitter code parsing
│       ├── llm/           # LLM client, providers
│       ├── tools/         # Tool implementations
│       └── utils/         # Encryption, GitHub client
│
└── README.md
```

## Key Design Decisions

### Why Multi-Phase Orchestration?
Breaking the task into distinct phases provides:
- **Transparency**: Users see what the agent is thinking
- **Control**: Each phase can be monitored and interrupted
- **Cost optimization**: Use cheaper models for exploration (Haiku), smarter models for planning/execution (Sonnet)

### Why Stage Changes?
Staging file modifications before applying provides:
- **Safety**: No accidental overwrites or deletions
- **Review**: Visual diff of all changes
- **Rollback**: Easy to reject unwanted changes
- **Auditability**: Clear record of what will change

### Why WebSocket for Streaming?
Real-time streaming via WebSocket provides:
- **Visibility**: See agent actions as they happen
- **Responsiveness**: Immediate feedback on progress
- **Interactivity**: Could support mid-task cancellation

## Future Enhancements

- [ ] Multi-file diff view with collapsible sections
- [ ] Task history with replay capability
- [ ] Custom tool definitions via UI
- [ ] Branch management and PR templates
- [ ] Collaborative editing sessions
- [ ] Local CLI mode with TUI interface

