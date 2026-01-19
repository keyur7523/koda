from fastapi import WebSocket
from typing import Callable
import json
import asyncio

class StreamingCallback:
    """Callback handler that sends events to WebSocket."""
    
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.loop = asyncio.get_event_loop()
    
    async def send(self, event_type: str, data: dict):
        await self.websocket.send_json({
            "type": event_type,
            "data": data
        })
    
    def on_phase_change(self, phase: str):
        asyncio.run_coroutine_threadsafe(
            self.send("phase", {"phase": phase}),
            self.loop
        )
    
    def on_tool_call(self, name: str, args: dict):
        asyncio.run_coroutine_threadsafe(
            self.send("tool_call", {"name": name, "args": args}),
            self.loop
        )
    
    def on_tool_result(self, name: str, result: str):
        asyncio.run_coroutine_threadsafe(
            self.send("tool_result", {"name": name, "result": result[:500]}),
            self.loop
        )
    
    def on_summary(self, summary: str):
        asyncio.run_coroutine_threadsafe(
            self.send("summary", {"summary": summary}),
            self.loop
        )
    
    def on_plan(self, plan: list):
        asyncio.run_coroutine_threadsafe(
            self.send("plan", {"plan": plan}),
            self.loop
        )

