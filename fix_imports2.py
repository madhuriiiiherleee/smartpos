import os
import re

def fix_imports(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add ArrowLeft to lucide-react import
    content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"]', lambda m: f"import {{{m.group(1).strip()}, ArrowLeft}} from 'lucide-react'" if 'ArrowLeft' not in m.group(1) else m.group(0), content)
        
    # Add Link to react-router-dom import
    content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'"]react-router-dom[\'"]', lambda m: f"import {{{m.group(1).strip()}, Link}} from 'react-router-dom'" if 'Link' not in m.group(1) else m.group(0), content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_imports('front end/src/pages/sales/SalesEntryPage.jsx')
fix_imports('front end/src/pages/sales/SalesOrderEntryPage.jsx')
