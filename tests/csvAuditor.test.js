import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, auditLeadData } from '../src/csvAuditor.js';

test('parseCSV correctly extracts rows and trims whitespace', () => {
  const csv = `name,email,company\nAlice, alice@test.com ,"Acme, Inc"\nBob,bob@gmail.com,Beta`;
  const records = parseCSV(csv);
  assert.equal(records.length, 2);
  assert.equal(records[0].name, 'Alice');
  assert.equal(records[0].email, 'alice@test.com');
  assert.equal(records[0].company, 'Acme, Inc');
  assert.equal(records[1].name, 'Bob');
});

test('auditLeadData identifies freemails, generic inboxes, and short phones', () => {
  const records = [
    { name: 'A', work_email: 'ceo@acme.com', phone: '14155550199' },
    { name: 'B', work_email: 'contact@acme.com', phone: '14155550199' },
    { name: 'C', work_email: 'user@gmail.com', phone: '1234' },
    { name: 'D', work_email: 'sales@partner.com', phone: '' }
  ];

  const audit = auditLeadData(records);
  assert.equal(audit.totalRecords, 4);
  assert.equal(audit.summary.freeEmails, 1);
  assert.equal(audit.summary.genericRoleEmails, 2); // contact@, sales@
  assert.equal(audit.summary.shortPhones, 1); // '1234'
  assert.equal(audit.issues.length, 3);
});
