const fs = require('fs');
const path = require('path');

// Get all affected files from the build output - we need to fix the syntax
// The issue: script turned `param =>` into `param: any =>` but it should be `(param: any) =>`
// We need to find patterns like `word: any =>` that are NOT inside parens and wrap them

const { execSync } = require('child_process');

// First, let's git checkout all affected files to undo the bad changes
// Then redo them properly
let tscOutput = '';
try {
  // First revert the bad changes by re-running tsc to find files that still have issues
  // Actually, let's just scan all .ts/.tsx files for the bad pattern and fix them
} catch(e) {}

// Find all files with the bad pattern: `word: any =>`  not inside parens
const srcDir = path.resolve('src');

function walkDir(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const allFiles = walkDir(srcDir);
let totalFixed = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Pattern 1: Fix `word: any =>` that's NOT inside parentheses
  // This matches cases like `.map(agent: any =>` and turns them into `.map((agent: any) =>`
  // We look for: open-paren, then immediately `word: any =>`
  const pattern1 = /\((\w+): any =>/g;
  if (pattern1.test(content)) {
    content = content.replace(/\((\w+): any =>/g, '(($1: any) =>');
    changed = true;
  }

  // Pattern 2: Fix `.forEach(word: any =>` similarly
  // Already covered by pattern 1

  // Pattern 3: Fix cases where there's already parens like `((word: any) =>` - these are fine
  // But we might have double-wrapped from pattern 1 if already in parens like `((agent: any) =>`
  // Check for triple parens: `(((word: any) =>` and unwrap one level
  content = content.replace(/\(\((\(\w+: any\)) =>/g, '($1 =>');

  // Pattern 4: Fix cases in .find(), .filter(), .some() etc where it's `callback(d: any =>`
  // These should also be `(d: any) =>`
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
  }
}

console.log(`\nFixed ${totalFixed} files`);
