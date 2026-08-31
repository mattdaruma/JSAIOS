/**
 * JSAIOS - Single-purpose dev tool: countLines
 * Scans src/ and config/ for all code, markup, and data files, categorizes them by file extension,
 * calculates statistical line metrics (mean, median, max, min, per-category compliance),
 * exports a CSV report to reports/src_line_counts.csv, and prints a console summary.
 */

import fs from 'fs';
import path from 'path';

export interface ExtensionConfig {
  category: string;
  maxRecommendedLines: number;
}

export const FILE_TYPE_CONFIG: Record<string, ExtensionConfig> = {
  '.ts': { category: 'TypeScript Logic', maxRecommendedLines: 250 },
  '.tsx': { category: 'React Component', maxRecommendedLines: 250 },
  '.js': { category: 'JavaScript Logic', maxRecommendedLines: 250 },
  '.jsx': { category: 'JSX Component', maxRecommendedLines: 250 },
  '.css': { category: 'Stylesheet', maxRecommendedLines: 500 },
  '.scss': { category: 'SCSS Stylesheet', maxRecommendedLines: 500 },
  '.html': { category: 'HTML Template', maxRecommendedLines: 500 },
  '.json': { category: 'JSON Manifest', maxRecommendedLines: 350 },
  '.yaml': { category: 'YAML Config', maxRecommendedLines: 350 },
  '.yml': { category: 'YAML Config', maxRecommendedLines: 350 },
  '.svg': { category: 'SVG Asset', maxRecommendedLines: 1000 }
};

const DEFAULT_CONFIG: ExtensionConfig = { category: 'Generic File', maxRecommendedLines: 300 };

interface FileLineStat {
  relativePath: string;
  filename: string;
  extension: string;
  category: string;
  totalLines: number;
  nonEmptyLines: number;
  commentLines: number;
  maxRecommendedLines: number;
  isOversized: boolean;
}

function scanDirectory(dirPath: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const list = fs.readdirSync(dirPath);

  for (const file of list) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(scanDirectory(filePath));
    } else {
      results.push(filePath);
    }
  }

  return results;
}

function analyzeFile(absPath: string, rootDir: string): FileLineStat {
  const content = fs.readFileSync(absPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const ext = path.extname(absPath).toLowerCase();
  const cfg = FILE_TYPE_CONFIG[ext] || DEFAULT_CONFIG;

  let nonEmptyLines = 0;
  let commentLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      nonEmptyLines++;
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
        commentLines++;
      }
    }
  }

  const relativePath = path.relative(rootDir, absPath).replace(/\\/g, '/');
  const filename = path.basename(absPath);
  const isOversized = lines.length > cfg.maxRecommendedLines;

  return {
    relativePath,
    filename,
    extension: ext || 'none',
    category: cfg.category,
    totalLines: lines.length,
    nonEmptyLines,
    commentLines,
    maxRecommendedLines: cfg.maxRecommendedLines,
    isOversized
  };
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return sorted[middle];
}

export function runLineCountReport(): void {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, 'src');
  const reportsDir = path.join(rootDir, 'reports');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filePaths = scanDirectory(srcDir);
  const stats: FileLineStat[] = filePaths.map((p) => analyzeFile(p, rootDir));

  // Sort descending by total lines
  stats.sort((a, b) => b.totalLines - a.totalLines);

  const totalFiles = stats.length;
  const lineCounts = stats.map((s) => s.totalLines);
  const totalLines = lineCounts.reduce((acc, curr) => acc + curr, 0);

  const meanLines = totalFiles > 0 ? (totalLines / totalFiles).toFixed(1) : '0';
  const medianLines = calculateMedian(lineCounts);
  const maxStat = stats[0] || { relativePath: 'N/A', totalLines: 0 };
  const minStat = stats[stats.length - 1] || { relativePath: 'N/A', totalLines: 0 };

  const oversizedFiles = stats.filter((s) => s.isOversized);
  const compliantCount = totalFiles - oversizedFiles.length;
  const compliancePercentage = totalFiles > 0 ? ((compliantCount / totalFiles) * 100).toFixed(1) : '100';

  // Group stats by Category
  const categoryMap: Record<string, { count: number; totalLines: number }> = {};
  for (const s of stats) {
    if (!categoryMap[s.category]) {
      categoryMap[s.category] = { count: 0, totalLines: 0 };
    }
    categoryMap[s.category].count++;
    categoryMap[s.category].totalLines += s.totalLines;
  }

  // Generate CSV
  const csvHeaders = 'RelativePath,Filename,Extension,Category,TotalLines,NonEmptyLines,CommentLines,MaxThreshold,IsOversized\n';
  const csvRows = stats
    .map(
      (s) =>
        `"${s.relativePath}","${s.filename}","${s.extension}","${s.category}",${s.totalLines},${s.nonEmptyLines},${s.commentLines},${s.maxRecommendedLines},${s.isOversized}`
    )
    .join('\n');
  const csvPath = path.join(reportsDir, 'src_line_counts.csv');

  fs.writeFileSync(csvPath, csvHeaders + csvRows, 'utf-8');

  // Console output summary
  console.log('=======================================================================');
  console.log(' JSAIOS Codebase Line Count & Extension-Aware Modular Health Report');
  console.log('=======================================================================');
  console.log(` Total Project Files Analyzed: ${totalFiles}`);
  console.log(` Total Lines of Code          : ${totalLines}`);
  console.log(` Mean (Average) Lines         : ${meanLines} lines/file`);
  console.log(` Median Lines                 : ${medianLines} lines/file`);
  console.log(` Max File Size                : ${maxStat.totalLines} lines (${maxStat.relativePath})`);
  console.log(` Min File Size                : ${minStat.totalLines} lines (${minStat.relativePath})`);
  console.log(` Modular Health Compliance    : ${compliancePercentage}% compliant (${compliantCount}/${totalFiles} files within limits)`);

  console.log('\n Breakout by File Category:');
  for (const cat of Object.keys(categoryMap)) {
    const info = categoryMap[cat];
    const avg = (info.totalLines / info.count).toFixed(1);
    console.log(`  • ${cat.padEnd(25)} : ${info.count} file(s), ${info.totalLines} total lines (Avg: ${avg} lines/file)`);
  }

  if (oversizedFiles.length > 0) {
    console.log('\n Files Exceeding Recommended Modular Thresholds:');
    for (const f of oversizedFiles) {
      console.log(`  • ${f.relativePath.padEnd(45)} ${f.totalLines} lines (Limit: ${f.maxRecommendedLines} lines, ${f.category})`);
    }
  } else {
    console.log('\n 🎉 All project files are 100% compliant with recommended modular limits!');
  }

  console.log('\n Report generated successfully:');
  console.log(` CSV Output: reports/src_line_counts.csv`);
  console.log('=======================================================================');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('countLines.ts')) {
  runLineCountReport();
}
