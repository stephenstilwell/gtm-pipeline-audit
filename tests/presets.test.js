import test from 'node:test';
import assert from 'node:assert/strict';
import { listPresets, WATERFALL_PRESETS, analyzePipeline } from '../src/index.js';

test('listPresets returns verified providers and waterfalls', () => {
  const { providers, waterfalls } = listPresets();
  assert.ok(providers.length >= 8);
  assert.ok(waterfalls.length >= 2);
});

test('preset waterfalls calculate realistic unit economics', () => {
  const emailPreset = WATERFALL_PRESETS['b2b-email-discovery'];
  const result = analyzePipeline(emailPreset);
  assert.equal(result.volume, 5000);
  assert.ok(result.totalCost > 0);
  assert.ok(result.effectiveCostPerMatchedLead > 0);
});
