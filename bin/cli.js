#!/usr/bin/env node
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import {
  analyzePipeline,
  optimizePipeline,
  comparePipelines,
  generateMarkdownReport,
  generateHtmlReport,
  parseCSV,
  auditLeadData,
  cleanLeadData,
  toCSV,
  listPresets,
  WATERFALL_PRESETS
} from '../src/index.js';

const options = {
  file: { type: 'string', short: 'f' },
  format: { type: 'string', default: 'text' },
  optimize: { type: 'boolean', default: false },
  clean: { type: 'boolean', default: false },
  presets: { type: 'boolean', default: false },
  usePreset: { type: 'string' },
  output: { type: 'string', short: 'o' },
  help: { type: 'boolean', short: 'h' }
};

const { values, positionals } = parseArgs({ options, allowPositionals: true });

if (values.presets) {
  const { providers, waterfalls } = listPresets();
  console.log(`\n=== GTM Pipeline Audit: Provider & Waterfall Presets ===\n`);
  console.log(`--- Standard Waterfall Presets ---`);
  for (const wf of waterfalls) {
    console.log(`  ID: ${wf.id}`);
    console.log(`  Name: ${wf.name} (Stages: ${wf.stages.length})\n`);
  }
  console.log(`--- Industry Benchmark Providers ---`);
  for (const p of providers) {
    const policy = p.chargePolicy === 'per_hit' ? 'per match' : 'per attempt';
    console.log(`  [${p.id}] ${p.name}: $${p.costPerCall}/${policy} (~${(p.hitRate * 100).toFixed(0)}% hit rate)`);
  }
  console.log(`\nRun with --usePreset <id> to audit or export a reference waterfall.\n`);
  process.exit(0);
}

if (values.usePreset) {
  const preset = WATERFALL_PRESETS[values.usePreset];
  if (!preset) {
    console.error(`Unknown preset "${values.usePreset}". Run with --presets to view available templates.`);
    process.exit(1);
  }

  if (values.output && !values.format.includes('html')) {
    fs.writeFileSync(path.resolve(process.cwd(), values.output), JSON.stringify(preset, null, 2), 'utf8');
    console.log(`\nPreset "${values.usePreset}" exported to ${values.output}\n`);
    process.exit(0);
  }

  const result = analyzePipeline(preset);
  if (values.format === 'html') {
    const html = generateHtmlReport(result);
    if (values.output) {
      fs.writeFileSync(path.resolve(process.cwd(), values.output), html, 'utf8');
      console.log(`\nHTML report written to: ${values.output}\n`);
    } else {
      console.log(html);
    }
  } else if (values.format === 'markdown') {
    console.log(generateMarkdownReport(result));
  } else {
    console.log(`\n=== GTM Pipeline Audit Preset: ${preset.name} ===\n`);
    console.log(`Volume:               ${result.volume.toLocaleString()} records`);
    console.log(`Total Projected Cost: $${result.totalCost.toFixed(2)}`);
    console.log(`Effective Cost / Rec: $${result.effectiveCostPerRecord.toFixed(4)} per record`);
    console.log(`Cost / Success Lead:  $${result.effectiveCostPerMatchedLead.toFixed(4)} per lead`);
    console.log(`Match Rate:           ${(result.matchRate * 100).toFixed(1)}%\n`);
    console.log(`Tip: Pass -o <file.json> to export this preset as a starting template.\n`);
  }
  process.exit(0);
}

if (values.help || (!values.file && positionals.length === 0)) {
  console.log(`
Usage: gtm-pipeline-audit <path-to-file> [options]

Supported Input:
  - JSON (.json): Pipeline architecture definitions (waterfalls, filters, scrapers)
  - CSV  (.csv) : Raw lead exports (evaluates fill rates, freemails, role inboxes, short numbers)

Options:
  -f, --file        Path to input file (.json or .csv)
  --format          Output format: text | json | markdown | html (default: text)
  --optimize        Calculate automated optimization & projected budget savings (JSON only)
  --clean           Clean CSV lead list (remove personal freemails, generic inboxes, duplicates)
  --presets         List built-in provider market rates and reference waterfall templates
  --usePreset <id>  Inspect or export a reference waterfall template (e.g. b2b-email-discovery)
  -o, --output      Save optimized JSON, cleaned CSV, or exported HTML to a specified path
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

    if (values.clean) {
      const cleanResult = cleanLeadData(records);
      const cleanedCsv = toCSV(cleanResult.cleaned);

      if (values.output) {
        fs.writeFileSync(path.resolve(process.cwd(), values.output), cleanedCsv, 'utf8');
      }

      if (values.format === 'json') {
        console.log(JSON.stringify(cleanResult.stats, null, 2));
      } else {
        console.log(`\n=== GTM Lead Data Cleaning Report ===\n`);
        console.log(`Input Leads:    ${cleanResult.stats.inputCount}`);
        console.log(`Retained Leads: ${cleanResult.stats.cleanedCount} (${(cleanResult.stats.retentionRate * 100).toFixed(1)}%)`);
        console.log(`Filtered Leads: ${cleanResult.stats.rejectedCount}\n`);

        if (cleanResult.rejected.length > 0) {
          console.log(`--- Rejection Sample ---`);
          for (const item of cleanResult.rejected.slice(0, 5)) {
            const emailKey = Object.keys(item.record).find(k => k.toLowerCase().includes('email'));
            const emailVal = emailKey ? item.record[emailKey] : '(no email)';
            console.log(`- ${emailVal}: ${item.reason}`);
          }
          console.log('');
        }

        if (values.output) {
          console.log(`Cleaned CSV saved to: ${values.output}\n`);
        } else if (!values.output && values.format !== 'json') {
          console.log(`Tip: Pass -o <clean-leads.csv> to write the cleaned dataset directly.\n`);
        }
      }
    } else {
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
          console.log(`Tip: Run with --clean -o <output.csv> to strip deliverability risks before sequencing.\n`);
        } else {
          console.log(`\nNo critical hygiene issues detected.\n`);
        }
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

      if (values.format === 'html') {
        const html = generateHtmlReport(result);
        if (values.output) {
          fs.writeFileSync(path.resolve(process.cwd(), values.output), html, 'utf8');
          console.log(`\nStandalone HTML report written to: ${values.output}\n`);
        } else {
          console.log(html);
        }
      } else if (values.format === 'json') {
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
          console.log(`Tip: Run with --format html -o report.html for a visual executive dashboard.\n`);
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
