/**
 * Standalone HTML Report Generator for GTM Pipeline Audits & Data Quality Inspections.
 * Generates an executive visual dashboard including:
 * - Summary KPI cards (Total records, matched records, match rate, total cost, cost per lead)
 * - Stage Breakdown Table with visual waterfall cascade indicators
 * - Actionable Recommendations with severity badges
 * - Clean responsive CSS and print-ready styles
 */

export function generateHtmlReport(result, options = {}) {
  const { title = 'GTM Pipeline Audit Dashboard', subtitle = 'Preflight Unit Economics & Waterfall Analysis' } = options;

  const findingsHtml = result.findings && result.findings.length > 0
    ? result.findings.map(f => {
        const badgeColor = f.severity === 'warning' ? '#b45309; background: #fef3c7;' : '#1d4ed8; background: #dbeafe;';
        return `
          <div class="finding-card">
            <div class="finding-header">
              <span class="badge" style="color: ${badgeColor}">${f.severity.toUpperCase()}</span>
              <strong>${escapeHtml(f.title)}</strong>
            </div>
            <p class="finding-msg">${escapeHtml(f.message)}</p>
          </div>
        `;
      }).join('\n')
    : '<div class="passed-box">No critical configuration defects found. Waterfall cascade and filter sequencing are optimal.</div>';

  const rowsHtml = (result.stageResults || []).map(s => {
    const group = s.waterfallGroup ? `<span class="group-tag">${escapeHtml(s.waterfallGroup)}</span>` : '-';
    const policy = s.chargePolicy === 'per_hit' ? 'per hit' : 'per attempt';
    return `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td><span class="type-pill ${s.type}">${s.type}</span></td>
        <td>${group}</td>
        <td class="num">${s.callsMade.toLocaleString()}</td>
        <td class="num">${s.hits.toLocaleString()}</td>
        <td class="num">$${s.unitCost.toFixed(3)} <span class="sub-policy">(${policy})</span></td>
        <td class="num"><strong>$${s.stageCost.toFixed(2)}</strong></td>
      </tr>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --primary: #2563eb;
      --success: #16a34a;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.5;
      padding: 32px 16px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 28px;
    }
    .header h1 {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .header p {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .card-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .card-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
    }
    .section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 28px;
    }
    .section h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
    }
    th {
      font-weight: 600;
      color: var(--text-muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td.num {
      text-align: right;
    }
    th.num {
      text-align: right;
    }
    .sub-policy {
      font-size: 11px;
      color: var(--text-muted);
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      margin-right: 8px;
    }
    .type-pill {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .type-pill.enrichment { background: #e0e7ff; color: #3730a3; }
    .type-pill.filter { background: #fef08a; color: #854d0e; }
    .group-tag {
      background: #f1f5f9;
      color: #475569;
      font-family: monospace;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .finding-card {
      background: #fff;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin-bottom: 12px;
      border-radius: 0 4px 4px 0;
      background: #fdfaf5;
    }
    .finding-header {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    .finding-msg {
      font-size: 13px;
      color: #334155;
    }
    .passed-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 32px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .section, .card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(result.name || title)}</h1>
      <p>${escapeHtml(subtitle)} &bull; Generated by gtm-pipeline-audit</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Input Volume</div>
        <div class="card-value">${(result.volume || 0).toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="card-label">Matched Records</div>
        <div class="card-value">${(result.successfulEnrichments || 0).toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="card-label">Effective Yield</div>
        <div class="card-value">${((result.matchRate || 0) * 100).toFixed(1)}%</div>
      </div>
      <div class="card">
        <div class="card-label">Total Cost</div>
        <div class="card-value">$${(result.totalCost || 0).toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-label">Cost / Matched Lead</div>
        <div class="card-value">$${(result.effectiveCostPerMatchedLead || 0).toFixed(3)}</div>
      </div>
    </div>

    <div class="section">
      <h2>Stage Breakdown & Waterfall Flow</h2>
      <table>
        <thead>
          <tr>
            <th>Stage Name</th>
            <th>Type</th>
            <th>Waterfall</th>
            <th class="num">Calls Made</th>
            <th class="num">Hits</th>
            <th class="num">Unit Cost</th>
            <th class="num">Stage Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Architecture & Governance Findings</h2>
      ${findingsHtml}
    </div>

    <div class="footer">
      gtm-pipeline-audit &bull; Open-source GTM Engineering Utility
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
