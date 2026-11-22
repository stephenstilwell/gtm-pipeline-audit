/**
 * Benchmark Catalog & Presets for GTM Enrichment & Waterfall Providers
 * Contains benchmark market rates (2025/2026 typical costs per successful hit or attempt)
 * and coverage rates across email finders, phone providers, company firmographics, and LLM classifiers.
 */

export const PROVIDER_BENCHMARKS = {
  // Mobile / Direct Phone
  'cognism_phone': {
    name: 'Cognism Mobile',
    category: 'mobile_phone',
    type: 'enrichment',
    waterfallGroup: 'phone',
    costPerCall: 0.25,
    hitRate: 0.65,
    chargePolicy: 'per_hit'
  },
  'zoominfo_phone': {
    name: 'ZoomInfo Direct Dial',
    category: 'mobile_phone',
    type: 'enrichment',
    waterfallGroup: 'phone',
    costPerCall: 0.35,
    hitRate: 0.60,
    chargePolicy: 'per_hit'
  },
  'datagma_phone': {
    name: 'Datagma Mobile',
    category: 'mobile_phone',
    type: 'enrichment',
    waterfallGroup: 'phone',
    costPerCall: 0.08,
    hitRate: 0.45,
    chargePolicy: 'per_attempt'
  },
  'lusha_phone': {
    name: 'Lusha Phone',
    category: 'mobile_phone',
    type: 'enrichment',
    waterfallGroup: 'phone',
    costPerCall: 0.15,
    hitRate: 0.48,
    chargePolicy: 'per_hit'
  },

  // Work Email Finders
  'prospeo_email': {
    name: 'Prospeo Email',
    category: 'work_email',
    type: 'enrichment',
    waterfallGroup: 'email',
    costPerCall: 0.02,
    hitRate: 0.60,
    chargePolicy: 'per_attempt'
  },
  'findymail_email': {
    name: 'Findymail Verified Email',
    category: 'work_email',
    type: 'enrichment',
    waterfallGroup: 'email',
    costPerCall: 0.03,
    hitRate: 0.65,
    chargePolicy: 'per_hit'
  },
  'hunter_email': {
    name: 'Hunter.io Email',
    category: 'work_email',
    type: 'enrichment',
    waterfallGroup: 'email',
    costPerCall: 0.015,
    hitRate: 0.50,
    chargePolicy: 'per_attempt'
  },
  'apollo_email': {
    name: 'Apollo Email Search',
    category: 'work_email',
    type: 'enrichment',
    waterfallGroup: 'email',
    costPerCall: 0.01,
    hitRate: 0.55,
    chargePolicy: 'per_attempt'
  },

  // LLM / AI Custom Evaluators
  'gemini_flash_classifier': {
    name: 'Gemini Flash ICP Classifier',
    category: 'ai_classifier',
    type: 'enrichment',
    costPerCall: 0.001,
    hitRate: 0.85,
    chargePolicy: 'per_attempt'
  },
  'gpt4o_mini_enricher': {
    name: 'GPT-4o Mini Persona Scorer',
    category: 'ai_classifier',
    type: 'enrichment',
    costPerCall: 0.003,
    hitRate: 0.85,
    chargePolicy: 'per_attempt'
  },

  // Standard Zero-Cost Filters
  'icp_filter': {
    name: 'ICP Target Industry & Headcount Filter',
    category: 'filter',
    type: 'filter',
    costPerCall: 0,
    hitRate: 0.70,
    dropUnmatched: true
  }
};

/**
 * Standard recommended reference waterfall configurations.
 */
export const WATERFALL_PRESETS = {
  'b2b-email-discovery': {
    name: 'Optimized B2B Email Waterfall',
    volume: 5000,
    stages: [
      PROVIDER_BENCHMARKS['icp_filter'],
      PROVIDER_BENCHMARKS['apollo_email'],
      PROVIDER_BENCHMARKS['prospeo_email'],
      PROVIDER_BENCHMARKS['findymail_email']
    ]
  },
  'b2b-mobile-discovery': {
    name: 'Cost-Optimized Mobile Waterfall',
    volume: 2500,
    stages: [
      PROVIDER_BENCHMARKS['icp_filter'],
      PROVIDER_BENCHMARKS['datagma_phone'],
      PROVIDER_BENCHMARKS['lusha_phone'],
      PROVIDER_BENCHMARKS['cognism_phone']
    ]
  }
};

/**
 * List all available provider presets.
 */
export function listPresets() {
  return {
    providers: Object.keys(PROVIDER_BENCHMARKS).map(k => ({ id: k, ...PROVIDER_BENCHMARKS[k] })),
    waterfalls: Object.keys(WATERFALL_PRESETS).map(k => ({ id: k, ...WATERFALL_PRESETS[k] }))
  };
}
