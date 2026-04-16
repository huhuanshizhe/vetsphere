import sys, os

outpath = os.path.join("e:", os.sep, "连川科技", "vetsphere", "tmp", "result.txt")
path = os.path.join("e:", os.sep, "连川科技", "vetsphere", "apps", "admin", "src", "app", "(admin)", "products", "[id]", "page.tsx")

with open(outpath, 'w', encoding='utf-8') as out:
    out.write(f"Path: {path}\n")
    out.write(f"Exists: {os.path.exists(path)}\n")
    
    if os.path.exists(path):
        with open(path, 'rb') as f:
            raw = f.read()
        
        has_crlf = b'\r\n' in raw
        sep = b'\r\n' if has_crlf else b'\n'
        lines = raw.split(sep)
        
        out.write(f"Size: {len(raw)}\n")
        out.write(f"CRLF: {has_crlf}\n")
        out.write(f"Lines: {len(lines)}\n")
        
        if len(lines) > 1050:
            for i in range(1036, 1050):
                out.write(f"{i+1}: {lines[i]}\n")
            
            # Remove stray lines
            to_remove = {1037, 1038, 1047}
            new_lines = [line for i, line in enumerate(lines) if i not in to_remove]
            
            with open(path, 'wb') as f:
                f.write(sep.join(new_lines))
            
            out.write(f"\nFixed! Lines: {len(lines)} -> {len(new_lines)}\n")
            for i in range(1036, 1047):
                out.write(f"{i+1}: {new_lines[i]}\n")
        else:
            out.write(f"Not enough lines!\n")
    else:
        out.write("File not found!\n")
