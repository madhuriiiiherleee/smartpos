import os
import re

for root, dirs, files in os.walk('front end/src'):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if '<Link' in content and 'Link' not in content[:content.find('function')]:
                print(f"Missing Link import in {filepath}")
                
            if '<ArrowLeft' in content and 'ArrowLeft' not in content[:content.find('function')]:
                print(f"Missing ArrowLeft import in {filepath}")
