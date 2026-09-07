
import re

def fix_customer():
    p = "front end/src/pages/master-settings/CustomerPage.jsx"
    with open(p, "r", encoding="utf-8") as f: c = f.read()
    c = re.sub(r"\{\s*key:\s*'address_line1',\s*label:\s*'Address',\s*className:\s*'max-w-xs truncate'\s*\},", "", c)
    with open(p, "w", encoding="utf-8") as f: f.write(c)

def fix_vendor():
    p = "front end/src/pages/master-settings/VendorPage.jsx"
    with open(p, "r", encoding="utf-8") as f: c = f.read()
    c = re.sub(r"\{\s*key:\s*'email',\s*label:\s*'Email'\s*\},", "", c)
    c = re.sub(r"\{\s*key:\s*'gst_number',\s*label:\s*'GST Number'\s*\},", "", c)
    with open(p, "w", encoding="utf-8") as f: f.write(c)

def fix_product():
    p = "front end/src/pages/master-settings/ProductPage.jsx"
    with open(p, "r", encoding="utf-8") as f: c = f.read()
    c = re.sub(r"<th className=\"px-5 py-3 font-medium\">HSN No\.</th>\n", "", c)
    c = re.sub(r"<th className=\"px-5 py-3 font-medium\">GST</th>\n", "", c)
    c = re.sub(r"<th className=\"px-5 py-3 text-right font-medium\">Pack Sizes</th>\n", "", c)
    
    # And we also need to remove the corresponding <td> from the tbody
    c = re.sub(r"<td className=\"px-5 py-3\.5 text-slate-500\">\{product\.hsn_code \|\| '—'\}</td>\n", "", c)
    c = re.sub(r"<td className=\"px-5 py-3\.5 tabular-nums text-slate-500\">\{product\.cgst_percent == null && product\.sgst_percent == null \? '—' : `\$\{product\.cgst_percent \+ product\.sgst_percent\}%`\}</td>\n", "", c)
    
    # For Pack sizes:
    c = re.sub(r"<td className=\"px-5 py-3\.5 text-right tabular-nums text-slate-500\">\{product\.details_count || 0\}</td>\n", "", c)
    
    # And we need to adjust the colSpan for the loading skeleton in ProductPage
    c = c.replace("colSpan={11}", "colSpan={8}")
    c = c.replace("colSpan={12}", "colSpan={9}") # Just in case

    with open(p, "w", encoding="utf-8") as f: f.write(c)

fix_customer()
fix_vendor()
fix_product()

