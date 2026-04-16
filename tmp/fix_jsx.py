import sys

path = r'e:\连川科技\vetsphere\apps\admin\src\app\(admin)\products\[id]\page.tsx'

with open(path, 'rb') as f:
    raw = f.read()

print(f'File size: {len(raw)}', flush=True)
print(f'First 50 bytes: {raw[:50]}', flush=True)

has_lf = b'\n' in raw
has_crlf = b'\r\n' in raw
print(f'Has LF: {has_lf}', flush=True)
print(f'Has CRLF: {has_crlf}', flush=True)

if has_crlf:
    lines = raw.split(b'\r\n')
else:
    lines = raw.split(b'\n')

print(f'Total lines: {len(lines)}', flush=True)

if len(lines) > 1050:
    for i in range(1036, 1050):
        print(f'{i+1}: {lines[i]}', flush=True)
    
    # Remove lines: 1038 (comment), 1039 (blank), 1048 (stray })
    # 0-indexed: 1037, 1038, 1047
    to_remove = {1037, 1038, 1047}
    new_lines = [line for i, line in enumerate(lines) if i not in to_remove]
    
    sep = b'\r\n' if has_crlf else b'\n'
    with open(path, 'wb') as f:
        f.write(sep.join(new_lines))
    
    print(f'\nFixed! New total lines: {len(new_lines)}', flush=True)
    
    # Verify
    for i in range(1036, 1047):
        print(f'{i+1}: {new_lines[i]}', flush=True)
else:
    print(f'ERROR: Expected 2000+ lines but got {len(lines)}', flush=True)
