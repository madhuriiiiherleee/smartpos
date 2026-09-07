import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    # Remove top shade from cards
    content = content.replace('border-t-4 border-brand-500 ', '')
    
    # Change teal buttons to the sidebar color (#103252)
    content = content.replace('bg-teal-600', 'bg-[#103252]')
    content = content.replace('hover:bg-teal-700', 'hover:bg-[#0c263e]')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
for root, dirs, files in os.walk('front end/src'):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
