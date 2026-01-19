from ..indexer.index import build_index, CodeIndex
from ..indexer.extractor import SymbolKind

# Cache the index so we don't rebuild on every call
_cached_index: CodeIndex | None = None


def get_index() -> CodeIndex:
    """Get or build the code index."""
    global _cached_index
    if _cached_index is None:
        _cached_index = build_index(".")
    return _cached_index


def clear_index_cache():
    """Clear the cached index (call after file changes)."""
    global _cached_index
    _cached_index = None


def index_symbols(kind: str | None = None) -> str:
    """
    Get a summary of symbols in the codebase.
    
    Args:
        kind: Filter by symbol kind (class, function, method) or None for summary
    
    Returns:
        Formatted list of symbols
    """
    index = get_index()
    
    if kind is None:
        # Return summary
        lines = [index.summary(), ""]
        
        lines.append("Classes:")
        for cls in index.get_classes():
            lines.append(f"  {cls.name} ({cls.filepath}:{cls.start_line})")
        
        lines.append("\nFunctions:")
        for func in index.get_functions()[:15]:  # Limit to 15
            sig = func.signature or func.name
            lines.append(f"  {sig} ({func.filepath}:{func.start_line})")
        
        if len(index.get_functions()) > 15:
            lines.append(f"  ... and {len(index.get_functions()) - 15} more")
        
        return "\n".join(lines)
    
    # Filter by kind
    kind_map = {
        "class": SymbolKind.CLASS,
        "function": SymbolKind.FUNCTION,
        "method": SymbolKind.METHOD,
        "import": SymbolKind.IMPORT,
    }
    
    if kind.lower() not in kind_map:
        return f"Unknown kind '{kind}'. Use: class, function, method, import"
    
    symbols = index.find_by_kind(kind_map[kind.lower()])
    lines = [f"Found {len(symbols)} {kind}(s):", ""]
    
    for sym in symbols[:30]:  # Limit output
        if sym.signature:
            lines.append(f"  {sym.signature}")
        else:
            lines.append(f"  {sym.name}")
        lines.append(f"    → {sym.filepath}:{sym.start_line}")
    
    if len(symbols) > 30:
        lines.append(f"\n  ... and {len(symbols) - 30} more")
    
    return "\n".join(lines)


def find_symbol(name: str) -> str:
    """
    Search for symbols by name.
    
    Args:
        name: Symbol name to search for (partial match)
    
    Returns:
        Matching symbols with locations
    """
    index = get_index()
    matches = index.find_by_name(name)
    
    if not matches:
        return f"No symbols found matching '{name}'"
    
    lines = [f"Found {len(matches)} symbol(s) matching '{name}':", ""]
    
    for sym in matches[:20]:
        prefix = f"{sym.parent}." if sym.parent else ""
        lines.append(f"  [{sym.kind.value}] {prefix}{sym.name}")
        if sym.signature:
            lines.append(f"    {sym.signature}")
        lines.append(f"    → {sym.filepath}:{sym.start_line}-{sym.end_line}")
    
    if len(matches) > 20:
        lines.append(f"\n  ... and {len(matches) - 20} more")
    
    return "\n".join(lines)


if __name__ == "__main__":
    print("=== Index Summary ===")
    print(index_symbols())
    print("\n=== Find 'run' ===")
    print(find_symbol("run"))

