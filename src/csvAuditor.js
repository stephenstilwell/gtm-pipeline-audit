/**
 * Simple, zero-dependency CSV parser handling quoted values, escaped quotes, and newlines.
 */
export function parseCSV(csvText) {
  const lines = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === '')) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] !== undefined ? row[j].trim() : '';
    }
    records.push(obj);
  }

  return records;
}

/**
 * Profiles a batch of CSV lead records across standard enrichment columns:
 * - Empty / null rate
 * - Low-quality personal email provider detection (gmail, yahoo, hotmail, etc.)
 * - Generic role-based email detection (info@, sales@, support@, admin@, etc.)
 * - Invalid phone formats
 * - Estimated budget leakage / invalid cost spend
 */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'zoho.com', 'protonmail.com', 'gmx.com'
]);

const GENERIC_ROLE_PREFIXES = new Set([
  'info', 'contact', 'support', 'sales', 'admin', 'office', 'help',
  'billing', 'team', 'jobs', 'careers', 'marketing', 'press'
]);

export function auditLeadData(records) {
  const total = records.length;
  if (total === 0) {
    return { total: 0, fields: {}, issues: [] };
  }

  const fieldKeys = Object.keys(records[0]);
  const fields = {};
  for (const k of fieldKeys) {
    fields[k] = { populated: 0, empty: 0 };
  }

  let freeEmails = 0;
  let genericRoleEmails = 0;
  let invalidEmails = 0;
  let totalEmailsAnalyzed = 0;

  let totalPhonesAnalyzed = 0;
  let shortPhones = 0;

  for (const row of records) {
    for (const k of fieldKeys) {
      const val = row[k];
      if (val !== undefined && val !== null && val.trim() !== '') {
        fields[k].populated++;
      } else {
        fields[k].empty++;
      }
    }

    // Inspect email columns (look for column names containing 'email')
    const emailKey = fieldKeys.find(k => k.toLowerCase().includes('email'));
    if (emailKey && row[emailKey]) {
      const email = row[emailKey].trim().toLowerCase();
      totalEmailsAnalyzed++;

      if (!email.includes('@') || !email.includes('.')) {
        invalidEmails++;
      } else {
        const [localPart, domain] = email.split('@');
        if (FREE_EMAIL_DOMAINS.has(domain)) {
          freeEmails++;
        }
        if (GENERIC_ROLE_PREFIXES.has(localPart)) {
          genericRoleEmails++;
        }
      }
    }

    // Inspect phone columns (look for column names containing 'phone' or 'mobile')
    const phoneKey = fieldKeys.find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
    if (phoneKey && row[phoneKey]) {
      const phoneDigits = row[phoneKey].replace(/\D/g, '');
      totalPhonesAnalyzed++;
      if (phoneDigits.length < 7) {
        shortPhones++;
      }
    }
  }

  const issues = [];

  if (freeEmails > 0) {
    const pct = ((freeEmails / totalEmailsAnalyzed) * 100).toFixed(1);
    issues.push({
      severity: 'warning',
      metric: 'Personal/Freemail Domains in B2B List',
      count: freeEmails,
      percentage: pct,
      recommendation: `${freeEmails} records (${pct}%) use personal consumer emails (e.g. @gmail.com). Filter these out before sending to CRM or email warmup sequences.`
    });
  }

  if (genericRoleEmails > 0) {
    const pct = ((genericRoleEmails / totalEmailsAnalyzed) * 100).toFixed(1);
    issues.push({
      severity: 'warning',
      metric: 'Generic Role Inboxes',
      count: genericRoleEmails,
      percentage: pct,
      recommendation: `${genericRoleEmails} records (${pct}%) are generic role accounts (e.g. sales@, info@). Avoid using premium enrichment credits on generic aliases.`
    });
  }

  if (shortPhones > 0) {
    const pct = ((shortPhones / totalPhonesAnalyzed) * 100).toFixed(1);
    issues.push({
      severity: 'warning',
      metric: 'Malformed / Short Phone Numbers',
      count: shortPhones,
      percentage: pct,
      recommendation: `${shortPhones} records (${pct}%) have fewer than 7 digits. These should be cleaned before passing to SDR dialers or SMS sequences.`
    });
  }

  return {
    totalRecords: total,
    fields,
    issues,
    summary: {
      totalEmailsAnalyzed,
      freeEmails,
      genericRoleEmails,
      invalidEmails,
      totalPhonesAnalyzed,
      shortPhones
    }
  };
}
