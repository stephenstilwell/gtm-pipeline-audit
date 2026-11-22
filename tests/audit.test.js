import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePipeline, optimizePipeline, comparePipelines } from '../src/index.js';

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

test('waterfall group only queries misses for subsequent fallback stages', () => {
  const pipeline = {
    name: 'Waterfall Fallback Test',
    volume: 1000,
    stages: [
      { name: 'Primary Finder', type: 'enrichment', waterfallGroup: 'phone', costPerCall: 0.02, hitRate: 0.6 },
      { name: 'Fallback Finder', type: 'enrichment', waterfallGroup: 'phone', costPerCall: 0.05, hitRate: 0.5 }
    ]
  };

  const report = analyzePipeline(pipeline);
  // Stage 1 called for all 1,000 -> 600 hits, 400 misses. Cost = 1000 * 0.02 = $20
  // Stage 2 called ONLY for the 400 misses. Cost = 400 * 0.05 = $20
  // Total cost = $40
  assert.equal(report.stageResults[0].callsMade, 1000);
  assert.equal(report.stageResults[1].callsMade, 400);
  assert.equal(report.totalCost, 40);
});

test('optimizePipeline re-sequences waterfall and hoists zero-cost filters', () => {
  const unoptimized = {
    name: 'Unoptimized',
    volume: 1000,
    stages: [
      { name: 'Expensive Vendor', type: 'enrichment', waterfallGroup: 'phone', costPerCall: 0.10, hitRate: 0.4 },
      { name: 'Cheap Vendor', type: 'enrichment', waterfallGroup: 'phone', costPerCall: 0.02, hitRate: 0.4 },
      { name: 'Free Filter', type: 'filter', costPerCall: 0, hitRate: 0.5, dropUnmatched: true }
    ]
  };

  const optimized = optimizePipeline(unoptimized);

  // Filter should be hoisted first
  assert.equal(optimized.stages[0].name, 'Free Filter');
  // Cheap vendor should precede expensive vendor
  assert.equal(optimized.stages[1].name, 'Cheap Vendor');
  assert.equal(optimized.stages[2].name, 'Expensive Vendor');

  const comparison = comparePipelines(unoptimized, optimized);
  assert.ok(comparison.costSavings > 0);
  assert.ok(comparison.percentageSavings > 40);
});
