# GTM Pipeline Audit

`gtm-pipeline-audit` is a lightweight, zero-dependency command-line utility and library designed for GTM engineers, RevOps builders, and growth hackers. It models and audits multi-stage enrichment pipelines and waterfalls (e.g. Clay tables, Apollo waterfalls, n8n workflows, or internal enrichment microservices) to identify budget waste, detect ordering defects, and automatically generate optimized configurations.

## The Problem

Modern GTM engineering workflows rely heavily on cascading enrichment providers (waterfalls) and automated LLM qualification steps. Teams frequently introduce subtle architecture bugs that waste budget:
1. **Late Filtering:** Calling expensive phone or email discovery APIs on raw leads before running free qualification filters (e.g., ICP geography, company size, or domain exclusions).
2. **Suboptimal Waterfall Sequences:** Placing high-cost API endpoints before lower-cost, high-coverage endpoints in fallback cascades.
3. **Hidden Unit Economics:** Lack of clarity on true cost per qualified, reachable lead versus nominal cost per API call.

## Features

- **Waterfall Cascade Simulation:** Accurately models waterfall fallback routing where subsequent providers are only invoked for unresolved misses.
- **Filter Leakage Detection:** Warns when free filters are placed after paid enrichment stages.
- **Automated Pipeline Optimizer (`--optimize`):** Automatically hoists qualification filters and re-sequences fallback cascades by ascending cost-per-attempt, projecting net cost savings and percentage reductions.
- **Unit Economics Modeling:** Computes total cost, effective cost per input record, and cost per qualified matched lead.
- **Flexible Reporting:** Outputs summary metrics in terminal CLI format, JSON, or Markdown tables.
- **Zero Dependencies:** Built with native Node.js ES modules and the built-in test runner.

## Quickstart

### 1. Audit an existing pipeline

Requires Node.js 20 or newer.

```sh
cd d:\Development\gtm-pipeline-audit
node bin/cli.js examples/unoptimized-pipeline.json
```

### 2. Run automated optimization & savings analysis

```sh
node bin/cli.js examples/unoptimized-pipeline.json --optimize
```

Save the optimized configuration to a new JSON file:
```sh
node bin/cli.js examples/unoptimized-pipeline.json --optimize -o examples/optimized-pipeline.json
```

### 3. Run unit tests

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
