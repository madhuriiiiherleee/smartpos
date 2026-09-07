import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add uppercase tracking-wide to any h1 class that doesn't have it
    def repl(m):
        cls = m.group(1)
        if 'uppercase' not in cls:
            return f'<h1 className="{cls} uppercase tracking-wide"'
        return m.group(0)

    content = re.sub(r'<h1 className="([^"]+)"', repl, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
for root, dirs, files in os.walk('front end/src'):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
