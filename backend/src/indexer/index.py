from dataclasses import dataclass, field
from pathlib import Path
from .parser import parse_file
from .extractor import extract_symbols, Symbol, SymbolKind


@dataclass
class CodeIndex:
    """Index of all symbols in a codebase."""
    symbols: list[Symbol] = field(default_factory=list)
    files_indexed: list[str] = field(default_factory=list)

    def find_by_name(self, name: str) -> list[Symbol]:
        """Find symbols by name (case-insensitive partial match)."""
        name_lower = name.lower()
        return [s for s in self.symbols if name_lower in s.name.lower()]
    
    def find_by_kind(self, kind: SymbolKind) -> list[Symbol]:
        """Find all symbols of a given kind."""
        return [s for s in self.symbols if s.kind == kind]
    
    def find_in_file(self, filepath: str) -> list[Symbol]:
        """Find all symbols in a specific file."""
        return [s for s in self.symbols if s.filepath == filepath]
    
    def get_classes(self) -> list[Symbol]:
        """Get all class definitions."""
        return self.find_by_kind(SymbolKind.CLASS)
    
    def get_functions(self) -> list[Symbol]:
        """Get all function definitions (not methods)."""
        return self.find_by_kind(SymbolKind.FUNCTION)
    
    def get_methods(self, class_name: str | None = None) -> list[Symbol]:
        """Get methods, optionally filtered by class."""
        methods = self.find_by_kind(SymbolKind.METHOD)
        if class_name:
            methods = [m for m in methods if m.parent == class_name]
        return methods
    
    def summary(self) -> str:
        """Return a summary of the index."""
        classes = len(self.get_classes())
        functions = len(self.get_functions())
        methods = len(self.get_methods())
        imports = len(self.find_by_kind(SymbolKind.IMPORT))
        
        return (
            f"Indexed {len(self.files_indexed)} files: "
            f"{classes} classes, {functions} functions, "
            f"{methods} methods, {imports} imports"
        )


def build_index(root_dir: str = ".", file_pattern: str = "*.py") -> CodeIndex:
    """Build an index of all Python files in a directory."""
    index = CodeIndex()
    root = Path(root_dir)
    
    # Directories to skip
    skip_dirs = {"venv", ".venv", "__pycache__", ".git", "node_modules", "dist", "build"}
    
    def should_skip(path: Path) -> bool:
        return any(part in skip_dirs for part in path.parts)
    
    for filepath in root.rglob(file_pattern):
        if should_skip(filepath) or not filepath.is_file():
            continue
        
        try:
            result = parse_file(str(filepath))
            with open(filepath, "rb") as f:
                source = f.read()
            
            symbols = extract_symbols(str(filepath), result["root"], source)
            index.symbols.extend(symbols)
            index.files_indexed.append(str(filepath))
        except Exception as e:
            print(f"Warning: Failed to parse {filepath}: {e}")
    
    return index


if __name__ == "__main__":
    index = build_index("src")
    print(index.summary())
    print()
    
    # Show all classes
    print("Classes:")
    for cls in index.get_classes():
        print(f"  {cls.name} ({cls.filepath})")
    
    print()
    
    # Search example
    print("Symbols matching 'execute':")
    for sym in index.find_by_name("execute"):
        print(f"  [{sym.kind.value}] {sym.name} in {sym.filepath}")

