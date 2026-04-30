const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = ['node_modules', '.git', '.next', 'out', 'build', 'dist', 'coverage'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.gs'];

function walkDir(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        results = results.concat(walkDir(filePath, baseDir));
      }
    } else if (EXTENSIONS.includes(path.extname(file))) {
      const relativePath = path.relative(baseDir, filePath);
      results.push(relativePath);
    }
  });
  return results;
}

function extractImports(content) {
  const importRegex = /^import\s+.*?['"`].*?['"`]|import\s*\(\s*['"`].*?['"`]\s*\)/gm;
  return content.match(importRegex) || [];
}

function extractExports(content) {
  const exportRegex = /^export\s+(default\s+)?(function|const|let|var|class|interface|type|async function)/gm;
  const matches = content.match(exportRegex) || [];
  return matches.map(m => m.trim());
}

function extractApiCalls(content) {
  const fetchRegex = /fetch\s*\(/g;
  const firestoreRegex = /db\.collection|\.doc\(|\.where\(|\.add\(|\.set\(|\.update\(|\.delete\(/g;
  const sheetsApiRegex = /SpreadsheetApp|UrlFetchApp|getSheetByName|getRange|setValue/g;
  const webhookRegex = /envoyerWebhook|UrlFetchApp\.fetch/g;
  return {
    fetch: (content.match(fetchRegex) || []).length,
    firestore: (content.match(firestoreRegex) || []).length,
    sheetsApi: (content.match(sheetsApiRegex) || []).length,
    webhook: (content.match(webhookRegex) || []).length,
  };
}

function analyzeFile(filePath, baseDir) {
  const fullPath = path.join(baseDir, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  return {
    file: filePath,
    imports: extractImports(content),
    exports: extractExports(content),
    apiCalls: extractApiCalls(content),
    size: content.length,
  };
}

const projectRoot = process.cwd();
const files = walkDir(projectRoot);
const analysis = {
  root: projectRoot,
  generatedAt: new Date().toISOString(),
  totalFiles: files.length,
  files: files.map(f => analyzeFile(f, projectRoot)),
};

console.log(JSON.stringify(analysis, null, 2));
