/**
 * Sanitizes and exports lead records according to common GTM engineering requirements.
 * Rules:
 * - Filter consumer freemail domains (gmail, yahoo, etc.) for B2B campaigns
 * - Filter generic role accounts (info@, sales@, etc.)
 * - Discard invalid/short phones or format phone numbers to standard E.164 digits
 * - Drop duplicate contacts by normalized email address
 */

export function cleanLeadData(records, options = {}) {
  const {
    dropFreeEmails = true,
    dropGenericRoleEmails = true,
    dropShortPhones = false,
    deduplicateEmails = true
  } = options;

  const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'zoho.com', 'protonmail.com', 'gmx.com'
  ]);

  const GENERIC_ROLE_PREFIXES = new Set([
    'info', 'contact', 'support', 'sales', 'admin', 'office', 'help',
    'billing', 'team', 'jobs', 'careers', 'marketing', 'press'
  ]);

  const seenEmails = new Set();
  const cleaned = [];
  const rejected = [];

  for (const record of records) {
    const keys = Object.keys(record);
    const emailKey = keys.find(k => k.toLowerCase().includes('email'));
    const phoneKey = keys.find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));

    let isRejected = false;
    let reason = '';

    if (emailKey && record[emailKey]) {
      const email = record[emailKey].trim().toLowerCase();
      
      // Duplication check
      if (deduplicateEmails) {
        if (seenEmails.has(email)) {
          isRejected = true;
          reason = `Duplicate email: ${email}`;
        }
      }

      if (!isRejected && (!email.includes('@') || !email.includes('.'))) {
        isRejected = true;
        reason = `Invalid email syntax: ${email}`;
      }

      if (!isRejected) {
        const [localPart, domain] = email.split('@');
        if (dropFreeEmails && FREE_EMAIL_DOMAINS.has(domain)) {
          isRejected = true;
          reason = `Personal/Freemail domain: @${domain}`;
        } else if (dropGenericRoleEmails && GENERIC_ROLE_PREFIXES.has(localPart)) {
          isRejected = true;
          reason = `Generic role inbox: ${localPart}@`;
        }
      }

      if (!isRejected && deduplicateEmails) {
        seenEmails.add(email);
      }
    }

    if (!isRejected && phoneKey && record[phoneKey] && dropShortPhones) {
      const phoneDigits = record[phoneKey].replace(/\D/g, '');
      if (phoneDigits.length < 7) {
        isRejected = true;
        reason = `Malformed phone number: ${record[phoneKey]}`;
      }
    }

    if (isRejected) {
      rejected.push({ record, reason });
    } else {
      cleaned.push(record);
    }
  }

  return {
    cleaned,
    rejected,
    stats: {
      inputCount: records.length,
      cleanedCount: cleaned.length,
      rejectedCount: rejected.length,
      retentionRate: records.length > 0 ? (cleaned.length / records.length) : 0
    }
  };
}

/**
 * Converts array of objects back to CSV string.
 */
export function toCSV(records) {
  if (!records || records.length === 0) return '';
  const headers = Object.keys(records[0]);
  const rows = [headers.join(',')];

  for (const rec of records) {
    const values = headers.map(h => {
      const val = rec[h] !== undefined && rec[h] !== null ? String(rec[h]) : '';
      if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    rows.push(values.join(','));
  }

  return rows.join('\n');
}
