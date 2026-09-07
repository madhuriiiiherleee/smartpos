import os
import re
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match <header> block and extract the title from <h1>
    header_pattern = re.compile(r'<header[^>]*>\s*<div[^>]*>\s*<h1[^>]*>(.*?)</h1>\s*(?:<p[^>]*>.*?</p>\s*)?</div>\s*</header>', re.DOTALL)
    
    match = header_pattern.search(content)
    if not match:
        return False
        
    title = match.group(1).strip()
    
    # Remove the header
    new_content = header_pattern.sub('', content)
    
    # Check if there's a PageToolbar
    if '<PageToolbar' in new_content:
        new_content = re.sub(r'<PageToolbar', f'<PageToolbar\\n        title="{title}"', new_content, count=1)
    else:
        # Just insert the title at the top of <main>
        main_pattern = re.compile(r'(<main[^>]*>)')
        main_match = main_pattern.search(new_content)
        if main_match:
            title_block = f'\\n        <div className="mb-6 flex items-center justify-between">\\n          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>\\n        </div>'
            new_content = new_content[:main_match.end()] + title_block + new_content[main_match.end():]
            
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
        return True
    return False

if __name__ == '__main__':
    count = 0
    for root, dirs, files in os.walk('front end/src'):
        for file in files:
            if file.endswith('.jsx'):
                if process_file(os.path.join(root, file)):
                    count += 1
    print(f"Updated {count} files")
