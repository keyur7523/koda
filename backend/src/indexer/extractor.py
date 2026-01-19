from dataclasses import dataclass
from enum import Enum
from tree_sitter import Node


class SymbolKind(Enum):
    FUNCTION = "function"
    CLASS = "class"
    METHOD = "method"
    IMPORT = "import"
    VARIABLE = "variable"


@dataclass
class Symbol:
    name: str
    kind: SymbolKind
    filepath: str
    start_line: int
    end_line: int
    signature: str | None = None  # For functions: "def foo(a, b) -> int"
    parent: str | None = None     # For methods: class name


def extract_symbols(filepath: str, root_node: Node, source: bytes) -> list[Symbol]:
    """Extract all symbols from a parsed syntax tree."""
    symbols = []
    
    def get_text(node: Node) -> str:
        return source[node.start_byte:node.end_byte].decode("utf-8")
    
    def visit(node: Node, parent_class: str | None = None):
        # Function definitions
        if node.type == "function_definition":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = get_text(name_node)
                kind = SymbolKind.METHOD if parent_class else SymbolKind.FUNCTION
                
                # Build signature
                params_node = node.child_by_field_name("parameters")
                return_node = node.child_by_field_name("return_type")
                sig = f"def {name}{get_text(params_node) if params_node else '()'}"
                if return_node:
                    sig += f" -> {get_text(return_node)}"
                
                symbols.append(Symbol(
                    name=name,
                    kind=kind,
                    filepath=filepath,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    signature=sig,
                    parent=parent_class,
                ))
        
        # Class definitions
        elif node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = get_text(name_node)
                symbols.append(Symbol(
                    name=name,
                    kind=SymbolKind.CLASS,
                    filepath=filepath,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                ))
                # Visit children with class context
                for child in node.children:
                    visit(child, parent_class=name)
                return  # Don't double-visit children
        
        # Import statements
        elif node.type in ("import_statement", "import_from_statement"):
            symbols.append(Symbol(
                name=get_text(node),
                kind=SymbolKind.IMPORT,
                filepath=filepath,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
            ))
        
        # Recurse
        for child in node.children:
            visit(child, parent_class)
    
    visit(root_node)
    return symbols


if __name__ == "__main__":
    from .parser import parse_file
    
    result = parse_file("src/agent/orchestrator.py")
    with open("src/agent/orchestrator.py", "rb") as f:
        source = f.read()
    
    symbols = extract_symbols(result["filepath"], result["root"], source)
    
    print(f"Found {len(symbols)} symbols:\n")
    for sym in symbols:
        if sym.kind == SymbolKind.IMPORT:
            continue  # Skip imports for cleaner output
        prefix = f"  {sym.parent}." if sym.parent else ""
        print(f"[{sym.kind.value}] {prefix}{sym.name} (L{sym.start_line}-{sym.end_line})")
        if sym.signature:
            print(f"         {sym.signature}")

