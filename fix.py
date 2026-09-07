import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix literal \n in string
    content = content.replace('\\n', '\n')
    
    # Fix empty return ()
    empty_return = re.compile(r'return\s*\(\s*\)', re.DOTALL)
    content = empty_return.sub('return null', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
for root, dirs, files in os.walk('front end/src'):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
