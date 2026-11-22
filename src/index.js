/**
 * GTM Pipeline Audit Engine
 * Evaluates waterfall order, cost efficiency, filter gating, and data waste in outbound enrichment pipelines.
 */

export function analyzePipeline(pipeline) {
  const name = pipeline.name || 'Untitled Pipeline';
  const volume = Number(pipeline.volume) || 1000;
  const stages = pipeline.stages || [];

  let currentVolume = volume;
  let totalCost = 0;
  let stageResults = [];
  let findings = [];

  // Check 1: Are cheap filters placed before expensive LLM / phone scrapers?
  let seenExpensiveStage = false;
  let expensiveStageName = '';

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const unitCost = Number(stage.costPerCall || 0);
    const hitRate = Math.min(Math.max(Number(stage.hitRate ?? 1), 0), 1);
    const dropUnmatched = Boolean(stage.dropUnmatched);
    const isEnrichment = stage.type === 'enrichment';
    const isFilter = stage.type === 'filter';

    // Track expensive stages (> $0.03 per call)
    if (unitCost >= 0.03 && !seenExpensiveStage) {
      seenExpensiveStage = true;
      expensiveStageName = stage.name || `Stage #${i + 1}`;
    }

    if (isFilter && seenExpensiveStage && unitCost === 0) {
      findings.push({
        severity: 'warning',
        stage: stage.name,
        title: 'Filter stage placed after expensive enrichment',
        message: `Filter "${stage.name}" runs after "${expensiveStageName}". Moving qualification filters before paid enrichment avoids paying for unqualified leads.`
      });
    }

    // Cost calculation: charged per input call or per successful match?
    const chargePolicy = stage.chargePolicy || 'per_attempt'; // 'per_attempt' or 'per_hit'
    const callsMade = currentVolume;
    const hits = Math.round(currentVolume * hitRate);
    
    let stageCost = 0;
    if (chargePolicy === 'per_hit') {
      stageCost = hits * unitCost;
    } else {
      stageCost = callsMade * unitCost;
    }

    totalCost += stageCost;

    stageResults.push({
      name: stage.name || `Stage #${i + 1}`,
      type: stage.type || 'enrichment',
      callsMade,
      hits,
      unitCost,
      stageCost,
      remainingVolume: dropUnmatched ? hits : currentVolume
    });

    if (dropUnmatched) {
      currentVolume = hits;
    }
  }

  // Check 2: Waterfall ordering efficiency
  // If consecutive stages are waterfall fallbacks for the same field, check if lower cost per hit is prioritized
  for (let i = 0; i < stages.length - 1; i++) {
    const s1 = stages[i];
    const s2 = stages[i + 1];

    if (s1.waterfallGroup && s1.waterfallGroup === s2.waterfallGroup) {
      const c1 = Number(s1.costPerCall || 0);
      const c2 = Number(s2.costPerCall || 0);
      if (c1 > c2 && c2 > 0) {
        findings.push({
          severity: 'improvement',
          stage: s1.name,
          title: 'Suboptimal waterfall sequencing',
          message: `Provider "${s1.name}" ($${c1}/call) is sequenced before "${s2.name}" ($${c2}/call) in the same waterfall "${s1.waterfallGroup}". Try querying the lower-cost provider first.`
        });
      }
    }
  }

  const effectiveCostPerRecord = volume > 0 ? totalCost / volume : 0;
  const finalVolume = currentVolume;
  const matchRate = volume > 0 ? finalVolume / volume : 0;
  const effectiveCostPerMatchedLead = finalVolume > 0 ? totalCost / finalVolume : 0;

  return {
    name,
    volume,
    successfulEnrichments: finalVolume,
    matchRate,
    totalCost,
    effectiveCostPerRecord,
    effectiveCostPerMatchedLead,
    stageResults,
    findings
  };
}

export function generateMarkdownReport(result) {
  let md = `# GTM Pipeline Audit Report: ${result.name}\n\n`;
  md += `| Metric | Value |\n`;
  md += `| :--- | :--- |\n`;
  md += `| Input Volume | ${result.volume.toLocaleString()} |\n`;
  md += `| Successfully Matched | ${result.successfulEnrichments.toLocaleString()} |\n`;
  md += `| Effective Match Rate | ${(result.matchRate * 100).toFixed(1)}% |\n`;
  md += `| Total Estimated Cost | $${result.totalCost.toFixed(2)} |\n`;
  md += `| Cost Per Input Record | $${result.effectiveCostPerRecord.toFixed(4)} |\n`;
  md += `| Cost Per Matched Lead | $${result.effectiveCostPerMatchedLead.toFixed(4)} |\n\n`;

  md += `## Stage Breakdown\n\n`;
  md += `| Stage | Type | Calls | Hits | Cost/Call | Stage Total |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const s of result.stageResults) {
    md += `| ${s.name} | ${s.type} | ${s.callsMade.toLocaleString()} | ${s.hits.toLocaleString()} | $${s.unitCost.toFixed(3)} | $${s.stageCost.toFixed(2)} |\n`;
  }

  if (result.findings.length > 0) {
    md += `\n## Findings & Recommendations\n\n`;
    for (const f of result.findings) {
      md += `- **[${f.severity.toUpperCase()}] ${f.title}**: ${f.message}\n`;
    }
  }

  return md;
}
