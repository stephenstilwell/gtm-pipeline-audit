#!/usr/bin/env node
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import {
  analyzePipeline,
  optimizePipeline,
  comparePipelines,
  generateMarkdownReport,
  parseCSV,
  auditLeadData
} from '../src/index.js';

const options = {
  file: { type: 'string', short: 'f' },
  format: { type: 'string', default: 'text' },
  optimize: { type: 'boolean', default: false },
  output: { type: 'string', short: 'o' },
  help: { type: 'boolean', short: 'h' }
};

const { values, positionals } = parseArgs({ options, allowPositionals: true });

if (values.help || (!values.file && positionals.length === 0)) {
  console.log(`
Usage: gtm-pipeline-audit <path-to-file> [options]

Supported Input:
  - JSON (.json): Pipeline architecture definitions (waterfalls, filters, scrapers)
  - CSV  (.csv) : Raw lead exports (evaluates fill rates, freemails, role inboxes, short numbers)

Options:
  -f, --file        Path to input file (.json or .csv)
  --format          Output format: text | json | markdown (default: text)
  --optimize        Calculate automated optimization & projected budget savings (JSON only)
  -o, --output      Save optimized output to a specified path
  -h, --help        Show this help message
`);
  process.exit(0);
}

const targetPath = values.file || positionals[0];
const fullPath = path.resolve(process.cwd(), targetPath);

try {
  const content = fs.readFileSync(fullPath, 'utf8');

  if (fullPath.endsWith('.csv')) {
    const records = parseCSV(content);
    const audit = auditLeadData(records);

    if (values.format === 'json') {
      console.log(JSON.stringify(audit, null, 2));
    } else {
      console.log(`\n=== GTM Lead Data Hygiene Audit ===\n`);
      console.log(`File:              ${path.basename(fullPath)}`);
      console.log(`Total Records:     ${audit.totalRecords.toLocaleString()}`);
      console.log(`Emails Evaluated:  ${audit.summary.totalEmailsAnalyzed.toLocaleString()}`);
      console.log(`Phones Evaluated:  ${audit.summary.totalPhonesAnalyzed.toLocaleString()}\n`);

      console.log(`--- Field Fill Rates ---`);
      for (const [col, stats] of Object.entries(audit.fields)) {
        const pct = ((stats.populated / audit.totalRecords) * 100).toFixed(1);
        console.log(`  ${col.padEnd(20)}: ${stats.populated} populated (${pct}%)`);
      }

      if (audit.issues.length > 0) {
        console.log(`\n--- Hygiene & Deliverability Issues (${audit.issues.length}) ---`);
        for (const issue of audit.issues) {
          console.log(`[${issue.severity.toUpperCase()}] ${issue.metric}: ${issue.count} (${issue.percentage}%)`);
          console.log(`  ${issue.recommendation}\n`);
        }
      } else {
        console.log(`\nNo critical hygiene issues detected.\n`);
      }
    }
  } else {
    // JSON pipeline audit
    const pipeline = JSON.parse(content);

    if (values.optimize) {
      const optimized = optimizePipeline(pipeline);
      const comparison = comparePipelines(pipeline, optimized);

      if (values.output) {
        fs.writeFileSync(path.resolve(process.cwd(), values.output), JSON.stringify(optimized, null, 2), 'utf8');
      }

      if (values.format === 'json') {
        console.log(JSON.stringify(comparison, null, 2));
      } else {
        console.log(`\n=== GTM Pipeline Optimization Analysis ===\n`);
        console.log(`Original Projected Cost:  $${comparison.original.totalCost.toFixed(2)}`);
        console.log(`Optimized Projected Cost: $${comparison.optimized.totalCost.toFixed(2)}`);
        console.log(`Projected Net Savings:    $${comparison.costSavings.toFixed(2)} (${comparison.percentageSavings.toFixed(1)}% reduction)\n`);
        
        console.log(`--- Optimization Changes Applied ---`);
        console.log(`1. Hoisted qualification filters before paid enrichment steps.`);
        console.log(`2. Re-sequenced waterfall fallback providers by ascending cost-per-attempt.\n`);

        if (values.output) {
          console.log(`Optimized pipeline saved to: ${values.output}\n`);
        }
      }
    } else {
      const result = analyzePipeline(pipeline);

      if (values.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else if (values.format === 'markdown') {
        console.log(generateMarkdownReport(result));
      } else {
        console.log(`\n=== GTM Pipeline Audit: ${result.name} ===\n`);
        console.log(`Input Volume:         ${result.volume.toLocaleString()} records`);
        console.log(`Estimated Match Rate: ${(result.matchRate * 100).toFixed(1)}% (${result.successfulEnrichments.toLocaleString()} records)`);
        console.log(`Total Projected Cost: $${result.totalCost.toFixed(2)}`);
        console.log(`Effective Cost / Rec: $${result.effectiveCostPerRecord.toFixed(4)} per input record`);
        console.log(`Cost / Success Lead:  $${result.effectiveCostPerMatchedLead.toFixed(4)} per enriched lead`);
        
        if (result.findings.length > 0) {
          console.log(`\n--- Recommendations & Findings (${result.findings.length}) ---`);
          for (const finding of result.findings) {
            console.log(`[${finding.severity.toUpperCase()}] ${finding.title}`);
            console.log(`  ${finding.message}\n`);
          }
          console.log(`Tip: Run with --optimize to see projected savings after automated re-sequencing.\n`);
        } else {
          console.log(`\nNo configuration issues found. Waterfall sequence is optimal.\n`);
        }
      }
    }
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
