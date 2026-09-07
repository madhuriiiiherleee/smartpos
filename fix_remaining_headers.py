import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # For files with <header> that contain title, p, and a Link
    # Match the entire header
    header_pattern = re.compile(
        r'<header[^>]*>\s*<div[^>]*>\s*<div[^>]*>\s*<h1[^>]*>(.*?)</h1>.*?<p[^>]*>.*?</p>\s*</div>\s*(<Link[^>]*>.*?</Link>)?\s*</div>\s*</header>',
        re.DOTALL
    )
    
    def repl(m):
        title = m.group(1).strip()
        link_str = m.group(2)
        if link_str:
            # Change link color to teal
            link_str = re.sub(r'bg-brand-600', 'bg-teal-600', link_str)
            link_str = re.sub(r'hover:bg-brand-700', 'hover:bg-teal-700', link_str)
            return f'''<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">{title}</h1>
            {link_str}
          </div>'''
        else:
            return f'''<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">{title}</h1>
          </div>'''

    # Apply replacement for the typical header pattern
    new_content = header_pattern.sub(repl, content)

    # Note: we need to move this replacement block inside <main> if it's currently outside.
    # Actually, the replacement happens exactly where <header> was. We should move it inside <main>
    # Wait, the simplest way is to just let it be replaced. 
    # But wait, we want it inside <main> so the padding is correct.
    # Let's write a smarter replacement that extracts it, removes header, and puts the title inside <main>.

    # Let's just do it manually for safety.
