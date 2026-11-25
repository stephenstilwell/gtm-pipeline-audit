# GTM Pipeline Audit

`gtm-pipeline-audit` is a lightweight, zero-dependency command-line utility and library designed for GTM engineers, RevOps builders, and growth practitioners. It audits and optimizes both **multi-stage outbound pipeline designs** (waterfalls, filters, scrapers) and **real lead data exports (CSV)** to eliminate budget waste, deliverability risk, and vendor lock-in.

## Why This Exists

Modern GTM engineering workflows rely heavily on cascading enrichment providers (waterfalls) and automated LLM qualification steps. Teams frequently suffer from:
1. **Late Filtering:** Calling expensive phone or email discovery APIs on raw leads before running free qualification filters (e.g., ICP geography, company size, or domain exclusions).
2. **Suboptimal Waterfall Sequences:** Placing high-cost API endpoints before lower-cost, high-coverage endpoints in fallback cascades.
3. **Data Quality & Deliverability Waste:** Spending enrichment credits on consumer emails (e.g. `@gmail.com`), generic role inboxes (e.g. `sales@`, `info@`), or dialing malformed phone numbers.
4. **Opaque Unit Economics & Provider Pricing:** Lack of benchmark awareness on actual market prices (per-attempt vs. per-hit) across popular vendors (Apollo, Prospeo, Findymail, Cognism, Datagma, LLM classifiers).

## Features

- **JSON Pipeline Audit:** Evaluates waterfall fallback cascades, detects late filters, and models cost per input record vs. cost per successfully enriched lead.
- **Standalone Visual HTML Reports (`--format html`):** Generates self-contained executive HTML dashboards with KPI cards, waterfall cascade flow tables, and highlighted governance alerts.
- **Automated Pipeline Optimizer (`--optimize`):** Automatically hoists qualification filters and reorders waterfalls by ascending cost-per-attempt, projecting net budget savings.
- **Provider Benchmark Catalog & Presets (`--presets`, `--usePreset`):** Built-in industry benchmarks for email finders, direct dials, and LLM classifiers. Export production-grade waterfall templates with a single flag.
- **CSV Lead Data Hygiene Audit:** Directly audits exported CSV batches (from Clay, Apollo, ZoomInfo, etc.) reporting column fill rates, personal freemail domains, generic role inboxes, and malformed phone numbers.
- **Automated CSV Sanitizer (`--clean`):** Strips consumer freemails, generic role inboxes, and duplicate records to protect sender reputation and prevent wasted API/sequencing spend.
- **Zero External Dependencies:** Built entirely with native Node.js ES modules and the built-in test runner.

## Quickstart

Requires Node.js 20 or newer.

### 1. Generate an Executive HTML Audit Dashboard

```sh
node bin/cli.js examples/unoptimized-pipeline.json --format html -o reports/audit-report.html
```

### 2. View Provider Benchmarks & Reference Templates

```sh
node bin/cli.js --presets
```

Export an optimized email discovery waterfall template to edit:
```sh
node bin/cli.js --usePreset b2b-email-discovery -o my-waterfall.json
```

### 3. Audit Lead Data from CSV

```sh
node bin/cli.js examples/csv/leads-sample.csv
```

Outputs:
```text
=== GTM Lead Data Hygiene Audit ===

File:              leads-sample.csv
Total Records:     8
Emails Evaluated:  8
Phones Evaluated:  7

--- Field Fill Rates ---
  first_name          : 8 populated (100.0%)
  last_name           : 8 populated (100.0%)
  company             : 8 populated (100.0%)
  title               : 8 populated (100.0%)
  work_email          : 8 populated (100.0%)
  direct_phone        : 7 populated (87.5%)

--- Hygiene & Deliverability Issues (3) ---
[WARNING] Personal/Freemail Domains in B2B List: 2 (25.0%)
  2 records (25.0%) use personal consumer emails (e.g. @gmail.com). Filter these out before sending to CRM or email warmup sequences.

[WARNING] Generic Role Inboxes: 2 (25.0%)
  2 records (25.0%) are generic role accounts (e.g. sales@, info@). Avoid using premium enrichment credits on generic aliases.

[WARNING] Malformed / Short Phone Numbers: 2 (28.6%)
  2 records (28.6%) have fewer than 7 digits. These should be cleaned before passing to SDR dialers or SMS sequences.
```

### 4. Clean & Sanitize Lead CSV Before Outbound

Clean out invalid freemails, generic inboxes, and duplicates, outputting the clean leads:

```sh
node bin/cli.js examples/csv/leads-sample.csv --clean -o cleaned-leads.csv
```

### 5. Audit Pipeline Architecture & Waterfalls (JSON)

```sh
node bin/cli.js examples/unoptimized-pipeline.json
```

### 6. Automatically Optimize Pipeline Configuration

```sh
node bin/cli.js examples/unoptimized-pipeline.json --optimize
```

Save the optimized configuration to a new file:
```sh
node bin/cli.js examples/unoptimized-pipeline.json --optimize -o examples/optimized-pipeline.json
```

### 7. Gate projected spend in CI

Use `--max-cost` on a JSON pipeline definition to check its projected spend at the configured input volume. The example projects $590.00 and exits with status `2` because the budget is $500.00.

```sh
node bin/cli.js examples/unoptimized-pipeline.json --max-cost 500 --format json
```

The check compares the projected total rounded to cents with the dollar limit. An audit at or below the limit exits `0`. Invalid input exits `1`. The audit report is still generated when spend exceeds the limit. JSON output includes `budget.maxCost`, `budget.projectedCost`, and `budget.exceeded`, while the budget message goes to standard error. To check an optimized pipeline, save it with `--optimize -o` and audit that file with `--max-cost`.

### 8. Run Unit Tests

```sh
npm test
```

## License

MIT
