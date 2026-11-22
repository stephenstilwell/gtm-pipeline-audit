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
- **Automated Pipeline Optimizer (`--optimize`):** Automatically hoists qualification filters and reorders waterfalls by ascending cost-per-attempt, projecting net budget savings.
- **Provider Benchmark Catalog & Presets (`--presets`, `--usePreset`):** Built-in industry benchmarks for email finders, direct dials, and LLM classifiers. Export production-grade waterfall templates with a single flag.
- **CSV Lead Data Hygiene Audit:** Directly audits exported CSV batches (from Clay, Apollo, ZoomInfo, etc.) reporting column fill rates, personal freemail domains, generic role inboxes, and malformed phone numbers.
- **Automated CSV Sanitizer (`--clean`):** Strips consumer freemails, generic role inboxes, and duplicate records to protect sender reputation and prevent wasted API/sequencing spend.
- **Zero External Dependencies:** Built entirely with native Node.js ES modules and the built-in test runner.

## Quickstart

Requires Node.js 20 or newer.

### 1. View Provider Benchmarks & Reference Templates

```sh
node bin/cli.js --presets
```

Outputs:
```text
=== GTM Pipeline Audit: Provider & Waterfall Presets ===

--- Standard Waterfall Presets ---
  ID: b2b-email-discovery
  Name: Optimized B2B Email Waterfall (Stages: 4)

  ID: b2b-mobile-discovery
  Name: Cost-Optimized Mobile Waterfall (Stages: 4)

--- Industry Benchmark Providers ---
  [cognism_phone] Cognism Mobile: $0.25/per match (~65% hit rate)
  [zoominfo_phone] ZoomInfo Direct Dial: $0.35/per match (~60% hit rate)
  [datagma_phone] Datagma Mobile: $0.08/per attempt (~45% hit rate)
  [lusha_phone] Lusha Phone: $0.15/per match (~48% hit rate)
  [prospeo_email] Prospeo Email: $0.02/per attempt (~60% hit rate)
  [findymail_email] Findymail Verified Email: $0.03/per match (~65% hit rate)
  [hunter_email] Hunter.io Email: $0.015/per attempt (~50% hit rate)
  [apollo_email] Apollo Email Search: $0.01/per attempt (~55% hit rate)
  [gemini_flash_classifier] Gemini Flash ICP Classifier: $0.001/per attempt (~85% hit rate)
  [gpt4o_mini_enricher] GPT-4o Mini Persona Scorer: $0.003/per attempt (~85% hit rate)
```

Export an optimized email discovery waterfall template to edit:
```sh
node bin/cli.js --usePreset b2b-email-discovery -o my-waterfall.json
```

### 2. Audit Lead Data from CSV

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

### 3. Clean & Sanitize Lead CSV Before Outbound

Clean out invalid freemails, generic inboxes, and duplicates, outputting the clean leads:

```sh
node bin/cli.js examples/csv/leads-sample.csv --clean -o cleaned-leads.csv
```

### 4. Audit Pipeline Architecture & Waterfalls (JSON)

```sh
node bin/cli.js examples/unoptimized-pipeline.json
```

### 5. Automatically Optimize Pipeline Configuration

```sh
node bin/cli.js examples/unoptimized-pipeline.json --optimize
```

Save the optimized configuration to a new file:
```sh
node bin/cli.js examples/unoptimized-pipeline.json --optimize -o examples/optimized-pipeline.json
```

### 6. Run Unit Tests

```sh
npm test
```

## License

MIT
