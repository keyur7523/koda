import tree_sitter_python as tspython
from tree_sitter import Language, Parser

# Initialize Python language
PY_LANGUAGE = Language(tspython.language())


def get_parser(language: str = "python") -> Parser:
    """Get a tree-sitter parser for the given language."""
    parser = Parser(PY_LANGUAGE)
    return parser


def parse_file(filepath: str) -> dict:
    """Parse a file and return the syntax tree."""
    parser = get_parser()
    
    with open(filepath, "rb") as f:
        content = f.read()
    
    tree = parser.parse(content)
    return {
        "filepath": filepath,
        "tree": tree,
        "root": tree.root_node,
    }


if __name__ == "__main__":
    # Test with a real file
    result = parse_file("src/main.py")
    print(f"Parsed: {result['filepath']}")
    print(f"Root node type: {result['root'].type}")
    print(f"Children: {len(result['root'].children)}")

