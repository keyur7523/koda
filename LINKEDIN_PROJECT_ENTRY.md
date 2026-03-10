# Koda — LinkedIn Projects Section Entry

**Project Name:** Koda

**Tagline:** An AI coding agent that understands your repo, plans changes, and opens PRs — with human approval at every step.

**Description:**
I built Koda, a full-stack AI coding agent that connects to your GitHub repos and performs multi-step code tasks autonomously. The backend is a FastAPI service with a 4-phase agentic orchestration loop — understanding, planning, executing, and approval — where cheaper models (Haiku) handle exploration and smarter models (Sonnet) handle planning and execution to keep costs down. All file modifications are staged and diffed before applying, so nothing ships without explicit user approval. The frontend streams agent progress over WebSockets in real time and uses Monaco Editor for inline diff review.

**Tech Stack:** Python, FastAPI, SQLAlchemy, PostgreSQL, Anthropic SDK, OpenAI SDK, Tree-sitter, WebSockets, React 19, TypeScript, Vite, TailwindCSS v4, Zustand, React Query, Monaco Editor, Framer Motion, Vercel, Render

**Key Features:**
- 4-phase agentic orchestration (understand → plan → execute → approve) with phase-based LLM model selection to balance cost and capability
- Human-in-the-loop change management — file edits are staged, diffed, and require explicit approval before being applied
- Tool-loop executor pattern giving the agent access to file I/O, terminal commands, code search, and Tree-sitter symbol indexing
- End-to-end GitHub integration: clone repos, create branches, push commits, and open pull requests automatically
- Real-time WebSocket streaming of agent phases, tool calls, and results to the frontend

**Live URL:** https://koda-tau.vercel.app/

**GitHub URL:** https://github.com/keyur7523/koda
