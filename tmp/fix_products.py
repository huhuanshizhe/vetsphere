import os

path = r'e:\连川科技\vetsphere\apps\admin\src\app\(admin)\products\[id]\page.tsx'

with open(path, 'rb') as f:
    raw = f.read()

lines = raw.split(b'\n')
print(f'Total lines: {len(lines)}')

# Show lines 1037-1050 (0-indexed: 1036-1049)
for i in range(1036, 1050):
    print(f'{i+1}: {lines[i]}')

# Remove line 1038 (comment), 1039 (blank), and 1048 (stray })
# 0-indexed: 1037, 1038, 1047
to_remove = {1037, 1038, 1047}
new_lines = [line for i, line in enumerate(lines) if i not in to_remove]

print(f'\nAfter fix ({len(new_lines)} lines):')
for i in range(1036, 1048):
    print(f'{i+1}: {new_lines[i]}')

with open(path, 'wb') as f:
    f.write(b'\n'.join(new_lines))

print('\nFile fixed!')
