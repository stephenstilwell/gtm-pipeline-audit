import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePipeline, generateHtmlReport } from '../src/index.js';

test('generateHtmlReport produces valid self-contained HTML with KPI cards and table', () => {
  const pipeline = {
    name: 'Sample Waterfall',
    volume: 1000,
    stages: [
      { name: 'Cheap Finder', type: 'enrichment', waterfallGroup: 'email', costPerCall: 0.01, hitRate: 0.5 },
      { name: 'Secondary Finder', type: 'enrichment', waterfallGroup: 'email', costPerCall: 0.04, hitRate: 0.5 }
    ]
  };

  const result = analyzePipeline(pipeline);
  const html = generateHtmlReport(result);

  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('Sample Waterfall'));
  assert.ok(html.includes('Cheap Finder'));
  assert.ok(html.includes('Secondary Finder'));
  assert.ok(html.includes('KPI cards') || html.includes('card-value'));
});
