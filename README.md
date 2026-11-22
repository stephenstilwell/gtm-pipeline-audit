# GTM Pipeline Audit

`gtm-pipeline-audit` is a lightweight, zero-dependency command-line utility and library designed for GTM engineers and RevOps builders. It analyzes multi-stage enrichment pipelines and waterfalls (e.g., Clay tables, n8n workflows, Apollo waterfalls, or internal enrichment scripts) to identify cost waste, ordering defects, and qualification leakage before running outbound batches.

## The Problem

Modern GTM engineering relies heavily on cascading enrichment providers (waterfalls) and automated LLM qualification steps. Teams frequently introduce subtle architecture bugs that waste budget:
1. **Late Filtering:** Calling expensive phone or email discovery APIs on 5,000 raw leads before running simple, free filters (e.g., geography, company size, or domain exclusions).
2. **Suboptimal Waterfall Sequences:** Placing high-cost API endpoints before lower-cost, high-coverage endpoints for the same field.
3. **Hidden Unit Economics:** Lack of clarity on true cost per qualified, reachable lead versus nominal cost per API call.

## Features

- **Waterfall Sequence Verification:** Checks that fallback chains query lower-cost providers first.
- **Filter Leakage Detection:** Warns when free filters are placed after paid enrichment stages.
- **Unit Economics Modeling:** Computes total cost, effective cost per input record, and cost per qualified matched lead.
- **Flexible Reporting:** Outputs summary metrics in terminal CLI format, JSON, or Markdown tables.
- **Zero Dependencies:** Built with native Node.js ES modules and the built-in test runner.

## Quickstart

### 1. Run with Node.js

Requires Node.js 20 or newer.

```sh
cd d:\Development\gtm-pipeline-audit
node bin/cli.js examples/unoptimized-pipeline.json
```

To output a Markdown table:
```sh
node bin/cli.js examples/unoptimized-pipeline.json --format markdown
```

To run unit tests:
```sh
npm test
```

## Example Pipeline Schema

```json
{
  "name": "Outbound Prospecting Waterfall",
  "volume": 5000,
  "stages": [
    {
      "name": "Premium Mobile Phone Finder",
      "type": "enrichment",
      "waterfallGroup": "phone",
      "costPerCall": 0.10,
      "hitRate": 0.40,
      "chargePolicy": "per_attempt",
      "dropUnmatched": false
    },
    {
      "name": "Standard Phone Lookup",
      "type": "enrichment",
      "waterfallGroup": "phone",
      "costPerCall": 0.03,
      "hitRate": 0.35,
      "chargePolicy": "per_attempt",
      "dropUnmatched": false
    },
    {
      "name": "ICP Geography & Headcount Filter",
      "type": "filter",
      "costPerCall": 0,
      "hitRate": 0.60,
      "dropUnmatched": true
    }
  ]
}
```

## License

MIT
