import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    content = content.replace(
        '<tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">',
        '<tr className="bg-[#103252] text-xs uppercase tracking-wide text-white">'
    )
    
    # Check if there are other similar ones, like printing versions
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
for root, dirs, files in os.walk('front end/src'):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
