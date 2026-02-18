"""
Migrate pages from <NavBar /> to <AppShell> wrapper.
For each file that imports NavBar:
1. Replace NavBar import with AppShell import
2. Remove <NavBar /> from JSX
3. Add <AppShell> wrapper inside the route component (or at top-level return)
"""
import re, os, sys

sys.stdout.reconfigure(encoding="utf-8")

BASE = r"C:\Users\natha\iopps-fresh\src"

# Files to SKIP (keep NavBar as-is)
SKIP = {
    os.path.normpath(os.path.join(BASE, "app", "org", "plans", "page.tsx")),
}

def find_files_with_navbar(base):
    """Find all .tsx files that import NavBar."""
    results = []
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith(".tsx") or f.endswith(".ts"):
                path = os.path.join(root, f)
                if os.path.normpath(path) in SKIP:
                    continue
                try:
                    with open(path, "r", encoding="utf-8") as fh:
                        content = fh.read()
                    if re.search(r'''import\s+NavBar\s+from\s+["']@/components/NavBar["']''', content):
                        results.append(path)
                except:
                    pass
    return results

def migrate_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Step 1: Replace NavBar import with AppShell import
    content = re.sub(
        r'''import\s+NavBar\s+from\s+["']@/components/NavBar["']\s*;?''',
        'import AppShell from "@/components/AppShell";',
        content,
    )

    # Step 2: Remove <NavBar /> line (preserving surrounding structure)
    # Handle both <NavBar /> and <NavBar/>
    content = re.sub(r'[ \t]*<NavBar\s*/>\s*\n', '', content)

    # Step 3: Add AppShell wrapper
    # Strategy: find the route wrapper or top-level div and wrap content inside

    # Check for ProtectedRoute wrapper
    if "<ProtectedRoute>" in content and "</ProtectedRoute>" in content:
        # Insert <AppShell> right after <ProtectedRoute>
        content = content.replace(
            "<ProtectedRoute>",
            "<ProtectedRoute>\n      <AppShell>",
            1,
        )
        # Insert </AppShell> right before </ProtectedRoute>
        # Find the LAST occurrence of </ProtectedRoute>
        idx = content.rfind("</ProtectedRoute>")
        if idx != -1:
            content = content[:idx] + "</AppShell>\n    </ProtectedRoute>" + content[idx + len("</ProtectedRoute>"):]

    elif "<AdminRoute>" in content and "</AdminRoute>" in content:
        content = content.replace(
            "<AdminRoute>",
            "<AdminRoute>\n      <AppShell>",
            1,
        )
        idx = content.rfind("</AdminRoute>")
        if idx != -1:
            content = content[:idx] + "</AppShell>\n    </AdminRoute>" + content[idx + len("</AdminRoute>"):]

    else:
        # No route wrapper — find the outermost return JSX and wrap it
        # Pattern: return (\n    <div ...
        # We need to wrap the top-level returned JSX with <AppShell>
        # Find `return (` and wrap the first child element
        match = re.search(r'(return\s*\(\s*\n)', content)
        if match:
            insert_pos = match.end()
            # Find the matching closing paren for this return
            # Insert <AppShell> right after return (
            content = content[:insert_pos] + "    <AppShell>\n" + content[insert_pos:]
            # Find the closing );
            # We need to find the matching ); for this return statement
            # Find the last ); before the end of the function
            close_match = re.search(r'\n(\s*)\);\s*\n\}', content[insert_pos:])
            if close_match:
                close_pos = insert_pos + close_match.start()
                content = content[:close_pos] + "\n    </AppShell>" + content[close_pos:]

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False

files = find_files_with_navbar(BASE)
print(f"Found {len(files)} files to migrate")

migrated = 0
errors = []
for path in sorted(files):
    rel = os.path.relpath(path, BASE)
    try:
        if migrate_file(path):
            migrated += 1
            print(f"  OK  {rel}")
        else:
            print(f"  SKIP {rel} (no changes)")
    except Exception as e:
        errors.append((rel, str(e)))
        print(f"  ERR {rel}: {e}")

print(f"\nDone: {migrated} files migrated, {len(errors)} errors")
if errors:
    for rel, err in errors:
        print(f"  {rel}: {err}")
