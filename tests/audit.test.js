import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePipeline } from '../src/index.js';

test('detects filter placed after expensive enrichment', () => {
  const pipeline = {
    name: 'Test Pipeline',
    volume: 1000,
    stages: [
      { name: 'LLM Scoring', type: 'enrichment', costPerCall: 0.05, hitRate: 0.9 },
      { name: 'Domain Filter', type: 'filter', costPerCall: 0, hitRate: 0.5, dropUnmatched: true }
    ]
  };

  const report = analyzePipeline(pipeline);
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].severity, 'warning');
  assert.equal(report.totalCost, 50);
});

test('detects suboptimal waterfall order when expensive provider is called first', () => {
  const pipeline = {
    name: 'Waterfall Test',
    volume: 1000,
    stages: [
      { name: 'Vendor High', type: 'enrichment', waterfallGroup: 'email', costPerCall: 0.08, hitRate: 0.5 },
      { name: 'Vendor Low', type: 'enrichment', waterfallGroup: 'email', costPerCall: 0.02, hitRate: 0.4 }
    ]
  };

  const report = analyzePipeline(pipeline);
  const reorderFinding = report.findings.find(f => f.title === 'Suboptimal waterfall sequencing');
  assert.ok(reorderFinding);
});
