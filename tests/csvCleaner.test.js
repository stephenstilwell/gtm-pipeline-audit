import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLeadData, toCSV } from '../src/csvCleaner.js';

test('cleanLeadData filters out freemails and generic role inboxes while preserving valid contacts', () => {
  const records = [
    { name: 'Alice', work_email: 'alice@acme.com', direct_phone: '14155552671' },
    { name: 'Bob', work_email: 'bob@gmail.com', direct_phone: '14155550000' },
    { name: 'Sales', work_email: 'sales@partner.com', direct_phone: '14155551111' },
    { name: 'Duplicate Alice', work_email: 'alice@acme.com', direct_phone: '14155552671' }
  ];

  const result = cleanLeadData(records);
  assert.equal(result.stats.inputCount, 4);
  assert.equal(result.stats.cleanedCount, 1);
  assert.equal(result.stats.rejectedCount, 3);
  assert.equal(result.cleaned[0].name, 'Alice');
});

test('toCSV serializes records with proper escaping', () => {
  const records = [
    { name: 'Alice', company: 'Acme, Inc', email: 'alice@acme.com' }
  ];

  const csv = toCSV(records);
  assert.ok(csv.includes('"Acme, Inc"'));
  assert.ok(csv.startsWith('name,company,email\n'));
});
