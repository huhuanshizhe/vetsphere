import sys, os
sys.stdout.write("Script started\n")
sys.stdout.flush()

path = os.path.join("e:", os.sep, "连川科技", "vetsphere", "apps", "admin", "src", "app", "(admin)", "products", "[id]", "page.tsx")
sys.stdout.write(f"Path: {path}\n")
sys.stdout.write(f"Exists: {os.path.exists(path)}\n")
sys.stdout.flush()

if os.path.exists(path):
    with open(path, 'rb') as f:
        raw = f.read()
    sys.stdout.write(f"Size: {len(raw)}\n")
    sys.stdout.flush()
