// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  currentStep: 1,
  maxStep: 1,
  productSuite: 'neo',
  pricingModel: 'worker',
  customer: { name: '', country: '', type: '', primaryUseCase: '', dealType: '', channel: '', opportunityLink: '', isPOC: false, pocDuration: 3, pocDiscount: 0, contractMonths: 36, contractStartDate: '', partialYearPosition: 'end', annualUplift: 10 },
  upsell: { currentACV: '', targetACV: '', currentWorkers: '', currentUsers: '' },
  renewal: { currentACV: '', acvGrowth: 10, neoAcvTarget: '', neoWorkers: '', neoUsers: '', bom: [] },
  foundation: { workersNeeded: '', volumeNeeded: '', usersNeeded: '', tbPerYear: '', selectedTier: null, tierManuallySet: false, boosters: { workers: 0, volume: 0, users: 0, trainingHours: 0, support: null } },
  aiSuite: { aiBundle: false, enrich: false, enrichManual: false, semantic: false, transcription: false, agenticBYOAI: false, byoAIAdvanced: false, byoAIGraph: false, byoGraphAutoEnrich: false, agenticAdvanced: false, semanticAutoAgentic: false, supportAutoAgentic: false },
  useCases: { secondary: [], subUseCases: [], foundationOnly: true },
  enhancedCap: {
    discover_saas:     { selected: false, active_gb: 0, archive_gb: 0, file_transfer_gb: 0, inactive_gb: 0, eca_gb: 0,
      audio_minutes: 0, translation_docs: 0, tfa_users: 0, excel_redaction_docs: 0,
      // Per add-on: true = pay as you go (billed on usage, $0 committed) instead of an upfront commit
      payg: { active_gb: false, archive_gb: false, file_transfer_gb: false, inactive_gb: false, eca_gb: false, audio_minutes: false, translation_docs: false, tfa_users: false, excel_redaction_docs: false },
      gen_ai_review_mode: 'none', gen_ai_review_docs: 0 },
    discover_onprem:   { selected: false, instances: 1, users: 1, capacity_gb: 0,
      predictive_coding_instances: 0, ai_review_instances: 0, enrich_instances: 0,
      ingestion_workers: 0, excel_redaction_instances: 0 },
    adaptive_security: { selected: false, endpoints: 1, users: 1, servers: 1 },
    ecc:               { selected: false, endpoints: 1 },
    legal_hold:        { selected: false, custodians: 1 },
    automated_relativity: { selected: false },
    abbyy:         { selected: false, pkg: 'abbfr002', qty: 1 },
    q1_dynamics:   { connectors: {} },
    t3k:           { selected: false, instances: 1, pricing_mode: 'tb', tb_tier: 'tb10', user_tier: 'ur10', workers: 10 },
    veritone:      { selected: false, instances: 1, transcription_tier: 'sml', first_langs: 1, additional_langs: 0 },
  },
  // Visualisation Bundle (Knowledge Graph) — a fixed Small/Medium/Large bundle of users +
  // memory, chosen directly or via the needUsers/needGb recommender. Booster tier/qty are
  // only ever set by the recommender, never edited directly by the user.
  visualisation: {
    selected: false, bundleTier: 'small',
    boosterUserTier: 'u20', boosterUserQty: 0,
    boosterMemoryTier: 'm64', boosterMemoryQty: 0,
    needUsers: '', needGb: '',
    kgAutoEnrich: false,
    byoGraphAutoSelected: false,
  },
  advantageServices: { implementationPackage: false, solutionImplementationPackage: false, componentLicenseExtension: '', discoverAdvantageQty: 0, discoverTopUpQty: 0 },
  // Test Environments (Configure section 7) — selected SKUs, keyed by SKU code. Each is a
  // simple yes/no (always 1 unit); a missing entry means not selected.
  nonProd: { qty: {} },
  discounts: { foundation: 0, aiSuite: 0, useCases: 0, enhanced: 0, nonProd: 0, consulting: 0, blended: 0 },
  targets:   { acv: '', tcv: '' },
  approvalNotes: '',
  valueWin:  { activeLevers: {}, inputs: {}, primaryUseCase: '' },
  partnerMargins: { bySku: {} },
  currency: 'USD',
  // Bumped whenever a step is inserted, so a quote saved under an older numbering can be
  // shifted onto the new step numbers when it's loaded (see migrateLoadedState).
  stepLayout: 2
};

const INITIAL_STATE = JSON.parse(JSON.stringify(state));

// ─── Tier display names ──────────────────────────────────────────────────────
// The internal tier keys (light/core/rapid) are permanent identifiers used for state,
// pricing lookups and SKU size suffixes — they never change. This map is the single
// source of truth for the customer-facing tier name. Everything that shows a tier name
// to the user derives it from here (or from the config .name values, which follow the
// same words), so a future rename is a one-line change.
const TIER_DISPLAY_NAME = { light: 'Standard', core: 'Accelerate', rapid: 'Performance' };
function tierDisplayName(key) {
  return TIER_DISPLAY_NAME[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');
}

// ─── Session persistence ─────────────────────────────────────────────────────
// Guards against losing in-progress input to an accidental page refresh or the
// browser's native Back/Forward navigation (the in-app step nav already keeps
// everything in `state`; this just survives the tab reloading `state` from scratch).
const SESSION_STORAGE_KEY = 'nuixPricingToolState';

function persistState() {
  try { sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state)); }
  catch { /* sessionStorage unavailable (e.g. private browsing) — persistence is best-effort */ }
}

function restoreState() {
  try {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!saved) return false;
    Object.assign(state, JSON.parse(saved));
    migrateLoadedState();
    return true;
  } catch { return false; }
}

// Brings a restored or loaded quote up to date with the current state shape. Layout 1
// predates the Test Environments step (14): Partner Margins and Quote summary were 14/15.
function migrateLoadedState() {
  if (!state.partnerMargins?.bySku) state.partnerMargins = { bySku: {} };
  if (!state.nonProd?.qty) state.nonProd = { qty: {} };
  if ((state.stepLayout || 1) < 2) {
    if (state.currentStep >= 14) state.currentStep += 1;
    if (state.maxStep     >= 14) state.maxStep     += 1;
  }
  state.stepLayout = INITIAL_STATE.stepLayout;
}

// Since state now survives a refresh, a page reload can no longer be used to
// start a fresh deal — this gives users an explicit way to do that instead.
function startNewQuote() {
  // In-page confirmation rather than window.confirm(), which some browsers and embedded
  // panes suppress (returning false straight away, so the button appeared to do nothing).
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:24px 28px;max-width:420px;box-shadow:0 12px 40px rgba(0,0,0,0.3)">
      <div style="font-size:17px;font-weight:700;color:#1a1a2e;margin-bottom:8px">Start a new deal?</div>
      <div style="font-size:13px;color:#4b5563;margin-bottom:20px">This will clear everything entered so far. Save this quote first if you need it.</div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button data-act="cancel" style="padding:8px 18px;border-radius:8px;border:1.5px solid #d1d5db;background:#fff;font-weight:600;cursor:pointer">Cancel</button>
        <button data-act="ok" style="padding:8px 18px;border-radius:8px;border:none;background:#003080;color:#fff;font-weight:700;cursor:pointer">Start new deal</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => {
    const act = e.target.dataset && e.target.dataset.act;
    if (e.target === overlay || act === 'cancel') { overlay.remove(); return; }
    if (act !== 'ok') return;
    overlay.remove();
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)));
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* best-effort */ }
    showStep(1);
  });
  document.body.appendChild(overlay);
}

// ─── Value / ROI data ────────────────────────────────────────────────────────
const VALUE_LEVERS = {
  fines_avoided: {
    label: 'Fines Avoided', category: 'Risk & Liability Reduction', icon: '🛡️',
    prompts: [
      'Has the organisation been fined by a regulator before? If so, how much?',
      'What is the typical fine for a breach in their industry or jurisdiction?',
      'How frequently do incidents occur that could attract a regulatory fine?',
      'Are they currently under any investigations, consent orders, or enforceable undertakings?'
    ],
    inputs: [
      { id: 'fine_risk',      label: 'Estimated annual regulatory fine exposure',  type: 'currency', default: 5000000 },
      { id: 'fine_reduction', label: '% risk reduction with Nuix',                 type: 'percent',  default: 30, min: 5, max: 80 }
    ],
    calc: v => (v.fine_risk || 0) * (v.fine_reduction || 0) / 100
  },
  litigation_cost: {
    label: 'Litigation Cost Avoided', category: 'Risk & Liability Reduction', icon: '⚖️',
    prompts: [
      'How many litigation or regulatory matters does the organisation face per year?',
      'What is the average external legal spend per matter (legal fees, counsel, court costs)?',
      'How often are matters settled or resolved before proceeding to litigation?',
      'Has early access to evidence ever helped them resolve a matter faster or cheaper?'
    ],
    inputs: [
      { id: 'lit_cost',      label: 'Average litigation cost per matter',              type: 'currency', default: 500000 },
      { id: 'lit_matters',   label: 'Matters per year',                                type: 'number',   default: 5 },
      { id: 'lit_reduction', label: '% of matters resolved before going to litigation', type: 'percent',  default: 25, min: 5, max: 80 }
    ],
    calc: v => (v.lit_cost || 0) * (v.lit_matters || 0) * (v.lit_reduction || 0) / 100
  },
  insurance_premium: {
    label: 'Insurance Premium Reduction', category: 'Risk & Liability Reduction', icon: '🏦',
    prompts: [
      'What does the organisation currently pay in annual cyber, E&O, or professional indemnity insurance?',
      'Have premiums increased recently due to incidents or compliance gaps?',
      'Has the insurer flagged data governance or breach response capability as a risk factor?',
      'Have they had any claims in the last 3 years that could be mitigated with better data controls?'
    ],
    inputs: [
      { id: 'ins_premium',   label: 'Annual insurance / E&O premium',             type: 'currency', default: 2000000 },
      { id: 'ins_reduction', label: '% reduction from improved compliance posture', type: 'percent', default: 10, min: 2, max: 30 }
    ],
    calc: v => (v.ins_premium || 0) * (v.ins_reduction || 0) / 100
  },
  win_rate: {
    label: 'Higher Win / Success Rates', category: 'High-Stakes Insights', icon: '🎯',
    prompts: [
      'What is the average value or outcome at stake per case or matter?',
      'How many cases or matters does the team handle per year?',
      'Have there been cases where missing or delayed evidence affected the outcome?',
      'How much faster could they reach a decision with better evidence surfacing?'
    ],
    inputs: [
      { id: 'case_value',      label: 'Average value per case / matter',              type: 'currency', default: 1000000 },
      { id: 'cases_year',      label: 'Cases per year',                               type: 'number',   default: 20 },
      { id: 'win_improvement', label: '% improvement in win rate with Nuix',          type: 'percent',  default: 5, min: 1, max: 20 }
    ],
    calc: v => (v.case_value || 0) * (v.cases_year || 0) * (v.win_improvement || 0) / 100
  },
  processing_labour: {
    label: 'Processing Labour Saved', category: 'Productivity Improvement', icon: '⚡',
    prompts: [
      'How many analysts, investigators, or processors are involved in data collection and processing today?',
      'What is the typical salary range for these roles?',
      'How much of their time is spent on manual, repetitive tasks like collection, ingestion, or deduplication?',
      'Have they ever had to bring in contractors or extend timelines due to data processing backlogs?'
    ],
    inputs: [
      { id: 'proc_people', label: 'Number of data analysts / processors', type: 'number',   default: 3 },
      { id: 'proc_salary', label: 'Average annual salary (USD)',           type: 'currency', default: 100000 },
      { id: 'proc_saving', label: '% of time saved with Nuix',            type: 'percent',  default: 40, min: 10, max: 80 }
    ],
    calc: v => (v.proc_people || 0) * (v.proc_salary || 0) * (v.proc_saving || 0) / 100
  },
  reviewer_time: {
    label: 'Reviewer Time Saved', category: 'Productivity Improvement', icon: '📋', hint: '~$1,000/GB',
    prompts: [
      'How much data (GB or TB) do they typically collect and review per matter or per year?',
      'What is their current cost of review — internal reviewers or external legal review rates?',
      'What percentage of collected data typically turns out to be irrelevant or duplicate?',
      'How long does a typical review cycle take, and what would half that time be worth?'
    ],
    inputs: [
      { id: 'rev_gb',        label: 'Data volume reviewed/yr (GB) — from tier',  type: 'number',   default: 15000 },
      { id: 'rev_cost_gb',   label: 'Review cost per GB (USD)',                   type: 'currency', default: 1000 },
      { id: 'rev_reduction', label: '% review volume reduction with Nuix',        type: 'percent',  default: 10, min: 1, max: 60 }
    ],
    calc: v => (v.rev_gb || 0) * (v.rev_cost_gb || 0) * (v.rev_reduction || 0) / 100
  },
  storage_cost: {
    label: 'Storage Cost Reduction', category: 'Productivity Improvement', icon: '💾', hint: '$3/GB/month',
    prompts: [
      'How much data is the organisation currently storing (on-prem or cloud)?',
      'What are they paying per GB per month in storage or hosting costs?',
      'Do they have a data retention policy — and is it being enforced or audited?',
      'How much redundant, obsolete, or trivial (ROT) data do they estimate they hold?'
    ],
    inputs: [
      { id: 'stor_gb',        label: 'Data stored (GB) — from tier',          type: 'number',   default: 15000 },
      { id: 'stor_cost_gb',   label: 'Storage cost per GB/month (USD)',        type: 'currency', default: 3 },
      { id: 'stor_reduction', label: '% storage footprint reduction with Nuix', type: 'percent', default: 20, min: 5, max: 50 }
    ],
    calc: v => (v.stor_gb || 0) * (v.stor_cost_gb || 0) * 12 * (v.stor_reduction || 0) / 100
  },
  provider_cost: {
    label: 'Current Provider Cost Eliminated', category: 'Provider Cost Reduction', icon: '🔄',
    prompts: [
      'What is the organisation currently paying for their existing solution (licences, maintenance, hosting)?',
      'Are there any professional services or managed service fees tied to the current vendor?',
      'Will Nuix fully replace the incumbent, or will both run in parallel for a period?',
      'Are there any exit costs (termination fees, migration costs) associated with leaving the current provider?'
    ],
    inputs: [
      { id: 'prov_annual_cost',   label: 'Annual cost of current provider (USD)',         type: 'currency', default: 500000 },
      { id: 'prov_replacement',   label: '% of current solution replaced by Nuix',        type: 'percent',  default: 100, min: 10, max: 100 }
    ],
    calc: v => (v.prov_annual_cost || 0) * (v.prov_replacement || 0) / 100
  },
  infra_investment: {
    label: 'Infrastructure Investment', category: 'Costs & Investment', icon: '🏗️',
    subtract: true,
    prompts: [
      'Is there any one-time capital expenditure required to deploy or integrate Nuix (e.g. hardware, data migration, professional services)?',
      'Are there ongoing infrastructure costs such as cloud hosting, storage, or managed services that will run for the life of the deal?',
      'Are these costs net-new, or do they partially replace existing spend already captured in another lever?'
    ],
    inputs: [
      { id: 'infra_onetime',  label: 'One-time infrastructure investment',          type: 'currency', default: 500000 },
      { id: 'infra_monthly',  label: 'Ongoing infrastructure cost (per month)',      type: 'currency', default: 5000 }
    ],
    calc: v => {
      const years = Math.max(getContractYears(), 1/12);
      const annualOnetime    = (v.infra_onetime || 0) / years;
      const annualRecurring  = (v.infra_monthly || 0) * 12;
      return annualOnetime + annualRecurring;
    }
  }
};

const VALUE_LEVERS_BY_USE_CASE = {
  'Investigations': ['win_rate', 'processing_labour', 'reviewer_time'],
  'Legal':          ['reviewer_time', 'processing_labour', 'storage_cost', 'provider_cost'],
  'Data Privacy':   ['fines_avoided', 'insurance_premium', 'litigation_cost'],
};

// ─── Currency ────────────────────────────────────────────────────────────────
// Rates aligned to the company Pricebook (units of currency per 1 USD), so the
// tool's display conversion matches what Salesforce CPQ will actually invoice.
const CURRENCIES = {
  USD: { symbol: '$',   name: 'USD', rate: 1.0000 },
  AUD: { symbol: 'A$',  name: 'AUD', rate: 1.4286 },
  CAD: { symbol: 'C$',  name: 'CAD', rate: 1.3275 },
  EUR: { symbol: '€',   name: 'EUR', rate: 0.8832 },
  GBP: { symbol: '£',   name: 'GBP', rate: 0.7895 },
};
const COUNTRY_CURRENCY = {
  'United States': 'USD', 'Canada': 'CAD', 'Australia': 'AUD',
  'United Kingdom': 'GBP',
  'Germany': 'EUR', 'France': 'EUR', 'Netherlands': 'EUR', 'Belgium': 'EUR',
  'Switzerland': 'EUR', 'Sweden': 'EUR', 'Norway': 'EUR', 'Denmark': 'EUR',
  'Spain': 'EUR', 'Italy': 'EUR',
};
function getDefaultCurrency(country) { return COUNTRY_CURRENCY[country] || 'USD'; }
function setCurrency(code) {
  state.currency = code;
  const sel = document.getElementById('currency-picker');
  if (sel && sel.value !== code) sel.value = code;
  updateLiveQuote();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = n => {
  if (n == null || n === '') return 'Custom';
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  const converted = Math.round((n * cur.rate) / 100) * 100;
  return cur.symbol + converted.toLocaleString('en-US');
};
const pct  = n => (n * 100).toFixed(1) + '%';
const cfg  = () => window.PRICING_CONFIG;
const $    = id => document.getElementById(id);
const el   = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

// ─── Pricing model ───────────────────────────────────────────────────────────
// Single US list price for every customer (currency conversion, handled in fmt(),
// is a separate display-only step). Regional localisation, government and multi-year no
// longer discount the price — instead they widen the rep's allowed discount
// ceiling before CEO approval. See getMaxThreshold().
function getRM()       { return 1.0; }   // was: regional localisation multiplier applied to price
function getAutoDisc() { return 1.0; }   // was: government × multi-year applied to price

// Attribute factors — used ONLY to size the discount ceiling, never the price.
// Each returns the share of list price notionally retained by that lever.
function getRegionalFactor() { return cfg().regional_multipliers[state.customer.country] || 1.0; }
function getGovFactor()      { return isGov() ? (1 - cfg().discount_rules.government_max) : 1; }
function getMultiYearFactor(){ return 1 - getMultiYearDisc(); }

// Maximum discount (off list) a rep can apply before the deal needs CEO approval.
// Factors compound multiplicatively so the approvable floor price is identical to
// the previous auto-discount model:
//   old floor = list × regional × gov × multiYear × (1 − 0.20)
//   new floor = list × (1 − getMaxThreshold())
function getMaxThreshold() {
  const base = cfg().discount_rules.auto_approve_threshold;   // 0.20 standard Additional Discount
  const floorFactor = (1 - base) * getGovFactor() * getRegionalFactor() * getMultiYearFactor();
  return 1 - floorFactor;
}

// Sequential ceiling buildup — Additional Discount first, then attribute levers.
// Each row carries the lever's retained factor, its marginal contribution to the
// ceiling, and the running ceiling after it applies.
function getCeilingBuildup() {
  const C    = cfg();
  const base = C.discount_rules.auto_approve_threshold;
  const yrs  = Math.floor(getContractYears());
  const defs = [
    { name: 'Additional Discount',                        short: 'Additional',              cls: 'base',   factor: 1 - base,             always: true  },
    { name: 'Government',                                 short: 'Govt',                    cls: 'gov',    factor: getGovFactor(),       always: false },
    { name: `Regional · ${state.customer.country || '—'}`, short: state.customer.country || 'Regional', cls: 'region', factor: getRegionalFactor(), always: false },
    { name: `${yrs}-year term`,                           short: `${yrs}-yr`,               cls: 'year',   factor: getMultiYearFactor(), always: false },
  ];
  let cum = 1; const rows = [];
  for (const d of defs) {
    if (!d.always && d.factor === 1) continue;   // lever absent → no contribution
    const before = 1 - cum; cum *= d.factor; const after = 1 - cum;
    rows.push({ ...d, marginal: after - before, running: after });
  }
  return { rows, floorFactor: cum, ceiling: 1 - cum };
}

// ─── Maximum-discount display helpers ──────────────────────────────────────
// Display only — getCeilingBuildup() above remains the single source of truth
// for the ceiling maths. These format its output for the rail and summary panel.

// Plain-English reason a lever is included, keyed off row.cls.
function ceilingLeverWhy(row) {
  switch (row.cls) {
    case 'base':   return 'Applies to every deal';
    case 'gov':    return 'Government pricing rule';
    case 'region': return 'Regional index ' + getRegionalFactor().toFixed(3);
    case 'year':   return '5% per extra year';
    default:       return '';
  }
}

// Headline ceiling/off-list percentage: 1dp, trailing ".0" dropped (e.g. 55.5%, 20%).
function ceilingOff1(x) { return (x * 100).toFixed(1).replace(/\.0$/, '') + '%'; }
// Floor/reconciliation percentage: always 1dp (e.g. 44.5%, 80.0%).
function ceilingP1(x) { return (x * 100).toFixed(1) + '%'; }
// Tooltip "keep" percentage: whole number unless it needs one decimal (80%, 77.2%, 90%).
function ceilingKeepP(factor) {
  const v = factor * 100;
  return (Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : Math.round(v * 10) / 10) + '%';
}

// Lever list markup shared by the rail and the summary panel — name, why, and
// the lever's own rounded discount (never a running total).
function ceilingLeverListHtml(rows) {
  return rows.map(r => `
    <div class="dc-lv">
      <span><span class="dc-lv-name">${r.name}</span><span class="dc-lv-why">${ceilingLeverWhy(r)}</span></span>
      <span class="dc-lv-amt">${Math.round((1 - r.factor) * 100)}%</span>
    </div>`).join('');
}

// "How this maximum is calculated" tooltip — the only place the exact
// compounding maths and the floor price are shown.
function ceilingTooltipHtml(rows, floorFactor, ceiling) {
  const calcRows = rows.map(r => `<span class="r"><span>${r.name}</span><b>&times; ${ceilingKeepP(r.factor)}</b></span>`).join('');
  return `<span class="dc-tip">
      <span class="dc-tip-h">How this maximum is calculated</span>
      <p>These discounts <b>compound</b> &mdash; each applies to what's left after the one before, so they don't add up.</p>
      <span class="calc">
        ${calcRows}
        <span class="r floorrow"><span>Lowest price before CEO approval</span><b>${ceilingP1(floorFactor)}&nbsp;of&nbsp;list</b></span>
      </span>
      <p style="margin-bottom:6px">That's up to <b>100% &minus; ${ceilingP1(floorFactor)} = ${ceilingOff1(ceiling)}</b> off list.</p>
      <small>Listed discounts rounded; calculation uses exact rates.</small>
    </span>`;
}

function ceilingInfoButtonHtml(rows, floorFactor, ceiling) {
  return `<button class="dc-info" aria-label="How this maximum is calculated" tabindex="0">i${ceilingTooltipHtml(rows, floorFactor, ceiling)}</button>`;
}

// The live-quote rail scrolls internally (overflow-y:auto), which per the CSS
// overflow spec forces the browser to also clip overflow-x — so a tooltip
// bleeding left into the main content area gets cut off at the rail's edge.
// .dc-tip is position:fixed (escapes that ancestor clipping); this computes
// its on-screen position from the button's real bounding rect, clamped to the
// viewport, each time one is hovered/focused.
function positionCeilingTooltip(btn) {
  const tip = btn.querySelector('.dc-tip');
  if (!tip) return;
  const r = btn.getBoundingClientRect();
  const gap = 9, margin = 8;
  const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || 768;
  const tw = tip.offsetWidth, th = tip.offsetHeight;

  let left = r.right - tw;                                   // align right edges, opening leftward
  left = Math.min(Math.max(left, margin), vw - margin - tw);

  let top = r.bottom + gap, openUp = false;                  // open downward by default
  if (top + th > vh - margin) { top = r.top - th - gap; openUp = true; }

  tip.style.left = Math.round(left) + 'px';
  tip.style.top  = Math.round(top) + 'px';
  tip.classList.toggle('dc-tip-up', openUp);
}

document.addEventListener('mouseover', e => {
  const btn = e.target.closest?.('.dc-info');
  if (btn) positionCeilingTooltip(btn);
});
document.addEventListener('focusin', e => {
  const btn = e.target.closest?.('.dc-info');
  if (btn) positionCeilingTooltip(btn);
});
window.addEventListener('scroll', () => {
  const btn = document.activeElement?.closest?.('.dc-info') || document.querySelector('.dc-info:hover');
  if (btn) positionCeilingTooltip(btn);
}, true);

// Plain-English "why they qualify" sentence for the summary panel — built from
// whichever non-base levers are present, so it generalises beyond one scenario.
function ceilingWhyProse(rows) {
  const bits = [];
  rows.forEach(r => {
    if (r.cls === 'gov')    bits.push('a <b>government buyer</b>');
    if (r.cls === 'region') bits.push(`based in <b>${state.customer.country || 'this region'}</b>`);
    if (r.cls === 'year')   bits.push(`on a <b>${r.name.split('-')[0]}-year term</b>`);
  });
  const compoundNote = `Because the discounts compound, the maximum is lower than their simple sum; tap the ⓘ for the exact figures and the lowest price before CEO approval.`;
  if (!bits.length) return `Includes the <b>Additional Discount</b> every deal carries. ${compoundNote}`;
  const list = bits.length === 1 ? bits[0] : bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1];
  const hasBase = rows.some(r => r.cls === 'base');
  const baseNote = hasBase ? ' &mdash; alongside the Additional Discount every deal carries' : '';
  return `Qualifies because they're ${list}${baseNote}. ${compoundNote}`;
}

// Full discount-ceiling panel for the Quote Summary (replaces the old
// "Price adjustments applied" chip row).
function renderCeilingPanel() {
  const { rows, floorFactor, ceiling } = getCeilingBuildup();

  return `
    <div class="dc-panel">
      <div class="dc-sum-grid">
        <div>
          <div class="dc-sh-eyebrow">Maximum Discount</div>
          <div class="dc-sh-num">${ceilingOff1(ceiling)}</div>
          <div class="dc-sh-word">off list &mdash; the most you can give</div>
          <div class="dc-sh-gate">Within this, your <b>Domain Leader &amp; EVP</b> approve. Beyond it, the deal needs <b>CEO approval</b>.</div>
        </div>
        <div>
          <div class="dc-max-top" style="margin-bottom:4px">
            <div class="dc-max-listlabel">Included in this maximum</div>
            ${ceilingInfoButtonHtml(rows, floorFactor, ceiling)}
          </div>
          ${ceilingLeverListHtml(rows)}
          <p class="dc-why">${ceilingWhyProse(rows)}</p>
        </div>
      </div>
    </div>`;
}

// Compact ceiling readout for the live-quote right rail.
function renderCeilingMini() {
  const { rows, floorFactor, ceiling } = getCeilingBuildup();
  return `
    <div class="qp-disc-stack">
      <div class="dc-max-top">
        <div>
          <div class="dc-max-eyebrow">Maximum Discount</div>
          <div class="dc-max-head">Up to <span class="off">${ceilingOff1(ceiling)}</span> off list</div>
          <div class="dc-max-thresh">before <b>CEO approval</b></div>
        </div>
        ${ceilingInfoButtonHtml(rows, floorFactor, ceiling)}
      </div>
      <div class="dc-max-listlabel">Included in this maximum</div>
      ${ceilingLeverListHtml(rows)}
    </div>`;
}



function getSupportIncrementalCost(selectedKey, tierSupportName) {
  const C = cfg();
  const levelPrice = {
    'Advantage Bronze':     C.support_booster_prices.bronze,
    'Advantage Silver':     C.support_booster_prices.silver,
    'Advantage Gold':       C.support_booster_prices.gold
  };
  const included = levelPrice[tierSupportName] || 0;
  const selected = C.support_booster_prices[selectedKey] || 0;
  return Math.max(0, selected - included);
}

function getContractYears() {
  if (state.customer.isPOC) return (state.customer.pocDuration || 3) / 12;
  return (parseInt(state.customer.contractMonths) || 12) / 12;
}

function getMultiYearDisc() {
  if (state.customer.isPOC) return 0;
  const fullYears = Math.floor((parseInt(state.customer.contractMonths) || 12) / 12);
  if (fullYears <= 1) return 0;
  return Math.min((fullYears - 1) * cfg().discount_rules.multi_year_per_year, 0.30);
}

function getAnnualUplift() {
  if (state.customer.isPOC) return 0;
  const fullYears = Math.floor((parseInt(state.customer.contractMonths) || 12) / 12);
  if (fullYears <= 1) return 0;
  return Math.max(0, parseFloat(state.customer.annualUplift) || 0) / 100;
}

function getYearPrice(baseNet, year) {
  return baseNet * Math.pow(1 + getAnnualUplift(), year - 1);
}

// Returns an array of period objects for the contract layout.
// Each period: { label, months, fraction, upliftExp }
function getContractPeriods() {
  if (state.customer.isPOC) {
    const dur = state.customer.pocDuration || 3;
    return [{ label: `${dur} months`, months: dur, fraction: dur / 12, upliftExp: 0 }];
  }
  const totalMonths = parseInt(state.customer.contractMonths) || 12;
  const fullYears   = Math.floor(totalMonths / 12);
  const remMonths   = totalMonths % 12;
  const position    = state.customer.partialYearPosition || 'end';
  const periods     = [];

  if (remMonths > 0 && position === 'start') {
    periods.push({ label: `${remMonths} mo`, months: remMonths, fraction: remMonths / 12, upliftExp: 0 });
  }
  for (let y = 1; y <= fullYears; y++) {
    periods.push({ label: `Year ${y}`, months: 12, fraction: 1, upliftExp: y - 1 });
  }
  if (remMonths > 0 && position === 'end') {
    periods.push({ label: `${remMonths} mo`, months: remMonths, fraction: remMonths / 12, upliftExp: Math.max(0, fullYears - 1) });
  }
  if (periods.length === 0) periods.push({ label: 'Year 1', months: 12, fraction: 1, upliftExp: 0 });
  return periods;
}

function getPeriodPrice(baseNet, period) {
  return baseNet * Math.pow(1 + getAnnualUplift(), period.upliftExp) * period.fraction;
}

// Returns periods with calendar start/end dates added (ISO strings).
// If no contractStartDate is set, dateFrom/dateTo are null.
function getContractPeriodsWithDates() {
  const periods = getContractPeriods();
  const startStr = state.customer.contractStartDate;
  if (!startStr) return periods.map(p => ({ ...p, dateFrom: null, dateTo: null }));

  function toLocalISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const [sy, sm, sd] = startStr.split('-').map(Number);
  let curY = sy, curM = sm, curD = sd;

  return periods.map(p => {
    const dateFrom = `${curY}-${String(curM).padStart(2,'0')}-${String(curD).padStart(2,'0')}`;
    // Advance by p.months months
    let nextM = curM + p.months;
    let nextY = curY;
    while (nextM > 12) { nextM -= 12; nextY++; }
    // dateTo is the day before the next period starts
    const nextDate = new Date(nextY, nextM - 1, curD);
    nextDate.setDate(nextDate.getDate() - 1);
    const dateTo = toLocalISO(nextDate);
    curY = nextY; curM = nextM;
    return { ...p, dateFrom, dateTo };
  });
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function isGov() { return ['Gov Agency', 'Gov Law Enforcement'].includes(state.customer.type); }

// getAutoDisc() is defined above (returns 1.0). Government and multi-year now
// feed the discount ceiling via getGovFactor()/getMultiYearFactor(), not price.

function upgradeToTier(tier) {
  state.foundation.selectedTier = tier;
  // Switching to a lower tier can drop the included Advantage level (e.g. Rapid→Light
  // moves Silver→Bronze). If a selected SKU mandates a floor (Agentic: AI - Advanced →
  // Silver), re-add the upgrade booster so the requirement can't be lost via a tier change.
  enforceSupportFloor();
  if (state.pricingModel === 'consumption') {
    const t  = cfg().consumption_tiers[tier];
    const tb = parseFloat(state.foundation.tbPerYear) || 0;
    const u  = state.foundation.usersNeeded || 0;
    state.foundation.boosters.volume = Math.max(0, tb - t.included_tb);
    state.foundation.boosters.users  = Math.max(0, u - t.users);
    $('consumption-pricing-area').innerHTML = renderConsumptionPricing();
  } else {
    const t = cfg().foundation_tiers[tier];
    // Recalculate boosters needed for new tier based on original requirements
    const w = state.foundation.workersNeeded || 0;
    const v = state.foundation.volumeNeeded  || 0;
    const u = state.foundation.usersNeeded   || 0;
    state.foundation.boosters.workers = Math.max(0, w - t.workers);
    state.foundation.boosters.volume  = Math.max(0, v - t.volume_tb);
    state.foundation.boosters.users   = Math.max(0, u - t.users);
    $('tier-rec-area').innerHTML = renderTierRecommendation();
  }
  bindBoosterEvents();
}

function resetFoundationRequirements() {
  state.foundation.workersNeeded = '';
  state.foundation.volumeNeeded  = '';
  state.foundation.usersNeeded   = '';
  state.foundation.tbPerYear     = '';
  state.foundation.selectedTier  = null;
  state.foundation.tierManuallySet = false;
  state.foundation.boosters      = { workers: 0, volume: 0, users: 0, trainingHours: 0, support: null };
  showStep(state.currentStep, true);
}

// Re-applies the best-fit tier recommendation, clearing any manual tier override —
// used by the "Reset to recommended tier" link on the tier-switch pills.
function resetToRecommendedTier() {
  state.foundation.tierManuallySet = false;
  const u = state.foundation.usersNeeded || 0;
  if (state.pricingModel === 'consumption') {
    const tb   = parseFloat(state.foundation.tbPerYear) || 0;
    const tier = bestFitConsumptionTier(tb);
    const t    = cfg().consumption_tiers[tier];
    state.foundation.selectedTier    = tier;
    state.foundation.boosters.volume = Math.max(0, tb - t.included_tb);
    state.foundation.boosters.users  = Math.max(0, u - t.users);
    $('consumption-pricing-area').innerHTML = renderConsumptionPricing();
  } else {
    const w    = state.foundation.workersNeeded || 0;
    const tier = bestFitTier(w);
    const t    = cfg().foundation_tiers[tier];
    state.foundation.selectedTier     = tier;
    state.foundation.boosters.workers = Math.max(0, w - t.workers);
    state.foundation.boosters.volume  = 0;
    state.foundation.boosters.users   = Math.max(0, u - t.users);
    $('tier-rec-area').innerHTML = renderTierRecommendation();
  }
  bindBoosterEvents();
  updateLiveQuote();
}

// "Best fit" tier — the largest tier whose included capacity doesn't exceed the
// requirement, so tier + boosters match it exactly with no unused included capacity
// (e.g. 24 workers → Standard 10 + 14 boosters, not Accelerate with 6 spare). Below the
// smallest tier's capacity it falls back to Light. May cost more than the cheapest tier.
function bestFitTier(w) {
  const tiers = cfg().foundation_tiers;
  let fit = 'light';
  for (const key of ['light', 'core', 'rapid']) if (tiers[key].workers <= w) fit = key;
  return fit;
}

// Consumption-model equivalent of bestFitTier(), keyed on TB/yr.
function bestFitConsumptionTier(tb) {
  const tiers = cfg().consumption_tiers;
  let fit = 'light';
  for (const key of ['light', 'core', 'rapid']) if (tiers[key].included_tb <= tb) fit = key;
  return fit;
}

function recommendTier(w, v, u) {
  const tiers = ['light', 'core', 'rapid'];
  let best = null, bestCost = Infinity;
  for (const tier of tiers) {
    const t = cfg().foundation_tiers[tier];
    const b = cfg().foundation_boosters[tier];
    const ew = Math.max(0, w - t.workers), ev = Math.max(0, v - t.volume_tb), eu = Math.max(0, u - t.users);
    const cost = t.price + ew * b.worker + ev * b.volume_tb + eu * b.user;
    if (cost <= bestCost) { bestCost = cost; best = { tier, cost, ew, ev, eu }; }
  }
  return best;
}

// Consumption-model equivalent of recommendTier() — picks the cheapest Light/Core/Rapid
// consumption tier (+ TB booster + user booster) for an estimated TB/yr and user count.
function recommendConsumptionTier(tb, u) {
  const tiers = ['light', 'core', 'rapid'];
  let best = null, bestCost = Infinity;
  for (const tier of tiers) {
    const t = cfg().consumption_tiers[tier];
    const b = cfg().foundation_boosters[tier];
    const etb = Math.max(0, tb - t.included_tb), eu = Math.max(0, u - t.users);
    const cost = t.price + etb * t.tb_booster_rate + eu * b.user;
    if (cost <= bestCost) { bestCost = cost; best = { tier, cost, etb, eu }; }
  }
  return best;
}

// Resolves the selected Visualisation Bundle tier plus any booster packs to their
// SKU, name and price.
// Virtual "no bundle" pseudo-bundle — lets a customer's need be covered entirely by
// raw KGU/KGM packs (via recommendVisualisationBundle) when that's cheaper than any
// preset bundle floor. Deliberately NOT added to pricing.config.js's visualisation_bundles,
// since renderVisualisation()'s bundle-card grid iterates that object directly — keeping
// it out means no extra card appears; this path is only reachable via the recommender.
const NO_BUNDLE = { key: 'none', sku: null, name: 'Custom (Pay-As-You-Go)', included_users: 0, included_memory_gb: 0, price: 0 };

function getVisualisationBundlePricing(v) {
  const C = cfg();
  const bundle = v.bundleTier === 'none' ? NO_BUNDLE : (C.visualisation_bundles[v.bundleTier] || C.visualisation_bundles.small);
  const linkMod = C.enhanced_capabilities.nuix_modules.linkurious;
  const boosterUserTier = linkMod.user_tiers.find(t => t.key === v.boosterUserTier) || linkMod.user_tiers[0];
  const boosterMemTier  = linkMod.memory_tiers.find(t => t.key === v.boosterMemoryTier) || linkMod.memory_tiers[0];
  const boosterUserQty  = v.boosterUserQty   || 0;
  const boosterMemQty   = v.boosterMemoryQty || 0;
  const boosterUserUSD  = boosterUserTier.price * boosterUserQty;
  const boosterMemUSD   = boosterMemTier.price  * boosterMemQty;
  return {
    bundle, boosterUserTier, boosterMemTier, boosterUserQty, boosterMemQty,
    boosterUserUSD, boosterMemUSD,
    totalUsers: bundle.included_users      + boosterUserTier.users * boosterUserQty,
    totalGb:    bundle.included_memory_gb  + boosterMemTier.gb     * boosterMemQty,
    totalBaseUSD: bundle.price + boosterUserUSD + boosterMemUSD
  };
}

// Cheapest way to cover at least `need` units using repeated packs of a single tier —
// boosters (like every other add-on in this tool) are bought as one tier + a quantity,
// not a mix of tiers, so this picks whichever single KGU/KGM tier is cheapest to reach
// or exceed the requirement.
function cheapestSingleTierCoverage(need, tiers, sizeField) {
  if (need <= 0) return { tier: tiers[0], qty: 0, cost: 0 };
  let best = null;
  for (const t of tiers) {
    const qty  = Math.ceil(need / t[sizeField]);
    const cost = qty * t.price;
    if (!best || cost < best.cost) best = { tier: t, qty, cost };
  }
  return best;
}

// Recommends the cheapest Visualisation Bundle tier (+ booster pack) for a desired
// total users/GB — mirrors recommendTier's "excess over included capacity, cheapest
// tier wins" logic, adapted to discrete KGU/KGM booster packs instead of a continuous
// per-unit booster rate.
function recommendVisualisationBundle(users, gb) {
  const C = cfg();
  const linkMod = C.enhanced_capabilities.nuix_modules.linkurious;
  const tierKeys = ['small', 'medium', 'large'];
  let best = null;
  for (const key of tierKeys) {
    const b = C.visualisation_bundles[key];
    const excessUsers = Math.max(0, users - b.included_users);
    const excessGb    = Math.max(0, gb    - b.included_memory_gb);
    const userCover = cheapestSingleTierCoverage(excessUsers, linkMod.user_tiers,   'users');
    const memCover  = cheapestSingleTierCoverage(excessGb,    linkMod.memory_tiers, 'gb');
    const cost = b.price + userCover.cost + memCover.cost;
    if (!best || cost <= best.cost) best = { tierKey: key, bundle: b, cost, userCover, memCover, excessUsers, excessGb };
  }
  // Also evaluate covering the whole ask from raw KGU/KGM packs with no bundle base —
  // cheaper than any preset once the need falls below the Small bundle's floor. Strict
  // "<" so an exact tie still prefers a real named bundle.
  const noneUserCover = cheapestSingleTierCoverage(users, linkMod.user_tiers,   'users');
  const noneMemCover  = cheapestSingleTierCoverage(gb,    linkMod.memory_tiers, 'gb');
  const noneCost = noneUserCover.cost + noneMemCover.cost;
  if (noneCost < best.cost) {
    best = { tierKey: 'none', bundle: NO_BUNDLE, cost: noneCost, userCover: noneUserCover, memCover: noneMemCover, excessUsers: users, excessGb: gb };
  }
  return best;
}

// The three AI Suite modules that are mutually exclusive with the AI Bundle SKU —
// selecting the Bundle disables these; selecting all three individually auto-upgrades to it.
const AI_BUNDLE_COMPONENT_KEYS = ['enrich', 'semantic', 'transcription'];
const AI_SUITE_CFG_KEY_MAP = { aiBundle: 'ai_bundle', enrich: 'enrich', semantic: 'semantic', transcription: 'transcription', agenticBYOAI: 'agentic_byo_ai', byoAIAdvanced: 'byo_ai_advanced', byoAIGraph: 'byo_ai_graph', agenticAdvanced: 'agentic_advanced' };

// The Solutions Library is no longer sold standalone — it's bundled at $0 whenever
// Enrich, Semantic Search or Transcription is selected. state.useCases.foundationOnly
// is kept as a derived mirror of that (rather than a manually-set toggle) so the many
// existing "!state.useCases.foundationOnly" checks throughout the app keep working
// unchanged. Call this after any change to state.aiSuite.enrich/semantic/transcription.
function syncSolutionsLibraryInclusion() {
  state.useCases.foundationOnly = !(state.aiSuite.aiBundle || state.aiSuite.enrich || state.aiSuite.semantic || state.aiSuite.transcription);
}

// If Enrich, Semantic Search and Transcription end up all selected individually
// (whichever order/source they were turned on from), swap to the cheaper AI Bundle SKU
// automatically rather than leaving three separately-priced lines on the quote.
function maybeAutoUpgradeToAiBundle() {
  if (!AI_BUNDLE_COMPONENT_KEYS.every(k => state.aiSuite[k])) return;
  state.aiSuite.aiBundle = true;
  AI_BUNDLE_COMPONENT_KEYS.forEach(k => state.aiSuite[k] = false);
  state.aiSuite.enrichManual = false;
  state.aiSuite.byoGraphAutoEnrich = false;
  syncSolutionsLibraryInclusion();
}

// The Visualisation Bundle (Knowledge Graph) requires Enrich. Auto-enable it when the
// bundle is turned on (unless the AI Bundle already covers that requirement; Enrich brings
// the bundled Solutions Library along automatically, so no separate handling is needed
// here), and reverse the auto-enable when it's turned off, unless the user had explicitly
// chosen Enrich themselves.
function applyKgEnrichDependency(turningOn) {
  const v = state.visualisation;
  if (turningOn) {
    if (!state.aiSuite.enrich && !state.aiSuite.aiBundle) {
      state.aiSuite.enrich = true;
      v.kgAutoEnrich = true;
    }
  } else {
    if (v.kgAutoEnrich && !state.aiSuite.enrichManual) {
      state.aiSuite.enrich = false;
    }
    v.kgAutoEnrich = false;
  }
  syncSolutionsLibraryInclusion();
  maybeAutoUpgradeToAiBundle();
}

// ─── Advantage support floor ─────────────────────────────────────────────────
// Some SKUs mandate a minimum Advantage level (e.g. Agentic: AI - Advanced requires
// Advantage Silver). These helpers are the single source of truth for that floor so it
// can be enforced everywhere support can change: the support selector, tier switches,
// and the AI Suite dependency logic below.
const SUPPORT_ORDER    = { 'Advantage Bronze': 1, 'Advantage Silver': 2, 'Advantage Gold': 3 };
const SUPPORT_KEY_NAME = { bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' };

// The Advantage level a tier includes for free (before any upgrade booster).
function getTierBaseSupport() {
  const tier = state.foundation.selectedTier;
  if (!tier) return 'Advantage Bronze';
  const C = cfg();
  const t = state.pricingModel === 'consumption' ? C.consumption_tiers[tier] : C.foundation_tiers[tier];
  return t?.support || 'Advantage Bronze';
}

// Effective Advantage level = the higher of the tier's included level and any chosen upgrade.
function getEffectiveSupportName() {
  const base = getTierBaseSupport();
  const boosterName = SUPPORT_KEY_NAME[state.foundation.boosters.support] || null;
  return boosterName && SUPPORT_ORDER[boosterName] > SUPPORT_ORDER[base] ? boosterName : base;
}

// Highest minimum Advantage level required by the current selections (null if none).
function getRequiredSupportLevel() {
  return state.aiSuite.agenticAdvanced ? 'Advantage Silver' : null;
}

// Raise the support upgrade booster if the effective level is below a required floor.
// Returns true if it changed the selection. Called wherever support or tier can change.
function enforceSupportFloor() {
  const req = getRequiredSupportLevel();
  if (!req) return false;
  if (SUPPORT_ORDER[getEffectiveSupportName()] >= SUPPORT_ORDER[req]) return false;
  const keyForReq = { 'Advantage Silver': 'silver', 'Advantage Gold': 'gold' }[req];
  if (!keyForReq) return false;
  state.foundation.boosters.support = keyForReq;
  state.aiSuite.supportAutoAgentic = true;
  return true;
}

// Agentic: AI - Advanced requires Semantic Search (which brings the bundled Solutions
// Library along) and Advantage Silver support. Auto-add/upgrade both when it's turned on,
// and reverse those auto-changes when it's turned off — unless the user had made the same
// choice themselves. "Requires Semantic Search" is satisfied by the AI Bundle too, since
// the Bundle contains Semantic Search (same treatment as the Enrich/KG dependency rule).
function applyAgenticAdvancedDependencies(turningOn) {
  if (turningOn) {
    // Semantic Search dependency (skip if the AI Bundle already covers it).
    if (!state.aiSuite.semantic && !state.aiSuite.aiBundle) {
      state.aiSuite.semantic = true;
      state.aiSuite.semanticAutoAgentic = true;
    }
    // Advantage Silver dependency — raise support to the required floor if the effective
    // level (tier base + any chosen booster) is below it. Rapid already includes Silver.
    enforceSupportFloor();
  } else {
    if (state.aiSuite.semanticAutoAgentic) {
      // Only pull Semantic back off if the user hasn't since committed to it another way
      // (manual pick, or it being drawn into the AI Bundle).
      if (!state.aiSuite.aiBundle) state.aiSuite.semantic = false;
      state.aiSuite.semanticAutoAgentic = false;
    }
    if (state.aiSuite.supportAutoAgentic) {
      state.foundation.boosters.support = null;
      state.aiSuite.supportAutoAgentic = false;
    }
  }
  syncSolutionsLibraryInclusion();
  maybeAutoUpgradeToAiBundle();
}

// Resolves one AI Suite module's US list price at a tier — every module (including
// the AI Bundle SKU) bills at full list price for that tier.
function getAiModuleBaseUSD(stateKey, tierKey, aiSuite) {
  const ck = AI_SUITE_CFG_KEY_MAP[stateKey];
  if (!ck || !tierKey) return 0;
  return cfg().ai_suite_modules[ck]?.price[tierKey] || 0;
}

// Salesforce's Discover SaaS volume-discount model: Active Data, Archive Data, File
// Transfer Data and Inactive Data are pooled. Their combined list-price total (monthly
// rate x 12 x contract length, with annual uplift compounding via the same
// getContractPeriods()/getPeriodPrice() every other multi-year total in this tool uses)
// becomes a TCV; ONE blended discount % is looked up from that TCV and applied equally
// to all four. Nothing else in Discover SaaS (ECA, Gen AI Review, etc.) is in this pool.
function discoverSaasVolumeDiscount(dc, nm) {
  dc = discoverCommitView(dc);
  const monthlyList = dc.active_gb * nm.active_gb_month
    + dc.archive_gb * nm.archive_gb_month
    + (dc.file_transfer_gb || 0) * nm.file_transfer_gb_month
    + (dc.inactive_gb      || 0) * nm.inactive_gb_month;
  const annualList = monthlyList * 12;
  const tcv = getContractPeriods().reduce((sum, p) => sum + getPeriodPrice(annualList, p), 0);
  const tiers = nm.volume_discount_tiers;
  let tier = tiers[0];
  for (const t of tiers) { if (tcv >= t.threshold) tier = t; }
  return { monthlyList, annualList, tcv, pct: tier.pct, tier };
}

// Discover SaaS is metered per GB/user/minute/document per month (annualized ×12),
// except Excel Redaction and document-based Gen AI Review, which are billed per
// document as entered — not a monthly rate, so no ×12.
// Audio transcription, machine translation, two-factor auth and Excel redaction can be
// committed upfront OR taken pay-as-you-go — never both. A PAYG add-on has no committed qty.
const DISCOVER_PAYG_ADDONS = {
  active_gb:            { sku: 'NRTCLGB',  name: 'Active Storage',               per: 'GB/month', rateKey: 'active_gb_month' },
  archive_gb:           { sku: 'NRTCLAD',  name: 'Archive Storage',              per: 'GB/month', rateKey: 'archive_gb_month' },
  file_transfer_gb:     { sku: 'NRTCLFT',  name: 'File Transfer Data',           per: 'GB/month', rateKey: 'file_transfer_gb_month' },
  inactive_gb:          { sku: 'NRTCLREF', name: 'Inactive Data',                per: 'GB/month', rateKey: 'inactive_gb_month' },
  eca_gb:               { sku: 'NRTECA',   name: 'Early Case Assessment',        per: 'GB/month', rateKey: 'eca_gb_month' },
  audio_minutes:        { sku: 'NRTAUDIO', name: 'Audio Transcription',          per: 'minute',   rateKey: 'audio_transcription_minute_month' },
  translation_docs:     { sku: 'NRTMLT',   name: 'Machine Language Translation', per: 'document', rateKey: 'machine_translation_doc_month' },
  tfa_users:            { sku: 'NRTTFA',   name: 'Two-Factor Authentication',    per: 'user',     rateKey: 'two_factor_auth_user_month' },
  excel_redaction_docs: { sku: 'NRTERDOC', name: 'Excel Redaction',              per: 'document', rateKey: 'excel_redaction_per_doc' }
};
function isDiscoverPayg(dc, field) { return !!(dc.payg && dc.payg[field]); }
function discoverCommitQty(dc, field) { return isDiscoverPayg(dc, field) ? 0 : (dc[field] || 0); }
// A copy of the SaaS config with every pay-as-you-go quantity zeroed, so pricing, the pooled
// volume discount and the committed SKU rows only ever see what is actually committed.
function discoverCommitView(dc) {
  const v = { ...dc };
  Object.keys(DISCOVER_PAYG_ADDONS).forEach(f => { if (isDiscoverPayg(dc, f)) v[f] = 0; });
  return v;
}
// Whole-unit price in the quote currency (fmt() rounds to the nearest 100, which would show
// $8,040 as $8,000).
function fmtExact(usd) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  return cur.symbol + Math.round(usd * cur.rate).toLocaleString('en-US');
}
function fmtRate(usd) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  return cur.symbol + (usd * cur.rate).toFixed(2);
}

function discoverSaasBaseUSD(dc, nm) {
  dc = discoverCommitView(dc);
  const df = 1 - discoverSaasVolumeDiscount(dc, nm).pct;
  const monthly = dc.active_gb * nm.active_gb_month * df
    + dc.archive_gb * nm.archive_gb_month * df
    + (dc.file_transfer_gb  || 0) * nm.file_transfer_gb_month * df
    + (dc.inactive_gb       || 0) * nm.inactive_gb_month * df
    + (dc.eca_gb            || 0) * nm.eca_gb_month
    + discoverCommitQty(dc, 'audio_minutes')    * nm.audio_transcription_minute_month
    + discoverCommitQty(dc, 'translation_docs') * nm.machine_translation_doc_month
    + discoverCommitQty(dc, 'tfa_users')        * nm.two_factor_auth_user_month
    + (dc.gen_ai_review_mode === 'active' ? dc.active_gb * nm.gen_ai_review_per_gb : 0);
  const oneOff = discoverCommitQty(dc, 'excel_redaction_docs') * nm.excel_redaction_per_doc
    + (dc.gen_ai_review_mode === 'document' ? (dc.gen_ai_review_docs || 0) * nm.gen_ai_review_per_doc : 0);
  return monthly * 12 + oneOff;
}

// Discover On-Prem is licensed per instance/user/GB/worker per year — no monthly
// metering, so unlike Discover SaaS none of these are annualized.
function discoverOnpremBaseUSD(dc, nm) {
  return nm.price_per_instance * (dc.instances || 0)
    + nm.price_per_user * (dc.users || 0)
    + nm.price_per_gb * (dc.capacity_gb || 0)
    + nm.predictive_coding_per_instance * (dc.predictive_coding_instances || 0)
    + nm.ai_review_per_instance * (dc.ai_review_instances || 0)
    + nm.enrich_per_instance * (dc.enrich_instances || 0)
    + nm.ingestion_per_worker * (dc.ingestion_workers || 0)
    + nm.excel_redaction_per_instance * (dc.excel_redaction_instances || 0);
}

// Advantage SKUs for Discover. CSLT104 (Nuix Advantage Discover SaaS) is offered whenever
// Discover SaaS is on the quote; CSLT107 Top Up 24 is offered on Discover-only quotes (Neo
// quotes already have their own tier-based Top Up). Both are priced per unit per year and
// sit in the Nuix Discover layer, shown under Advantage & Implementation in the summary.
// A SKU with a fixed list price per currency. Pricing runs in USD and is converted for
// display, so return the USD amount that converts back to exactly the local list price.
function listPriceUSD(pricesByCurrency) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  const local = pricesByCurrency[cur.name];
  return local != null ? local / cur.rate : pricesByCurrency.USD;
}

function discoverAdvantageSkuRows() {
  const adv = state.advantageServices || {};
  const C = cfg().consulting;
  const rows = [];
  // Support level (Bronze / Silver / Gold). A Discover-only quote has no included level, so
  // the chosen one is priced in full at the same CSLT10xU prices as the Neo upgrades. On a
  // Neo quote the level is priced with the Foundation tier instead.
  const supKey = state.foundation.boosters.support;
  if (isDiscoverSuite() && supKey) {
    const sku  = { bronze: 'CSLT101U', silver: 'CSLT102U', gold: 'CSLT103U' }[supKey];
    const name = { bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' }[supKey];
    rows.push({ sku, name: `Support – ${name}`, qty: 1, unit: 'Per year', notes: '', unitBaseUSD: getSupportIncrementalCost(supKey, null), key: 'enh_discover_support' });
  }
  const advQty = parseInt(adv.discoverAdvantageQty) > 0 ? 1 : 0;   // yes/no — never more than one
  if (state.enhancedCap.discover_saas.selected && advQty > 0)
    rows.push({ sku: 'CSLT104', name: 'Nuix Advantage Discover SaaS', qty: advQty, unit: 'Per unit/year', notes: '', unitBaseUSD: listPriceUSD(C.cslt104_prices), key: 'enh_discover_advantage' });
  const topUpQty = parseInt(adv.discoverTopUpQty) || 0;
  if (isDiscoverSuite() && topUpQty > 0)
    rows.push({ sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24', qty: topUpQty, unit: 'Per unit/year', notes: '24 hours consulting', unitBaseUSD: listPriceUSD(C.cslt107_topup_prices), key: 'enh_discover_topup' });
  return rows;
}

// Shared SKU-row builders for Discover SaaS/On-Prem, reused by every place that
// needs to list them as line items (quote detail, SKU export, admin summary).
function discoverSaasSkuRows(dcIn, nm) {
  const dc = discoverCommitView(dcIn);
  const rows = [];
  const disc = discoverSaasVolumeDiscount(dc, nm);
  const volNote = `×12/yr · ${Math.round(disc.pct * 100)}% vol. disc.`;
  if (dc.active_gb > 0)           rows.push({ sku: 'NRTCLGB',   name: 'Nuix Discover SaaS – Active Storage',           qty: dc.active_gb,           unit: 'Per GB/month',      notes: volNote, unitBaseUSD: nm.active_gb_month * (1 - disc.pct) * 12,                     key: 'enh_discoverSaas_active' });
  if (dc.archive_gb > 0)          rows.push({ sku: 'NRTCLAD',   name: 'Nuix Discover SaaS – Archive Storage',          qty: dc.archive_gb,          unit: 'Per GB/month',      notes: volNote, unitBaseUSD: nm.archive_gb_month * (1 - disc.pct) * 12,                    key: 'enh_discoverSaas_archive' });
  if (dc.file_transfer_gb > 0)    rows.push({ sku: 'NRTCLFT',   name: 'Nuix Discover SaaS – File Transfer Data',       qty: dc.file_transfer_gb,    unit: 'Per GB/month',      notes: volNote, unitBaseUSD: nm.file_transfer_gb_month * (1 - disc.pct) * 12,              key: 'enh_discoverSaas_fileTransfer' });
  if (dc.inactive_gb > 0)         rows.push({ sku: 'NRTCLREF',  name: 'Nuix Discover SaaS – Inactive Data',            qty: dc.inactive_gb,         unit: 'Per GB/month',      notes: volNote, unitBaseUSD: nm.inactive_gb_month * (1 - disc.pct) * 12,                   key: 'enh_discoverSaas_inactive' });
  if (dc.eca_gb > 0)              rows.push({ sku: 'NRTECA',    name: 'Nuix Discover SaaS – Early Case Assessment',    qty: dc.eca_gb,              unit: 'Per GB/month',      notes: '×12/yr', unitBaseUSD: nm.eca_gb_month * 12,                        key: 'enh_discoverSaas_eca' });
  if (dc.audio_minutes > 0)       rows.push({ sku: 'NRTAUDIO',  name: 'Nuix Discover SaaS – Audio Transcription',      qty: dc.audio_minutes,       unit: 'Per minute/month',  notes: '×12/yr', unitBaseUSD: nm.audio_transcription_minute_month * 12,   key: 'enh_discoverSaas_audio' });
  if (dc.translation_docs > 0)    rows.push({ sku: 'NRTMLT',    name: 'Nuix Discover SaaS – Machine Language Translation', qty: dc.translation_docs, unit: 'Per document/month', notes: '×12/yr', unitBaseUSD: nm.machine_translation_doc_month * 12,    key: 'enh_discoverSaas_translation' });
  if (dc.tfa_users > 0)           rows.push({ sku: 'NRTTFA',    name: 'Nuix Discover SaaS – Two-Factor Authentication', qty: dc.tfa_users,          unit: 'Per user/month',    notes: '×12/yr', unitBaseUSD: nm.two_factor_auth_user_month * 12,         key: 'enh_discoverSaas_tfa' });
  if (dc.excel_redaction_docs > 0) rows.push({ sku: 'NRTERDOC', name: 'Nuix Discover SaaS – Excel Redaction',          qty: dc.excel_redaction_docs, unit: 'Per document',     notes: 'one-off',  unitBaseUSD: nm.excel_redaction_per_doc,                 key: 'enh_discoverSaas_excelRedaction' });
  // Pay-as-you-go add-ons: a $0 committed line that records the usage rate for billing
  Object.entries(DISCOVER_PAYG_ADDONS).forEach(([field, a]) => {
    if (!isDiscoverPayg(dcIn, field)) return;
    rows.push({ sku: a.sku, name: `Nuix Discover SaaS – ${a.name} (Pay as you go)`, qty: 0, unit: 'Pay as you go',
      notes: `billed on usage · ${fmtRate(nm[a.rateKey])} per ${a.per}`, unitBaseUSD: 0, key: `enh_discoverSaas_payg_${field}` });
  });
  if (dc.gen_ai_review_mode === 'active' && dc.active_gb > 0)
    rows.push({ sku: 'NRTAIACT', name: 'Nuix Discover SaaS – Gen AI Review (Active Data)', qty: dc.active_gb,        unit: 'Per GB/month', notes: '×12/yr', unitBaseUSD: nm.gen_ai_review_per_gb * 12,               key: 'enh_discoverSaas_genaiActive' });
  if (dc.gen_ai_review_mode === 'document' && dc.gen_ai_review_docs > 0)
    rows.push({ sku: 'NRTAIDOC',  name: 'Nuix Discover SaaS – Gen AI Review (Document)',   qty: dc.gen_ai_review_docs, unit: 'Per document', notes: 'one-off', unitBaseUSD: nm.gen_ai_review_per_doc,                  key: 'enh_discoverSaas_genaiDocument' });
  return rows;
}
function discoverOnpremSkuRows(dc, nm) {
  const rows = [];
  if (dc.instances > 0)                    rows.push({ sku: 'NRTOPINST',    name: 'Nuix Discover On-Prem – Instance',                qty: dc.instances,                    unit: 'Per instance/yr', notes: '', unitBaseUSD: nm.price_per_instance,             key: 'enh_discoverOnprem_instance' });
  if (dc.users > 0)                        rows.push({ sku: 'NRTOPUSER',    name: 'Nuix Discover On-Prem – User',                    qty: dc.users,                        unit: 'Per user/yr',     notes: '', unitBaseUSD: nm.price_per_user,                  key: 'enh_discoverOnprem_user' });
  if (dc.capacity_gb > 0)                  rows.push({ sku: 'NRTHGB',       name: 'Nuix Discover On-Prem – Capacity (GB)',           qty: dc.capacity_gb,                  unit: 'Per GB/yr',       notes: 'alt. to Users', unitBaseUSD: nm.price_per_gb,     key: 'enh_discoverOnprem_capacity' });
  if (dc.predictive_coding_instances > 0)  rows.push({ sku: 'NRTPCODE',     name: 'Nuix Discover On-Prem – Predictive Coding Add-on', qty: dc.predictive_coding_instances,  unit: 'Per instance/yr', notes: '', unitBaseUSD: nm.predictive_coding_per_instance, key: 'enh_discoverOnprem_predictiveCoding' });
  if (dc.ai_review_instances > 0)          rows.push({ sku: 'NRTDISCAI01',  name: 'Nuix Discover On-Prem – AI Review',               qty: dc.ai_review_instances,          unit: 'Per instance/yr', notes: '', unitBaseUSD: nm.ai_review_per_instance,          key: 'enh_discoverOnprem_aiReview' });
  if (dc.enrich_instances > 0)             rows.push({ sku: 'NRTDISCAI02',  name: 'Nuix Discover On-Prem – Enrich (OOTB Models)',    qty: dc.enrich_instances,             unit: 'Per instance/yr', notes: '', unitBaseUSD: nm.enrich_per_instance,             key: 'enh_discoverOnprem_enrich' });
  if (dc.ingestion_workers > 0)            rows.push({ sku: 'NRTDISC01',    name: 'Nuix Discover On-Prem – Ingestions',              qty: dc.ingestion_workers,            unit: 'Per worker/yr',   notes: '', unitBaseUSD: nm.ingestion_per_worker,            key: 'enh_discoverOnprem_ingestions' });
  if (dc.excel_redaction_instances > 0)    rows.push({ sku: 'NRTDISCXLR01', name: 'Nuix Discover On-Prem – Native Excel Redaction',  qty: dc.excel_redaction_instances,    unit: 'Per instance/yr', notes: '', unitBaseUSD: nm.excel_redaction_per_instance,    key: 'enh_discoverOnprem_excelRedaction' });
  return rows;
}

// Test Environments — one row per selected test-environment SKU. A SKU whose list_price
// is still null in pricing.config.js is quoted at $0 and flagged "price TBC".
function nonProdSkuRows() {
  const qty = state.nonProd?.qty || {};
  return cfg().non_prod.skus.filter(s => (qty[s.sku] || 0) > 0).map(s => ({
    sku: s.sku, name: s.name, qty: 1, unit: 'Per unit/yr',
    notes: s.list_price == null ? 'Price TBC' : '',
    unitBaseUSD: s.list_price || 0, key: `nonProd_${s.sku}`
  }));
}
function nonProdBaseUSD() {
  return nonProdSkuRows().reduce((sum, r) => sum + r.unitBaseUSD * r.qty, 0);
}

// ─── Price calculations ───────────────────────────────────────────────────────
function calcPrices() {
  const rm   = getRM();
  const adsc = getAutoDisc();
  const tier = state.foundation.selectedTier;
  const C    = cfg();

  // Foundation
  let foundBase = 0;
  if (state.pricingModel === 'consumption' && tier) {
    const t   = C.consumption_tiers[tier];
    const b   = C.foundation_boosters[tier];
    const bst = state.foundation.boosters;
    const supportCost = bst.support ? getSupportIncrementalCost(bst.support, t.support) : 0;
    const byoAIPacks  = ['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k]) ? 7 : 0;
    foundBase = t.price
              + bst.volume * t.tb_booster_rate
              + bst.users * b.user
              + (bst.trainingHours + byoAIPacks) * b.training_hour
              + supportCost;
  } else if (tier) {
    const t = C.foundation_tiers[tier];
    const b = C.foundation_boosters[tier];
    const bst = state.foundation.boosters;
    const supportCost = bst.support ? getSupportIncrementalCost(bst.support, t.support) : 0;
    const byoAIPacks = ['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k]) ? 7 : 0;
    const isExpansion = state.customer.dealType === 'Neo Expansion';
    // Expansion deals: customer already owns the base tier — only price the new boosters
    const basePrice = isExpansion ? 0 : t.price;
    foundBase = basePrice + bst.workers * b.worker + bst.volume * b.volume_tb + bst.users * b.user + (bst.trainingHours + byoAIPacks) * b.training_hour + supportCost;
  }

  // AI Suite — tier is state.foundation.selectedTier for both pricing models
  let aiBase = 0;
  if (tier) {
    for (const sk of Object.keys(AI_SUITE_CFG_KEY_MAP)) {
      if (state.aiSuite[sk]) aiBase += getAiModuleBaseUSD(sk, tier, state.aiSuite);
    }
  }

  // Use Cases
  let ucBase = 0;
  if (!state.useCases.foundationOnly && tier) {
    ucBase += C.use_case_modules.solution_pack.price[tier] || 0;
  }

  // Enhanced capabilities
  let ecBase = 0;
  const ec = state.enhancedCap;
  const nm = C.enhanced_capabilities.nuix_modules;
  if (ec.discover_saas.selected)     ecBase += discoverSaasBaseUSD(ec.discover_saas, nm.discover_saas);
  if (ec.discover_onprem.selected)   ecBase += discoverOnpremBaseUSD(ec.discover_onprem, nm.discover_onprem);
  discoverAdvantageSkuRows().forEach(r => { ecBase += r.unitBaseUSD * r.qty; });
  if (ec.adaptive_security.selected) ecBase += nm.adaptive_security.price_per_endpoint * ec.adaptive_security.endpoints + nm.adaptive_security.price_per_user * ec.adaptive_security.users + nm.adaptive_security.price_per_server * ec.adaptive_security.servers;
  if (state.visualisation.selected) ecBase += getVisualisationBundlePricing(state.visualisation).totalBaseUSD;
  if (ec.ecc && ec.ecc.selected)                 ecBase += nm.ecc.price_per_endpoint * ec.ecc.endpoints;
  if (ec.legal_hold?.selected)                   ecBase += nm.legal_hold.price_per_custodian_month * ec.legal_hold.custodians * 12;
  if (ec.automated_relativity?.selected)         ecBase += nm.automated_relativity.list_price;
  const tp = C.enhanced_capabilities.third_party;
  if (ec.abbyy?.selected) {
    const abbyyPkg = tp.abbyy.packages.find(p => p.key === (ec.abbyy.pkg || 'abbfr002'));
    if (abbyyPkg) ecBase += abbyyPkg.price * (ec.abbyy.qty || 1);
  }
  if (ec.q1_dynamics?.connectors) ecBase += Object.entries(ec.q1_dynamics.connectors).filter(([,v])=>v).reduce((s,[k]) => s + (tp.q1_dynamics.connectors.find(c=>c.key===k)?.price||0), 0);
  if (ec.t3k?.selected) {
    ecBase += tp.t3k.price_per_instance * (ec.t3k.instances || 1);
    const tMode = ec.t3k.pricing_mode || 'tb';
    if (tMode === 'worker') {
      ecBase += tp.t3k.price_per_worker * (ec.t3k.workers || 10);
    } else if (tMode === 'tb') {
      const tbT = tp.t3k.tb_tiers.find(t => t.key === (ec.t3k.tb_tier || 'tb10'));
      if (tbT) ecBase += tbT.price;
    } else if (tMode === 'users') {
      const urT = tp.t3k.user_tiers.find(t => t.key === (ec.t3k.user_tier || 'ur10'));
      if (urT) ecBase += urT.price;
    }
  }
  if (ec.veritone?.selected) {
    ecBase += tp.veritone.price_per_instance * (ec.veritone.instances || 1);
    const vtT = tp.veritone.transcription_tiers.find(t => t.key === (ec.veritone.transcription_tier || 'sml'));
    if (vtT) ecBase += vtT.price;
    ecBase += tp.veritone.price_first_language * (ec.veritone.first_langs || 0);
    ecBase += tp.veritone.price_additional_language * (ec.veritone.additional_langs || 0);
  }

  // Consulting
  let consBase = 0;
  if (state.advantageServices?.implementationPackage) {
    consBase += C.consulting.cslt300_price;
  }
  if (state.advantageServices?.solutionImplementationPackage) {
    consBase += C.consulting.cslt301_price;
  }

  const blendedPct = (state.discounts.blended || 0) / 100;
  const layers = {
    foundation: { label: 'Nuix Neo Foundation',                        baseUSD: foundBase, rm, autoDisc: adsc, salesDisc: (state.discounts.foundation || 0) / 100 + blendedPct },
    aiSuite:    { label: 'AI Suite',                                 baseUSD: aiBase,    rm, autoDisc: adsc, salesDisc: (state.discounts.aiSuite    || 0) / 100 + blendedPct },
    useCases:   { label: 'Solutions Library',                  baseUSD: ucBase,    rm, autoDisc: adsc, salesDisc: (state.discounts.useCases   || 0) / 100 + blendedPct },
    enhanced:   { label: isDiscoverSuite() ? 'Nuix Discover' : 'Add Ons',                                 baseUSD: ecBase,    rm, autoDisc: adsc, salesDisc: (state.discounts.enhanced   || 0) / 100 + blendedPct },
    nonProd:    { label: 'Test Environments',                       baseUSD: nonProdBaseUSD(), rm, autoDisc: adsc, salesDisc: (state.discounts.nonProd || 0) / 100 + blendedPct },
    consulting: { label: 'Customisation & Consulting',              baseUSD: consBase,  rm: 1, autoDisc: 1, salesDisc: (state.discounts.consulting || 0) / 100 + blendedPct }
  };

  for (const l of Object.values(layers)) {
    l.regional    = l.baseUSD * l.rm;
    l.afterAuto   = l.regional * l.autoDisc;
    l.salesDeduct = l.afterAuto * (-l.salesDisc);  // positive input = discount deducted, negative input = premium added
    l.net         = l.afterAuto + l.salesDeduct;
  }

  return layers;
}

function needsApproval(layers) {
  // CEO approval needed when the applied discount exceeds this deal's ceiling
  const ceiling = getMaxThreshold();
  return Object.values(layers).some(l => l.salesDisc > ceiling);
}

// ─── Upsell recommendation engine ────────────────────────────────────────────

function computeUpsellRecommendation() {
  const currentACV     = parseFloat(state.upsell?.currentACV)    || 0;
  const targetACV      = parseFloat(state.upsell?.targetACV)     || 0;
  const currentWorkers = parseFloat(state.upsell?.currentWorkers) || 0;
  // Optional — lets a deal with light worker needs but heavy Concurrent Review usage
  // (e.g. a large review team) still size into the right tier.
  const currentUsers   = parseFloat(state.upsell?.currentUsers)  || 0;

  if (!currentACV || !targetACV || !currentWorkers) return null;

  const C            = cfg();
  const rm           = getRM();
  const autoDisc     = getAutoDisc();

  // Both inputs are in the selected display currency; convert to USD for all price comparisons
  const cur          = CURRENCIES[state.currency] || CURRENCIES.USD;
  const currentACVusd = currentACV / cur.rate;
  const maxBudget     = targetACV / cur.rate;

  // ── Step 1: Find value-optimal Neo Foundation tier for the worker + user counts ──
  // recommendTier picks the tier+booster combo with the lowest total list price,
  // so it correctly prefers Core over boosted-Light from ~20 workers (or users) onwards.
  const optRec   = recommendTier(currentWorkers, 0, currentUsers);
  const tierKey  = optRec.tier;
  const t        = C.foundation_tiers[tierKey];
  const b        = C.foundation_boosters[tierKey];
  const excessWorkers  = optRec.ew;
  const excessUsers    = optRec.eu;
  const foundBaseNoSup = t.price + excessWorkers * b.worker + excessUsers * b.user;
  const netAt0         = foundBaseNoSup * rm * autoDisc;
  // Ceiling is this deal's actual approvable discount (Additional Discount compounded
  // with region/government/multi-year headroom), not a flat 20% — see getMaxThreshold().
  const discountCeiling = getMaxThreshold();
  const netAtCeiling    = netAt0 * (1 - discountCeiling);

  let foundationRec = null;
  if (netAt0 <= maxBudget) {
    foundationRec = { tierKey, excessWorkers, excessUsers, foundBaseNoSup, additionalDisc: 0, netACV: netAt0 };
  } else if (netAtCeiling <= maxBudget) {
    const neededDisc     = 1 - maxBudget / netAt0;
    const additionalDisc = Math.min(neededDisc, discountCeiling);
    foundationRec = { tierKey, excessWorkers, excessUsers, foundBaseNoSup, additionalDisc, netACV: foundBaseNoSup * rm * autoDisc * (1 - additionalDisc) };
  }

  if (!foundationRec) {
    return { canMigrate: false, maxBudget, currentACV: currentACVusd, currentWorkers, currentUsers, discountCeiling };
  }

  const { additionalDisc } = foundationRec;
  let totalACV     = foundationRec.netACV;
  let remaining    = maxBudget - totalACV;
  let totalBaseUSD = foundationRec.foundBaseNoSup; // grows as we add items

  const addonsAdded = [];
  let solutionPackRec = null;

  // ── Step 2a: Try the AI Bundle SKU (Enrich + Semantic Search + Transcription,
  // which also bundles the Solutions Library, all in one line) before falling back
  // to individual items below. The Bundle is always cheaper than buying the three
  // separately, so recommend it whenever it fits the remaining budget.
  let bundleApplied = false;
  {
    const bundleBase = C.ai_suite_modules.ai_bundle.price[tierKey] || 0;
    const bundleNet  = bundleBase * rm * autoDisc;

    if (bundleBase > 0 && bundleNet <= remaining) {
      addonsAdded.push({ key: 'aiBundle', label: 'AI Bundle', type: 'ai', aiKey: 'aiBundle', baseUSD: bundleBase, netACV: bundleNet });
      remaining    -= bundleNet;
      totalACV     += bundleNet;
      totalBaseUSD += bundleBase;
      bundleApplied = true;
    }
  }

  // ── Step 2: Solution Pack — requires Enrich, so evaluate them as one bundle ──
  // Solution Pack can never be recommended without Enrich (product dependency rule).
  // If the AI Bundle doesn't fit the budget, Solution Pack is dropped entirely; Enrich
  // is still tried on its own as a regular AI add-on in Step 3 below.
  // (Skipped entirely if the AI Bundle above already committed everything.)
  if (!bundleApplied) {
    const spBase     = C.use_case_modules.solution_pack.price[tierKey] || 0;
    const spNet      = spBase * rm * autoDisc;
    const enrichBase = C.ai_suite_modules.enrich.price[tierKey] || 0;
    const enrichNet  = enrichBase * rm * autoDisc;
    const bundleCost = spNet + enrichNet;

    if (bundleCost <= remaining) {
      solutionPackRec = { key: 'solution_pack', label: C.use_case_modules.solution_pack.label, baseUSD: spBase, netACV: spNet };
      addonsAdded.push({ key: 'enrich', label: 'Enrich', type: 'ai', aiKey: 'enrich', baseUSD: enrichBase, netACV: enrichNet });
      remaining    -= bundleCost;
      totalACV     += spNet + enrichNet;
      totalBaseUSD += spBase + enrichBase;
    }
  }

  // ── Step 3: Remaining AI add-ons (Semantic, Transcription — plus Enrich if the
  // Solution Pack bundle above wasn't affordable). Skipped entirely if the AI
  // Bundle above already covers all three. ─────────────────────────────
  const addonCandidates = bundleApplied ? [] : [
    { key: 'enrich',        label: 'Enrich',          aiKey: 'enrich' },
    { key: 'semantic',      label: 'Semantic Search',  aiKey: 'semantic' },
    { key: 'transcription', label: 'Transcription',    aiKey: 'transcription' },
  ].filter(a => !addonsAdded.some(added => added.key === a.key));

  for (const addon of addonCandidates) {
    const addonBaseUSD = C.ai_suite_modules[addon.aiKey].price[tierKey] || 0;
    const addonNet = addonBaseUSD * rm * autoDisc;

    if (addonNet <= remaining) {
      addonsAdded.push({ ...addon, type: 'ai', baseUSD: addonBaseUSD, netACV: addonNet });
      remaining    -= addonNet;
      totalACV     += addonNet;
      totalBaseUSD += addonBaseUSD;
    }
  }

  const finalFoundBaseUSD = foundationRec.foundBaseNoSup;
  const foundationNetFinal = finalFoundBaseUSD * rm * autoDisc * (1 - additionalDisc);
  // Recompute totalACV cleanly
  const spNet      = solutionPackRec ? solutionPackRec.netACV : 0;
  const addonsNet  = addonsAdded.reduce((s, a) => s + a.netACV, 0);
  const totalACVFinal = foundationNetFinal + spNet + addonsNet;
  remaining = maxBudget - totalACVFinal;

  // ── Step 4: Negative blended discount (sell above list) to fill the rest of the
  // customer's target ACV. Foundation discount and add-on selection above only ever
  // spend up to maxBudget, so any budget still unspent here means we ran out of real
  // product to sell, not that we hit a cap — so this closes the gap all the way to
  // maxBudget itself (uncapped), not merely to a minimum growth benchmark.
  let negativeBlendedDisc  = 0; // as a fraction; negative = price increase

  if (totalACVFinal < maxBudget && remaining > 0) {
    // D_b = -(maxBudget - totalACVFinal) / (totalBaseUSD * rm * autoDisc)
    // totalBaseUSD * rm * autoDisc is the "base net" before any blended
    const baseNet = totalBaseUSD * rm * autoDisc;
    negativeBlendedDisc = -(maxBudget - totalACVFinal) / baseNet;
  }

  // Final ACV after blended adjustment
  // Increase = (-negativeBlendedDisc) * totalBaseUSD * rm * autoDisc
  const blendedIncrease = (-negativeBlendedDisc) * totalBaseUSD * rm * autoDisc;
  const finalTotalACV   = totalACVFinal + blendedIncrease;

  return {
    canMigrate: true,
    maxBudget,
    currentACV: currentACVusd,
    currentWorkers,
    currentUsers,
    foundation: {
      tierKey,
      tierName: C.foundation_tiers[tierKey].name,
      excessWorkers: foundationRec.excessWorkers,
      excessUsers: foundationRec.excessUsers,
      baseUSD: finalFoundBaseUSD,
      additionalDisc,
      netACV: foundationNetFinal
    },
    support: null,
    solutionPack: solutionPackRec,
    addons: addonsAdded,
    negativeBlendedDisc,
    totalACV: finalTotalACV,
    acvGrowthPct:    ((finalTotalACV / currentACVusd) - 1) * 100,
    acvGrowthAmount: finalTotalACV - currentACVusd,
    // Informational benchmark only — no longer a cap on Step 4 above, which fills all the
    // way to maxBudget regardless of whether that clears the 15% growth benchmark.
    hit15pctTarget:  finalTotalACV >= (currentACVusd * 1.15) - 1,  // within $1
    target15pct: currentACVusd * 1.15
  };
}

function applyRenewalNeoRecommendation() {
  const currentACV   = parseFloat(state.renewal.currentACV) || 0;
  const neoAcvTarget = parseFloat(state.renewal.neoAcvTarget);
  const growth       = parseFloat(state.renewal.acvGrowth) ?? 10;
  const targetACV    = (!isNaN(neoAcvTarget) && neoAcvTarget > 0) ? neoAcvTarget : currentACV * (1 + growth / 100);
  const workers      = parseFloat(state.renewal.neoWorkers) || 10;
  const users        = parseFloat(state.renewal.neoUsers)   || 0;
  // Set upsell state directly — do NOT call saveUpsellStep() here because those DOM
  // elements belong to the Upsell Builder page and don't exist on the Renewal Builder,
  // which would overwrite these values with empty strings before the rec is computed.
  state.upsell.currentACV     = String(currentACV);
  state.upsell.targetACV      = String(targetACV);
  state.upsell.currentWorkers = String(workers);
  state.upsell.currentUsers   = String(users);
  applyUpsellRecommendation(true);
}

function applyUpsellRecommendation(skipSave) {
  if (!skipSave) saveUpsellStep();
  const rec = computeUpsellRecommendation();
  if (!rec || !rec.canMigrate) return;

  const C = cfg();
  const { foundation, solutionPack, addons, negativeBlendedDisc } = rec;

  // Foundation
  state.foundation.selectedTier           = foundation.tierKey;
  state.foundation.workersNeeded          = parseFloat(state.upsell.currentWorkers) || 0;
  state.foundation.usersNeeded            = parseFloat(state.upsell.currentUsers) || 0;
  state.foundation.volumeNeeded           = 0;
  state.foundation.boosters.workers       = foundation.excessWorkers;
  state.foundation.boosters.volume        = 0;
  state.foundation.boosters.users         = foundation.excessUsers;
  state.foundation.boosters.trainingHours = 0;
  state.foundation.boosters.support       = null;

  // Discounts — additional discount is on the foundation layer
  state.discounts.foundation = Math.round(foundation.additionalDisc * 1000) / 10; // positive = discount %
  state.discounts.blended    = Math.round(negativeBlendedDisc * 1000) / 10;        // negative = premium %
  state.discounts.aiSuite    = 0;
  state.discounts.useCases   = 0;
  state.discounts.enhanced   = 0;

  // AI Suite
  state.aiSuite.aiBundle      = addons.some(a => a.key === 'aiBundle');
  state.aiSuite.enrich        = addons.some(a => a.key === 'enrich');
  state.aiSuite.enrichManual  = state.aiSuite.enrich;
  state.aiSuite.semantic      = addons.some(a => a.key === 'semantic');
  state.aiSuite.transcription = addons.some(a => a.key === 'transcription');
  state.aiSuite.agenticBYOAI  = false;
  state.aiSuite.byoAIAdvanced = false;
  state.aiSuite.byoAIGraph    = false;
  state.aiSuite.agenticAdvanced    = false;
  state.aiSuite.semanticAutoAgentic = false;
  state.aiSuite.supportAutoAgentic  = false;

  // Use Cases / Solution Pack — Solutions Library is bundled free with Enrich/Semantic/
  // Transcription, so inclusion is derived from the AI Suite selections just set above.
  syncSolutionsLibraryInclusion();
  state.useCases.secondary      = [];


  state.maxStep = Math.max(state.maxStep, 7);
  showStep(7);
}

// ─── Step rendering ───────────────────────────────────────────────────────────

function renderStep1() {
  const C = cfg();
  const typeOpts = ['Gov Agency','Gov Law Enforcement','Law Firm','Corporate','ASP','LSV']
    .map(t => `<option value="${t}" ${state.customer.type===t?'selected':''}>${t}</option>`).join('');

  return `
    <div class="card">
      <div style="margin-bottom:4px">
        <div class="card-title">Step A — Setup</div>
        <h2 style="margin:0">Customer Profile</h2>
      </div>
      <div class="form-grid" style="margin-top:16px">
        <div class="form-group full">
          <label>Customer / Organisation name</label>
          <input type="text" id="f-name" placeholder="e.g. Department of Home Affairs" value="${state.customer.name}">
        </div>
        <div class="form-group">
          <label>Country <span style="color:#dc2626" title="Required">*</span></label>
          <div style="position:relative">
            <input type="text" id="f-country" placeholder="Type to search country…" autocomplete="off" value="${state.customer.country || ''}">
            <div id="country-dropdown"
              style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:200;max-height:280px;overflow-y:auto"></div>
          </div>
        </div>
        <div class="form-group">
          <label>Customer type <span style="color:#dc2626" title="Required">*</span></label>
          <select id="f-type"><option value="">Select type…</option>${typeOpts}</select>
        </div>
        <div class="form-group">
          <label>Deal type</label>
          <select id="f-dealtype">
            <option value="">Select deal type…</option>
            <option value="Renewal" ${state.customer.dealType==='Renewal'?'selected':''}>Renewal or Nuix Neo Migration</option>
            <option value="Neo Expansion" ${state.customer.dealType==='Neo Expansion'?'selected':''}>Nuix Neo Expansion</option>
            <option value="New Business" ${state.customer.dealType==='New Business'?'selected':''}>New Business</option>
            <optgroup label="Nuix Discover">
              ${DISCOVER_DEAL_TYPES.map(d => `<option value="${d}" ${state.customer.dealType===d?'selected':''}>${d}</option>`).join('')}
            </optgroup>
          </select>
        </div>
        <div class="form-group full">
          <label>Opportunity Link <span class="text-muted" style="font-weight:400">(optional - required for Salesforce quote creation)</span></label>
          <input type="text" id="f-opportunity-link" placeholder="e.g. Salesforce Opportunity URL" value="${state.customer.opportunityLink || ''}">
        </div>
      </div>
      <div class="info-box" style="margin-top:16px">
        <strong>Deal type</strong> — choose the option that reflects the customer's current relationship with Nuix:
        <ul style="margin:8px 0 0 18px;padding:0">
          <li><strong>Renewal or Nuix Neo Migration</strong> — the customer already holds a Nuix contract, whether on Component products (e.g. Nuix Workstation) or a Nuix Neo Solution (e.g. Nuix Neo Investigations Solution).</li>
          <li><strong>Nuix Neo Expansion</strong> — the customer is already on Nuix Neo and this deal adds capacity to their existing contract.</li>
          <li><strong>New Business</strong> — the customer is a new logo, or this is a net-new environment at an existing customer.</li>
          <li><strong>Discover New Business / Renewal / Expansion</strong> — the same three situations for a Nuix Discover quote (SaaS or On-Prem) without Nuix Neo. Choosing one selects the Nuix Discover product suite for you.</li>
        </ul>
      </div>
    </div>`;
}

function autoTierFromWorkers(workers) {
  if (!workers || workers <= 0) return null;
  // Use the same recommendation logic as the standard foundation step — Rapid plus
  // boosters covers any worker count, uncapped, so there's no ceiling tier to escalate to.
  const rec = recommendTier(workers, 0, 0);
  return rec ? rec.tier : null;
}

function renderNeoExpansionBuilder() {
  const C = cfg();
  const currentWorkers = parseFloat(state.upsell.currentWorkers) || '';
  const autoTier = currentWorkers ? autoTierFromWorkers(currentWorkers) : null;
  const autoTierName = autoTier ? (C.foundation_tiers[autoTier]?.name || autoTier) : null;

  const tierBadge = autoTier ? `
    <div style="display:inline-flex;align-items:center;gap:8px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:8px;padding:10px 16px;margin-top:10px;font-size:13px;font-weight:600;color:#1E40AF">
      <span>Auto-allocated tier: ${autoTierName}</span>
    </div>` : '';

  return `
    <div class="card">
      <div class="card-title">Step E — Nuix Neo Expansion</div>
      <h2>Existing Contract Details</h2>
      <div class="info-box">Enter the customer's current Nuix Neo worker count. The tool will automatically allocate them to the correct pricing tier for this expansion.</div>

      <label class="field-label">Current Nuix Neo Workers</label>
      <input type="number" id="exp-neo-workers" min="1" step="1" placeholder="e.g. 30" value="${currentWorkers}">
      <span class="text-muted" style="display:block;margin-top:4px">Workers on the customer's existing contract</span>
      ${tierBadge}

    </div>`;
}

// ─── Renewal Builder ──────────────────────────────────────────────────────────

function renewalBomTotal() {
  return (state.renewal.bom || []).reduce((s, item) => s + (item.price || 0) * (item.qty || 1), 0);
}

// ─── Renewal computation helpers ─────────────────────────────────────────────

function parseComponentMapping(mapStr, itemQty) {
  if (!mapStr) return [];
  const skuIndex = {};
  (window.LEGACY_SKUS || []).forEach(s => { skuIndex[s.sku.toUpperCase()] = s; });
  return mapStr.split('+').map(part => {
    part = part.trim();
    const compound = part.match(/^(\d+)\*(.+)$/);
    const multiplier = compound ? parseInt(compound[1]) : 1;
    const skuCode    = (compound ? compound[2] : part).trim().toUpperCase();
    const found      = skuIndex[skuCode];
    const resolvedQty = multiplier * (itemQty || 1);
    return {
      sku:      found ? found.sku : skuCode,
      name:     found ? found.name : skuCode,
      price:    found ? found.price : null,
      qty:      resolvedQty,
      linePrice: (found?.price || 0) * resolvedQty
    };
  });
}

function computeComponentRenewal() {
  const bom = state.renewal.bom || [];
  if (!bom.length) return null;
  const skuIndex = {};
  (window.LEGACY_SKUS || []).forEach(s => { skuIndex[s.sku.toUpperCase()] = s; });
  const lines = [];
  let total = 0;
  let hasUnavailable = false;
  for (const item of bom) {
    // Always use the LEGACY_SKUS entry so we have the latest mapToComponent data
    const catalogEntry = skuIndex[item.sku.toUpperCase()];
    const cohort = catalogEntry?.cohort || item.cohort;
    if (cohort === 'O') {
      const linePrice = (item.price || 0) * (item.qty || 1);
      total += linePrice;
      lines.push({ original: item, status: 'renew', mapped: [{ sku: item.sku, name: item.name, qty: item.qty, price: item.price, linePrice }] });
    } else {
      const mapStr = catalogEntry?.mapToComponent || null;
      if (!mapStr) {
        hasUnavailable = true;
        lines.push({ original: item, status: 'unavailable', mapped: [] });
      } else {
        const mapped = parseComponentMapping(mapStr, item.qty || 1);
        const lineTotal = mapped.reduce((s, m) => s + (m.linePrice || 0), 0);
        total += lineTotal;
        lines.push({ original: item, status: 'mapped', mapped });
      }
    }
  }
  return { lines, total, hasUnavailable };
}

function computeRenewalNeoRecommendation() {
  const currentACV = parseFloat(state.renewal.currentACV) || 0;
  if (!currentACV) return null;
  const neoAcvTarget = parseFloat(state.renewal.neoAcvTarget);
  const growth    = parseFloat(state.renewal.acvGrowth) ?? 10;
  const targetACV = (!isNaN(neoAcvTarget) && neoAcvTarget > 0) ? neoAcvTarget : currentACV * (1 + growth / 100);
  // The upsell engine requires currentWorkers > 0 to size the tier.
  // For renewal we use 10 (Light minimum) as the floor; the budget constraint
  // in the engine will select the right tier regardless.
  const saved = { currentACV: state.upsell.currentACV, targetACV: state.upsell.targetACV, currentWorkers: state.upsell.currentWorkers, currentUsers: state.upsell.currentUsers };
  const workers = parseFloat(state.renewal.neoWorkers) || 10;
  const users   = parseFloat(state.renewal.neoUsers)   || 0;
  state.upsell.currentACV     = String(currentACV);
  state.upsell.targetACV      = String(targetACV);
  state.upsell.currentWorkers = String(workers);
  state.upsell.currentUsers   = String(users);
  const rec = computeUpsellRecommendation();
  state.upsell.currentACV     = saved.currentACV;
  state.upsell.targetACV      = saved.targetACV;
  state.upsell.currentWorkers = saved.currentWorkers;
  state.upsell.currentUsers   = saved.currentUsers;
  return rec;
}

function renderRenewalBuilder() {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  const sym = cur.symbol;
  const r   = state.renewal;
  const currentACV = r.currentACV || '';
  const acvGrowth  = r.acvGrowth  != null ? r.acvGrowth : 10;
  const bom        = r.bom || [];

  const bomRows = bom.length === 0
    ? `<tr><td colspan="3" style="text-align:center;padding:24px 16px;color:#9ca3af;font-size:13px">No SKUs added yet — search above and click Add.</td></tr>`
    : bom.map((item, idx) => {
        const cohortBadge = item.cohort === 'L'
          ? `<span style="font-size:10px;font-weight:700;background:#FEF3C7;color:#92400E;border-radius:4px;padding:2px 6px;margin-left:6px">Legacy</span>`
          : '';
        return `<tr style="border-top:1px solid #e5e7eb">
          <td style="padding:10px 12px;font-weight:700;font-size:13px;color:#003080;white-space:nowrap">${item.sku}${cohortBadge}</td>
          <td style="padding:10px 12px;font-size:13px;color:#1a1a2e">${item.name}</td>
          <td style="padding:10px 12px;white-space:nowrap">
            <input type="number" class="ren-bom-qty" data-idx="${idx}" min="1" value="${item.qty || 1}"
              style="width:60px;border:1.5px solid #d1d5db;border-radius:6px;padding:4px 8px;font-size:13px;text-align:center">
          </td>
          <td style="padding:10px 8px;text-align:center">
            <button class="ren-bom-remove" data-idx="${idx}"
              style="background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;line-height:1"
              title="Remove">✕</button>
          </td>
        </tr>`;
      }).join('');

  return `
    <div class="card">
      <div class="card-title">Step E — Setup</div>
      <h2>Renewal Builder</h2>
      <p style="font-weight:700;margin-bottom:8px">This step is optional. Click Customer Value below to skip over it.</p>
      <p class="text-muted" style="margin-bottom:20px">Enter the customer's current contract details to build a bill of materials for this renewal.</p>

      <div class="form-grid cols-2" style="max-width:540px;margin-bottom:16px">
        <div class="form-group">
          <label>Current ACV (${sym})</label>
          <input type="text" id="f-ren-currentacv" inputmode="numeric" placeholder="e.g. 250,000" value="${currentACV ? parseFloat(currentACV).toLocaleString() : ''}">
          <span class="text-muted">Annual contract value today</span>
        </div>
        <div class="form-group">
          <label>Component ACV Growth (%)</label>
          <input type="number" id="f-ren-acvgrowth" min="0" max="200" step="1" placeholder="e.g. 10" value="${acvGrowth}">
          <span class="text-muted">Growth applied to Component renewal pricing</span>
        </div>
      </div>
      <div class="form-grid cols-3" style="margin-bottom:24px">
        <div class="form-group">
          <label>Nuix Neo ACV Target (${sym})</label>
          <input type="text" id="f-ren-neoacvtarget" inputmode="numeric" placeholder="e.g. 275,000" value="${r.neoAcvTarget ? parseFloat(r.neoAcvTarget).toLocaleString() : ''}">
          <span class="text-muted">Target ACV for Nuix Neo recommendation</span>
        </div>
        <div class="form-group">
          <label>Nuix Neo Workers Required</label>
          <input type="number" id="f-ren-neoworkers" min="1" step="1" placeholder="e.g. 10" value="${r.neoWorkers || ''}">
          <span class="text-muted">Processing workers for Neo tier sizing</span>
        </div>
        <div class="form-group">
          <label>Nuix Neo Review Users Required</label>
          <input type="number" id="f-ren-neousers" min="0" step="1" placeholder="e.g. 20" value="${r.neoUsers || ''}">
          <span class="text-muted">Concurrent Review users for Neo tier sizing</span>
        </div>
      </div>

      <h3 style="font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:12px">Current Bill of Materials</h3>
      <p class="text-muted" style="margin-bottom:16px;margin-top:-8px">Add the SKUs from the customer's current contract.</p>

      <div style="display:flex;gap:8px;margin-bottom:20px;position:relative">
        <div style="position:relative;flex:1">
          <input type="text" id="f-ren-sku" placeholder="Type a SKU code or product name to search…"
            autocomplete="off"
            style="width:100%;border:1.5px solid #d1d5db;border-radius:8px;padding:10px 14px;font-size:14px;outline:none;box-sizing:border-box">
          <div id="ren-sku-dropdown"
            style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:200;max-height:280px;overflow-y:auto"></div>
        </div>
        <button id="ren-bom-add"
          style="padding:10px 22px;background:#003080;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">
          Add
        </button>
      </div>

      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f3f5f8">
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280;white-space:nowrap">SKU</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280">Product Name</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280">Qty</th>
              <th style="padding:10px 8px"></th>
            </tr>
          </thead>
          <tbody id="ren-bom-tbody">
            ${bomRows}
          </tbody>
        </table>
      </div>
    </div>
    <div id="ren-options-area">
      ${bom.length > 0 ? renderRenewalOptions(sym) : ''}
    </div>`;
}

function renderRenewalOptions(sym) {
  const compRec = computeComponentRenewal();
  const neoRec  = computeRenewalNeoRecommendation();

  // ── Component option ────────────────────────────────────────────────────────
  let compHtml = '';
  if (compRec) {
    // Total Price = Current ACV + Component ACV Growth
    const currentACV   = parseFloat(state.renewal.currentACV) || 0;
    const acvGrowth    = parseFloat(state.renewal.acvGrowth) ?? 10;
    const componentTotalPrice = currentACV > 0 ? Math.round(currentACV * (1 + acvGrowth / 100)) : compRec.total;

    // Spread Total Price proportionally across lines by list price weight
    const listTotal = compRec.total; // sum of all mapped line list prices

    const lineRows = compRec.lines.map(line => {
      const orig = line.original;
      const legacyBadge = orig.cohort === 'L'
        ? `<span style="font-size:10px;font-weight:700;background:#FEF3C7;color:#92400E;border-radius:3px;padding:1px 5px;margin-left:4px">Legacy</span>` : '';

      if (line.status === 'unavailable') {
        return `<tr style="border-top:1px solid #fde68a;background:#FFFBEB">
          <td style="padding:10px 12px;white-space:nowrap">
            <span style="font-weight:700;color:#92400E;font-size:13px">${orig.sku}</span>${legacyBadge}
          </td>
          <td style="padding:10px 12px;font-size:13px;color:#374151">${orig.name}</td>
          <td colspan="2" style="padding:10px 12px">
            <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#b45309;background:#FEF3C7;border-radius:6px;padding:4px 10px;border:1px solid #fcd34d">
              ⚠ Capability no longer available — cannot be migrated to Component or Nuix Neo
            </span>
          </td>
        </tr>`;
      }

      if (line.status === 'renew') {
        const m = line.mapped[0];
        const lineListPrice = m.linePrice || 0;
        const lineAllocated = listTotal > 0 ? Math.round(componentTotalPrice * lineListPrice / listTotal) : 0;
        const lt = lineAllocated ? `${sym}${lineAllocated.toLocaleString()}` : '—';
        return `<tr style="border-top:1px solid #e5e7eb">
          <td style="padding:10px 12px;white-space:nowrap">
            <span style="font-weight:700;color:#003080;font-size:13px">${orig.sku}</span>
          </td>
          <td style="padding:10px 12px;font-size:13px;color:#374151">${orig.name}</td>
          <td style="padding:10px 12px;font-size:12px;color:#6b7280;white-space:nowrap">× ${m.qty}</td>
          <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#003080;text-align:right;white-space:nowrap">${lt}</td>
        </tr>`;
      }

      // status === 'mapped'
      // For mapped lines, compute total list price for all sub-lines combined, then allocate
      const mappedLineListTotal = line.mapped.reduce((s, m) => s + (m.linePrice || 0), 0);
      const mappedAllocated = listTotal > 0 ? Math.round(componentTotalPrice * mappedLineListTotal / listTotal) : 0;

      const mappedRows = line.mapped.map((m, i) => {
        // Each sub-line gets its proportional share of the mapped group's allocation
        const subShare = mappedLineListTotal > 0 ? Math.round(mappedAllocated * (m.linePrice || 0) / mappedLineListTotal) : 0;
        const lt = subShare ? `${sym}${subShare.toLocaleString()}` : '—';
        return `<tr style="border-top:${i === 0 ? '1px solid #e5e7eb' : '1px solid #f3f4f6'}">
          <td style="padding:${i === 0 ? '10px' : '4px'} 12px;white-space:nowrap">
            ${i === 0 ? `<span style="font-weight:700;color:#92400E;font-size:13px;text-decoration:line-through">${orig.sku}</span>${legacyBadge}<br><span style="font-size:11px;color:#6b7280">maps to ↓</span>` : ''}
          </td>
          <td style="padding:${i === 0 ? '10px' : '4px'} 12px;font-size:13px">
            <span style="font-weight:700;color:#003080">${m.sku}</span>
            <span style="color:#374151;margin-left:6px">${m.name}</span>
          </td>
          <td style="padding:${i === 0 ? '10px' : '4px'} 12px;font-size:12px;color:#6b7280;white-space:nowrap">× ${m.qty}</td>
          <td style="padding:${i === 0 ? '10px' : '4px'} 12px;font-size:13px;font-weight:700;color:#003080;text-align:right;white-space:nowrap">${lt}</td>
        </tr>`;
      }).join('');
      return mappedRows;
    }).join('');

    const unavailableCount = compRec.lines.filter(l => l.status === 'unavailable').length;
    const unavailableNote = unavailableCount > 0
      ? `<div style="margin-top:12px;padding:10px 14px;background:#FFFBEB;border:1px solid #fcd34d;border-radius:8px;font-size:12px;color:#92400E;font-weight:600">
          ⚠ ${unavailableCount} line item${unavailableCount > 1 ? 's' : ''} cannot be renewed on Component or Nuix Neo and will be excluded from this renewal.
        </div>` : '';

    compHtml = `
      <div class="card" style="border-top:4px solid #374151">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:4px">Option 2</div>
            <h2 style="margin-bottom:4px">Component Renewal</h2>
            <p class="text-muted">Renew on existing Nuix Component technology. Legacy SKUs are mapped to their current equivalent.</p>
          </div>
          <div style="background:#f3f5f8;border-radius:10px;padding:14px 20px;text-align:right;flex-shrink:0">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280;margin-bottom:2px">Total Price</div>
            <div style="font-size:22px;font-weight:800;color:#374151">${sym}${componentTotalPrice.toLocaleString()}</div>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f3f5f8">
                <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280;white-space:nowrap">SKU</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280">Renewal Product</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280;white-space:nowrap">Qty</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280;white-space:nowrap">Line Total</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid #374151;background:#f3f5f8">
                <td colspan="3" style="padding:12px 12px;font-size:13px;font-weight:700;color:#374151">Total Price</td>
                <td style="padding:12px 12px;font-size:15px;font-weight:800;color:#374151;text-align:right">${sym}${componentTotalPrice.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        ${unavailableNote}
        <div style="margin-top:16px;padding:12px 16px;background:#f9fafb;border-radius:8px;font-size:12px;color:#6b7280;border:1px solid #e5e7eb">
          Component pricing is based on current ACV + ${acvGrowth}% growth. Line totals are distributed proportionally by list price weight.
        </div>
      </div>`;
  }

  // ── Neo option ──────────────────────────────────────────────────────────────
  const currentACV = parseFloat(state.renewal.currentACV) || 0;
  let neoHtml = '';
  if (!currentACV) {
    neoHtml = `<div class="card" style="border-top:4px solid #0056e3;text-align:center;padding:32px;color:var(--muted)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:8px">Option 1 — Nuix Neo</div>
      <div style="font-weight:600">Enter a Current ACV and Nuix Neo ACV Target above to generate a Nuix Neo recommendation</div>
    </div>`;
  } else {
    const recHtml = renderUpsellRecommendation(neoRec).replace(/onclick="applyUpsellRecommendation\(\)"/g, 'onclick="applyRenewalNeoRecommendation()"');
    neoHtml = `
      <div class="card" style="border-top:4px solid #0056e3;padding-bottom:0;margin-bottom:0">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:4px">Option 1</div>
        <h2 style="margin-bottom:4px">Nuix Neo Migration</h2>
        <p class="text-muted" style="margin-bottom:16px">Migrate to the Nuix Neo platform. Based on the Nuix Neo ACV Target${state.renewal.neoAcvTarget ? ` of ${sym}${parseFloat(state.renewal.neoAcvTarget).toLocaleString()}` : ''}.</p>
        ${recHtml}
      </div>`;
  }

  // Stacked layout — Neo (Option 1) always on top
  return `<div style="display:flex;flex-direction:column;gap:20px">
    ${neoHtml}
    ${compHtml || ''}
  </div>`;
}

function renewalAddSku(skuStr) {
  const query = (skuStr || '').trim().toUpperCase();
  if (!query) return;
  const skus  = window.LEGACY_SKUS || [];
  const match = skus.find(s => s.sku.toUpperCase() === query)
             || skus.find(s => s.sku.toUpperCase().startsWith(query));
  const item = match
    ? { sku: match.sku, name: match.name, cohort: match.cohort, family: match.family, price: match.price, qty: 1 }
    : { sku: skuStr.trim(), name: 'Unknown SKU', cohort: 'O', family: '—', price: null, qty: 1 };
  if (!state.renewal.bom) state.renewal.bom = [];
  const existing = state.renewal.bom.find(b => b.sku.toUpperCase() === item.sku.toUpperCase());
  if (existing) existing.qty = (existing.qty || 1) + 1;
  else          state.renewal.bom.push(item);
}

function refreshRenewalOptions() {
  const area = $('ren-options-area');
  if (!area) return;
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  const bom = state.renewal.bom || [];
  area.innerHTML = bom.length > 0 ? renderRenewalOptions(cur.symbol) : '';
}

function renderBomRows(bom) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  const sym = cur.symbol;
  return bom.length === 0
    ? `<tr><td colspan="3" style="text-align:center;padding:24px 16px;color:#9ca3af;font-size:13px">No SKUs added yet — search above and click Add.</td></tr>`
    : bom.map((it, i) => {
        const cb = it.cohort === 'L' ? `<span style="font-size:10px;font-weight:700;background:#FEF3C7;color:#92400E;border-radius:4px;padding:2px 6px;margin-left:6px">Legacy</span>` : '';
        return `<tr style="border-top:1px solid #e5e7eb">
          <td style="padding:10px 12px;font-weight:700;font-size:13px;color:#003080;white-space:nowrap">${it.sku}${cb}</td>
          <td style="padding:10px 12px;font-size:13px;color:#1a1a2e">${it.name}</td>
          <td style="padding:10px 12px;white-space:nowrap">
            <input type="number" class="ren-bom-qty" data-idx="${i}" min="1" value="${it.qty || 1}"
              style="width:60px;border:1.5px solid #d1d5db;border-radius:6px;padding:4px 8px;font-size:13px;text-align:center">
          </td>
          <td style="padding:10px 8px;text-align:center">
            <button class="ren-bom-remove" data-idx="${i}"
              style="background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;line-height:1" title="Remove">✕</button>
          </td>
        </tr>`;
      }).join('');
}

function bindRenewalBomEvents() {
  document.querySelectorAll('.ren-bom-qty').forEach(inp => {
    inp.addEventListener('change', () => {
      const idx = parseInt(inp.dataset.idx);
      const val = Math.max(1, parseInt(inp.value) || 1);
      inp.value = val;
      if (state.renewal.bom[idx]) state.renewal.bom[idx].qty = val;
      refreshRenewalOptions();
    });
  });
  document.querySelectorAll('.ren-bom-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      state.renewal.bom.splice(idx, 1);
      const tbody = $('ren-bom-tbody');
      if (tbody) {
        tbody.innerHTML = renderBomRows(state.renewal.bom);
        bindRenewalBomEvents();
      }
      refreshRenewalOptions();
    });
  });
}

function renderUpsellRecommendation(rec) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;

  if (!rec) {
    return `<div class="card" style="text-align:center;padding:32px;color:var(--muted)">
      <div style="font-size:28px;margin-bottom:8px">⬡</div>
      <div style="font-weight:600">Enter the customer details above to generate a recommendation</div>
    </div>`;
  }

  const fmtBudget = n => fmt(n);

  if (!rec.canMigrate) {
    const maxBudgetFmt = fmtBudget(rec.maxBudget);
    const ceilingPct = ((rec.discountCeiling || 0) * 100).toFixed(1).replace(/\.0$/, '');
    return `
      <div class="card" style="border:2px solid #F59E0B;background:#FFFBEB">
        <div style="display:flex;align-items:flex-start;gap:16px">
          <span style="font-size:32px;flex-shrink:0">⚠️</span>
          <div>
            <div style="font-size:17px;font-weight:800;color:#92400E;margin-bottom:6px">Budget Insufficient for Nuix Neo Foundation Migration</div>
            <div style="color:#B45309;font-size:14px;line-height:1.6">
              The customer's target ACV of <strong>${maxBudgetFmt}</strong> does not cover the optimal Nuix Neo Foundation tier for ${rec.currentWorkers} processing workers — even with this deal's maximum ${ceilingPct}% additional discount applied.
            </div>
            <div style="margin-top:16px;background:#FEF3C7;border-radius:8px;padding:14px 18px;font-size:14px;font-weight:700;color:#92400E;border:1px solid #F59E0B">
              Please consider renewing the customer on their existing Nuix solution.
            </div>
          </div>
        </div>
      </div>`;
  }

  const C   = cfg();
  const { foundation, solutionPack, addons, totalACV, acvGrowthPct, acvGrowthAmount, negativeBlendedDisc, hit15pctTarget, target15pct } = rec;

  const growthColor = acvGrowthPct >= 15 ? '#15803d' : acvGrowthPct >= 5 ? '#d97706' : '#dc2626';

  // Build line items for recommendation breakdown
  const lines = [];

  // Foundation line
  const tierName = C.foundation_tiers[foundation.tierKey].name;
  const addDiscNote = foundation.additionalDisc > 0 ? ` · ${(foundation.additionalDisc * 100).toFixed(1)}% additional discount` : '';
  lines.push({
    icon: '⬡',
    label: tierName,
    sub: `${(parseFloat(rec.currentWorkers)||0)} workers (${C.foundation_tiers[foundation.tierKey].workers} included${foundation.excessWorkers > 0 ? ` + ${foundation.excessWorkers} booster` : ''}) · ${(parseFloat(rec.currentUsers)||0)} review users (${C.foundation_tiers[foundation.tierKey].users} included${foundation.excessUsers > 0 ? ` + ${foundation.excessUsers} booster` : ''})${addDiscNote}`,
    amount: foundation.netACV,
    type: 'foundation'
  });

  // Solution Pack
  if (solutionPack) {
    lines.push({
      icon: '📦',
      label: `${solutionPack.label} Solution Pack`,
      sub: `Matches primary use case`,
      amount: solutionPack.netACV,
      type: 'usecase'
    });
  }

  // AI add-ons
  addons.forEach(addon => {
    const typeLabel = addon.type === 'ai' ? 'AI Suite' : 'Enhanced Capability';
    lines.push({
      icon: addon.key === 'knowledge_graph' ? '🕸' : '🤖',
      label: addon.label,
      sub: typeLabel,
      amount: addon.netACV,
      type: addon.type
    });
  });

  // Negative blended (price increase)
  const blendedPct = Math.round(Math.abs(negativeBlendedDisc) * 1000) / 10;
  if (negativeBlendedDisc < -0.0001) {
    lines.push({
      icon: '📈',
      label: `Price adjustment (+${blendedPct}% across all layers)`,
      sub: `Applied to fill the customer's target ACV`,
      amount: totalACV - (foundation.netACV + (solutionPack ? solutionPack.netACV : 0) + addons.reduce((s,a) => s+a.netACV, 0)),
      type: 'blended'
    });
  }

  const linesHtml = lines.map(l => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span style="font-size:18px;line-height:1;margin-top:2px">${l.icon}</span>
        <div>
          <div style="font-weight:600;font-size:14px;color:var(--navy)">${l.label}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${l.note || l.sub}</div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:16px">
        ${l.amount != null ? `<div style="font-weight:700;font-size:14px;color:var(--navy)">${fmt(l.amount)}</div>` : ''}
      </div>
    </div>`).join('');

  const growth15Note = !hit15pctTarget && negativeBlendedDisc < -0.0001
    ? `<div style="font-size:12px;color:#d97706;margin-top:6px">⚠ Budget allows a maximum of ${acvGrowthPct.toFixed(1)}% growth — the 15% target requires ${fmtBudget(target15pct)} budget.</div>`
    : !hit15pctTarget && negativeBlendedDisc >= -0.0001
      ? `<div style="font-size:12px;color:#d97706;margin-top:6px">⚠ Budget fully utilised by capabilities — ACV growth is ${acvGrowthPct.toFixed(1)}%. Consider discussing a budget increase to reach 15%.</div>`
      : '';

  return `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px">Recommended Nuix Neo Migration Deal</div>
          <h2 style="margin:0">Deal Recommendation</h2>
        </div>
        <div style="background:var(--navy);color:#fff;border-radius:12px;padding:16px 24px;text-align:right;flex-shrink:0">
          <div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Target ACV</div>
          <div style="font-size:22px;font-weight:800">${fmt(rec.maxBudget)}</div>
          <div style="font-size:11px;opacity:0.6;margin-top:2px">Current: ${fmt(rec.currentACV)}</div>
        </div>
      </div>

      <div style="margin-bottom:20px">
        ${linesHtml}
      </div>

      <div style="background:var(--surface-2,#f8fafc);border-radius:10px;padding:16px 20px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:4px">Recommended ACV</div>
            <div style="font-size:28px;font-weight:800;color:var(--navy)">${fmt(totalACV)}</div>
            ${growth15Note}
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--muted);margin-bottom:4px">ACV Growth</div>
            <div style="font-size:24px;font-weight:800;color:${growthColor}">+${acvGrowthPct.toFixed(1)}%</div>
            <div style="font-size:13px;font-weight:600;color:${growthColor};margin-top:2px">+${fmt(acvGrowthAmount)} / year</div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="applyUpsellRecommendation()">Apply Recommendation &amp; Configure Deal →</button>
      </div>
      <p class="text-muted" style="margin-top:10px;font-size:12px">Applying the recommendation will pre-populate the deal builder. You can review and adjust every step before generating a quote.</p>
    </div>`;
}

let suiteNotice = '';   // one-off note shown on Step B after a suite change clears the deal type

function renderProductSuite() {
  const notice = suiteNotice; suiteNotice = '';
  const suites = [
    {
      key: 'neo',
      name: 'Nuix Neo',
      description: 'The Nuix Neo platform',
      icon: '⬡',
      available: true
    },
    {
      key: 'discover',
      name: 'Nuix Discover',
      description: 'Discover SaaS or Discover OP',
      icon: '◈',
      available: true
    }
  ];

  const cards = suites.map(s => {
    const selected = state.productSuite === s.key;
    return `
      <div class="suite-card ${selected ? 'selected' : ''} ${!s.available ? 'coming-soon' : ''}" data-suite="${s.key}">
        ${s.underConstruction ? '<div class="suite-coming-badge">Under Construction</div>' : ''}
        ${selected && s.available ? '<div class="suite-selected-badge">✓ Selected</div>' : ''}
        <div class="suite-icon">${s.icon}</div>
        <div class="suite-name">${s.name}</div>
        <div class="suite-desc">${s.description}</div>
      </div>`;
  }).join('');

  const comingSoonMsg = state.productSuite && !['neo', 'discover'].includes(state.productSuite) ? `
    <div style="background:#FEF3C7;border:1.5px solid #F59E0B;border-radius:10px;padding:20px 24px;display:flex;align-items:center;gap:16px;margin-top:8px">
      <span style="font-size:28px">🚧</span>
      <div>
        <div style="font-weight:700;color:#92400E;font-size:15px">Pricing tool coming soon</div>
        <div style="color:#B45309;font-size:13px;margin-top:2px">We're working on pricing configuration for this product. Please contact your pricing team directly for a quote.</div>
      </div>
    </div>` : '';

  return `
    <div class="card">
      <div class="card-title">Step B — Setup</div>
      <h2>Select Product Suite</h2>
      <p class="text-muted" style="margin-bottom:24px">Which Nuix product suite is the customer interested in?</p>
      <div class="suite-grid">${cards}</div>
      ${notice ? `<div style="background:#EFF6FF;border:1.5px solid #93C5FD;border-radius:10px;padding:12px 16px;margin-top:16px;font-size:13px;color:#1e40af;font-weight:600">${notice}</div>` : ''}
      ${comingSoonMsg}
    </div>`;
}

function renderContractStructure() {
  const C = cfg();
  // Always Standard Contract — auto-set isPOC to false
  state.customer.isPOC = false;

  const totalMonths = parseInt(state.customer.contractMonths) || 12;
  const fullYears   = Math.floor(totalMonths / 12);
  const remMonths   = totalMonths % 12;
  const showPartial = remMonths > 0;
  const showUplift  = fullYears > 1;

  return `
    <div class="card">
      <div class="card-title">Step C — Setup</div>
      <h2>Contract Duration</h2>
      <div class="poc-detail" style="margin-top:0">
        <div class="form-grid cols-2" style="padding:0">
          <div class="form-group">
            <label>Contract length (months)</label>
            <input type="number" id="f-contract-months" min="1" max="120" placeholder="36" value="${totalMonths}"
              oninput="
                const m = parseInt(this.value)||0;
                const fy = Math.floor(m/12);
                const rm = m%12;
                document.getElementById('annual-uplift-wrap').style.display = fy>1?'':'none';
                document.getElementById('partial-year-wrap').style.display = rm>0?'':'none';
              ">
            <span class="text-muted">Multi-year contracts add ${(C.discount_rules.multi_year_per_year * 100).toFixed(0)}% of discount headroom per additional full year (raises the discount ceiling, not an automatic price cut)</span>
          </div>
          <div class="form-group" id="annual-uplift-wrap" style="display:${showUplift ? '' : 'none'}">
            <label>Annual uplift</label>
            <div style="display:flex;align-items:center;gap:6px">
              <input type="number" id="f-annual-uplift" min="0" max="50" step="0.5" placeholder="10" value="${state.customer.annualUplift ?? 10}" style="width:100px">
              <span style="font-weight:700;color:var(--navy)">%</span>
            </div>
            <span class="text-muted">Annual price uplift after the first full year</span>
          </div>
          <div class="form-group">
            <label>Contract start date <span style="color:#dc2626">*</span></label>
            <input type="date" id="f-contract-start" required value="${state.customer.contractStartDate || ''}">
            <span class="text-muted">Required for Salesforce quote creation</span>
          </div>
          <div class="form-group" id="partial-year-wrap" style="display:${showPartial ? '' : 'none'}">
            <label>Partial year position</label>
            <select id="f-partial-position">
              <option value="end"   ${(state.customer.partialYearPosition||'end')==='end'   ? 'selected' : ''}>Stub at end (align to fixed end date)</option>
              <option value="start" ${(state.customer.partialYearPosition||'end')==='start' ? 'selected' : ''}>Ramp at start (partial first period)</option>
            </select>
            <span class="text-muted">Determines which period is pro-rated (${remMonths} month${remMonths!==1?'s':''})</span>
          </div>
        </div>
      </div>
    </div>`;
}

function renderPricingModel() {
  const sel = state.pricingModel;
  const isThirdPartyProcessor = ['Law Firm', 'LSV', 'ASP'].includes(state.customer.type);
  const consumptionTooltip = isThirdPartyProcessor
    ? `<div style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:6px 12px;background:#fef9c3;border:1.5px solid #eab308;border-radius:6px;font-size:12px;font-weight:600;color:#713f12">
        <span>⚠️</span><span>Consumption pricing is required for third-party data processors</span>
      </div>`
    : '';

  return `
    <div class="card">
      <div class="card-title">Step D — Setup</div>
      <h2>Pricing Model</h2>
      <p class="text-muted" style="margin-bottom:24px">How would you like to structure the Nuix Neo pricing?</p>
      <div class="contract-options">
        <div class="contract-opt ${sel === 'worker' ? 'selected' : ''}" data-pricing="worker">
          <div class="contract-opt-icon">⚙️</div>
          <div class="contract-opt-title">Worker-based</div>
          <div class="contract-opt-desc">Annual pricing based on processing workers. Predictable cost, with speed limited by processing capacity.</div>
        </div>
        <div class="contract-opt ${sel === 'consumption' ? 'selected' : ''}" data-pricing="consumption">
          <div class="contract-opt-icon">📊</div>
          <div class="contract-opt-title">Consumption-based</div>
          <div class="contract-opt-desc">Pricing based on the volume of data processed. Unlimited workers and speed.</div>
          ${consumptionTooltip}
        </div>
      </div>
      ${!sel ? '<p class="text-muted" style="text-align:center;padding:16px 0">Select a pricing model above to continue.</p>' : ''}
    </div>`;
}

function renderStep2() {
  if (state.pricingModel === 'consumption') return renderStep2Consumption();

  const isExpansion = state.customer.dealType === 'Neo Expansion';

  const C = cfg();

  if (!isExpansion && !state.foundation.selectedTier) {
    state.foundation.selectedTier = 'core';
    state.foundation.boosters = { workers: 0, volume: 0, users: 0, trainingHours: 0, support: null };
  }
  const tier = state.foundation.selectedTier;
  const recHtml = (!isExpansion && tier) ? renderTierRecommendation() : '';

  const lockedTierName = isExpansion && tier ? (C.foundation_tiers[tier]?.name || tier) : '';

  return `
    <div class="card">
      <div class="card-title">Layer 1 — Configure</div>
      <h2>Nuix Neo Foundation</h2>
      ${isExpansion ? `
      <div class="info-box">This is a Nuix Neo Expansion deal. The foundation tier is auto-allocated from the customer's current worker count. Configure any additional workers or users to add below.</div>
      <div style="display:inline-flex;align-items:center;gap:8px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:8px;padding:10px 16px;margin-bottom:20px;font-size:13px;font-weight:600;color:#1E40AF">
        <span>🔒 Tier: ${lockedTierName || '(set in Expansion Builder)'}</span>
      </div>
      <h3>Additional Capacity</h3>
      <div class="form-grid cols-3">
        <div class="form-group">
          <label>Additional workers needed</label>
          <input type="number" id="f-workers" min="0" placeholder="e.g. 5" value="${state.foundation.boosters.workers || 0}" oninput="state.foundation.boosters.workers=parseInt(this.value)||0;document.getElementById('exp-pricing-card').innerHTML=renderExpansionPricingCard();updateLiveQuote()">
          <span class="text-muted">Extra processing workers to add</span>
        </div>
        <div class="form-group">
          <label>Additional users needed</label>
          <input type="number" id="f-users" min="0" placeholder="e.g. 5" value="${state.foundation.boosters.users || 0}" oninput="state.foundation.boosters.users=parseInt(this.value)||0;document.getElementById('exp-pricing-card').innerHTML=renderExpansionPricingCard();updateLiveQuote()">
          <span class="text-muted">Extra concurrent users to add</span>
        </div>
      </div>
      <div id="exp-pricing-card">${renderExpansionPricingCard()}</div>` : `
      <div class="info-box">Tell us about your customer's requirements and we'll recommend the right foundation tier and any additional boosters needed.</div>
      <h3>Requirements</h3>
      <div class="form-grid cols-3">
        <div class="form-group">
          <label>Workers needed</label>
          <input type="number" id="f-workers" min="1" placeholder="e.g. 30" value="${state.foundation.workersNeeded}">
          <span class="text-muted">Processing workers required</span>
        </div>
        <div class="form-group">
          <label>Concurrent Review users</label>
          <input type="number" id="f-users" min="1" placeholder="e.g. 30" value="${state.foundation.usersNeeded}">
          <span class="text-muted">Concurrent Review users</span>
        </div>
      </div>
      <div id="tier-rec-area">${recHtml}</div>`}
    </div>`;
}

function renderExpansionPricingCard() {
  const tier = state.foundation.selectedTier;
  if (!tier) return '';
  const C = cfg();
  const rm    = getRM();
  const autoD = getAutoDisc();
  const discFactor = rm * autoD;

  const bst = state.foundation.boosters;
  const addWorkers = bst.workers || 0;
  const addUsers   = bst.users   || 0;

  const t = C.foundation_tiers[tier];
  const b = C.foundation_boosters[tier];
  if (!t || !b) return '';

  const workerCost = addWorkers * b.worker;
  const userCost   = addUsers   * b.user;
  const totalUSD   = workerCost + userCost;
  const totalNet   = totalUSD * discFactor;

  if (totalUSD === 0) return '';

  const lines = [];
  if (addWorkers > 0) lines.push(`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #DBEAFE"><span style="color:#374151;font-size:13px">+${addWorkers} additional worker${addWorkers !== 1 ? 's' : ''}</span><span style="font-weight:600;color:#1E40AF;font-size:13px">${fmt(addWorkers * b.worker * discFactor)}/yr</span></div>`);
  if (addUsers   > 0) lines.push(`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #DBEAFE"><span style="color:#374151;font-size:13px">+${addUsers} additional user${addUsers !== 1 ? 's' : ''}</span><span style="font-weight:600;color:#1E40AF;font-size:13px">${fmt(addUsers * b.user * discFactor)}/yr</span></div>`);

  return `
    <div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px;padding:16px 20px;margin-top:20px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#3B82F6;margin-bottom:12px">Expansion Pricing Preview · ${t.name}</div>
      ${lines.join('')}
      <div style="display:flex;justify-content:space-between;padding:10px 0 0"><span style="font-weight:700;color:#1E40AF;font-size:14px">Expansion addition</span><span style="font-weight:800;color:#1E40AF;font-size:18px">${fmt(totalNet)}/yr</span></div>
      <div style="font-size:11px;color:#6B7280;margin-top:4px">US list price · excludes use cases and add-ons</div>
    </div>`;
}

function renderStep2Consumption() {
  if (!state.foundation.boosters) {
    state.foundation.boosters = { workers: 0, volume: 0, users: 0, trainingHours: 0, support: null };
  }
  if (!state.foundation.selectedTier) {
    state.foundation.selectedTier = 'light';
  }
  const recHtml = renderConsumptionPricing();

  return `
    <div class="card">
      <div class="card-title">Layer 1 — Configure</div>
      <h2>Nuix Neo Foundation</h2>
      <div class="info-box">Tell us about your customer's requirements and we'll recommend the right consumption tier and any additional TB or user boosters needed.</div>
      <h3>Requirements</h3>
      <div class="form-grid cols-3">
        <div class="form-group">
          <label>Data to process (TB/yr)</label>
          <input type="number" id="f-tbperyear" min="1" placeholder="e.g. 40" value="${state.foundation.tbPerYear}">
          <span class="text-muted">Estimated annual data volume</span>
        </div>
        <div class="form-group">
          <label>Concurrent Review users</label>
          <input type="number" id="f-users" min="1" placeholder="e.g. 30" value="${state.foundation.usersNeeded}">
          <span class="text-muted">Concurrent Review users</span>
        </div>
      </div>
      <div id="consumption-pricing-area">${recHtml}</div>
    </div>`;
}

function renderConsumptionPricing() {
  const C    = cfg();
  const tier = state.foundation.selectedTier;
  if (!tier) return '';

  const rm      = getRM();
  const autoD   = getAutoDisc();
  const country = state.customer.country || 'your region';

  const t   = C.consumption_tiers[tier];
  const b   = C.foundation_boosters[tier];
  const bst = state.foundation.boosters;

  const supportCost = bst.support ? getSupportIncrementalCost(bst.support, t.support) : 0;
  const byoAIPacks  = ['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k]) ? 7 : 0;
  const basePrice   = t.price;
  const boostCost   = bst.volume * t.tb_booster_rate + bst.users * b.user + (bst.trainingHours + byoAIPacks) * b.training_hour + supportCost;
  const totalUSD    = basePrice + boostCost;
  const totalReg    = totalUSD * rm;
  const afterAutoD  = totalReg * autoD;
  const discFactor  = rm * autoD;

  const boosterLines = [];
  if (bst.volume > 0) boosterLines.push(`+${bst.volume} TB (${fmt(bst.volume * t.tb_booster_rate * discFactor)})`);
  if (bst.users > 0)  boosterLines.push(`+${bst.users} users (${fmt(bst.users * b.user * discFactor)})`);

  // Prices are US list; government/multi-year/regional size the discount ceiling,
  // not the price — so no per-tier "price adjustment" notes here.
  const autoDiscNotes = [];

  // Support upgrade options — only show levels above what the base tier includes
  const supportOrder = { 'Advantage Bronze': 1, 'Advantage Silver': 2, 'Advantage Gold': 3 };
  const baseLevel    = supportOrder[t.support] ?? 0;
  const supportOpts  = [
    { key: 'bronze', name: 'Advantage Bronze', price: getSupportIncrementalCost('bronze', t.support) },
    { key: 'silver', name: 'Advantage Silver', price: getSupportIncrementalCost('silver', t.support) },
    { key: 'gold',   name: 'Advantage Gold',   price: getSupportIncrementalCost('gold',   t.support) }
  ].filter(o => supportOrder[o.name] > baseLevel);

  // Upgrade suggestion — mirrors the worker model's logic, keyed on TB instead of workers
  const nextTierMap = { light: 'core', core: 'rapid' };
  const nextTierKey = nextTierMap[tier];
  let upgradeBanner = '';
  if (nextTierKey && boostCost > 0) {
    const nt = C.consumption_tiers[nextTierKey];
    const nb = C.foundation_boosters[nextTierKey];

    // Only capacity boosters count toward the threshold — support & training carry over regardless
    const capBoostCost = bst.volume * t.tb_booster_rate + bst.users * b.user;
    const effCapBoost  = capBoostCost * discFactor;
    const effGap       = (nt.price - t.price) * discFactor;
    const fraction     = effGap > 0 ? effCapBoost / effGap : 0;

    // Full cost at next tier: base + any remaining capacity boosters + same training/support
    const tbNeeded   = parseFloat(state.foundation.tbPerYear) || 0;
    const u          = state.foundation.usersNeeded || 0;
    const ntCapBoost = Math.max(0, tbNeeded - nt.included_tb) * nt.tb_booster_rate
                     + Math.max(0, u - nt.users) * nb.user;
    const ntTotalUSD   = nt.price + ntCapBoost + (bst.trainingHours + byoAIPacks) * nb.training_hour + supportCost;
    const effNextTotal = ntTotalUSD * discFactor;
    const effUplift    = effNextTotal - afterAutoD;

    if (fraction >= 0.5) {
      const driverLines = [];
      if (bst.volume > 0)        driverLines.push(`<li><strong>${bst.volume} TB additional volume</strong> — ${fmt(bst.volume * t.tb_booster_rate * discFactor)}/yr</li>`);
      if (bst.users > 0)         driverLines.push(`<li><strong>${bst.users} additional users</strong> — ${fmt(bst.users * b.user * discFactor)}/yr</li>`);
      if (bst.trainingHours > 0) driverLines.push(`<li><strong>${bst.trainingHours} Nuix Advantage Top Up pack${bst.trainingHours !== 1 ? 's' : ''}</strong> (${bst.trainingHours * 24} credits) — ${fmt(bst.trainingHours * b.training_hour * discFactor)}/yr</li>`);
      if (bst.support)           driverLines.push(`<li><strong>${supportOpts.find(o=>o.key===bst.support)?.name} support upgrade</strong> — ${fmt(getSupportIncrementalCost(bst.support, t.support) * discFactor)}/yr</li>`);

      const upliftText = effUplift <= 0
        ? `Upgrading to <strong>${nt.name}</strong> costs the same or less — <strong>${fmt(effNextTotal)}/yr</strong> with significantly more inclusions.`
        : `Upgrading to <strong>${nt.name}</strong> costs only <strong>${fmt(effUplift)}/yr more</strong> with lots more inclusions.`;

      const gainChips = (() => {
        const chips = [];
        const dtb = nt.included_tb    - (t.included_tb + bst.volume);
        const du  = nt.users          - (t.users       + bst.users);
        const dh  = nt.training_hours - t.training_hours;
        const chip = (txt) => `<span style="background:#EBF0FF;color:#003080;font-size:12px;font-weight:700;padding:5px 12px;border-radius:6px;letter-spacing:-0.1px">${txt}</span>`;
        if (dtb > 0) chips.push(chip(`+${dtb} TB/yr`));
        if (du > 0)  chips.push(chip(`+${du} users`));
        if (dh > 0)  chips.push(chip(`+${dh} training credits`));
        const supportOrder2 = { 'Advantage Bronze': 1, 'Advantage Silver': 2, 'Advantage Gold': 3 };
        if ((supportOrder2[nt.support] ?? 0) > (supportOrder2[t.support] ?? 0)) chips.push(chip(nt.support));
        return chips.join('');
      })();

      upgradeBanner = `
        <div style="margin-top:16px;border-radius:14px;overflow:hidden;box-shadow:0 4px 28px rgba(10,36,99,0.14)">
          <div style="background:linear-gradient(135deg,#003080 0%,#0056e3 100%);padding:16px 24px;display:flex;align-items:center;gap:12px">
            <span style="font-size:20px;line-height:1">✦</span>
            <div>
              <div style="font-weight:800;color:#fff;font-size:15px;letter-spacing:-0.2px">Consider upgrading to ${nt.name}</div>
              <div style="color:rgba(255,255,255,0.65);font-size:12px;margin-top:2px">Upgrade recommendation based on your selected add-ons</div>
            </div>
          </div>
          <div style="background:#fff;padding:22px 24px">
            <div style="color:#374151;font-size:13px;line-height:1.7;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f0f2f8">
              ${upliftText}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
              <div>
                <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:10px">Add-ons driving this</div>
                <ul style="margin:0;padding-left:16px;color:#374151;font-size:13px;line-height:2">
                  ${driverLines.join('')}
                </ul>
              </div>
              <div>
                <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:10px">What you gain</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">${gainChips}</div>
              </div>
            </div>

            <div style="margin-top:22px;padding-top:20px;border-top:1px solid #f0f2f8">
              <button class="btn btn-primary" style="font-size:13px;padding:10px 22px" onclick="upgradeToTier('${nextTierKey}')">Upgrade to ${nt.name} →</button>
            </div>
          </div>
        </div>`;
    }
  }

  // Tier-switch pills — cost every tier against the raw requirement (not just the
  // selected one) so the user can see, and knowingly override, the cheapest pick.
  const reqTB = parseFloat(state.foundation.tbPerYear) || 0;
  const reqU  = state.foundation.usersNeeded || 0;
  const tierCompare = ['light', 'core', 'rapid'].map(key => {
    const tk  = C.consumption_tiers[key];
    const bk  = C.foundation_boosters[key];
    const etb = Math.max(0, reqTB - tk.included_tb);
    const eu  = Math.max(0, reqU - tk.users);
    return { key, t: tk, etb, eu, cost: tk.price + etb * tk.tb_booster_rate + eu * bk.user };
  });
  const cheapestTierKey = tierCompare.reduce((a, c) => c.cost < a.cost ? c : a).key;
  // Before any requirement is entered "cheapest" is meaningless (Light always wins at zero).
  const hasRequirement = reqTB > 0 || reqU > 0;
  // Best fit (tier + boosters match the TB requirement exactly) is the default pick;
  // cheapest is "Best Value". Both can land on the same tier — Best Fit then wins the badge.
  const bestFitKey = reqTB > 0 ? bestFitConsumptionTier(reqTB) : cheapestTierKey;

  const tierPillsHtml = !hasRequirement ? '' : `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${tierCompare.map(tc => {
        const isSel = tc.key === tier;
        const isFit = reqTB > 0 && tc.key === bestFitKey;
        const isRec = tc.key === cheapestTierKey;
        const tbLine  = tc.etb > 0 ? `${tc.t.included_tb} TB + ${tc.etb} boosted = ${tc.t.included_tb + tc.etb}` : `${tc.t.included_tb} TB included`;
        const userLine = tc.eu  > 0 ? `${tc.t.users} users + ${tc.eu} boosted = ${tc.t.users + tc.eu}`          : `${tc.t.users} users included`;
        return `
        <div class="tier-switch-pill" data-tier-switch="${tc.key}" style="cursor:pointer;flex:1;min-width:150px;padding:10px 14px;border-radius:10px;border:1.5px solid rgba(255,255,255,${isSel ? '0.85' : '0.25'});background:rgba(255,255,255,${isSel ? '0.18' : '0.06'})">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700">${tc.t.name.replace('NEO – ', '')}</span>
            ${isFit ? `<span style="font-size:9px;font-weight:700;background:#EBF0FF;color:#003080;padding:2px 6px;border-radius:10px;letter-spacing:0.3px">BEST FIT</span>`
              : isRec ? `<span style="font-size:9px;font-weight:700;background:#EBF0FF;color:#003080;padding:2px 6px;border-radius:10px;letter-spacing:0.3px">BEST VALUE</span>` : ''}
          </div>
          <div style="font-size:16px;font-weight:800">${fmt(tc.cost * rm * autoD)}</div>
          <div style="font-size:11px;opacity:0.65;margin-top:4px">${tbLine}</div>
          <div style="font-size:11px;opacity:0.65">${userLine}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:11px;opacity:0.55;margin:-10px 0 16px">Compares base tier + capacity boosters only — support, training and other add-ons are priced below.</div>`;

  const tierOverrideNote = (hasRequirement && tier !== bestFitKey) ? (() => {
    const rec  = tierCompare.find(tc => tc.key === bestFitKey);
    const cur  = tierCompare.find(tc => tc.key === tier);
    const diff = (cur.cost - rec.cost) * rm * autoD;
    const blendedRate = Math.round(t.price / t.included_tb);
    return `
      <div style="margin-bottom:16px;font-size:12px;line-height:1.6;opacity:0.85">
        You've chosen <strong>${t.name.replace('NEO – ', '')}</strong> — ${diff >= 0 ? `${fmt(diff)}/yr more than` : `${fmt(-diff)}/yr less than`} ${rec.t.name.replace('NEO – ', '')} (best fit).
        Boosters on ${t.name.replace('NEO – ', '')} run ${fmt(t.tb_booster_rate * rm * autoD)}/TB, above its ~${fmt(blendedRate * rm * autoD)}/TB included rate.
        <span style="cursor:pointer;text-decoration:underline;font-weight:600" onclick="resetToRecommendedTier()">Reset to recommended tier</span>
      </div>`;
  })() : '';

  return `
    <div class="tier-rec">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <div class="tier-rec-label">${(!hasRequirement || tier === bestFitKey) ? 'Recommended tier' : 'Selected tier'}</div>
          <div class="tier-rec-name">${t.name}</div>
        </div>
        <button class="btn btn-ghost btn-sm" style="flex-shrink:0" onclick="resetFoundationRequirements()">↺ Reset</button>
      </div>
      ${tierPillsHtml}
      ${tierOverrideNote}
      <div class="tier-rec-rows">
        <span class="tier-rec-row" style="font-size:20px;font-weight:800;color:#fff;opacity:1;line-height:1">${t.included_tb + bst.volume} <span style="font-size:13px;font-weight:600;opacity:0.8">TB/yr</span></span>
        <span style="opacity:0.2;font-size:18px;line-height:1">|</span>

        <span class="tier-rec-row" style="font-size:12px;opacity:0.65"><strong>${t.users + bst.users}</strong> user cap</span>
        <span class="tier-rec-row" style="font-size:12px;opacity:0.65"><strong>${t.training_hours}</strong> training credits</span>
        <span class="tier-rec-row" style="font-size:12px;opacity:0.65">Support included: <strong>${bst.support ? supportOpts.find(o=>o.key===bst.support)?.name : t.support}</strong></span>
      </div>
      ${boosterLines.length ? `<div style="opacity:0.7;font-size:12px;margin-bottom:12px">Capacity boosters: ${boosterLines.join(' · ')}</div>` : ''}
      <div style="border-top:1px solid rgba(255,255,255,0.15);margin:14px 0 12px"></div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;opacity:0.6;margin-bottom:8px">Included in all tiers</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
        ${['File Types','Connectors','APIs','Automate','Investigate / Review','Training','Support (Advantage)'].map(f =>
          `<span style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px">${f}</span>`
        ).join('')}
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.15);margin-bottom:14px"></div>
      <div class="tier-price-row">
        <div>
          <div class="tier-price">${fmt(afterAutoD)}</div>
          <div class="tier-price-sub">per year · ${country}${autoDiscNotes.length ? ' · after price adjustments' : ''}</div>
          ${autoDiscNotes.length ? `<div style="opacity:0.6;font-size:11px;margin-top:4px">${autoDiscNotes.join(' · ')}</div>` : ''}
        </div>
        ${rm !== 1 ? `<div style="opacity:0.5;font-size:12px">Base USD: ${fmt(totalUSD)}</div>` : ''}
      </div>
    </div>
    ${upgradeBanner}`;
}

function renderTierRecommendation() {
  const C    = cfg();
  const tier = state.foundation.selectedTier;
  if (!tier) return '';

  const rm      = getRM();
  const autoD   = getAutoDisc();
  const country = state.customer.country || 'your region';

  const t   = C.foundation_tiers[tier];
  const b   = C.foundation_boosters[tier];
  const bst = state.foundation.boosters;

  const supportCost = bst.support ? getSupportIncrementalCost(bst.support, t.support) : 0;
  const byoAIPacks  = ['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k]) ? 7 : 0;
  const basePrice   = t.price;
  const boostCost   = bst.workers * b.worker + bst.volume * b.volume_tb + bst.users * b.user + (bst.trainingHours + byoAIPacks) * b.training_hour + supportCost;
  const totalUSD    = basePrice + boostCost;
  const totalReg    = totalUSD * rm;
  const afterAutoD  = totalReg * autoD;
  const discFactor  = rm * autoD;

  const boosterLines = [];
  if (bst.workers > 0)      boosterLines.push(`+${bst.workers} workers (${fmt(bst.workers * b.worker * discFactor)})`);
  if (bst.volume > 0)       boosterLines.push(`+${bst.volume} TB (${fmt(bst.volume * b.volume_tb * discFactor)})`);
  if (bst.users > 0)        boosterLines.push(`+${bst.users} users (${fmt(bst.users * b.user * discFactor)})`);

  // Tier-switch pills — cost every tier against the raw requirement (not just the
  // selected one) so the user can see, and knowingly override, the cheapest pick.
  // Surfacing included workers/users per tier (not just price) is what makes the
  // booster markup visible instead of a hidden gotcha.
  const reqW = state.foundation.workersNeeded || 0;
  const reqU = state.foundation.usersNeeded   || 0;
  const tierCompare = ['light', 'core', 'rapid'].map(key => {
    const tk = C.foundation_tiers[key];
    const bk = C.foundation_boosters[key];
    const ew = Math.max(0, reqW - tk.workers);
    const eu = Math.max(0, reqU - tk.users);
    return { key, t: tk, ew, eu, cost: tk.price + ew * bk.worker + eu * bk.user };
  });
  const cheapestTierKey = tierCompare.reduce((a, b) => b.cost < a.cost ? b : a).key;
  // Before any requirement is entered, "cheapest" is meaningless (Light always wins at
  // zero workers) — the step's own default (Core, before input) would otherwise look
  // like a spurious override. Only compare once there's a real requirement to size against.
  const hasRequirement = reqW > 0 || reqU > 0;
  // Best fit (tier + boosters match the worker requirement exactly) is the default pick;
  // cheapest is "Best Value". Both can land on the same tier — Best Fit then wins the badge.
  const bestFitKey = reqW > 0 ? bestFitTier(reqW) : cheapestTierKey;

  const tierPillsHtml = !hasRequirement ? '' : `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${tierCompare.map(tc => {
        const isSel = tc.key === tier;
        const isFit = reqW > 0 && tc.key === bestFitKey;
        const isRec = tc.key === cheapestTierKey;
        const workerLine = tc.ew > 0 ? `${tc.t.workers} workers + ${tc.ew} boosted = ${tc.t.workers + tc.ew}` : `${tc.t.workers} workers included`;
        const userLine   = tc.eu > 0 ? `${tc.t.users} users + ${tc.eu} boosted = ${tc.t.users + tc.eu}`     : `${tc.t.users} users included`;
        return `
        <div class="tier-switch-pill" data-tier-switch="${tc.key}" style="cursor:pointer;flex:1;min-width:150px;padding:10px 14px;border-radius:10px;border:1.5px solid rgba(255,255,255,${isSel ? '0.85' : '0.25'});background:rgba(255,255,255,${isSel ? '0.18' : '0.06'})">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700">${tc.t.name.replace('NEO – ', '')}</span>
            ${isFit ? `<span style="font-size:9px;font-weight:700;background:#EBF0FF;color:#003080;padding:2px 6px;border-radius:10px;letter-spacing:0.3px">BEST FIT</span>`
              : isRec ? `<span style="font-size:9px;font-weight:700;background:#EBF0FF;color:#003080;padding:2px 6px;border-radius:10px;letter-spacing:0.3px">BEST VALUE</span>` : ''}
          </div>
          <div style="font-size:16px;font-weight:800">${fmt(tc.cost * rm * autoD)}</div>
          <div style="font-size:11px;opacity:0.65;margin-top:4px">${workerLine}</div>
          <div style="font-size:11px;opacity:0.65">${userLine}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:11px;opacity:0.55;margin:-10px 0 16px">Compares base tier + capacity boosters only — support, training and other add-ons are priced below.</div>`;

  const tierOverrideNote = (hasRequirement && tier !== bestFitKey) ? (() => {
    const rec  = tierCompare.find(tc => tc.key === bestFitKey);
    const cur  = tierCompare.find(tc => tc.key === tier);
    const diff = (cur.cost - rec.cost) * rm * autoD;
    const blendedRate = Math.round(t.price / t.workers);
    return `
      <div style="margin-bottom:16px;font-size:12px;line-height:1.6;opacity:0.85">
        You've chosen <strong>${t.name.replace('NEO – ', '')}</strong> — ${diff >= 0 ? `${fmt(diff)}/yr more than` : `${fmt(-diff)}/yr less than`} ${rec.t.name.replace('NEO – ', '')} (best fit).
        Boosters on ${t.name.replace('NEO – ', '')} run ${fmt(b.worker * rm * autoD)}/worker, above its ~${fmt(blendedRate * rm * autoD)}/worker included rate.
        <span style="cursor:pointer;text-decoration:underline;font-weight:600" onclick="resetToRecommendedTier()">Reset to recommended tier</span>
      </div>`;
  })() : '';

  // Prices are US list; government/multi-year/regional size the discount ceiling,
  // not the price — so no per-tier "price adjustment" notes here.
  const autoDiscNotes = [];

  // Support upgrade options — only show levels above what the base tier includes
  const supportOrder = { 'Advantage Bronze': 1, 'Advantage Silver': 2, 'Advantage Gold': 3 };
  const baseLevel    = supportOrder[t.support] ?? 0;
  const supportOpts  = [
    { key: 'bronze', name: 'Advantage Bronze', price: getSupportIncrementalCost('bronze', t.support) },
    { key: 'silver', name: 'Advantage Silver', price: getSupportIncrementalCost('silver', t.support) },
    { key: 'gold',   name: 'Advantage Gold',   price: getSupportIncrementalCost('gold',   t.support) }
  ].filter(o => supportOrder[o.name] > baseLevel);

  // A selected SKU may mandate a minimum Advantage level (Agentic: AI - Advanced → Silver).
  // Lock any option that would drop effective support below that floor.
  const supFloor   = getRequiredSupportLevel();
  const noneLocked = !!supFloor && supportOrder[t.support] < supportOrder[supFloor];

  const supportHtml = supportOpts.length ? `
    <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.15)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;opacity:0.65;margin-bottom:10px">Support upgrade <span style="font-weight:400;opacity:0.7">(optional)</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div class="support-opt ${!bst.support ? 'active' : ''}" ${noneLocked ? `data-support-locked="1" title="${supFloor} is required by Agentic: AI - Advanced and can't be reduced."` : 'data-support="none"'} style="cursor:${noneLocked ? 'not-allowed' : 'pointer'};opacity:${noneLocked ? '0.4' : '1'};padding:8px 14px;border-radius:8px;border:1.5px solid rgba(255,255,255,${!bst.support ? '0.5' : '0.2'});background:rgba(255,255,255,${!bst.support ? '0.15' : '0.05'});font-size:12px;font-weight:600;color:#fff">
          ${noneLocked ? '🔒 ' : ''}Keep included<br><span style="font-weight:400;opacity:0.65">${t.support}</span>
        </div>
        ${supportOpts.map(o => { const oLocked = !!supFloor && supportOrder[o.name] < supportOrder[supFloor]; return `
        <div class="support-opt ${bst.support === o.key ? 'active' : ''}" ${oLocked ? 'data-support-locked="1" title="Below the required Advantage level."' : `data-support="${o.key}"`} style="cursor:${oLocked ? 'not-allowed' : 'pointer'};opacity:${oLocked ? '0.4' : '1'};padding:8px 14px;border-radius:8px;border:1.5px solid rgba(255,255,255,${bst.support === o.key ? '0.5' : '0.2'});background:rgba(255,255,255,${bst.support === o.key ? '0.15' : '0.05'});font-size:12px;font-weight:600;color:#fff">
          ${o.name}<br><span style="font-weight:400;opacity:0.65">+${fmt(o.price * discFactor)} / yr</span>
        </div>`; }).join('')}
      </div>
      ${supFloor ? `<div style="margin-top:10px;font-size:11px;font-weight:600;color:#fde68a">🔒 ${supFloor} required by Agentic: AI - Advanced</div>` : ''}
    </div>` : '';

  const trainingHtml = `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.15)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;opacity:0.65;margin-bottom:10px">Nuix Advantage – Top Up 24 Hours <span style="font-weight:400;opacity:0.7">(optional · ${fmt(b.training_hour * discFactor)}/pack · 24 hrs)</span></div>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="number" id="b-training-hours" min="0" value="${bst.trainingHours}" style="width:80px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.3);border-radius:6px;color:#fff;padding:6px 10px;font-size:14px;font-weight:600">
        <span style="opacity:0.65;font-size:13px">packs (${bst.trainingHours * 24} credits)</span>
        ${bst.trainingHours > 0 ? `<span style="opacity:0.65;font-size:13px">= ${fmt(bst.trainingHours * b.training_hour * discFactor)}</span>` : ''}
      </div>
      ${byoAIPacks > 0 ? `<div style="margin-top:8px;font-size:12px;font-weight:600;color:#fef08a">+ ${byoAIPacks} packs (${byoAIPacks * 24} hrs) auto-included for BYO AI implementation = ${fmt(byoAIPacks * b.training_hour * discFactor)}</div>` : ''}
      <div style="opacity:0.5;font-size:11px;margin-top:4px">Includes ${t.training_hours} credits in base tier</div>
    </div>`;

  // Upgrade suggestion — all comparisons use effective price (after regional rate + auto-discounts)
  const nextTierMap = { light: 'core', core: 'rapid' };
  const nextTierKey = nextTierMap[tier];
  let upgradeBanner = '';
  if (nextTierKey && boostCost > 0) {
    const nt  = C.foundation_tiers[nextTierKey];
    const nb  = C.foundation_boosters[nextTierKey];

    // Only capacity boosters count toward the threshold — support & training carry over regardless
    const capBoostCost  = bst.workers * b.worker + bst.volume * b.volume_tb + bst.users * b.user;
    const effCapBoost   = capBoostCost * discFactor;
    const effGap        = (nt.price - t.price) * discFactor;
    const fraction      = effGap > 0 ? effCapBoost / effGap : 0;

    // Full cost at next tier: base + any remaining capacity boosters + same training/support
    const w = state.foundation.workersNeeded || 0;
    const v = state.foundation.volumeNeeded  || 0;
    const u = state.foundation.usersNeeded   || 0;
    const ntCapBoost   = Math.max(0, w - nt.workers)    * nb.worker
                       + Math.max(0, v - nt.volume_tb)  * nb.volume_tb
                       + Math.max(0, u - nt.users)      * nb.user;
    const ntTotalUSD   = nt.price + ntCapBoost + (bst.trainingHours + byoAIPacks) * nb.training_hour + supportCost;
    const effNextTotal = ntTotalUSD * discFactor;
    const effUplift    = effNextTotal - afterAutoD;

    if (fraction >= 0.5) {
      const driverLines = [];
      if (bst.workers > 0)       driverLines.push(`<li><strong>${bst.workers} additional workers</strong> — ${fmt(bst.workers * b.worker * discFactor)}/yr</li>`);
      if (bst.volume > 0)        driverLines.push(`<li><strong>${bst.volume} TB additional volume</strong> — ${fmt(bst.volume * b.volume_tb * discFactor)}/yr</li>`);
      if (bst.users > 0)         driverLines.push(`<li><strong>${bst.users} additional users</strong> — ${fmt(bst.users * b.user * discFactor)}/yr</li>`);
      if (bst.trainingHours > 0) driverLines.push(`<li><strong>${bst.trainingHours} Nuix Advantage Top Up pack${bst.trainingHours !== 1 ? 's' : ''}</strong> (${bst.trainingHours * 24} credits) — ${fmt(bst.trainingHours * b.training_hour * discFactor)}/yr</li>`);
      if (bst.support)           driverLines.push(`<li><strong>${supportOpts.find(o=>o.key===bst.support)?.name} support upgrade</strong> — ${fmt(getSupportIncrementalCost(bst.support, t.support) * discFactor)}/yr</li>`);

      const upliftText = effUplift <= 0
        ? `Upgrading to <strong>${nt.name}</strong> costs the same or less — <strong>${fmt(effNextTotal)}/yr</strong> with significantly more inclusions.`
        : `Upgrading to <strong>${nt.name}</strong> costs only <strong>${fmt(effUplift)}/yr more</strong> with lots more inclusions.`;

      const gainChips = (() => {
        const chips = [];
        const dw = nt.workers       - (t.workers    + bst.workers);
        const dv = nt.volume_tb     - (t.volume_tb  + bst.volume);
        const du = nt.users         - (t.users      + bst.users);
        const dh = nt.training_hours - t.training_hours;
        const chip = (txt) => `<span style="background:#EBF0FF;color:#003080;font-size:12px;font-weight:700;padding:5px 12px;border-radius:6px;letter-spacing:-0.1px">${txt}</span>`;
        if (dw > 0) chips.push(chip(`+${dw} workers`));
        if (dv > 0) chips.push(chip(`+${dv} TB/yr`));
        if (du > 0) chips.push(chip(`+${du} users`));
        if (dh > 0) chips.push(chip(`+${dh} training credits`));
        const supportOrder = { 'Advantage Bronze': 1, 'Advantage Silver': 2, 'Advantage Gold': 3 };
        if ((supportOrder[nt.support] ?? 0) > (supportOrder[t.support] ?? 0)) chips.push(chip(nt.support));
        return chips.join('');
      })();

      upgradeBanner = `
        <div style="margin-top:16px;border-radius:14px;overflow:hidden;box-shadow:0 4px 28px rgba(10,36,99,0.14)">
          <div style="background:linear-gradient(135deg,#003080 0%,#0056e3 100%);padding:16px 24px;display:flex;align-items:center;gap:12px">
            <span style="font-size:20px;line-height:1">✦</span>
            <div>
              <div style="font-weight:800;color:#fff;font-size:15px;letter-spacing:-0.2px">Consider upgrading to ${nt.name}</div>
              <div style="color:rgba(255,255,255,0.65);font-size:12px;margin-top:2px">Upgrade recommendation based on your selected add-ons</div>
            </div>
          </div>
          <div style="background:#fff;padding:22px 24px">
            <div style="color:#374151;font-size:13px;line-height:1.7;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f0f2f8">
              ${upliftText}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
              <div>
                <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:10px">Add-ons driving this</div>
                <ul style="margin:0;padding-left:16px;color:#374151;font-size:13px;line-height:2">
                  ${driverLines.join('')}
                </ul>
              </div>
              <div>
                <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:10px">What you gain</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">${gainChips}</div>
              </div>
            </div>

            <div style="margin-top:22px;padding-top:20px;border-top:1px solid #f0f2f8">
              <button class="btn btn-primary" style="font-size:13px;padding:10px 22px" onclick="upgradeToTier('${nextTierKey}')">Upgrade to ${nt.name} →</button>
            </div>
          </div>
        </div>`;
    }
  }

  return `
    <div class="tier-rec">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <div class="tier-rec-label">${(!hasRequirement || tier === bestFitKey) ? 'Recommended tier' : 'Selected tier'}</div>
          <div class="tier-rec-name">${t.name}</div>
        </div>
        <button class="btn btn-ghost btn-sm" style="flex-shrink:0" onclick="resetFoundationRequirements()">↺ Reset</button>
      </div>
      ${tierPillsHtml}
      ${tierOverrideNote}
      <div class="tier-rec-rows">
        <span class="tier-rec-row" style="font-size:20px;font-weight:800;color:#fff;opacity:1;line-height:1">${t.workers + bst.workers} <span style="font-size:13px;font-weight:600;opacity:0.8">workers</span></span>
        <span style="opacity:0.2;font-size:18px;line-height:1">|</span>

        <span class="tier-rec-row" style="font-size:12px;opacity:0.65"><strong>${t.users + bst.users}</strong> user cap</span>
        <span class="tier-rec-row" style="font-size:12px;opacity:0.65"><strong>${t.training_hours}</strong> training credits</span>
        <span class="tier-rec-row" style="font-size:12px;opacity:0.65">Support included: <strong>${bst.support ? supportOpts.find(o=>o.key===bst.support)?.name : t.support}</strong></span>
      </div>
      ${boosterLines.length ? `<div style="opacity:0.7;font-size:12px;margin-bottom:12px">Capacity boosters: ${boosterLines.join(' · ')}</div>` : ''}
      <div style="border-top:1px solid rgba(255,255,255,0.15);margin:14px 0 12px"></div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;opacity:0.6;margin-bottom:8px">Included in all tiers</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
        ${['File Types','Connectors','APIs','Automate','Investigate / Review','Training','Support (Advantage)'].map(f =>
          `<span style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px">${f}</span>`
        ).join('')}
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.15);margin-bottom:14px"></div>
      <div class="tier-price-row">
        <div>
          <div class="tier-price">${fmt(afterAutoD)}</div>
          <div class="tier-price-sub">per year · ${country}${autoDiscNotes.length ? ' · after price adjustments' : ''}</div>
          ${autoDiscNotes.length ? `<div style="opacity:0.6;font-size:11px;margin-top:4px">${autoDiscNotes.join(' · ')}</div>` : ''}
        </div>
        ${rm !== 1 ? `<div style="opacity:0.5;font-size:12px">Base USD: ${fmt(totalUSD)}</div>` : ''}
      </div>
    </div>
    ${upgradeBanner}`;
}

function renderStepAdvantage() {
  const C    = cfg();
  const rm   = getRM();
  const autoD = getAutoDisc();
  const discFactor = rm * autoD;
  const bst  = state.foundation.boosters;
  const isConsumption = state.pricingModel === 'consumption';

  let t, b, baseSupport;
  if (isConsumption) {
    const tier = state.foundation.selectedTier;
    if (tier) {
      t = C.consumption_tiers[tier];
      b = C.foundation_boosters[tier];
      baseSupport = t.support;
    } else {
      baseSupport = isDiscoverSuite() ? 'No Advantage' : 'Advantage Bronze';
      b = null;
    }
  } else {
    const tier = state.foundation.selectedTier;
    if (tier) {
      t = C.foundation_tiers[tier];
      b = C.foundation_boosters[tier];
      baseSupport = t.support;
    } else {
      baseSupport = isDiscoverSuite() ? 'No Advantage' : 'Advantage Bronze';
      b = null;
    }
  }

  const supportOrder = { 'Advantage Bronze': 1, 'Advantage Silver': 2, 'Advantage Gold': 3 };
  const baseLevel = supportOrder[baseSupport] ?? 0;
  const supportOpts = [
    { key: 'bronze', name: 'Advantage Bronze', price: getSupportIncrementalCost('bronze', baseSupport) },
    { key: 'silver', name: 'Advantage Silver', price: getSupportIncrementalCost('silver', baseSupport) },
    { key: 'gold',   name: 'Advantage Gold',   price: getSupportIncrementalCost('gold',   baseSupport) }
  ].filter(o => supportOrder[o.name] > baseLevel);

  // A selected SKU may mandate a minimum Advantage level (Agentic: AI - Advanced → Silver).
  // Lock any option that would drop effective support below that floor.
  const supFloor   = getRequiredSupportLevel();
  const noneLocked = !!supFloor && supportOrder[baseSupport] < supportOrder[supFloor];

  const trainingRate = b ? b.training_hour : 0;
  const byoAIPacks   = ['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k]) ? 7 : 0;
  const implPkg      = state.advantageServices.implementationPackage;
  const implPrice    = C.consulting.cslt300_price;
  const solImplPkg   = state.advantageServices.solutionImplementationPackage;
  const solImplPrice = C.consulting.cslt301_price;

  const supportSection = supportOpts.length ? `
    <div class="config-section" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:14px">Support Upgrade <span style="font-weight:400">(optional)</span></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="support-opt ${!bst.support ? 'adv-opt-active' : 'adv-opt'}" data-support="none" style="cursor:pointer;padding:10px 16px;border-radius:10px;border:1.5px solid ${!bst.support ? '#003080' : '#e5e7eb'};background:${!bst.support ? '#eff6ff' : '#f9fafb'};font-size:13px;font-weight:600;color:${!bst.support ? '#003080' : '#374151'}">
          Keep included<br><span style="font-weight:400;font-size:12px;opacity:0.65">${baseSupport}</span>
        </div>
        ${supportOpts.map(o => `
        <div class="support-opt ${bst.support === o.key ? 'adv-opt-active' : 'adv-opt'}" data-support="${o.key}" style="cursor:pointer;padding:10px 16px;border-radius:10px;border:1.5px solid ${bst.support === o.key ? '#003080' : '#e5e7eb'};background:${bst.support === o.key ? '#eff6ff' : '#f9fafb'};font-size:13px;font-weight:600;color:${bst.support === o.key ? '#003080' : '#374151'}">
          ${o.name}<br><span style="font-weight:400;font-size:12px;color:#6b7280">+${fmt(o.price * discFactor)} / yr</span>
        </div>`).join('')}
      </div>
    </div>` : `
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:16px 20px;margin-bottom:16px;font-size:13px;font-weight:600;color:#166534">
      ✓ ${baseSupport} — highest support level included in your tier
    </div>`;

  const trainingBody = b ? `
      <div style="border-top:1px solid #e5e7eb;margin-top:20px;padding-top:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:14px">Nuix Advantage – Top Up 24 <span style="font-weight:400">(optional · ${fmt(trainingRate * discFactor)}/pack · 24 hrs each)</span></div>
        <div style="display:flex;align-items:center;gap:12px">
          <input type="number" id="b-training-hours" min="0" value="${bst.trainingHours}" style="width:80px;border:1.5px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:15px;font-weight:700;color:#1a1a2e;background:#fff">
          <span style="font-size:13px;color:#6b7280">packs (${bst.trainingHours * 24} credits)</span>
          ${bst.trainingHours > 0 ? `<span style="font-size:13px;font-weight:600;color:#059669">= ${fmt(bst.trainingHours * trainingRate * discFactor)}/yr</span>` : ''}
        </div>
        ${byoAIPacks > 0 ? `<div style="margin-top:8px;font-size:12px;font-weight:600;color:#d97706;background:#fef3c7;border-radius:6px;padding:6px 10px">+ ${byoAIPacks} packs auto-included for BYO AI implementation (${byoAIPacks * 24} hrs = ${fmt(byoAIPacks * trainingRate * discFactor)})</div>` : ''}
      </div>` : '';

  const combinedSupportCard = `
    <div class="config-section" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:16px">
      ${supportOpts.length ? `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:14px">Support Upgrade <span style="font-weight:400">(optional)</span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div class="support-opt ${!bst.support ? 'adv-opt-active' : 'adv-opt'}" ${noneLocked ? `data-support-locked="1" title="${supFloor} is required by Agentic: AI - Advanced and can't be reduced."` : 'data-support="none"'} style="cursor:${noneLocked ? 'not-allowed' : 'pointer'};opacity:${noneLocked ? '0.45' : '1'};padding:10px 16px;border-radius:10px;border:1.5px solid ${!bst.support ? '#003080' : '#e5e7eb'};background:${!bst.support ? '#eff6ff' : '#f9fafb'};font-size:13px;font-weight:600;color:${!bst.support ? '#003080' : '#374151'}">
            ${noneLocked ? '🔒 ' : ''}Keep included<br><span style="font-weight:400;font-size:12px;opacity:0.65">${baseSupport}</span>
          </div>
          ${supportOpts.map(o => { const oLocked = !!supFloor && supportOrder[o.name] < supportOrder[supFloor]; return `
          <div class="support-opt ${bst.support === o.key ? 'adv-opt-active' : 'adv-opt'}" ${oLocked ? 'data-support-locked="1" title="Below the required Advantage level."' : `data-support="${o.key}"`} style="cursor:${oLocked ? 'not-allowed' : 'pointer'};opacity:${oLocked ? '0.45' : '1'};padding:10px 16px;border-radius:10px;border:1.5px solid ${bst.support === o.key ? '#003080' : '#e5e7eb'};background:${bst.support === o.key ? '#eff6ff' : '#f9fafb'};font-size:13px;font-weight:600;color:${bst.support === o.key ? '#003080' : '#374151'}">
            ${o.name}<br><span style="font-weight:400;font-size:12px;color:#6b7280">+${fmt(o.price * discFactor)} / yr</span>
          </div>`; }).join('')}
        </div>
        ${supFloor ? `<div style="margin-top:10px;font-size:12px;font-weight:600;color:#166534;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px">🔒 ${supFloor} is required by Agentic: AI - Advanced and can't be reduced.</div>` : ''}` : `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:14px">Support Upgrade</div>
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:12px 16px;font-size:13px;font-weight:600;color:#166534">
          ✓ ${baseSupport} — highest support level included in your tier
        </div>`}
      ${trainingBody}
    </div>`;

  const implSection = `
    <div class="config-section" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:14px">Implementation Services</div>
      <div style="display:flex;align-items:flex-start;gap:16px">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;flex:1">
          <input type="checkbox" id="adv-impl-pkg" ${implPkg ? 'checked' : ''} style="margin-top:3px;width:18px;height:18px;cursor:pointer;accent-color:#003080">
          <div>
            <div style="font-size:14px;font-weight:700;color:#1a1a2e">Nuix Neo Foundation Implementation Package</div>
            <div style="font-size:12px;color:#6b7280;margin-top:3px">SKU: CSLT300 · ${fmt(implPrice)} · <strong style="color:#d97706">Year 1 only</strong> (one-off)</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">Structured implementation engagement for customers running Nuix Neo Foundation only</div>
          </div>
        </label>
        ${implPkg ? `<div style="font-size:15px;font-weight:800;color:#059669;white-space:nowrap;padding-top:2px">${fmt(implPrice)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:flex-start;gap:16px;margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb">
        <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;flex:1">
          <input type="checkbox" id="adv-sol-impl-pkg" ${solImplPkg ? 'checked' : ''} style="margin-top:3px;width:18px;height:18px;cursor:pointer;accent-color:#003080">
          <div>
            <div style="font-size:14px;font-weight:700;color:#1a1a2e">Nuix Neo Solution Implementation Package</div>
            <div style="font-size:12px;color:#6b7280;margin-top:3px">SKU: CSLT301 · ${fmt(solImplPrice)} · <strong style="color:#d97706">Year 1 only</strong> (one-off)</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">Structured implementation engagement for customers running Nuix Neo Foundation with the Solutions Library, Enrich, Semantic Search, or Transcription</div>
          </div>
        </label>
        ${solImplPkg ? `<div style="font-size:15px;font-weight:800;color:#059669;white-space:nowrap;padding-top:2px">${fmt(solImplPrice)}</div>` : ''}
      </div>
    </div>`;

  const clExtension = state.advantageServices.componentLicenseExtension || '';

  const componentLicenseCard = `
    <div class="config-section" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:14px">Component License Extension <span style="font-weight:400">(optional)</span></div>
      <p style="font-size:13px;color:#6b7280;margin:0 0 14px">Nuix Neo customers are eligible for an automatic six months extension of their component licenses. Please enter the quote number/s of their existing deployment to be extended.</p>
      <div class="form-group" style="max-width:480px">
        <label>Existing quote number/s</label>
        <textarea id="adv-cle-quotes" rows="3"
          placeholder="e.g. QT-123456, QT-789012"
          style="resize:vertical"
          oninput="state.advantageServices.componentLicenseExtension=this.value"
        >${clExtension}</textarea>
        <span class="text-muted">Enter one or more quote numbers, separated by commas or new lines</span>
      </div>
    </div>`;

  const advQty   = parseInt(state.advantageServices.discoverAdvantageQty) > 0 ? 1 : 0;
  const topUpQty = parseInt(state.advantageServices.discoverTopUpQty) || 0;
  const discoverQtyCard = (title, sku, price, desc, stateKey, qty, yesNo = false) => `
    <div class="config-section" style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:260px">
          <div style="font-size:14px;font-weight:700;color:#1a1a2e">${title}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:3px">SKU: ${sku} · ${fmtExact(price)} per unit per year</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">${desc}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          ${yesNo ? `
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#1a1a2e;cursor:pointer">
            <input type="checkbox" ${qty > 0 ? 'checked' : ''} style="width:18px;height:18px;accent-color:#003080;cursor:pointer"
              onchange="state.advantageServices.${stateKey}=this.checked?1:0;updateLiveQuote()"> Include
          </label>` : `
          <input type="number" min="0" step="1" value="${qty}" style="width:80px;border:1.5px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:15px;font-weight:700"
            oninput="state.advantageServices.${stateKey}=Math.max(0,parseInt(this.value)||0);updateLiveQuote()">
          <span style="font-size:13px;color:#6b7280">units</span>`}
        </div>
      </div>
    </div>`;
  const discoverAdvantageCard = state.enhancedCap.discover_saas.selected
    ? discoverQtyCard('Nuix Advantage Discover SaaS (v1.0)', 'CSLT104', listPriceUSD(C.consulting.cslt104_prices),
        'Quarterly meeting with a Nuix Customer Success Manager. Half day of training for up to 10 employees. Workflow usage assistance and success planning. 1 annual workflow and capability assessment. Nuix Advantage 24/5 Phone Support. 10 hours consulting.',
        'discoverAdvantageQty', advQty, true)
    : '';

  // Discover-only quotes: the Discover Advantage SKUs only — no Neo support levels,
  // implementation packages (Neo Foundation/Solution) or Component licence extension.
  if (isDiscoverSuite()) return `
    <h2>Advantage</h2>
    <p class="step-sub">Choose a Nuix Advantage support level, or none, and add Nuix Advantage to this Discover quote.</p>
    ${combinedSupportCard}
    ${discoverAdvantageCard || '<p class="text-muted">Nuix Advantage Discover SaaS (CSLT104) is available once Discover SaaS is selected on the Discover step.</p>'}
    ${discoverQtyCard('Nuix Advantage – Top Up 24', 'CSLT107', listPriceUSD(C.consulting.cslt107_topup_prices),
      '24 hours consulting. Product is co-termed with the customer\'s existing Advantage contract. Top up hours carry over if the customer renews their Advantage contract.',
      'discoverTopUpQty', topUpQty)}`;

  return `
    <h2>Advantage &amp; Implementation</h2>
    <p class="step-sub">Upgrade your Nuix Advantage support level, add Advantage hours, or include an implementation package.</p>
    ${combinedSupportCard}
    ${discoverAdvantageCard}
    ${implSection}
    ${componentLicenseCard}`;
}

function renderStep3() {
  const C    = cfg();
  const tier = state.foundation.selectedTier;
  const tierLabel = tier || null;
  // Prices are US list; government/multi-year/regional now size the discount
  // ceiling, not the price — so no per-card price adjustment or "incl." note.
  const discFactor = 1;
  const discNote = '';

  const byoAIStateKeys = ['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'];
  const byoAIWarning = `<div class="byo-ai-warning" style="background:#fef08a;border:1.5px solid #ca8a04;border-radius:8px;padding:10px 14px;font-size:12px;font-weight:600;color:#713f12;margin-top:6px;margin-bottom:4px">&#9888; Approval from Oliver Harvey required prior to quote approval. Min 168 Advantage hours required for implementation.</div>`;
  const bundleActive = state.aiSuite.aiBundle;
  const moduleHtml = Object.entries(C.ai_suite_modules).map(([key, mod]) => {
    const cfgToState = { ai_bundle: 'aiBundle', agentic_byo_ai: 'agenticBYOAI', byo_ai_advanced: 'byoAIAdvanced', byo_ai_graph: 'byoAIGraph', agentic_advanced: 'agenticAdvanced' };
    const stateKey = cfgToState[key] || key;
    const selected = state.aiSuite[stateKey];
    const isByoAI = byoAIStateKeys.includes(stateKey);
    const isBundleSku = stateKey === 'aiBundle';
    const isBundleComponent = AI_BUNDLE_COMPONENT_KEYS.includes(stateKey);
    const disabledByBundle = isBundleComponent && bundleActive;
    const listPrice = tierLabel && mod.price[tierLabel] ? mod.price[tierLabel] : null;
    const price = listPrice ? fmt(listPrice) : 'See summary';
    const listNote = '';

    let bundleSaveBadge = '';
    if (isBundleSku && tierLabel) {
      const compSum = AI_BUNDLE_COMPONENT_KEYS.reduce((s, k) => s + (C.ai_suite_modules[k]?.price[tierLabel] || 0), 0);
      const bundlePrice = mod.price[tierLabel] || 0;
      if (compSum > 0 && bundlePrice > 0) {
        const pct = Math.round((1 - bundlePrice / compSum) * 100);
        bundleSaveBadge = `<div class="ai-bundle-save-badge" style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:20px;padding:2px 10px;font-size:10px;font-weight:800;display:inline-block;margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">Save ${pct}%</div>`;
      }
    }
    const solLibBadge = (isBundleSku || isBundleComponent)
      ? `<div class="ai-bundle-badge" title="Includes the Solutions Library's pre-configured dashboards, workflows and reports at no extra charge." style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:600;display:inline-block;margin-bottom:8px;margin-left:${isBundleSku ? '0' : '6px'};cursor:help">ⓘ Includes Solutions Library</div>`
      : '';
    const disabledBadge = disabledByBundle
      ? `<div class="ai-bundle-badge" style="background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:600;display:inline-block;margin-bottom:8px">Included in AI Bundle</div>`
      : '';

    // Availability / deployment note (descriptive only — e.g. Agentic: AI - Advanced).
    const availabilityNote = mod.availabilityNote
      ? `<div class="ai-availability-note" style="font-size:11px;color:#6b7280;margin-top:6px">${mod.availabilityNote}</div>`
      : '';
    // Agentic: AI - Advanced auto-adds Semantic Search (+ Solutions Library) and upgrades
    // support to Advantage Silver — surface that with the same badge language as the KG/Enrich rule.
    const agenticReqBadge = (stateKey === 'agenticAdvanced' && selected)
      ? `<div class="uc-enrich-req" style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;margin-top:6px;margin-bottom:4px">✓ Requires Semantic Search &amp; Advantage Silver — both auto-added to your quote (Semantic Search brings the bundled Solutions Library with it).</div>`
      : '';

    return `
      <div class="toggle-card ${selected ? 'selected' : ''}" data-ai="${stateKey}" ${disabledByBundle ? 'style="opacity:0.5;cursor:not-allowed;pointer-events:none"' : ''}>
        <div class="toggle-icon"></div>
        <div class="toggle-body">
          <div class="toggle-title">${mod.name}</div>
          ${bundleSaveBadge}${solLibBadge}${disabledBadge}
          <div class="toggle-desc">${mod.question}</div>
          <div class="toggle-price">${price}<span style="font-weight:400;color:var(--muted);font-size:12px"> / year</span></div>
          ${availabilityNote}${listNote}${discNote}
        </div>
      </div>
      ${agenticReqBadge}
      ${isByoAI ? `<div class="byo-ai-warning" style="background:#fef08a;border:1.5px solid #ca8a04;border-radius:8px;padding:10px 14px;font-size:12px;font-weight:600;color:#713f12;margin-top:6px;margin-bottom:4px;display:${selected ? 'block' : 'none'}">&#9888; Approval from Oliver Harvey required prior to quote approval. Min 168 Advantage hours required for implementation.${stateKey === 'byoAIGraph' ? (state.aiSuite.aiBundle ? '<br>&#9888; Requires Knowledge Graph — auto-added to your quote. Enrich is already covered by your AI Bundle.' : '<br>&#9888; Requires Knowledge Graph and Enrich — both auto-added to your quote (Enrich brings the bundled Solutions Library with it).') : ''}</div>` : ''}`;
  }).join('');

  return `
    <div class="card">
      <div class="card-title">Layer 2 — Configure</div>
      <h2>AI Suite <span class="chip">Optional</span></h2>
      <div class="info-box">Select any additional AI capabilities your customer needs.</div>
      <div class="toggle-group">${moduleHtml}</div>
    </div>`;
}

// Discover has its own step (between Visualisation and Add Ons) — it outgrew the
// shared ec-card template used by the other Add Ons modules once every metered
// SKU from the pricebook's Discover SaaS/On-Prem sections was added.
function discoverSaasDiscountBoxInner(ds, dsNm) {
  const dsDisc = discoverSaasVolumeDiscount(ds, dsNm);
  const dsDiscPctLabel = Math.round(dsDisc.pct * 100) + '%';
  const contractYears = getContractYears();
  const contractLenLabel = state.customer.isPOC
    ? `${state.customer.pocDuration || 3} months (POC)`
    : `${parseInt(state.customer.contractMonths) || 12} months (${contractYears % 1 === 0 ? contractYears : contractYears.toFixed(1)} yrs)`;
  const tierIdx = dsNm.volume_discount_tiers.indexOf(dsDisc.tier);
  const nextTier = dsNm.volume_discount_tiers[tierIdx + 1];
  const tierRangeLabel = nextTier
    ? `${fmt(dsDisc.tier.threshold)}–${fmt(nextTier.threshold - 1)} TCV tier`
    : `${fmt(dsDisc.tier.threshold)}+ TCV tier`;
  return `
    <div style="margin-top:14px;border:1px solid #0056e3;border-radius:8px;background:#fff;padding:12px 14px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#0056e3;margin-bottom:8px">Volume discount &middot; active + archive + file transfer + inactive</div>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;color:#374151"><span>Combined list total</span><span style="font-weight:600">${fmt(dsDisc.monthlyList)}/mo</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;color:#374151"><span>Contract length</span><span style="font-weight:600">${contractLenLabel}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;color:#374151;border-bottom:1px solid #EEF1F6;padding-bottom:6px;margin-bottom:6px"><span>Total contract value (TCV)</span><span style="font-weight:600">${fmt(dsDisc.tcv)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:#003080"><span style="font-weight:700">Discount tier applied</span><span style="font-weight:800">${dsDiscPctLabel} off</span></div>
      <div style="font-size:10px;color:#6B7280;margin-top:2px">${tierRangeLabel} &middot; applied equally to all four SKUs above</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0 0;margin-top:6px;border-top:1px solid #EEF1F6;color:#166534"><span style="font-weight:700">Discounted combined total</span><span style="font-weight:800">${fmt(dsDisc.monthlyList * (1 - dsDisc.pct))}/mo</span></div>
    </div>
  `;
}

// One Discover SaaS quantity input with its Pay as you go checkbox (exclusive with a commit)
function dsPaygField(ds, nm, field, label, skuCode) {
  const payg = isDiscoverPayg(ds, field);
  const a = DISCOVER_PAYG_ADDONS[field];
  return `<div class="form-group"><label>${label}</label>
    <input type="number" class="ec-qty" data-mod="discover_saas" data-field="${field}" min="0" value="${payg ? 0 : ds[field]}" ${payg ? 'disabled' : ''}>
    <label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;font-weight:600;color:#374151;cursor:pointer">
      <input type="checkbox" class="ec-payg" data-field="${field}" ${payg ? 'checked' : ''} style="width:15px;height:15px;accent-color:#003080"> Pay as you go
    </label>
    <span style="font-size:10px;color:#6B7280">${payg ? `Billed on usage at ${fmtRate(nm[a.rateKey])} per ${a.per} &middot; no upfront commit` : `${fmtRate(nm[a.rateKey])}/${a.per.replace('GB/month','GB/mo')} &middot; ${skuCode} &middot; commit upfront, or tick Pay as you go`}</span></div>`;
}

function renderDiscover() {
  const C  = cfg();
  const ec = state.enhancedCap;
  const nm = C.enhanced_capabilities.nuix_modules;

  const ds   = ec.discover_saas;
  const dsNm = nm.discover_saas;
  const dsSel = ds.selected;
  const dsInputs = dsSel ? `
    <div class="ec-section-title" style="margin:14px 0 8px">Storage &amp; data &middot; $/GB per month</div>
    <div class="ec-inputs">
      ${dsPaygField(ds, dsNm, 'active_gb', 'Active data (GB)', 'NRTCLGB')}
      ${dsPaygField(ds, dsNm, 'archive_gb', 'Archive data (GB)', 'NRTCLAD')}
      ${dsPaygField(ds, dsNm, 'file_transfer_gb', 'File transfer data (GB)', 'NRTCLFT')}
      ${dsPaygField(ds, dsNm, 'inactive_gb', 'Inactive data (GB)', 'NRTCLREF')}
    </div>

    <div id="ds-vol-discount" style="margin-top:14px;border:1px solid #0056e3;border-radius:8px;background:#fff;padding:12px 14px">${discoverSaasDiscountBoxInner(ds, dsNm)}</div>

    <div class="ec-section-title" style="margin:14px 0 8px">Early case assessment</div>
    <div class="ec-inputs">
      ${dsPaygField(ds, dsNm, 'eca_gb', 'ECA hosted data (GB/month)', 'NRTECA')}
    </div>

    <div class="ec-section-title" style="margin:14px 0 8px">Gen AI review &middot; choose one pricing method</div>
    <div class="form-group full">
      <select class="ec-select" data-mod="discover_saas" data-field="gen_ai_review_mode">
        <option value="none" ${ds.gen_ai_review_mode === 'none' ? 'selected' : ''}>None</option>
        <option value="active" ${ds.gen_ai_review_mode === 'active' ? 'selected' : ''}>Priced on active data (+$${dsNm.gen_ai_review_per_gb}/GB active/mo)</option>
        <option value="document" ${ds.gen_ai_review_mode === 'document' ? 'selected' : ''}>Priced per document ($${dsNm.gen_ai_review_per_doc}/doc)</option>
      </select>
    </div>
    ${ds.gen_ai_review_mode === 'document' ? `
    <div class="ec-inputs" style="margin-top:8px">
      <div class="form-group"><label>Documents analysed (per yr)</label><input type="number" class="ec-qty" data-mod="discover_saas" data-field="gen_ai_review_docs" min="0" value="${ds.gen_ai_review_docs}"></div>
    </div>` : ''}

    <div class="ec-section-title" style="margin:14px 0 8px">Additional add-ons</div>
    <div class="ec-inputs">
      ${dsPaygField(ds, dsNm, 'audio_minutes', 'Audio transcription (min/mo)', 'NRTAUDIO')}
      ${dsPaygField(ds, dsNm, 'translation_docs', 'Machine translation (docs/mo)', 'NRTMLT')}
      ${dsPaygField(ds, dsNm, 'tfa_users', 'Two-factor auth (users)', 'NRTTFA')}
      ${dsPaygField(ds, dsNm, 'excel_redaction_docs', 'Excel redaction (docs/yr)', 'NRTERDOC')}
    </div>` : '';

  const dsCard = `
    <div class="ec-card ${dsSel ? 'selected' : ''}" style="grid-column:1/-1">
      <div class="ec-card-header">
        <div class="ec-check ${dsSel ? 'checked' : ''}" data-ec-nuix="discover_saas"></div>
        <div class="ec-name">${dsNm.name}</div>
      </div>
      <div class="ec-desc">${dsNm.description}</div>
      <div class="ec-price">$${dsNm.active_gb_month}/GB/month active &middot; $${dsNm.archive_gb_month}/GB/month archive</div>
      ${dsInputs}
    </div>`;

  const op   = ec.discover_onprem;
  const opNm = nm.discover_onprem;
  const opSel = op.selected;
  const opInputs = opSel ? `
    <div class="ec-section-title" style="margin:14px 0 8px">Core licensing</div>
    <div class="ec-inputs" style="grid-template-columns:1fr 1fr 1fr">
      <div class="form-group"><label>Instances</label><input type="number" class="ec-qty" data-mod="discover_onprem" data-field="instances" min="1" value="${op.instances}"></div>
      <div class="form-group"><label>Users</label><input type="number" class="ec-qty" data-mod="discover_onprem" data-field="users" min="0" value="${op.users}"></div>
      <div class="form-group"><label>Capacity (GB)</label><input type="number" class="ec-qty" data-mod="discover_onprem" data-field="capacity_gb" min="0" value="${op.capacity_gb}"></div>
    </div>

    <div class="ec-section-title" style="margin:14px 0 8px">Predictive coding &amp; AI add-ons</div>
    <div class="ec-inputs">
      <div class="form-group"><label>Predictive coding (instances)</label><input type="number" class="ec-qty" data-mod="discover_onprem" data-field="predictive_coding_instances" min="0" value="${op.predictive_coding_instances}"></div>
      <div class="form-group"><label>AI Review (instances)</label><input type="number" class="ec-qty" data-mod="discover_onprem" data-field="ai_review_instances" min="0" value="${op.ai_review_instances}"></div>
      <div class="form-group"><label>Enrich &ndash; OOTB models (instances)</label><input type="number" class="ec-qty" data-mod="discover_onprem" data-field="enrich_instances" min="0" value="${op.enrich_instances}"></div>
    </div>

    <div class="ec-section-title" style="margin:14px 0 8px">Ingestions &amp; redaction</div>
    <div class="ec-inputs">
      <div class="form-group"><label>Ingestions (workers)</label><input type="number" class="ec-qty" data-mod="discover_onprem" data-field="ingestion_workers" min="0" value="${op.ingestion_workers}"></div>
      <div class="form-group"><label>Native Excel redaction (instances)</label><input type="number" class="ec-qty" data-mod="discover_onprem" data-field="excel_redaction_instances" min="0" value="${op.excel_redaction_instances}"></div>
    </div>` : '';

  const opCard = `
    <div class="ec-card ${opSel ? 'selected' : ''}" style="grid-column:1/-1">
      <div class="ec-card-header">
        <div class="ec-check ${opSel ? 'checked' : ''}" data-ec-nuix="discover_onprem"></div>
        <div class="ec-name">${opNm.name}</div>
      </div>
      <div class="ec-desc">${opNm.description}</div>
      <div class="ec-price">${fmt(opNm.price_per_instance)}/instance/yr + ${fmt(opNm.price_per_user)}/user/yr</div>
      ${opInputs}
    </div>`;

  return `
    <div class="card">
      <div class="card-title">Layer 3 — Configure</div>
      <h2>Discover ${isDiscoverSuite() ? '' : '<span class="chip">Optional</span>'}</h2>
      <div class="ec-grid">${dsCard}${opCard}</div>
    </div>`;
}

// Test Environments (Configure section 7) — test-environment licences for customers that
// need a non-production instance. Any SKU can be chosen for now; business rules (e.g. only
// offering Neo test environments on a Neo deal) can be layered on later.
function renderNonProd() {
  // A Discover-only quote doesn't offer the Nuix Neo test environments
  const skus = cfg().non_prod.skus.filter(s => !isDiscoverSuite() || s.family !== 'Nuix Neo');
  const qty  = state.nonProd.qty;
  const families = [...new Set(skus.map(s => s.family))];

  const familyHtml = families.map(fam => {
    const cards = skus.filter(s => s.family === fam).map(s => {
      const sel = (qty[s.sku] || 0) > 0;
      const price = s.list_price == null ? 'Price TBC' : `${fmt(s.list_price)}/unit/yr`;
      const sizingNote = s.tier === 'Performance'
        ? `<div style="font-size:11px;color:#6B7280;margin-top:6px">Sized at ~25% of what the customer buys for production &mdash; e.g. 40 production workers &rarr; 10 test workers.</div>`
        : '';
      return `
        <div class="ec-card ${sel ? 'selected' : ''}">
          <div class="ec-card-header">
            <div class="ec-check ${sel ? 'checked' : ''}" data-np-toggle="${s.sku}"></div>
            <div class="ec-name">${s.name}</div>
          </div>
          <div class="ec-desc">${s.description}</div>
          ${sizingNote}
          <div class="ec-price">${price} <span style="font-size:10px;font-weight:400;color:#6B7280">&middot; ${s.sku}</span></div>
        </div>`;
    }).join('');
    // The Discover test environments are On-Prem only — label them so they aren't read as SaaS
    const famLabel = fam === 'Nuix Discover' ? 'Nuix Discover (On-Prem)' : fam;
    return `<div class="ec-section-title">${famLabel}</div><div class="ec-grid">${cards}</div>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-title">Layer 5 — Configure</div>
      <h2>Test Environments <span class="chip">Optional</span></h2>
      <p class="text-muted" style="margin-bottom:4px">Test environment licences for customers who need a non-production instance alongside production. Tick each one the customer needs.</p>
      ${familyHtml}
    </div>`;
}


function renderStep5() {
  const C    = cfg();
  const ec   = state.enhancedCap;

  function recTag(key) {
    return '';
  }

  // Knowledge Graph (linkurious) is configured on its own Visualisation step now, not here —
  // its config entry stays in nuix_modules only because the Small/Medium/Large bundles and
  // their boosters are built from its user_tiers/memory_tiers price data.
  // Discover SaaS/On-Prem moved to their own Discover step (renderDiscover) — too many
  // metered fields to fit this shared card template once the full SKU set was added.
  const nuixModHtml = Object.entries(C.enhanced_capabilities.nuix_modules).filter(([key]) => !['linkurious', 'discover_saas', 'discover_onprem', ...(isDiscoverSuite() ? DISCOVER_HIDDEN_MODULES : [])].includes(key)).map(([key, mod]) => {
    const sel = ec[key] && ec[key].selected;
    let inputsHtml = '';
    let priceHtml  = '';

    if (mod.pricing_model === 'compound') {
      priceHtml = `$${mod.price_per_endpoint}/endpoint · ${fmt(mod.price_per_user)}/user · ${fmt(mod.price_per_server)}/server`;
      inputsHtml = sel ? `<div class="ec-inputs">
        <div class="form-group"><label>Endpoints</label><input type="number" class="ec-qty" data-mod="${key}" data-field="endpoints" min="0" value="${ec[key].endpoints}"></div>
        <div class="form-group"><label>Users</label><input type="number" class="ec-qty" data-mod="${key}" data-field="users" min="0" value="${ec[key].users}"></div>
        <div class="form-group"><label>Servers</label><input type="number" class="ec-qty" data-mod="${key}" data-field="servers" min="0" value="${ec[key].servers}"></div>
      </div>` : '';
    } else if (mod.pricing_model === 'per_endpoint') {
      priceHtml = `$${mod.price_per_endpoint}/endpoint/yr`;
      inputsHtml = sel ? `<div class="ec-inputs">
        <div class="form-group"><label>Endpoints</label><input type="number" class="ec-qty" data-mod="${key}" data-field="endpoints" min="1" value="${ec[key].endpoints}"></div>
      </div>` : '';
    } else if (mod.pricing_model === 'per_custodian_month') {
      priceHtml = `$${mod.price_per_custodian_month}/custodian/month`;
      inputsHtml = sel ? `<div class="ec-inputs">
        <div class="form-group"><label>Custodians</label><input type="number" class="ec-qty" data-mod="${key}" data-field="custodians" min="1" value="${ec[key].custodians}"></div>
      </div>` : '';
    } else if (mod.pricing_model === 'per_gb_collection') {
      priceHtml = `$${mod.price_per_gb}/GB per collection`;
      inputsHtml = sel ? `<div class="ec-inputs">
        <div class="form-group"><label>GB per collection</label><input type="number" class="ec-qty" data-mod="${key}" data-field="gb" min="1" value="${ec[key].gb}"></div>
      </div>` : '';
    } else if (mod.pricing_model === 'flat') {
      priceHtml = `${fmt(mod.list_price)}/year`;
    }

    return `
      <div class="ec-card ${sel ? 'selected' : ''}">
        <div class="ec-card-header">
          <div class="ec-check ${sel ? 'checked' : ''}" data-ec-nuix="${key}"></div>
          <div class="ec-name">${mod.name}</div>
        </div>
        ${recTag(key)}
        <div class="ec-desc">${mod.description}</div>
        <div class="ec-price">${priceHtml}</div>
        ${inputsHtml}
      </div>`;
  }).join('');

  const tpHtml = Object.entries(C.enhanced_capabilities.third_party).map(([key, mod]) => {
    let sel, priceHtml, inputsHtml = '';

    if (mod.pricing_model === 'abbyy_packages') {
      sel = ec[key]?.selected;
      const abbyyPkgKey = ec[key]?.pkg || 'abbfr002';
      const abbyyPkg = mod.packages.find(p => p.key === abbyyPkgKey);
      priceHtml = abbyyPkg ? `${fmt(abbyyPkg.price)} / ${abbyyPkg.name}` : 'Select package';
      if (sel) {
        const pkgOpts = mod.packages.map(p => `<option value="${p.key}" ${abbyyPkgKey === p.key ? 'selected' : ''}>${p.name} (${fmt(p.price)})</option>`).join('');
        inputsHtml = `<div class="ec-inputs">
          <div class="form-group"><label>Package</label><select class="ec-select" data-mod="${key}" data-field="pkg">${pkgOpts}</select></div>
          <div class="form-group"><label>Quantity</label><input type="number" class="ec-qty" data-mod="${key}" data-field="qty" min="1" value="${ec[key].qty || 1}"></div>
        </div>`;
      }
    } else if (mod.pricing_model === 't3k') {
      sel = ec[key]?.selected;
      const tMode = ec[key]?.pricing_mode || 'tb';
      const tbTier = mod.tb_tiers.find(t => t.key === (ec[key]?.tb_tier || 'tb10'));
      const urTier = mod.user_tiers.find(t => t.key === (ec[key]?.user_tier || 'ur10'));
      let modeDesc = tMode === 'worker' ? `${fmt(mod.price_per_worker)}/worker`
        : tMode === 'tb'    ? (tbTier ? `${fmt(tbTier.price)} / ${tbTier.name}` : '')
        : (urTier ? `${fmt(urTier.price)} / ${urTier.name}` : '');
      priceHtml = `${fmt(mod.price_per_instance)}/connector · ${modeDesc}`;
      if (sel) {
        const modeOpts = [['tb','Volume (TB-based)'],['users','Concurrent Users'],['worker','Per Worker']].map(([v,l]) => `<option value="${v}" ${tMode===v?'selected':''}>${l}</option>`).join('');
        const tbOpts   = mod.tb_tiers.map(t    => `<option value="${t.key}"  ${(ec[key]?.tb_tier   ||'tb10') ===t.key  ?'selected':''}>${t.name} (${fmt(t.price)})</option>`).join('');
        const urOpts   = mod.user_tiers.map(t  => `<option value="${t.key}"  ${(ec[key]?.user_tier ||'ur10') ===t.key  ?'selected':''}>${t.name} (${fmt(t.price)})</option>`).join('');
        inputsHtml = `<div class="ec-inputs">
          <div class="form-group"><label>Connectors</label><input type="number" class="ec-qty" data-mod="${key}" data-field="instances" min="1" value="${ec[key].instances}"></div>
          <div class="form-group"><label>Licensing model</label><select class="ec-select" data-mod="${key}" data-field="pricing_mode">${modeOpts}</select></div>
          ${tMode==='worker' ? `<div class="form-group"><label>Workers</label><input type="number" class="ec-qty" data-mod="${key}" data-field="workers" min="1" value="${ec[key].workers}"></div>` : ''}
          ${tMode==='tb'     ? `<div class="form-group"><label>Volume tier</label><select class="ec-select" data-mod="${key}" data-field="tb_tier">${tbOpts}</select></div>` : ''}
          ${tMode==='users'  ? `<div class="form-group"><label>User tier</label><select class="ec-select" data-mod="${key}" data-field="user_tier">${urOpts}</select></div>` : ''}
        </div>`;
      }
    } else if (mod.pricing_model === 'veritone') {
      sel = ec[key]?.selected;
      const vtTierKey = ec[key]?.transcription_tier || 'sml';
      const vtTier = mod.transcription_tiers.find(t => t.key === vtTierKey);
      priceHtml = `${fmt(mod.price_per_instance)}/connector · ${vtTier ? fmt(vtTier.price) + ' transcription' : ''} · ${fmt(mod.price_first_language)}/1st language · ${fmt(mod.price_additional_language)}/add. language`;
      if (sel) {
        const vtOpts = mod.transcription_tiers.map(t => `<option value="${t.key}" ${vtTierKey===t.key?'selected':''}>${t.name} (${fmt(t.price)})</option>`).join('');
        inputsHtml = `<div class="ec-inputs">
          <div class="form-group"><label>Connectors</label><input type="number" class="ec-qty" data-mod="${key}" data-field="instances" min="1" value="${ec[key].instances}"></div>
          <div class="form-group"><label>Transcription tier</label><select class="ec-select" data-mod="${key}" data-field="transcription_tier">${vtOpts}</select></div>
          <div class="form-group"><label>First language</label><input type="number" class="ec-qty" data-mod="${key}" data-field="first_langs" min="0" value="${ec[key].first_langs}"></div>
          <div class="form-group"><label>Additional languages</label><input type="number" class="ec-qty" data-mod="${key}" data-field="additional_langs" min="0" value="${ec[key].additional_langs}"></div>
        </div>`;
      }
    } else if (mod.pricing_model === 'q1_connectors') {
      const anySelected = Object.values(ec[key]?.connectors || {}).some(v => v);
      sel = anySelected;
      const selectedCount = Object.values(ec[key]?.connectors || {}).filter(Boolean).length;
      priceHtml = selectedCount > 0 ? `${selectedCount} connector${selectedCount>1?'s':''} selected` : 'Select connectors below';
      const connectorList = mod.connectors.map(c => {
        const isSel = ec[key]?.connectors?.[c.key];
        return `<div class="q1-connector ${isSel ? 'q1-sel' : ''}" data-q1-connector="${c.key}" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:7px;cursor:pointer;transition:background 0.1s;${isSel?'background:#EBF0FF;':''}">
          <div class="ec-check ${isSel?'checked':''}" style="flex-shrink:0" data-q1-connector="${c.key}"></div>
          <span style="font-size:13px;font-weight:600;flex:1">${c.name}</span>
          <span style="font-size:12px;color:#6b7280;white-space:nowrap">$${c.price.toLocaleString()}/yr</span>
        </div>`;
      }).join('');
      inputsHtml = `<div style="margin-top:8px;display:flex;flex-direction:column;gap:2px">${connectorList}</div>`;
    } else {
      sel = ec[key];
      priceHtml = `${fmt(mod.list_price)}/year`;
    }

    return `
      <div class="ec-card ${sel ? 'selected' : ''}">
        <div class="ec-card-header">
          <div class="ec-check ${sel ? 'checked' : ''}" data-ec-tp="${key}"></div>
          <div class="ec-name">${mod.name}</div>
        </div>
        ${recTag(key)}
        <div class="ec-desc">${mod.description}</div>
        <div class="ec-price">${priceHtml}</div>
        ${inputsHtml}
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-title">Layer 3 — Configure</div>
      <h2>Add Ons <span class="chip">Optional</span></h2>
      <div class="ec-section-title">Nuix Modules</div>
      <div class="ec-grid">${nuixModHtml}</div>
      ${isDiscoverSuite() ? '' : `<div class="ec-section-title">Third-Party Capabilities</div>
      <div class="ec-grid">${tpHtml}</div>`}
    </div>`;
}

// Renders just the recommendation panel + "Use this recommendation" button, so the
// need-users/need-gb inputs can live-update it (via bindStepEvents) without re-rendering
// the whole step and losing input focus — same pattern as Foundation's tier-rec-area.
function renderVisualisationRecommendation() {
  const v = state.visualisation;
  const needUsers = parseFloat(v.needUsers) || 0;
  const needGb    = parseFloat(v.needGb)    || 0;
  if (needUsers <= 0 && needGb <= 0) return '';

  // Buying just users or just memory is a legitimate top-up (the customer may already
  // hold the other), but flag it — Knowledge Graph needs both to actually be usable.
  const partialWarning = (needUsers > 0) !== (needGb > 0)
    ? `<div class="uc-enrich-req" title="Knowledge Graph requires both users and memory to be properly licensed">⚠ Knowledge Graph requires both users and memory to be properly licensed</div>`
    : '';

  const rec = recommendVisualisationBundle(needUsers, needGb);
  if (!rec) return '';

  return `
    ${partialWarning}
    <div class="tier-rec" style="margin-top:16px">
      <div class="tier-rec-label">Recommended bundle</div>
      <div class="tier-rec-name">${rec.bundle.name.replace('Visualisation Bundle – ', '')}</div>
      <div style="font-size:13px;opacity:0.85;line-height:1.8;margin:10px 0">
        <div>${rec.bundle.included_users} Named Users · ${rec.bundle.included_memory_gb}GB Memory included</div>
        ${rec.userCover.qty > 0 ? `<div>+ ${rec.userCover.qty} × ${rec.userCover.tier.name} booster (covers ${rec.excessUsers} additional user${rec.excessUsers !== 1 ? 's' : ''})</div>` : ''}
        ${rec.memCover.qty > 0 ? `<div>+ ${rec.memCover.qty} × ${rec.memCover.tier.name} booster (covers ${rec.excessGb} additional GB)</div>` : ''}
      </div>
      <div class="tier-price-row">
        <div>
          <div class="tier-price">${fmt(rec.cost)}</div>
          <div class="tier-price-sub">per year</div>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="applyVisualisationRecommendation()">Use this recommendation</button>
    </div>`;
}

// Applies the current recommendation (from the need-users/need-gb inputs) to state —
// selects the recommended bundle tier and sets its booster tier/qty.
function applyVisualisationRecommendation() {
  const needUsers = parseFloat($('vis-need-users')?.value) || 0;
  const needGb    = parseFloat($('vis-need-gb')?.value)    || 0;
  const rec = recommendVisualisationBundle(needUsers, needGb);
  if (!rec) return;
  if (!state.visualisation.selected) applyKgEnrichDependency(true);
  state.visualisation.selected          = true;
  state.visualisation.bundleTier        = rec.tierKey;
  state.visualisation.boosterUserTier   = rec.userCover.tier.key;
  state.visualisation.boosterUserQty    = rec.userCover.qty;
  state.visualisation.boosterMemoryTier = rec.memCover.tier.key;
  state.visualisation.boosterMemoryQty  = rec.memCover.qty;
  showStep(state.currentStep, true);
}

// Icon + display name per bundle tier — purely cosmetic, keyed off the same
// cfg().visualisation_bundles keys used everywhere else.
const VISUALISATION_BUNDLE_META = {
  small:  { icon: '📊', label: 'Small' },
  medium: { icon: '🕸️', label: 'Medium' },
  large:  { icon: '🌐', label: 'Large' },
};

function renderVisualisation() {
  const C = cfg();
  const v = state.visualisation;
  const bundles = C.visualisation_bundles;

  const bundleCardsHtml = Object.entries(bundles).map(([key, b]) => {
    const selected = v.selected && v.bundleTier === key;
    const meta = VISUALISATION_BUNDLE_META[key];
    return `<div class="vis-bundle-card ${selected ? 'selected' : ''}" data-vis-bundle="${key}">
      <div class="vis-bundle-icon">${meta.icon}</div>
      <div class="vis-bundle-name">${meta.label}</div>
      <div class="vis-bundle-desc">${b.included_users} Named Users · ${b.included_memory_gb}GB Memory</div>
      <div class="vis-bundle-price">${fmt(b.price)}<span> / year</span></div>
    </div>`;
  }).join('');

  let summaryHtml = '';
  if (v.selected) {
    const vb = getVisualisationBundlePricing(v);
    const enrichOk = state.aiSuite.enrichManual || state.aiSuite.aiBundle;
    const kgReqBadge = enrichOk
      ? `<div class="uc-enrich-req" style="background:#dcfce7;color:#166534;border-color:#86efac">✓ Enrich already in your quote</div>`
      : `<div class="uc-enrich-req" title="Knowledge Graph requires Enrich. It will be automatically added to your quote (and brings the bundled Solutions Library with it).">⚡ Requires Enrich · auto-added</div>`;
    summaryHtml = `
      ${kgReqBadge}
      <div style="margin-top:14px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#374151;line-height:1.8">
        <div><strong>${vb.bundle.name}</strong>: ${fmt(vb.bundle.price)}</div>
        ${vb.boosterUserQty > 0 ? `<div>+ ${vb.boosterUserQty} × ${vb.boosterUserTier.name} booster: ${fmt(vb.boosterUserUSD)}</div>` : ''}
        ${vb.boosterMemQty  > 0 ? `<div>+ ${vb.boosterMemQty} × ${vb.boosterMemTier.name} booster: ${fmt(vb.boosterMemUSD)}</div>` : ''}
        <div style="margin-top:6px;font-weight:700">Total: ${fmt(vb.totalBaseUSD)}/yr · ${vb.totalUsers} Named Users · ${vb.totalGb}GB Memory</div>
      </div>`;
  }

  return `
    <div class="card">
      <div class="card-title">Layer 3 — Configure</div>
      <h2>Visualisation <span class="chip">Optional</span></h2>
      <div class="info-box">Knowledge Graph enables users gain access to dynamic, intuitive and interactive graph visualizations that allow for a deep understanding of relationships and context of entities within vast amounts of unstructured data.</div>
      <style>
        .vis-bundle-options { display:flex; gap:12px; margin-bottom:22px; }
        .vis-bundle-card { flex:1; border:1.5px solid #DDE1E8; border-radius:10px; padding:16px 18px; background:#fff; cursor:pointer; text-align:left; transition:border-color 0.15s, background 0.15s; }
        .vis-bundle-card:hover { border-color:#0056e3; background:#EFF6FF; }
        .vis-bundle-card.selected { border-color:#0056e3; background:#EFF6FF; }
        .vis-bundle-icon { font-size:22px; margin-bottom:8px; }
        .vis-bundle-name { font-size:15px; font-weight:700; color:#111; margin-bottom:4px; }
        .vis-bundle-card.selected .vis-bundle-name { color:#0056e3; }
        .vis-bundle-desc { font-size:12px; color:#6b7280; margin-bottom:10px; }
        .vis-bundle-price { font-size:16px; font-weight:800; color:#111; }
        .vis-bundle-price span { font-weight:400; color:#6b7280; font-size:12px; }
      </style>
      <div class="vis-bundle-options">${bundleCardsHtml}</div>
      <div class="ec-section-title">Or tell us what's needed and we'll pick a bundle</div>
      <div class="form-grid cols-3">
        <div class="form-group">
          <label>Named Users needed</label>
          <input type="number" id="vis-need-users" min="0" placeholder="e.g. 30" value="${v.needUsers}">
        </div>
        <div class="form-group">
          <label>Memory needed (GB)</label>
          <input type="number" id="vis-need-gb" min="0" placeholder="e.g. 150" value="${v.needGb}">
        </div>
      </div>
      <div id="vis-rec-area">${renderVisualisationRecommendation()}</div>
      ${summaryHtml}
    </div>`;
}

function renderStep7() {
  // Per-layer discounts are not user-editable; clear any stale values so only
  // the blended deal discount applies.
  ['foundation','aiSuite','useCases','enhanced','nonProd','consulting'].forEach(k => { state.discounts[k] = 0; });

  // Goal-seek: back-calculate blended discount from a target ACV or TCV.
  // TCV takes priority when both are supplied.
  const targetACV = parseFloat(state.targets?.acv) || 0;
  const targetTCV = parseFloat(state.targets?.tcv) || 0;
  if (targetACV || targetTCV) {
    const cur          = CURRENCIES[state.currency] || CURRENCIES.USD;
    const baseLayers   = calcPrices(); // totAfterAuto is independent of blendedPct
    const baseTotAfterAuto = Object.values(baseLayers).reduce((s, l) => s + l.afterAuto, 0);
    if (baseTotAfterAuto > 0) {
      let blendedPct;
      if (targetTCV) {
        // Sum period multipliers exactly as getPeriodPrice does — accounts for partial-year fractions and correct uplift exponents
        const periods = getContractPeriods();
        const uplift  = getAnnualUplift();
        const S = periods.reduce((sum, p) => sum + Math.pow(1 + uplift, p.upliftExp) * p.fraction, 0);
        blendedPct = 1 - (targetTCV / cur.rate) / (baseTotAfterAuto * S);
      } else {
        blendedPct = 1 - (targetACV / cur.rate) / baseTotAfterAuto;
      }
      state.discounts.blended = Math.min(100, Math.max(-100, Math.round(blendedPct * 10000) / 100));
    }
  }

  const layers = calcPrices();
  const C = cfg();
  const rm = getRM();
  const cust = state.customer;
  const appReqDiscount = needsApproval(layers);
  const _totNetForApproval = Object.values(layers).reduce((s, l) => s + l.net, 0);
  const appReqSize = _totNetForApproval > 1_000_000;
  const appReq = appReqDiscount || appReqSize;

  const pocDur = state.customer.pocDuration || 3;
  const pocFee = C.poc_price_per_month * pocDur;
  const pocHtml = state.customer.isPOC ? `
    <div class="poc-banner">
      <span class="poc-icon">🔬</span>
      <p>This is a <strong>POC / Pilot</strong> — <strong>${pocDur} month${pocDur>1?'s':''}</strong>. POC fee of <strong>${fmt(pocFee)}</strong> applies, credited in full against contract value upon conversion.</p>
    </div>` : '';

  // Government, multi-year and regional no longer adjust the price — they size the
  // discount ceiling instead (see renderCeilingPanel below). Annual uplift is still
  // a real year-on-year price change and is shown in the summary table's uplift row.

  // Sublabel helpers
  const tier = state.foundation.selectedTier;
  const tierName = C.foundation_tiers[tier]?.name || '—';
  const aiSelected = Object.entries(state.aiSuite).filter(([,v])=>v).map(([k])=>({
    enrich:'Enrich',semantic:'Semantic Search',transcription:'Transcription',agenticBYOAI:'BYO AI',byoAIAdvanced:'BYO AI - Advanced',byoAIGraph:'BYO AI - Graph'
  }[k]||k));
  const ucPrimary = state.useCases.foundationOnly ? 'Foundation only' : 'Solution Pack';
  const ucSec = '';
  const ecSelected = [
    state.enhancedCap.discover_saas.selected     && 'Discover SaaS',
    state.enhancedCap.discover_onprem.selected   && 'Discover On-Prem',
    state.enhancedCap.adaptive_security.selected && 'Adaptive Security',
    state.visualisation.selected && 'Knowledge Graph',
    state.enhancedCap.ecc && state.enhancedCap.ecc.selected && 'ECC (Enterprise Collection Centre)',
    state.enhancedCap.legal_hold?.selected       && 'Nuix Automate Legal Hold',
    state.enhancedCap.automated_relativity?.selected && 'Automated Relativity Export and Orchestration',
    state.enhancedCap.abbyy?.selected            && 'ABBYY OCR',
    Object.values(state.enhancedCap.q1_dynamics?.connectors||{}).some(v=>v) && 'Q1 Dynamics',
    state.enhancedCap.t3k?.selected              && 'T3K (Media Analysis)',
    state.enhancedCap.veritone?.selected         && 'Veritone',
  ].filter(Boolean);
  const isExpansionDeal = state.customer.dealType === 'Neo Expansion';
  let foundationSub = tierName;
  if (isExpansionDeal) {
    const addParts = [];
    const bst = state.foundation.boosters || {};
    if (bst.workers > 0) addParts.push(`${bst.workers} Worker${bst.workers !== 1 ? 's' : ''}`);
    if (bst.users   > 0) addParts.push(`${bst.users} User${bst.users !== 1 ? 's' : ''}`);
    if (addParts.length) foundationSub = `${tierName} + ${addParts.join(', ')}`;
  }

  const periods = getContractPeriods();

  // ── Build per-SKU rows (same logic as generateBudgetQuote) ──────────────────
  function unitNetForSummary(unitBaseUSD, layerKey) {
    if (!unitBaseUSD) return 0;
    const l = layers[layerKey];
    const autoF  = layerKey === 'consulting' ? 1 : l.autoDisc;
    const salesF = 1 - l.salesDisc;
    return unitBaseUSD * rm * autoF * salesF;
  }

  const skuRows = [];
  const tierSuffix2 = tier === 'light' ? 'L' : tier === 'core' ? 'C' : tier === 'rapid' ? 'R' : null;
  const t2 = tier ? C.foundation_tiers[tier] : null;
  const b2 = tier ? C.foundation_boosters[tier] : null;
  const refTier3  = tier;
  const refSize3  = refTier3 === 'light' ? 'S' : refTier3 === 'core' ? 'MD' : refTier3 === 'rapid' ? 'L' : tierSuffix2;
  const refName3  = tierDisplayName(refTier3);

  // Section 1 — Foundation tier
  if (state.pricingModel === 'consumption') {
    const ct3  = C.consumption_tiers[tier];
    const bst3 = state.foundation.boosters || {};
    skuRows.push({ section: 'foundation', sku: ct3.sku, name: ct3.name, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: ct3.price });
    if (bst3.volume > 0)
      skuRows.push({ section: 'foundation', sku: ct3.tb_booster_sku, name: `Additional TB – ${refName3} (Consumption)`, qty: bst3.volume, unit: 'Per TB/yr', layer: 'foundation', unitBaseUSD: ct3.tb_booster_rate });
    if (bst3.users > 0) {
      const userSkus3 = { light: 'NEOBRS', core: 'NEOBRMD', rapid: 'NEOBRL' };
      skuRows.push({ section: 'foundation', sku: userSkus3[tier], name: `Additional Concurrent User – ${refName3}`, qty: bst3.users, unit: 'Per user/yr', layer: 'foundation', unitBaseUSD: b2.user });
    }
  } else {
    const foundationSkus3 = { light: 'NEO007S', core: 'NEO007MD', rapid: 'NEO007L' };
    if (cust.dealType !== 'Neo Expansion') {
      if (tierSuffix2) {
        skuRows.push({ section: 'foundation', sku: foundationSkus3[tier], name: `Nuix Neo Foundation – ${t2.name.replace('NEO – ','')}`, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: t2.price });
      }
    }
    if (tierSuffix2 && b2) {
      const workerSkus3 = { light: 'NEOBWS', core: 'NEOBWMD', rapid: 'NEOBWL' };
      const volumeSkus3 = { light: 'NEO-BOOST-VOL-L', core: 'NEO-BOOST-VOL-C', rapid: 'NEO-BOOST-VOL-R' };
      const userSkus3   = { light: 'NEOBRS', core: 'NEOBRMD', rapid: 'NEOBRL' };
      const bst3 = state.foundation.boosters || {};
      if (bst3.workers > 0) skuRows.push({ section: 'foundation', sku: workerSkus3[tier], name: `Additional Worker – ${refName3}`, qty: bst3.workers, unit: 'Per worker/yr', layer: 'foundation', unitBaseUSD: b2.worker });
      if (bst3.volume  > 0) skuRows.push({ section: 'foundation', sku: volumeSkus3[tier], name: `Additional Volume – ${refName3}`, qty: bst3.volume,  unit: 'Per TB/yr',     layer: 'foundation', unitBaseUSD: b2.volume_tb });
      if (bst3.users   > 0) skuRows.push({ section: 'foundation', sku: userSkus3[tier],   name: `Additional Concurrent User – ${refName3}`, qty: bst3.users, unit: 'Per user/yr', layer: 'foundation', unitBaseUSD: b2.user });
    }
  }

  // Section 2 — AI Suite (Solutions Library is bundled at $0 with Enrich/Semantic
  // Search/Transcription — it's appended below as the last row in this section
  // rather than its own section)
  const aiDisplayMap3 = { aiBundle: ['NEOAIBNDL01','AI Bundle'], enrich: ['NEOAI001','Enrich'], semantic: ['NEOS001','Semantic Search'], transcription: ['NEOS002','Transcription'], agenticBYOAI: ['NEOAI002','BYO AI'], byoAIAdvanced: ['NEOAI003','BYO AI - Advanced'], byoAIGraph: ['NEOAI004','BYO AI - Graph'], agenticAdvanced: ['NEOAI005','Agentic: AI - Advanced'] };
  Object.entries(state.aiSuite).forEach(([key, on]) => {
    if (on && refSize3 && aiDisplayMap3[key]) {
      const [base3, aiName3] = aiDisplayMap3[key];
      const aiPrice3 = getAiModuleBaseUSD(key, refTier3, state.aiSuite);
      skuRows.push({ section: 'aiSuite', sku: `${base3}${refSize3}`, name: `${aiName3} – ${refName3}`, qty: 1, unit: 'Per year', layer: 'aiSuite', unitBaseUSD: aiPrice3 });
    }
  });
  if (!state.useCases.foundationOnly && refSize3) {
    const ucPrice3 = refTier3 ? (C.use_case_modules.solution_pack?.price[refTier3] || 0) : 0;
    skuRows.push({ section: 'aiSuite', sku: `NEOSLIB${refSize3}`, name: `Solutions Library – ${refName3}`, qty: 1, unit: 'Per year', layer: 'useCases', unitBaseUSD: ucPrice3 });
  }

  // Section 4 — Add Ons
  const ec3 = state.enhancedCap;
  const nm3 = C.enhanced_capabilities.nuix_modules;
  const tp3 = C.enhanced_capabilities.third_party;
  if (ec3.discover_saas?.selected)   discoverSaasSkuRows(ec3.discover_saas, nm3.discover_saas).forEach(r     => skuRows.push({ section: 'enhanced', layer: 'enhanced', ...r }));
  if (ec3.discover_onprem?.selected) discoverOnpremSkuRows(ec3.discover_onprem, nm3.discover_onprem).forEach(r => skuRows.push({ section: 'enhanced', layer: 'enhanced', ...r }));
  discoverAdvantageSkuRows().forEach(r => skuRows.push({ section: 'consulting', layer: 'enhanced', ...r }));
  if (ec3.adaptive_security?.selected) {
    if (ec3.adaptive_security.endpoints > 0) skuRows.push({ section: 'enhanced', sku: 'ENDPT001',  name: 'Adaptive Security – Endpoint', qty: ec3.adaptive_security.endpoints, unit: 'Per endpoint/yr', layer: 'enhanced', unitBaseUSD: nm3.adaptive_security.price_per_endpoint });
    if (ec3.adaptive_security.users > 0)     skuRows.push({ section: 'enhanced', sku: 'ENDPTUSER', name: 'Adaptive Security – User',     qty: ec3.adaptive_security.users,     unit: 'Per user/yr',    layer: 'enhanced', unitBaseUSD: nm3.adaptive_security.price_per_user });
    if (ec3.adaptive_security.servers > 0)   skuRows.push({ section: 'enhanced', sku: 'ENDPTSVR',  name: 'Adaptive Security – Server',   qty: ec3.adaptive_security.servers,   unit: 'Per server/yr',  layer: 'enhanced', unitBaseUSD: nm3.adaptive_security.price_per_server });
  }
  if (state.visualisation.selected) {
    const vb3 = getVisualisationBundlePricing(state.visualisation);
    if (vb3.bundle.sku) skuRows.push({ section: 'enhanced', sku: vb3.bundle.sku, name: vb3.bundle.name, qty: 1, unit: 'Per bundle/yr', layer: 'enhanced', unitBaseUSD: vb3.bundle.price });
    if (vb3.boosterUserQty > 0) skuRows.push({ section: 'enhanced', sku: vb3.boosterUserTier.sku, name: `Visualisation Bundle Booster – ${vb3.boosterUserTier.name}`, qty: vb3.boosterUserQty, unit: 'Per pack/yr', layer: 'enhanced', unitBaseUSD: vb3.boosterUserTier.price });
    if (vb3.boosterMemQty > 0)  skuRows.push({ section: 'enhanced', sku: vb3.boosterMemTier.sku,  name: `Visualisation Bundle Booster – ${vb3.boosterMemTier.name}`,  qty: vb3.boosterMemQty,  unit: 'Per pack/yr', layer: 'enhanced', unitBaseUSD: vb3.boosterMemTier.price });
  }
  if (ec3.ecc?.selected && ec3.ecc.endpoints > 0)
    skuRows.push({ section: 'enhanced', sku: 'ENDPT101', name: 'ECC (Enterprise Collection Centre)', qty: ec3.ecc.endpoints, unit: 'Per endpoint/yr', layer: 'enhanced', unitBaseUSD: nm3.ecc.price_per_endpoint });
  if (ec3.legal_hold?.selected && ec3.legal_hold.custodians > 0)
    skuRows.push({ section: 'enhanced', sku: 'RALH001', name: 'Nuix Automate Legal Hold', qty: ec3.legal_hold.custodians, unit: 'Per custodian/month ×12', layer: 'enhanced', unitBaseUSD: nm3.legal_hold.price_per_custodian_month * 12 });
  if (ec3.automated_relativity?.selected)
    skuRows.push({ section: 'enhanced', sku: 'NEOREL01', name: 'Automated Relativity Export and Orchestration', qty: 1, unit: 'Per year', layer: 'enhanced', unitBaseUSD: nm3.automated_relativity.list_price });
  if (ec3.abbyy?.selected && (ec3.abbyy.qty || 1) > 0) {
    const abbyyPkg3 = tp3.abbyy.packages.find(p3 => p3.key === (ec3.abbyy.pkg || 'abbfr002'));
    if (abbyyPkg3) skuRows.push({ section: 'enhanced', sku: abbyyPkg3.sku, name: `ABBYY – ${abbyyPkg3.name}`, qty: ec3.abbyy.qty || 1, unit: 'Per unit/yr', layer: 'enhanced', unitBaseUSD: abbyyPkg3.price });
  }
  Object.entries(ec3.q1_dynamics?.connectors || {}).filter(([,v3]) => v3).forEach(([k3]) => {
    const con3 = tp3.q1_dynamics.connectors.find(x3 => x3.key === k3);
    if (con3) skuRows.push({ section: 'enhanced', sku: con3.sku || 'Q1', name: 'Q1 – ' + con3.name, qty: 1, unit: 'Per year', layer: 'enhanced', unitBaseUSD: con3.price });
  });
  if (ec3.t3k?.selected) {
    const tMode3 = ec3.t3k.pricing_mode || 'tb';
    if ((ec3.t3k.instances || 0) > 0) skuRows.push({ section: 'enhanced', sku: 'T3KCON001', name: 'T3K – Nuix Connector', qty: ec3.t3k.instances, unit: 'Per instance/yr', layer: 'enhanced', unitBaseUSD: tp3.t3k.price_per_instance });
    if (tMode3 === 'worker' && (ec3.t3k.workers || 0) > 0) {
      skuRows.push({ section: 'enhanced', sku: 'T3KCORE001', name: 'T3K – CORE Image Analysis', qty: ec3.t3k.workers, unit: 'Per worker/yr', layer: 'enhanced', unitBaseUSD: tp3.t3k.price_per_worker });
    } else if (tMode3 === 'tb') {
      const tbT3 = tp3.t3k.tb_tiers.find(t3 => t3.key === (ec3.t3k.tb_tier || 'tb10'));
      if (tbT3) skuRows.push({ section: 'enhanced', sku: tbT3.sku, name: `T3K – CORE Image Analysis (${tbT3.name})`, qty: 1, unit: 'Per unit/yr', layer: 'enhanced', unitBaseUSD: tbT3.price });
    } else if (tMode3 === 'users') {
      const urT3 = tp3.t3k.user_tiers.find(t3 => t3.key === (ec3.t3k.user_tier || 'ur10'));
      if (urT3) skuRows.push({ section: 'enhanced', sku: urT3.sku, name: `T3K – CORE Image Analysis (${urT3.name})`, qty: 1, unit: 'Per unit/yr', layer: 'enhanced', unitBaseUSD: urT3.price });
    }
  }
  if (ec3.veritone?.selected) {
    const vtP3 = tp3.veritone;
    if ((ec3.veritone.instances || 0) > 0) skuRows.push({ section: 'enhanced', sku: 'VERTSCPCON2', name: 'Veritone – Nuix Connector', qty: ec3.veritone.instances, unit: 'Per instance/yr', layer: 'enhanced', unitBaseUSD: vtP3.price_per_instance });
    const vtT3 = vtP3.transcription_tiers.find(t3 => t3.key === (ec3.veritone.transcription_tier || 'sml'));
    if (vtT3) skuRows.push({ section: 'enhanced', sku: vtT3.sku, name: `Veritone – Transcription (${vtT3.name})`, qty: 1, unit: 'Per instance/yr', layer: 'enhanced', unitBaseUSD: vtT3.price });
    if ((ec3.veritone.first_langs || 0) > 0)      skuRows.push({ section: 'enhanced', sku: 'VERTSLTLAN1', name: 'Veritone – Translation (First Language)',      qty: ec3.veritone.first_langs,      unit: 'Per language/yr', layer: 'enhanced', unitBaseUSD: vtP3.price_first_language });
    if ((ec3.veritone.additional_langs || 0) > 0) skuRows.push({ section: 'enhanced', sku: 'VERTSLTLANS', name: 'Veritone – Translation (Additional Language)', qty: ec3.veritone.additional_langs, unit: 'Per language/yr', layer: 'enhanced', unitBaseUSD: vtP3.price_additional_language });
  }

  // Section 5 — Advantage & Implementation
  const bst5 = state.foundation.boosters || {};
  if (state.pricingModel === 'consumption') {
    const trainingRate5 = C.foundation_boosters[refTier3]?.training_hour || 0;
    skuRows.push({ section: 'consulting', sku: 'TRNNEO001', name: 'Training Credits', qty: C.consumption_tiers[tier].training_hours, unit: 'Credits', layer: 'foundation', unitBaseUSD: 0 });
    if (bst5.trainingHours > 0)
      skuRows.push({ section: 'consulting', sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours', qty: bst5.trainingHours, unit: 'Per 24-hr pack', layer: 'foundation', unitBaseUSD: trainingRate5 });
    const supNames5c = { bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' };
    const includedSupportSkus5c = { 'Advantage Bronze': 'CSLT101F', 'Advantage Silver': 'CSLT102F', 'Advantage Gold': 'CSLT103F' };
    const effectiveSupport5c = bst5.support ? supNames5c[bst5.support] : C.consumption_tiers[tier].support;
    skuRows.push({ section: 'consulting', sku: includedSupportSkus5c[effectiveSupport5c], name: effectiveSupport5c, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: 0 });
    if (bst5.support) {
      const supSkus5  = { bronze: 'CSLT101U', silver: 'CSLT102U', gold: 'CSLT103U' };
      skuRows.push({ section: 'consulting', sku: supSkus5[bst5.support], name: `Support Upgrade – ${supNames5c[bst5.support]}`, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: getSupportIncrementalCost(bst5.support, C.consumption_tiers[tier].support) });
    }
  } else if (tierSuffix2 && b2) {
    skuRows.push({ section: 'consulting', sku: 'TRNNEO001', name: 'Training Credits', qty: t2.training_hours, unit: 'Credits', layer: 'foundation', unitBaseUSD: 0 });
    if (bst5.trainingHours > 0)
      skuRows.push({ section: 'consulting', sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours', qty: bst5.trainingHours, unit: 'Per 24-hr pack', layer: 'foundation', unitBaseUSD: b2.training_hour });
    const supNames5 = { bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' };
    const includedSupportSkus5 = { 'Advantage Bronze': 'CSLT101F', 'Advantage Silver': 'CSLT102F', 'Advantage Gold': 'CSLT103F' };
    const effectiveSupport5 = bst5.support ? supNames5[bst5.support] : t2.support;
    skuRows.push({ section: 'consulting', sku: includedSupportSkus5[effectiveSupport5], name: effectiveSupport5, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: 0 });
    if (bst5.support) {
      const supSkus5  = { bronze: 'CSLT101U', silver: 'CSLT102U', gold: 'CSLT103U' };
      skuRows.push({ section: 'consulting', sku: supSkus5[bst5.support], name: `Support Upgrade – ${supNames5[bst5.support]}`, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: getSupportIncrementalCost(bst5.support, t2.support) });
    }
  }
  if (['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k])) {
    const byoRate5 = b2 ? b2.training_hour : (C.foundation_boosters[refTier3]?.training_hour || 0);
    skuRows.push({ section: 'consulting', sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours (BYO AI Implementation)', qty: 7, unit: 'Per 24-hr pack', layer: 'foundation', unitBaseUSD: byoRate5 });
  }
  if (state.advantageServices?.implementationPackage)
    skuRows.push({ section: 'consulting', sku: 'CSLT300', name: 'Nuix Neo Foundation Implementation Package', qty: 1, unit: 'Per instance', layer: 'consulting', unitBaseUSD: C.consulting.cslt300_price, year1Only: true });
  if (state.advantageServices?.solutionImplementationPackage)
    skuRows.push({ section: 'consulting', sku: 'CSLT301', name: 'Nuix Neo Solution Implementation Package', qty: 1, unit: 'Per instance', layer: 'consulting', unitBaseUSD: C.consulting.cslt301_price, year1Only: true });

  // Section 6 — Test Environments
  nonProdSkuRows().forEach(r => skuRows.push({ section: 'nonProd', layer: 'nonProd', ...r, name: r.notes ? `${r.name} (${r.notes})` : r.name }));

  // ── Compute per-row net prices ────────────────────────────────────────────────
  const skuRowsWithPrices = skuRows.map(r => {
    const net = unitNetForSummary(r.unitBaseUSD, r.layer);
    const periodPrices = periods.map((p, pi) => {
      if (r.year1Only && pi > 0) return 0;
      return getPeriodPrice(net * r.qty, p);
    });
    return { ...r, net, periodPrices };
  });

  // ── Render section groups ────────────────────────────────────────────────────
  const SECTION_DEFS = [
    { key: 'foundation', label: 'Nuix Neo Foundation',        badge: '1' },
    { key: 'aiSuite',    label: 'AI Suite',                   badge: '2' },
    { key: 'enhanced',   label: 'Add Ons',                    badge: '3' },
    { key: 'consulting', label: 'Advantage & Implementation', badge: '4' },
    { key: 'nonProd',    label: 'Test Environments',          badge: '5' },
  ];
  const FIXED_COLS = 4; // Product | SKU | Qty | Unit
  const totalCols  = FIXED_COLS + periods.length;

  const tableRows = SECTION_DEFS.map(sec => {
    const rows3 = skuRowsWithPrices.filter(r => r.section === sec.key);
    if (rows3.length === 0) return '';
    const sectionTotal = periods.map((_, pi) => rows3.reduce((s, r) => s + (r.periodPrices[pi] || 0), 0));
    const rowsHtml3 = rows3.map((r, ri) => `
      <tr class="st-row">
        <td class="st-name"><div class="st-label">${r.name}</div></td>
        <td class="st-sku">${r.sku}</td>
        <td class="st-qty">${r.qty}</td>
        <td class="st-unit">${r.unit}</td>
        ${r.periodPrices.map((price, pi) => `<td class="st-yr"><div class="st-yr-price" style="font-size:13px">${price > 0 ? fmt(price) : '—'}</div></td>`).join('')}
      </tr>`).join('');
    const subtotalHtml = `
      <tr class="st-subtotal-row">
        <td colspan="${FIXED_COLS}" class="st-name" style="padding:7px 20px"><div class="st-sub" style="font-weight:700;color:var(--navy)">${sec.label} subtotal</div></td>
        ${sectionTotal.map(t3 => `<td class="st-yr" style="padding:7px 14px"><div class="st-yr-price" style="font-size:13px;color:var(--navy)">${fmt(t3)}</div></td>`).join('')}
      </tr>`;
    return `
      <tr class="st-section-header">
        <td colspan="${totalCols}">
          <span class="st-section-badge">${sec.badge}</span>${sec.label}
        </td>
      </tr>
      ${rowsHtml3}
      ${subtotalHtml}`;
  }).join('');

  const totAfterAuto  = Object.values(layers).reduce((s, l) => s + l.afterAuto, 0);
  const totSalesD     = Object.values(layers).reduce((s, l) => s + l.salesDeduct, 0);
  // Sum per-row, per-period prices (already correctly zero out year1Only items after period 0)
  // rather than re-deriving from the aggregate layer net, which would repeat one-time costs every period.
  const periodTotals  = periods.map((_, pi) => skuRowsWithPrices.reduce((s, r) => s + (r.periodPrices[pi] || 0), 0));
  const totContract   = periodTotals.reduce((s, v) => s + v, 0);
  const blendedDisc   = (state.discounts.blended || 0) / 100;
  const totBlendedD   = blendedDisc * totAfterAuto;
  const cur           = CURRENCIES[state.currency] || CURRENCIES.USD;
  const sym           = cur.symbol;

  const approvalBanner = appReq ? (() => {
    if (appReqDiscount) {
      const ceilPct = (getMaxThreshold() * 100).toFixed(1);
      return `
    <div class="approval-banner">
      <span class="warn-icon">⚠️</span>
      <div class="warn-text">
        <div class="warn-title"><strong>CEO approval required — discount exceeds this deal's ${ceilPct}% ceiling</strong></div>
        <div class="warn-sub">Before submitting for CEO approval in Salesforce, you must consider whether the capacity or capabilities can be rightsized to the customer's budget.</div>
      </div>
    </div>`;
    }
    return `
    <div class="approval-banner">
      <span class="warn-icon">⚠️</span>
      <div class="warn-text">
        <div class="warn-title"><strong>CEO approval required</strong></div>
        <div class="warn-sub">Deals over US$1,000,000 ACV or equivalent currency require CEO approval in all cases.</div>
      </div>
    </div>`;
  })() : '';

  const isNeoExpansion = state.customer.dealType === 'Neo Expansion';
  const expansionCurrentACV = isNeoExpansion ? (parseFloat(state.upsell.currentACV) || 0) : 0;

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Quote Summary — Finalise${isNeoExpansion ? ' · Nuix Neo Expansion' : ''}</div>
      <h2 style="margin-bottom:4px">${state.customer.name || 'Customer'} · ${state.customer.country || ''}</h2>
      <p class="text-muted">${state.customer.type || ''} · ${state.customer.isPOC ? `POC ${state.customer.pocDuration || 3} months` : `${state.customer.contractMonths || 12} months`}</p>
    </div>
    ${pocHtml}
    ${renderCeilingPanel()}
    <div class="card" style="padding:0;overflow:hidden;overflow-x:auto">
      <table class="sum-table">
        <thead>
          <tr>
            <th class="st-h-name">Product</th>
            <th class="st-h-sku">SKU</th>
            <th class="st-h-qty">Qty</th>
            <th class="st-h-unit">Unit</th>
            ${periods.map((p, i) => {
              const fracNote = p.fraction < 1 ? `<span class="st-h-sub">${p.months} mo pro-rated</span>` : '';
              return `<th class="st-h-yr">${p.label}${fracNote}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>${tableRows}${getAnnualUplift() > 0 && periods.filter(p => p.fraction === 1).length > 1 ? `
        <tr class="st-row" style="background:#f8faff">
          <td colspan="${FIXED_COLS}" class="st-name"><div class="st-label" style="color:var(--teal)">Annual uplift</div><div class="st-sub">${state.customer.annualUplift}% per year, compounding</div></td>
          ${periods.map((p, i) => {
            const txt = (p.upliftExp > 0 && p.fraction === 1)
              ? `+${state.customer.annualUplift}% /yr`
              : '—';
            return `<td class="st-yr"><div class="st-yr-price" style="font-size:13px;color:${p.upliftExp > 0 && p.fraction === 1 ? 'var(--teal)' : 'var(--muted)'};">${txt}</div></td>`;
          }).join('')}
        </tr>` : ''}</tbody>
        <tfoot>
          <tr class="st-total">
            <td colspan="${FIXED_COLS}" class="st-name">
              <div class="st-label">Period Subtotal</div>
              <div class="st-sub" style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap">
                <span>Deal discount:</span>
                <div class="st-disc-wrap">
                  <input type="number" min="-100" max="100" step="0.5" value="${state.discounts.blended || 0}" data-disc="blended">
                  <span class="st-pct">%</span>
                </div>
                ${blendedDisc > 0 ? `<div class="st-savings">−${fmt(totBlendedD)} /yr</div>` : blendedDisc < 0 ? `<div class="st-savings" style="color:var(--teal)">+${fmt(-totBlendedD)} /yr</div>` : ''}
              </div>
            </td>
            ${periods.map((p, pi) => `<td class="st-yr"><div class="st-yr-price st-total-price">${fmt(periodTotals[pi])}${p.fraction < 1 ? '' : '<span style="font-size:13px;font-weight:500"> /yr</span>'}</div></td>`).join('')}
          </tr>
          ${periods.length > 1 ? `
          <tr class="st-tcv-row">
            <td class="st-name" colspan="${FIXED_COLS}"><div class="st-label" style="color:#fff">Total Contract Value</div><div class="st-sub" style="color:rgba(255,255,255,0.55)">${state.customer.contractMonths || 12} months${getAnnualUplift() > 0 ? ` · ${state.customer.annualUplift}% annual uplift` : ''}</div></td>
            <td class="st-tcv-cell" colspan="${periods.length}"><div class="st-tcv-amount">${fmt(totContract)}</div></td>
          </tr>` : ''}
        </tfoot>
      </table>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Target Pricing</div>
      <div style="display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <div style="display:grid;grid-template-columns:${periods.length > 1 ? '1fr 1fr' : '1fr'};gap:16px;align-items:start;max-width:520px">
            ${periods.length > 1 ? `
            <div class="form-group">
              <label>Target Year 1 ACV</label>
              <div class="input-currency">
                <span class="currency-symbol">${sym}</span>
                <input type="number" min="0" step="1000" value="${state.targets.acv || ''}" data-target="acv" placeholder="Enter target Year 1 price">
              </div>
            </div>` : ''}
            <div class="form-group">
              <label>Target TCV</label>
              <div class="input-currency">
                <span class="currency-symbol">${sym}</span>
                <input type="number" min="0" step="1000" value="${state.targets.tcv || ''}" data-target="tcv" placeholder="Enter target contract value">
              </div>
            </div>
          </div>
          ${(targetACV || targetTCV) ? `<p style="font-size:12px;color:var(--muted);margin-top:10px;margin-bottom:0">Deal discount set to <strong style="color:var(--text)">${(state.discounts.blended || 0).toFixed(2)}%</strong> to reach this target. Clear the field to set the discount manually.</p>` : `<p style="font-size:12px;color:var(--muted);margin-top:10px;margin-bottom:0">Enter a target to automatically calculate the required deal discount.</p>`}
        </div>
        <div class="form-group" style="flex:1;min-width:260px">
          <label>Pricing Approval Notes</label>
          <textarea id="f-approval-notes" rows="4" placeholder="Explain the pricing rationale and approval context for approvers…" style="width:100%;resize:vertical;font-family:inherit;font-size:13px;padding:8px 10px;border:1.5px solid #d1d5db;border-radius:8px;color:var(--text);line-height:1.6" oninput="state.approvalNotes=this.value">${state.approvalNotes || ''}</textarea>
        </div>
      </div>
    </div>
    ${approvalBanner}
    <div class="quote-type-chooser">
      <div class="qtc-label">Generate &amp; Export</div>
      <div class="qtc-options-row">
        <div class="qtc-card-compact" onclick="generateSKUOrder()">
          <div class="qtc-cat">Internal</div>
          <div class="qtc-head"><span class="qtc-icon">🏷️</span><span class="qtc-title">SKU Order Sheet</span></div>
          <div class="qtc-desc">Full SKU list with quantities for order entry.</div>
        </div>
        ${!appReq ? `
        <div class="qtc-card-compact" onclick="generateBudgetQuote('itemised')">
          <div class="qtc-cat">Customer</div>
          <div class="qtc-head"><span class="qtc-icon">📋</span><span class="qtc-title">Itemised Budget Quote</span></div>
          <div class="qtc-desc">Per-SKU price for each contract year.</div>
        </div>
        <div class="qtc-card-compact" onclick="generateBudgetQuote('annual')">
          <div class="qtc-cat">Customer</div>
          <div class="qtc-head"><span class="qtc-icon">📅</span><span class="qtc-title">Annual Price Budget Quote</span></div>
          <div class="qtc-desc">Total annual price per year with product list.</div>
        </div>
        ${(state.customer.contractMonths > 12 && !state.customer.isPOC) ? `
        <div class="qtc-card-compact" onclick="generateBudgetQuote('total')">
          <div class="qtc-cat">Customer</div>
          <div class="qtc-head"><span class="qtc-icon">💰</span><span class="qtc-title">Total Price Budget Quote</span></div>
          <div class="qtc-desc">Single total price for the full contract.</div>
        </div>` : ''}
        ` : `<div style="padding:12px 16px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;font-size:12px;color:#991b1b;align-self:center"><strong>Budget quotes unavailable</strong> — CEO approval is required before presenting pricing to the customer.</div>`}
      </div>
      <p style="font-size:12px;color:var(--muted);margin-top:12px;margin-bottom:0">PDF the SKU Order Sheet and email it to <a href="mailto:pppquotecreation@nuix.com" style="color:#0056e3;text-decoration:underline">PPP Quote Creation</a> to have your quote created in Salesforce.</p>
    </div>` ;
}

// ─── Navigation & flow ────────────────────────────────────────────────────────

function saveStep1() {
  state.customer.name          = ($('f-name')?.value || '').trim();
  // Country is a search-to-select field — only accept an exact match against the
  // known country list, so a typo or unselected free text can never silently fall
  // back to the default (US) regional multiplier.
  const typedCountry = ($('f-country')?.value || '').trim();
  const knownCountries = Object.values(cfg().regions).flat();
  state.customer.country       = knownCountries.includes(typedCountry) ? typedCountry : '';
  state.customer.type          = $('f-type')?.value || '';
  state.customer.dealType      = $('f-dealtype')?.value || '';
  syncSuiteToDealType();
  state.customer.channel       = $('f-channel')?.value  || '';
  state.customer.opportunityLink = ($('f-opportunity-link')?.value || '').trim();
  state.customer.contractValue = $('f-duration')?.value || 1;
  state.customer.contractUnit  = $('f-durationUnit')?.value || 'years';
  state.customer.isPOC         = $('f-poc')?.value === 'yes';
  // Auto-set currency based on country
  if (state.customer.country) setCurrency(getDefaultCurrency(state.customer.country));
}

function saveStep2() {
  const isExpansion = state.customer.dealType === 'Neo Expansion';
  if (state.pricingModel === 'consumption') {
    state.foundation.tbPerYear   = parseFloat($('f-tbperyear')?.value) || 0;
    state.foundation.usersNeeded = parseFloat($('f-users')?.value) || 0;
    if ($('b-training-hours')) state.foundation.boosters.trainingHours = parseInt($('b-training-hours').value) || 0;
    return;
  }
  if (isExpansion) {
    state.foundation.boosters.workers = parseFloat($('f-workers')?.value) || 0;
    state.foundation.boosters.users   = parseFloat($('f-users')?.value) || 0;
    return;
  }
  state.foundation.workersNeeded = parseFloat($('f-workers')?.value) || 0;
  state.foundation.usersNeeded   = parseFloat($('f-users')?.value) || 0;
  if ($('b-training-hours'))     state.foundation.boosters.trainingHours = parseInt($('b-training-hours').value) || 0;
}

function saveUpsellStep() {
  state.upsell.currentACV     = stripCommas($('f-rb-currentacv')?.value)  || '';
  state.upsell.targetACV      = stripCommas($('f-rb-targetacv')?.value)   || '';
  state.upsell.currentWorkers = $('f-rb-workers')?.value                  || '';
}

function stripCommas(v) { return (v || '').replace(/,/g, ''); }

function saveRenewalStep() {
  if ($('f-ren-currentacv'))    state.renewal.currentACV    = stripCommas($('f-ren-currentacv').value)    || '';
  if ($('f-ren-acvgrowth'))     state.renewal.acvGrowth     = parseFloat($('f-ren-acvgrowth').value)      || 0;
  if ($('f-ren-neoacvtarget'))  state.renewal.neoAcvTarget  = stripCommas($('f-ren-neoacvtarget').value)  || '';
  if ($('f-ren-neoworkers'))    state.renewal.neoWorkers    = $('f-ren-neoworkers').value                 || '';
  if ($('f-ren-neousers'))      state.renewal.neoUsers      = $('f-ren-neousers').value                   || '';
}

function saveContractStep() {
  if ($('poc-dur'))             state.customer.pocDuration          = parseInt($('poc-dur').value) || 3;
  if ($('poc-disc'))            state.customer.pocDiscount          = Math.max(0, parseFloat($('poc-disc').value) || 0);
  if ($('f-contract-months'))   state.customer.contractMonths       = Math.max(1, parseInt($('f-contract-months').value) || 12);
  if ($('f-contract-start'))    state.customer.contractStartDate    = $('f-contract-start').value || '';
  if ($('f-partial-position'))  state.customer.partialYearPosition  = $('f-partial-position').value || 'end';
  if ($('f-annual-uplift'))     state.customer.annualUplift         = Math.max(0, parseFloat($('f-annual-uplift').value) || 0);
}

function saveNeoExpansionBuilder() {
  const currentWorkers = parseFloat(document.getElementById('exp-neo-workers')?.value) || 0;
  state.upsell.currentWorkers       = currentWorkers ? String(currentWorkers) : '';
  const autoTier = currentWorkers ? autoTierFromWorkers(currentWorkers) : null;
  if (autoTier) state.foundation.selectedTier = autoTier;
}

function saveCurrentStep() {
  if (state.currentStep === 1)  saveStep1();
  if (state.currentStep === 3)  saveContractStep();
  if (state.currentStep === 5)  {
    if (state.customer.dealType === 'Neo Expansion') saveNeoExpansionBuilder();
    else saveRenewalStep();
  }
  if (state.currentStep === 6)  saveStep2();
  if (state.currentStep === 15) savePartnerMargins();
}

function validateStep() {
  if (state.currentStep === 1) {
    if (!state.customer.country)       { alert('Please select a country.');           return false; }
    if (!state.customer.type)          { alert('Please select a customer type.');     return false; }
  }
  if (state.currentStep === 11 && isDiscoverSuite()) {
    const ec = state.enhancedCap;
    if (!ec.discover_saas.selected && !ec.discover_onprem.selected) { alert('Please select Discover SaaS and/or Discover On-Prem.'); return false; }
  }
  if (state.currentStep === 3) {
    if (!state.customer.contractStartDate) { alert('Please select a contract start date.'); return false; }
  }
  if (state.currentStep === 4) {
    if (!state.pricingModel) { alert('Please select a pricing model.'); return false; }
  }
  if (state.currentStep === 5 && state.customer.dealType === 'Neo Expansion') {
    if (!state.upsell.currentWorkers) { alert('Please enter the customer\'s current Nuix Neo worker count.'); return false; }
    if (!state.foundation.selectedTier) { alert('Could not auto-allocate a tier from the worker count. Please check the worker value.'); return false; }
  }
  if (state.currentStep === 7) {
    if (!state.foundation.selectedTier) { alert('Please enter requirements so we can recommend a tier.'); return false; }
  }
  return true;
}

// ─── SKU Line Items & Partner Margins ─────────────────────────────────────────

function isPartnerMarginsSkipped() {
  // Partner margins are now entered in Salesforce (with its own validation) instead of
  // here, per the partnerships team's request — hidden for now. Revert this return to
  // re-enable the step (state.customer.channel !== 'Partner').
  return true;
}

// Per-row unit pricing helper. Returns listUnit, regionalUnit, netUnitPrice, discPct.
// For consulting: rm is embedded in layers.consulting.baseUSD, so autoDisc=1 and we apply rm separately.
function unitP(unitBaseUSD, layerKey, layers, rm) {
  if (!unitBaseUSD) return { listUnit: 0, regionalUnit: 0, netUnitPrice: 0, discPct: 0 };
  const l = layers[layerKey];
  const regionalUnit = unitBaseUSD * rm;
  const autoF  = layerKey === 'consulting' ? 1 : l.autoDisc;
  const salesF = 1 - l.salesDisc;
  const netUnitPrice = regionalUnit * autoF * salesF;
  const discPct = regionalUnit > 0 ? 1 - netUnitPrice / regionalUnit : 0;
  return { listUnit: unitBaseUSD, regionalUnit, netUnitPrice, discPct };
}

function buildSkuRows() {
  const C    = cfg();
  const tier = state.foundation.selectedTier;
  const bst  = state.foundation.boosters;
  const t    = tier ? C.foundation_tiers[tier] : null;
  const b    = tier ? C.foundation_boosters[tier] : null;
  const tierSuffix = tier === 'light' ? 'L' : tier === 'core' ? 'C' : tier === 'rapid' ? 'R' : null;
  const tierSize   = tier === 'light' ? 'S' : tier === 'core' ? 'MD' : tier === 'rapid' ? 'L' : null;

  const rows = [];

  // ── Foundation ──────────────────────────────────────────────────────────────
  if (state.pricingModel === 'consumption') {
    const ct = C.consumption_tiers[tier];
    const tierName = tier ? tierDisplayName(tier) : '';
    rows.push({ sku: ct.sku, name: ct.name, qty: 1, unit: 'Per year', notes: '', layer: 'foundation', unitBaseUSD: ct.price, key: 'found_base', category: 'nuixSoftware' });
    if (bst.volume > 0)
      rows.push({ sku: ct.tb_booster_sku, name: `Additional TB – ${tierName} (Consumption)`, qty: bst.volume, unit: 'Per TB/yr', notes: '', layer: 'foundation', unitBaseUSD: ct.tb_booster_rate, key: 'found_volume', category: 'nuixSoftware' });
    if (bst.users > 0) {
      const userSkus = { light: 'NEOBRS', core: 'NEOBRMD', rapid: 'NEOBRL' };
      rows.push({ sku: userSkus[tier], name: `Additional Concurrent User – ${tierName}`, qty: bst.users, unit: 'Per user/yr', notes: '', layer: 'foundation', unitBaseUSD: b.user, key: 'found_users', category: 'nuixSoftware' });
    }
    rows.push({ sku: 'TRNNEO001', name: 'Training Credits', qty: ct.training_hours, unit: 'Credits', notes: 'Included', layer: 'foundation', unitBaseUSD: 0, key: 'found_training_included', category: 'nuixServices' });
    if (bst.trainingHours > 0)
      rows.push({ sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours',         qty: bst.trainingHours, unit: 'Per 24-hr pack', notes: '',                      layer: 'foundation', unitBaseUSD: b.training_hour, key: 'found_training', category: 'nuixServices' });
    const supNamesC = { bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' };
    const includedSupportSkusC = { 'Advantage Bronze': 'CSLT101F', 'Advantage Silver': 'CSLT102F', 'Advantage Gold': 'CSLT103F' };
    const effectiveSupportC = bst.support ? supNamesC[bst.support] : ct.support;
    rows.push({ sku: includedSupportSkusC[effectiveSupportC], name: effectiveSupportC, qty: 1, unit: 'Per year', notes: 'Advantage entitlement', layer: 'foundation', unitBaseUSD: 0, key: 'found_support_included', category: 'nuixServices' });
    if (bst.support) {
      const supSkus  = { bronze: 'CSLT101U', silver: 'CSLT102U', gold: 'CSLT103U' };
      rows.push({ sku: supSkus[bst.support], name: `Support Upgrade – ${supNamesC[bst.support]}`, qty: 1, unit: 'Per year', notes: '', layer: 'foundation', unitBaseUSD: getSupportIncrementalCost(bst.support, ct.support), key: 'found_support', category: 'nuixServices' });
    }
  } else {
    const foundationSkus = { light: 'NEO007S', core: 'NEO007MD', rapid: 'NEO007L' };
    const isExpansionDeal = state.customer.dealType === 'Neo Expansion';
    if (!isExpansionDeal) {
      // Standard deals — include the base tier as a line item
      if (tierSuffix) {
        rows.push({ sku: foundationSkus[tier], name: `Nuix Neo Foundation – ${t.name.replace('NEO – ','')}`, qty: 1, unit: 'Per year', notes: '', layer: 'foundation', unitBaseUSD: t.price, key: 'found_base', category: 'nuixSoftware' });
      }
    }
    const workerSkus = { light: 'NEOBWS', core: 'NEOBWMD', rapid: 'NEOBWL' };
    const volumeSkus = { light: 'NEO-BOOST-VOL-L', core: 'NEO-BOOST-VOL-C', rapid: 'NEO-BOOST-VOL-R' };
    const userSkus   = { light: 'NEOBRS', core: 'NEOBRMD', rapid: 'NEOBRL' };
    const tierName   = tier ? tierDisplayName(tier) : '';
    if (bst.workers > 0 && tierSuffix) rows.push({ sku: workerSkus[tier], name: `Additional Worker – ${tierName}`,           qty: bst.workers,       unit: 'Per worker/yr',  notes: '', layer: 'foundation', unitBaseUSD: b.worker, key: 'found_workers', category: 'nuixSoftware' });
    if (bst.volume  > 0 && tierSuffix) rows.push({ sku: volumeSkus[tier], name: `Additional Volume – ${tierName}`,           qty: bst.volume,        unit: 'Per TB/yr',      notes: '', layer: 'foundation', unitBaseUSD: b.volume_tb, key: 'found_volume', category: 'nuixSoftware' });
    if (bst.users   > 0 && tierSuffix) rows.push({ sku: userSkus[tier],   name: `Additional Concurrent User – ${tierName}`, qty: bst.users,         unit: 'Per user/yr',    notes: '', layer: 'foundation', unitBaseUSD: b.user, key: 'found_users', category: 'nuixSoftware' });
    if (tier) {  // no Foundation on a Discover-only quote
      rows.push({ sku: 'TRNNEO001', name: 'Training Credits', qty: t.training_hours, unit: 'Credits', notes: 'Included', layer: 'foundation', unitBaseUSD: 0, key: 'found_training_included', category: 'nuixServices' });
      if (bst.trainingHours > 0)
        rows.push({ sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours', qty: bst.trainingHours, unit: 'Per 24-hr pack', notes: '', layer: 'foundation', unitBaseUSD: b.training_hour, key: 'found_training', category: 'nuixServices' });
      const supNames = { bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' };
      const includedSupportSkus = { 'Advantage Bronze': 'CSLT101F', 'Advantage Silver': 'CSLT102F', 'Advantage Gold': 'CSLT103F' };
      const effectiveSupport = bst.support ? supNames[bst.support] : t.support;
      rows.push({ sku: includedSupportSkus[effectiveSupport], name: effectiveSupport, qty: 1, unit: 'Per year', notes: 'Advantage entitlement', layer: 'foundation', unitBaseUSD: 0, key: 'found_support_included', category: 'nuixServices' });
      if (bst.support) {
        const supSkus  = { bronze: 'CSLT101U', silver: 'CSLT102U', gold: 'CSLT103U' };
        rows.push({ sku: supSkus[bst.support], name: `Support Upgrade – ${supNames[bst.support]}`, qty: 1, unit: 'Per year', notes: 'Incremental upgrade', layer: 'foundation', unitBaseUSD: getSupportIncrementalCost(bst.support, t.support), key: 'found_support', category: 'nuixServices' });
      }
    }
  }

  // ── AI Suite ────────────────────────────────────────────────────────────────
  const refTier     = tier;
  const refTierSize = refTier === 'light' ? 'S' : refTier === 'core' ? 'MD' : refTier === 'rapid' ? 'L' : tierSize;
  const refTierName = tierDisplayName(refTier);
  const aiDisplayMap = { aiBundle: ['NEOAIBNDL01','AI Bundle'], enrich: ['NEOAI001','Enrich'], semantic: ['NEOS001','Semantic Search'], transcription: ['NEOS002','Transcription'], agenticBYOAI: ['NEOAI002','BYO AI'], byoAIAdvanced: ['NEOAI003','BYO AI - Advanced'], byoAIGraph: ['NEOAI004','BYO AI - Graph'], agenticAdvanced: ['NEOAI005','Agentic: AI - Advanced'] };
  Object.entries(state.aiSuite).forEach(([key, on]) => {
    if (on && refTierSize && aiDisplayMap[key]) {
      const [base, name] = aiDisplayMap[key];
      const aiPrice = getAiModuleBaseUSD(key, refTier, state.aiSuite);
      rows.push({ sku: `${base}${refTierSize}`, name: `${name} – ${refTierName}`, qty: 1, unit: 'Per year', notes: '', layer: 'aiSuite', unitBaseUSD: aiPrice, key: `ai_${key}`, category: 'nuixSoftware' });
    }
  });
  if (['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k])) {
    const byoRate = b ? b.training_hour : 0;
    rows.push({ sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours (BYO AI Implementation)', qty: 7, unit: 'Per 24-hr pack', notes: 'Min. 160 hrs for BYO AI', layer: 'foundation', unitBaseUSD: byoRate, key: 'ai_byoTraining', category: 'nuixServices' });
  }

  // ── Use Cases ────────────────────────────────────────────────────────────────
  if (!state.useCases.foundationOnly && refTierSize) {
    const ucPrice = refTier ? (C.use_case_modules.solution_pack?.price[refTier] || 0) : 0;
    rows.push({ sku: `NEOSLIB${refTierSize}`, name: `Solutions Library – ${refTierName}`, qty: 1, unit: 'Per year', notes: '', layer: 'useCases', unitBaseUSD: ucPrice, key: 'usecases_solutionpack', category: 'nuixSoftware' });
  }

  // ── Enhanced capabilities ────────────────────────────────────────────────────
  const ec = state.enhancedCap;
  const nm = C.enhanced_capabilities.nuix_modules;
  const tp = C.enhanced_capabilities.third_party;
  if (ec.discover_saas?.selected)   discoverSaasSkuRows(ec.discover_saas, nm.discover_saas).forEach(r     => rows.push({ layer: 'enhanced', category: 'nuixSoftware', ...r }));
  if (ec.discover_onprem?.selected) discoverOnpremSkuRows(ec.discover_onprem, nm.discover_onprem).forEach(r => rows.push({ layer: 'enhanced', category: 'nuixSoftware', ...r }));
  discoverAdvantageSkuRows().forEach(r => rows.push({ layer: 'enhanced', category: 'nuixServices', ...r }));
  if (ec.adaptive_security?.selected) {
    if (ec.adaptive_security.endpoints > 0) rows.push({ sku: 'ENDPT001',  name: 'Adaptive Security – Endpoint', qty: ec.adaptive_security.endpoints, unit: 'Per endpoint/yr', notes: '', layer: 'enhanced', unitBaseUSD: nm.adaptive_security.price_per_endpoint, key: 'enh_adaptiveSecurity_endpoint', category: 'nuixSoftware' });
    if (ec.adaptive_security.users > 0)     rows.push({ sku: 'ENDPTUSER', name: 'Adaptive Security – User',     qty: ec.adaptive_security.users,     unit: 'Per user/yr',    notes: '', layer: 'enhanced', unitBaseUSD: nm.adaptive_security.price_per_user, key: 'enh_adaptiveSecurity_user', category: 'nuixSoftware' });
    if (ec.adaptive_security.servers > 0)   rows.push({ sku: 'ENDPTSVR',  name: 'Adaptive Security – Server',   qty: ec.adaptive_security.servers,   unit: 'Per server/yr',  notes: '', layer: 'enhanced', unitBaseUSD: nm.adaptive_security.price_per_server, key: 'enh_adaptiveSecurity_server', category: 'nuixSoftware' });
  }
  if (state.visualisation.selected) {
    const vb = getVisualisationBundlePricing(state.visualisation);
    if (vb.bundle.sku) rows.push({ sku: vb.bundle.sku, name: vb.bundle.name, qty: 1, unit: 'Per bundle/yr', notes: '', layer: 'enhanced', unitBaseUSD: vb.bundle.price, key: 'enh_visualisation_bundle', category: 'thirdParty' });
    if (vb.boosterUserQty > 0) rows.push({ sku: vb.boosterUserTier.sku, name: `Visualisation Bundle Booster – ${vb.boosterUserTier.name}`, qty: vb.boosterUserQty, unit: 'Per pack/yr', notes: '', layer: 'enhanced', unitBaseUSD: vb.boosterUserTier.price, key: 'enh_visualisation_user_booster', category: 'thirdParty' });
    if (vb.boosterMemQty > 0)  rows.push({ sku: vb.boosterMemTier.sku,  name: `Visualisation Bundle Booster – ${vb.boosterMemTier.name}`,  qty: vb.boosterMemQty,  unit: 'Per pack/yr', notes: '', layer: 'enhanced', unitBaseUSD: vb.boosterMemTier.price, key: 'enh_visualisation_mem_booster', category: 'thirdParty' });
  }
  if (ec.ecc?.selected && ec.ecc.endpoints > 0)
    rows.push({ sku: 'ENDPT101', name: 'ECC (Enterprise Collection Centre)', qty: ec.ecc.endpoints, unit: 'Per endpoint/yr', notes: '', layer: 'enhanced', unitBaseUSD: nm.ecc.price_per_endpoint, key: 'enh_ecc', category: 'nuixSoftware' });
  if (ec.legal_hold?.selected && ec.legal_hold.custodians > 0)
    rows.push({ sku: 'RALH001', name: 'Nuix Automate Legal Hold', qty: ec.legal_hold.custodians, unit: 'Per custodian/month ×12', notes: '', layer: 'enhanced', unitBaseUSD: nm.legal_hold.price_per_custodian_month * 12, key: 'enh_legalHold', category: 'nuixSoftware' });
  if (ec.automated_relativity?.selected)
    rows.push({ sku: 'NEOREL01', name: 'Automated Relativity Export and Orchestration', qty: 1, unit: 'Per year', notes: '', layer: 'enhanced', unitBaseUSD: nm.automated_relativity.list_price, key: 'enh_automatedRelativity', category: 'nuixSoftware' });
  if (ec.abbyy?.selected && (ec.abbyy.qty || 1) > 0) {
    const abbyyPkg = tp.abbyy.packages.find(p => p.key === (ec.abbyy.pkg || 'abbfr002'));
    if (abbyyPkg) rows.push({ sku: abbyyPkg.sku, name: `ABBYY – ${abbyyPkg.name}`, qty: ec.abbyy.qty || 1, unit: 'Per unit/yr', notes: '', layer: 'enhanced', unitBaseUSD: abbyyPkg.price, key: 'enh_abbyy', category: 'thirdParty' });
  }
  Object.entries(ec.q1_dynamics?.connectors||{}).filter(([,v])=>v).forEach(([k]) => {
    const con2 = tp.q1_dynamics.connectors.find(x => x.key === k);
    if (con2) rows.push({ sku: con2.sku || 'Q1', name: 'Q1 – ' + con2.name, qty: 1, unit: 'Per year', notes: '', layer: 'enhanced', unitBaseUSD: con2.price, key: `enh_q1_${k}`, category: 'thirdParty' });
  });
  if (ec.t3k?.selected) {
    const tMode = ec.t3k.pricing_mode || 'tb';
    if ((ec.t3k.instances || 0) > 0) rows.push({ sku: 'T3KCON001', name: 'T3K – Nuix Connector', qty: ec.t3k.instances, unit: 'Per instance/yr', notes: '', layer: 'enhanced', unitBaseUSD: tp.t3k.price_per_instance, key: 'enh_t3k_connector', category: 'thirdParty' });
    if (tMode === 'worker' && (ec.t3k.workers || 0) > 0) {
      rows.push({ sku: 'T3KCORE001', name: 'T3K – CORE Image Analysis', qty: ec.t3k.workers, unit: 'Per worker/yr', notes: '', layer: 'enhanced', unitBaseUSD: tp.t3k.price_per_worker, key: 'enh_t3k_worker', category: 'thirdParty' });
    } else if (tMode === 'tb') {
      const tbT = tp.t3k.tb_tiers.find(t2 => t2.key === (ec.t3k.tb_tier || 'tb10'));
      if (tbT) rows.push({ sku: tbT.sku, name: `T3K – CORE Image Analysis (${tbT.name})`, qty: 1, unit: 'Per unit/yr', notes: '', layer: 'enhanced', unitBaseUSD: tbT.price, key: 'enh_t3k_tb', category: 'thirdParty' });
    } else if (tMode === 'users') {
      const urT = tp.t3k.user_tiers.find(t2 => t2.key === (ec.t3k.user_tier || 'ur10'));
      if (urT) rows.push({ sku: urT.sku, name: `T3K – CORE Image Analysis (${urT.name})`, qty: 1, unit: 'Per unit/yr', notes: '', layer: 'enhanced', unitBaseUSD: urT.price, key: 'enh_t3k_users', category: 'thirdParty' });
    }
  }
  if (ec.veritone?.selected) {
    const vtP = tp.veritone;
    if ((ec.veritone.instances || 0) > 0) rows.push({ sku: 'VERTSCPCON2', name: 'Veritone – Nuix Connector', qty: ec.veritone.instances, unit: 'Per instance/yr', notes: '', layer: 'enhanced', unitBaseUSD: vtP.price_per_instance, key: 'enh_veritone_connector', category: 'thirdParty' });
    const vtT = vtP.transcription_tiers.find(t2 => t2.key === (ec.veritone.transcription_tier || 'sml'));
    if (vtT) rows.push({ sku: vtT.sku, name: `Veritone – Transcription (${vtT.name})`, qty: 1, unit: 'Per instance/yr', notes: '', layer: 'enhanced', unitBaseUSD: vtT.price, key: 'enh_veritone_transcription', category: 'thirdParty' });
    if ((ec.veritone.first_langs || 0) > 0)      rows.push({ sku: 'VERTSLTLAN1', name: 'Veritone – Translation (First Language)',      qty: ec.veritone.first_langs,      unit: 'Per language/yr', notes: '', layer: 'enhanced', unitBaseUSD: vtP.price_first_language, key: 'enh_veritone_langFirst', category: 'thirdParty' });
    if ((ec.veritone.additional_langs || 0) > 0) rows.push({ sku: 'VERTSLTLANS', name: 'Veritone – Translation (Additional Language)', qty: ec.veritone.additional_langs, unit: 'Per language/yr', notes: '', layer: 'enhanced', unitBaseUSD: vtP.price_additional_language, key: 'enh_veritone_langAdditional', category: 'thirdParty' });
  }

  // ── Consulting ───────────────────────────────────────────────────────────────
  if (state.advantageServices?.implementationPackage) {
    rows.push({ sku: 'CSLT300', name: 'Nuix Neo Foundation Implementation Package', qty: 1, unit: 'Per instance', notes: 'Year 1 only', layer: 'consulting', unitBaseUSD: C.consulting.cslt300_price, year1Only: true, key: 'cons_implementation', category: 'nuixServices' });
  }
  if (state.advantageServices?.solutionImplementationPackage) {
    rows.push({ sku: 'CSLT301', name: 'Nuix Neo Solution Implementation Package', qty: 1, unit: 'Per instance', notes: 'Year 1 only', layer: 'consulting', unitBaseUSD: C.consulting.cslt301_price, year1Only: true, key: 'cons_solutionImplementation', category: 'nuixServices' });
  }

  // ── Test Environments ────────────────────────────────────────────────────────
  nonProdSkuRows().forEach(r => rows.push({ layer: 'nonProd', category: 'nuixSoftware', ...r }));

  return rows;
}

function getPricedSkuRows() {
  const layers = calcPrices();
  const rm = getRM();
  return buildSkuRows().map(r => ({ ...r, price: unitP(r.unitBaseUSD, r.layer, layers, rm) }));
}

function setPartnerMargin(key, year, value) {
  if (!state.partnerMargins.bySku[key]) state.partnerMargins.bySku[key] = {};
  state.partnerMargins.bySku[key][year] = parseFloat(value) || 0;
  updatePartnerPaymentDisplay();
}

function updatePartnerPaymentDisplay() {
  const rows    = getPricedSkuRows();
  const periods = getContractPeriods();
  let grandTotal = 0;
  periods.forEach((p, i) => {
    const pidx = i + 1;
    let periodTotal = 0;
    for (const row of rows) {
      const margin  = state.partnerMargins.bySku[row.key]?.[pidx] ?? 0;
      const payment = (row.year1Only && i > 0) ? 0 : getPeriodPrice(row.price.netUnitPrice * row.qty, p) * (margin / 100);
      periodTotal += payment;
      grandTotal  += payment;
      const el = $(`pm-pay-${row.key}-${pidx}`);
      if (el) el.textContent = fmt(payment);
    }
    const tEl = $(`pm-total-${pidx}`);
    if (tEl) tEl.textContent = fmt(periodTotal);
  });
  const gEl = $('pm-grand-total');
  if (gEl) gEl.textContent = fmt(grandTotal);
}

function applyMassEditCategory(catKey) {
  const val = parseFloat($('mass-' + catKey)?.value) || 0;
  const rows    = buildSkuRows();
  const periods = getContractPeriods();
  for (const row of rows.filter(r => r.category === catKey)) {
    if (!state.partnerMargins.bySku[row.key]) state.partnerMargins.bySku[row.key] = {};
    periods.forEach((_, i) => { state.partnerMargins.bySku[row.key][i + 1] = val; });
  }
  showStep(state.currentStep, true);
}

function savePartnerMargins() {
  // state.partnerMargins is updated in real-time via setPartnerMargin; nothing to sync from DOM
}

function renderPartnerMargins() {
  const periods = getContractPeriods();
  const rows    = getPricedSkuRows();
  const pm = state.partnerMargins;

  for (const row of rows) {
    if (!pm.bySku[row.key]) pm.bySku[row.key] = {};
    periods.forEach((_, i) => {
      if (pm.bySku[row.key][i + 1] === undefined) pm.bySku[row.key][i + 1] = 0;
    });
  }

  const catGroups = [
    { key: 'nuixSoftware', label: 'Nuix Software' },
    { key: 'nuixServices', label: 'Nuix Services' },
    { key: 'thirdParty',   label: 'Third Party Software' },
  ];

  const yearHeaders = periods.map((p, i) => {
    const cumPct = getAnnualUplift() > 0 && p.upliftExp > 0 ? `+${((Math.pow(1 + getAnnualUplift(), p.upliftExp) - 1) * 100).toFixed(1)}% on yr 1` : '';
    const fracNote = p.fraction < 1 ? `<span class="st-h-sub">${p.months} mo</span>` : (cumPct ? `<span class="st-h-sub">${cumPct}</span>` : '');
    return `<th class="st-h-yr" style="text-align:center">${p.label}${fracNote}</th>`;
  }).join('');

  const tableRows = catGroups.map(cat => {
    const catRows = rows.filter(r => r.category === cat.key);
    const sectionHeader = `<tr>
      <td colspan="${1 + periods.length}" style="padding:5px 16px;background:#f1f5f9;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;border-top:1px solid var(--border)">${cat.label}</td>
    </tr>`;
    if (catRows.length === 0) {
      return sectionHeader + `<tr class="st-row">
        <td class="st-name"><div class="st-label" style="color:var(--muted);font-style:italic">No products selected</div></td>
        ${periods.map(() => `<td class="st-yr"></td>`).join('')}
      </tr>`;
    }
    return sectionHeader + catRows.map(row => {
      const cells = periods.map((p, i) => {
        const pidx   = i + 1;
        const margin  = pm.bySku[row.key]?.[pidx] ?? 0;
        const payment = (row.year1Only && i > 0) ? 0 : getPeriodPrice(row.price.netUnitPrice * row.qty, p) * (margin / 100);
        return `<td class="st-yr" style="vertical-align:top;padding-top:10px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:3px;margin-bottom:5px">
            <input type="number" min="0" max="100" step="0.5" value="${margin}"
              style="width:52px;padding:4px 6px;border:1px solid var(--border);border-radius:5px;font-size:12px;text-align:center;background:#fff"
              oninput="setPartnerMargin('${row.key}',${pidx},this.value)">
            <span style="font-size:11px;color:var(--muted)">%</span>
          </div>
          <div id="pm-pay-${row.key}-${pidx}" class="st-yr-price" style="text-align:center">${fmt(payment)}</div>
        </td>`;
      }).join('');
      return `<tr class="st-row">
        <td class="st-name">
          <div class="st-label"><span style="font-family:monospace;font-size:10px;color:#1e40af">${row.sku}</span> · ${row.name}</div>
          <div class="st-sub">${row.qty} × ${row.unit}${row.notes ? ' · ' + row.notes : ''}</div>
        </td>
        ${cells}
      </tr>`;
    }).join('');
  }).join('');

  let grandTotal = 0;
  const totalCells = periods.map((p, i) => {
    const pidx = i + 1;
    const periodTotal = rows.reduce((sum, row) => {
      const margin = pm.bySku[row.key]?.[pidx] ?? 0;
      const val = (row.year1Only && i > 0) ? 0 : getPeriodPrice(row.price.netUnitPrice * row.qty, p) * (margin / 100);
      grandTotal += val;
      return sum + val;
    }, 0);
    return `<td class="st-yr" style="text-align:center"><div id="pm-total-${pidx}" class="st-yr-price st-total-price">${fmt(periodTotal)}</div></td>`;
  }).join('');

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Finalise ◆</div>
      <h2 style="margin:0 0 6px">Partner Margins</h2>
      <p style="margin:4px 0 0;color:var(--muted);font-size:14px">Set the partner margin % by SKU and contract year. Payments are calculated from the discounted quote price.</p>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">Apply to All Years</div>
      <div style="display:flex;flex-direction:column;gap:12px;max-width:420px">
        ${catGroups.map(cat => `
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:13px;font-weight:600;color:var(--text);min-width:160px">${cat.label}</div>
            <div style="display:flex;align-items:center;gap:4px">
              <input type="number" min="0" max="100" step="0.5" id="mass-${cat.key}" placeholder="0"
                style="width:65px;padding:7px 10px;border:1px solid var(--border);border-radius:7px;font-size:14px;text-align:right;background:#fff">
              <span style="color:var(--muted);font-size:13px">%</span>
            </div>
            <button onclick="applyMassEditCategory('${cat.key}')"
              style="padding:7px 16px;background:#1e40af;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap">
              Apply
            </button>
          </div>`).join('')}
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;overflow-x:auto;margin-bottom:16px">
      <table class="sum-table">
        <thead>
          <tr>
            <th class="st-h-name">SKU / Line Item</th>
            ${yearHeaders}
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
          <tr class="st-total">
            <td class="st-name"><div class="st-label">Total Partner Payment</div><div class="st-sub">Per year</div></td>
            ${totalCells}
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="padding:18px 24px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:10px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:15px;font-weight:600;color:#1e40af">Total Partner Contract Value</span>
      <span id="pm-grand-total" style="font-size:24px;font-weight:800;color:#1e40af">${fmt(grandTotal)}</span>
    </div>`;
}

function showStep(n, noScroll = false) {
  state.currentStep = n;
  const renders = { 1: renderStep1, 2: renderProductSuite, 3: renderContractStructure, 4: renderPricingModel, 5: renderStepE, 6: renderValueWin, 7: renderStep2, 9: renderStep3, 10: renderVisualisation, 11: renderDiscover, 12: renderStep5, 13: renderStepAdvantage, 14: renderNonProd, 15: renderPartnerMargins, 16: renderStep7 };
  $('step-content').innerHTML = renders[n]();
  const isRenewalBuilder = n === 5 && state.customer.dealType === 'Renewal';
  const mainEl = document.querySelector('main');
  mainEl.classList.toggle('wide', n === 16 || isRenewalBuilder);
  // Suppress transition so the inline override takes effect immediately
  mainEl.style.transition = 'none';
  mainEl.style.maxWidth = isRenewalBuilder ? '920px' : '';
  requestAnimationFrame(() => { mainEl.style.transition = ''; });
  const qp = $('quote-panel');
  if (qp) qp.style.display = isRenewalBuilder ? 'none' : '';
  updateProgress();
  updateNavButtons();
  updateLiveQuote();
  bindStepEvents();
  if (!noScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  persistState();
}

// ─── Product suite flow ───────────────────────────────────────────────────────
// Discover-only quotes have no Neo Foundation, pricing model, AI Suite, Visualisation
// or Advantage/Implementation steps — those are skipped, and the Neo state is cleared.
// Add-on modules that don't work with Discover — hidden (and cleared) on a Discover quote
const DISCOVER_HIDDEN_MODULES = ['automated_relativity', 'legal_hold'];

function isDiscoverSuite() {
  return state.productSuite === 'discover';
}

function enterDiscoverSuite() {
  state.pricingModel = 'worker';
  resetFoundationRequirements();
  Object.keys(state.aiSuite).forEach(k => { state.aiSuite[k] = false; });
  state.useCases.foundationOnly = true;
  state.useCases.secondary = [];
  state.useCases.subUseCases = [];
  state.visualisation.selected = false;
  state.advantageServices.implementationPackage = false;
  state.advantageServices.solutionImplementationPackage = false;
  // Third-party capabilities don't work with Discover — clear any already chosen
  const ec = state.enhancedCap;
  ['abbyy', 't3k', 'veritone'].forEach(k => { if (ec[k]) ec[k].selected = false; });
  ec.q1_dynamics.connectors = {};
  DISCOVER_HIDDEN_MODULES.forEach(k => { if (ec[k]) ec[k].selected = false; });
  // Drop any Neo test environments already ticked, so they can't be priced unseen
  cfg().non_prod.skus.filter(s => s.family === 'Nuix Neo').forEach(s => { delete state.nonProd.qty[s.sku]; });
  if (state.customer.dealType === 'Neo Expansion') state.customer.dealType = '';
  if (!state.enhancedCap.discover_saas.selected && !state.enhancedCap.discover_onprem.selected) {
    state.enhancedCap.discover_saas.selected = true;
  }
}

function isStepSkipped(n) {
  if (n === 8)  return true;                       // Solutions Library step removed — bundled automatically now
  if (n === 15) return isPartnerMarginsSkipped();
  if (n === 5)  return isUpsellBuilderSkipped() || isDiscoverSuite();
  if (isDiscoverSuite() && [4, 6, 7, 9, 10].includes(n)) return true;
  return false;
}

function stepAfter(n)  { let x = n + 1; while (x < 16 && isStepSkipped(x)) x++; return x; }
function stepBefore(n) { let x = n - 1; while (x > 1  && isStepSkipped(x)) x--; return x; }

// Discover-specific deal types. Choosing one selects the Discover suite; Neo Expansion selects Neo.
const DISCOVER_DEAL_TYPES = ['Discover New Business', 'Discover Renewal', 'Discover Expansion'];
function isDiscoverDealType() { return DISCOVER_DEAL_TYPES.includes(state.customer.dealType); }

function syncSuiteToDealType() {
  if (isDiscoverDealType() && !isDiscoverSuite()) {
    state.productSuite = 'discover';
    enterDiscoverSuite();
  } else if (state.customer.dealType === 'Neo Expansion' && isDiscoverSuite()) {
    state.productSuite = 'neo';
  }
}

function isUpsellBuilderSkipped() {
  return state.customer.dealType === 'New Business' || state.customer.dealType === 'Discover New Business';
}

function renderStepE() {
  if (state.customer.dealType === 'Neo Expansion')  return renderNeoExpansionBuilder();
  return renderRenewalBuilder();
}

function nextStep() {
  saveCurrentStep();
  if (!validateStep()) return;
  if (state.currentStep < 16) {
    const next = stepAfter(state.currentStep);
    state.maxStep = Math.max(state.maxStep, next);
    showStep(next);
  }
}

function prevStep() {
  saveCurrentStep();
  if (state.currentStep > 1) showStep(stepBefore(state.currentStep));
}

function updateLiveQuote() {
  const panel = $('quote-panel');
  if (!panel) return;

  if (state.currentStep === 16) {
    panel.style.display = '';
    panel.innerHTML = renderROIPanel();
    return;
  }

  if (state.currentStep === 5 && state.customer.dealType === 'Renewal') {
    panel.style.display = 'none';
    return;
  }
  if (state.currentStep === 5 && state.customer.dealType === 'Neo Expansion') {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = '';

  const layers   = calcPrices();
  const C        = cfg();
  const rm       = getRM();
  const autoD    = getAutoDisc();           // compound multiplier (non-regional)
  const cust     = state.customer;
  const years    = Math.max(getContractYears(), 1/12);
  const isPOC    = cust.isPOC;
  const layerStepGate = { foundation: 7, aiSuite: 8, useCases: 9, enhanced: 11, consulting: 14, nonProd: 14 };
  const totNet   = Object.entries(layers).reduce((s, [k, l]) => s + (state.currentStep >= (layerStepGate[k] || 6) ? l.net : 0), 0);
  const qpPeriods   = getContractPeriods();
  // The Implementation Packages are one-time Year 1 charges baked into the consulting layer's
  // net — strip them out before projecting later periods so they aren't repeated every year.
  const year1OnlyBaseLQ = (state.advantageServices?.implementationPackage ? C.consulting.cslt300_price : 0)
    + (state.advantageServices?.solutionImplementationPackage ? C.consulting.cslt301_price : 0);
  const year1OnlyNetLQ = state.currentStep >= (layerStepGate.consulting || 6)
    ? year1OnlyBaseLQ * (1 - layers.consulting.salesDisc)
    : 0;
  const totRecurringLQ = totNet - year1OnlyNetLQ;
  const totContract = qpPeriods.reduce((sum, p, pi) => sum + getPeriodPrice(pi === 0 ? totNet : totRecurringLQ, p), 0);

  // Effective combined discount for hero sub-label
  const discFactor   = rm * autoD;
  const effDiscPct   = Math.round((1 - discFactor) * 100);
  const autoDiscPct  = Math.round((1 - autoD) * 100);  // non-regional auto-disc
  const regionalPct  = Math.round(rm * 100);

  // Customer tags
  const tags = [
    cust.country  && `<span class="qp-tag qp-tag-primary">${cust.country.toUpperCase()}</span>`,
    cust.type     && `<span class="qp-tag">${cust.type.toUpperCase()}</span>`,
    isPOC         ? `<span class="qp-tag">POC ${cust.pocDuration || 3}MO</span>`
                  : `<span class="qp-tag">${cust.contractMonths || 12}MO</span>`
  ].filter(Boolean).join('');

  // Layer rows — only show layers whose config step has been reached
  // Steps: 7=Foundation, 9=AI Suite (also determines the bundled Solutions Library), 11=Discover/Enhanced, 13=Advantage & Implementation (shown once past it), 14=Test Environments
  const layerMinStep = { foundation: 6, aiSuite: 7, useCases: 7, enhanced: 11, consulting: 14, nonProd: 14 };
  const layerOrder  = ['foundation', 'aiSuite', 'useCases', 'enhanced', 'consulting', 'nonProd'];
  const layerLabels = { foundation: 'Nuix Neo Foundation', aiSuite: 'AI Suite', useCases: 'Solutions Library', enhanced: 'Add Ons', consulting: 'Customisation & Consulting', nonProd: 'Test Environments' };

  const layerRows = layerOrder.map(key => {
    const l = layers[key];
    // Solutions Library is bundled at $0 whenever Enrich/Semantic Search/Transcription
    // is selected — still show it explicitly rather than silently dropping a $0 layer.
    const bundledLibraryIncluded = key === 'useCases' && !state.useCases.foundationOnly;
    if (l.baseUSD === 0 && !bundledLibraryIncluded) return '';
    if (state.currentStep < layerMinStep[key]) return '';
    return `
      <div class="qp-layer">
        <div class="qp-layer-head">
          <span class="qp-layer-name">${layerLabels[key].toUpperCase()}</span>
          <span class="qp-layer-net">${bundledLibraryIncluded ? 'Included · $0' : fmt(l.net)}</span>
        </div>
      </div>`;
  }).filter(Boolean).join('');

  // Discount-ceiling readout — appears once a country is set. Government,
  // multi-year and regional size the ceiling, not the price.
  const discStackHtml = cust.country ? renderCeilingMini() : '';

  const noData = totNet === 0;

  // Annual customer value from value levers
  const vw = state.valueWin;
  let totalAnnualValue = 0;
  Object.entries(VALUE_LEVERS).forEach(([key, lev]) => {
    if (vw.activeLevers[key]) totalAnnualValue += lev.subtract ? -lev.calc(vw.inputs) : lev.calc(vw.inputs);
  });
  const valueOverTerm = totalAnnualValue * years;
  const hasValue = totalAnnualValue > 0;

  // Value Multiple — show from Foundation step (7) onwards when both value and cost are known
  const contractTotal = totContract;
  const valueMult = (state.currentStep >= 7 && hasValue && contractTotal > 0)
    ? valueOverTerm / contractTotal : null;
  const valueMultHtml = valueMult !== null ? `
    <div style="background:#f0f4ff;border-radius:10px;padding:12px 14px;margin-top:10px">
      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:4px">Value Multiple</div>
      <div style="font-size:24px;font-weight:800;color:#0056e3">${valueMult.toFixed(1)}&times;</div>
    </div>` : '';

  panel.innerHTML = `
    <div class="qp-inner">
      <div class="qp-section-label">Live Quote</div>
      <div class="qp-customer">${cust.name || 'Your customer'}</div>
      <div class="qp-tags">${tags || '<span class="qp-tag qp-tag-empty">Not set</span>'}</div>

      <div class="qp-value-card">
        <div class="qp-value-label">Annual Customer Value</div>
        ${hasValue
          ? `<div class="qp-value-price">${fmtWin(totalAnnualValue)}</div>
             <div class="qp-value-sub">per year</div>
             ${qpPeriods.length > 1 ? `<div class="qp-hero-divider" style="background:rgba(22,163,74,0.2)"></div>
             <div class="qp-hero-total" style="color:#15803d">
               <span>Value over ${cust.contractMonths || 12}-month term</span>
               <span style="color:#15803d">${fmtWin(valueOverTerm)}</span>
             </div>` : ''}`
          : `<div class="qp-value-zero">—</div><div class="qp-value-sub">Complete Customer Value step to see estimate</div>`
        }
      </div>

      <div class="qp-hero">
        <div class="qp-hero-label">Annual Contract Value</div>
        ${noData
          ? `<div class="qp-hero-zero">—</div><div class="qp-hero-sub">Configure pricing to see estimate</div>`
          : `<div class="qp-hero-price">${fmt(totNet)}</div>
             <div class="qp-hero-sub">per year${cust.country ? ' · ' + cust.country : ''}${effDiscPct > 0 ? ' · ' + effDiscPct + '% price adjustment' : ''}</div>`
        }
        ${!noData && qpPeriods.length > 1 ? `
          <div class="qp-hero-divider"></div>
          <div class="qp-hero-total">
            <span>Total contract (${cust.contractMonths || 12} months)</span>
            <span>${fmt(totContract)}</span>
          </div>` : ''}
      </div>

      ${valueMultHtml}

      ${layerRows
        ? `<div class="qp-breakdown">${layerRows}</div>`
        : `<div class="qp-empty">Component breakdown will appear as you configure each step.</div>`
      }

      ${discStackHtml}
    </div>`;
}

function updateProgress() {
  const labels = [
    'Customer profile', 'Product suite', 'Contract structure', 'Pricing model',
    state.customer.dealType === 'Neo Expansion' ? 'Nuix Neo Expansion builder' : 'Renewal builder',
    'Customer Value',
    // Index 7 (step 8, "Solutions Library") is left blank — that step was removed;
    // it's now bundled automatically with Enrich/Semantic Search/Transcription in
    // the AI Suite step. Keep the blank slot so the remaining labels stay aligned
    // to their step numbers (mirrors the '' placeholder at index 1 for skipped step 2).
    'Nuix Neo Foundation', '', 'AI Suite', 'Visualisation', 'Discover', 'Add Ons', isDiscoverSuite() ? 'Advantage' : 'Advantage & Implementation',
    'Test Environments', 'Partner Margins', 'Quote summary'
  ];
  const groups = [
    { label: 'Setup',          steps: [1, 2, 3, 4, 5].filter(n => !isStepSkipped(n)) },
    { label: 'Customer Value', steps: [6].filter(n => !isStepSkipped(n)) },
    { label: 'Configure',      steps: [7, 9, 10, 11, 12, 13, 14].filter(n => !isStepSkipped(n)) },
    { label: 'Finalise',       steps: isPartnerMarginsSkipped() ? [16] : [15, 16] }
  ].filter(g => g.steps.length);
  const stepDot = { 1:'A', 2:'B', 3:'C', 4:'D', 5:'E', 6:'★', 15:'◆', 16:'◈' };
  // Configure steps are numbered 1..n in the order shown, so skipped ones leave no gap
  groups.find(g => g.label === 'Configure').steps.forEach((n, i) => { stepDot[n] = String(i + 1); });
  const nav = $('sidebar-nav');
  if (!nav) return;
  nav.innerHTML = groups.map(g => {
    const items = g.steps.map(n => {
      const done   = n < state.currentStep && n < state.maxStep;
      const active = n === state.currentStep;
      const locked = n > state.maxStep;
      const cls       = done ? 'sn-done' : active ? 'sn-active' : locked ? 'sn-future sn-locked' : 'sn-future';
      const tickIcon  = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const lockIcon  = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="2" y="5" width="7" height="5.5" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
      const statusIcon = done ? `<span class="sn-status">${tickIcon}</span>` : locked ? `<span class="sn-status">${lockIcon}</span>` : '';
      const click     = locked ? '' : `onclick="jumpToStep(${n})"`;
      return `<div class="sn-item ${cls}" ${click}>
        <div class="sn-dot">${stepDot[n]}</div>
        <span class="sn-label">${labels[n - 1]}</span>
        ${statusIcon}
      </div>`;
    }).join('');
    return `<div class="sn-group">
      <div class="sn-group-label">${g.label}</div>
      ${items}
    </div>`;
  }).join('');
}

function jumpToStep(n) {
  if (n === state.currentStep) return;
  if (n > state.maxStep) return;
  saveCurrentStep();
  showStep(n);
}

function updateNavButtons() {
  const isPricingComingSoon = false;
  $('btn-prev').style.visibility = state.currentStep > 1 ? '' : 'hidden';
  $('btn-next').style.display = (state.currentStep === 16 || isPricingComingSoon) ? 'none' : '';
  const lastSetupStep = [5, 4, 3].find(n => !isStepSkipped(n));
  const toCustomerValue = !isStepSkipped(6);
  $('btn-next').textContent   = state.currentStep === lastSetupStep ? (toCustomerValue ? 'Customer Value →' : 'Configure →') : state.currentStep === 6 ? 'Configure →' : state.currentStep === 14 ? 'Review Pricing →' : 'Next →';
  $('step-count').style.display = 'none';
}

// ─── Event binding ────────────────────────────────────────────────────────────

function updatePOCPricingDisplay() {
  const C          = cfg();
  const dur        = state.customer.pocDuration || 3;
  const rm         = getRM();
  const regionalFee = C.poc_price_per_month * dur * rm;
  const disc       = state.customer.pocDiscount || 0;
  const regionalNet = regionalFee * (1 - disc / 100);

  const priceEl = $('poc-price-display');
  if (priceEl) priceEl.textContent = fmt(regionalNet);

  const listEl = $('poc-list-price');
  if (listEl) listEl.innerHTML = disc > 0
    ? `<div style="font-size:12px;color:var(--muted);text-decoration:line-through">${fmt(regionalFee)} list</div>` : '';

  const amtEl = $('poc-disc-amount');
  if (amtEl) amtEl.innerHTML = disc > 0
    ? `<span style="color:var(--green);font-weight:600;font-size:13px">−${fmt(regionalFee * disc / 100)}</span>` : '';

  const btnEl = $('poc-btn-wrap');
  if (btnEl) btnEl.innerHTML = disc >= 20
    ? `<button class="btn btn-amber" onclick="alert('Your approval request has been submitted. The relevant pricing committee members have been notified based on the discount level requested. You will be contacted once a decision has been made.')">📤 Send for Approval</button>`
    : `<button class="btn btn-primary" onclick="generatePOCQuote()">📄 Generate Quote</button>`;
}

function bindStepEvents() {
  // Step 1: Country search (typeahead — mirrors the Renewal Builder SKU search)
  (function bindCountrySearch() {
    const countryInput = $('f-country');
    const dropdown     = $('country-dropdown');
    if (!countryInput || !dropdown) return;

    // A handful of common acronyms/aliases that don't appear in the country name itself.
    const COUNTRY_ALIASES = {
      'United States':  ['usa', 'us', 'u.s.', 'u.s.a.', 'america'],
      'United Kingdom': ['uk', 'u.k.', 'britain', 'great britain']
    };
    const allCountries = Object.values(cfg().regions).flat().sort((a, b) => a.localeCompare(b));

    function doSearch(val) {
      const q = val.trim().toLowerCase();
      if (!q) { dropdown.style.display = 'none'; return; }
      const matches = allCountries.filter(c =>
        c.toLowerCase().includes(q) || (COUNTRY_ALIASES[c] || []).some(a => a.includes(q))
      ).slice(0, 12);
      if (!matches.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = matches.map(c =>
        `<div class="ctry-dd-item" style="padding:9px 12px;cursor:pointer;font-size:13px;color:#1a1a2e;border-bottom:1px solid #f3f4f6">${c}</div>`
      ).join('');
      dropdown.style.display = 'block';
      dropdown._matches = matches;
      dropdown.querySelectorAll('.ctry-dd-item').forEach((el, i) => {
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          commitCountry(dropdown._matches[i]);
        });
      });
    }

    function commitCountry(country) {
      countryInput.value = country;
      dropdown.style.display = 'none';
      state.customer.country = country;
      setCurrency(getDefaultCurrency(country));
    }

    countryInput.addEventListener('input', () => {
      if (state.customer.country && countryInput.value !== state.customer.country) state.customer.country = '';
      doSearch(countryInput.value);
    });
    countryInput.addEventListener('blur', () => {
      setTimeout(() => { dropdown.style.display = 'none'; }, 150);
    });
    countryInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && dropdown._matches && dropdown._matches.length === 1) {
        e.preventDefault();
        commitCountry(dropdown._matches[0]);
      }
    });
  })();

  // Step 3: contract type toggle
  document.querySelectorAll('[data-contract]').forEach(opt => {
    opt.addEventListener('click', () => {
      state.customer.isPOC = opt.dataset.contract === 'poc';
      showStep(state.currentStep, true);
    });
  });

  // Step 3: POC duration change — re-render to update price and discounted amount
  const pocDurSel = $('poc-dur');
  if (pocDurSel) {
    pocDurSel.addEventListener('change', () => {
      state.customer.pocDuration = parseInt(pocDurSel.value) || 3;
      showStep(state.currentStep, true);
    });
  }

  // Step 3: POC discount input — targeted update to avoid re-render focus loss
  const pocDiscInp = $('poc-disc');
  if (pocDiscInp) {
    pocDiscInp.addEventListener('input', () => {
      state.customer.pocDiscount = Math.max(0, parseFloat(pocDiscInp.value) || 0);
      updatePOCPricingDisplay();
    });
  }

  // Step 2: product suite cards
  document.querySelectorAll('[data-suite]').forEach(card => {
    card.addEventListener('click', () => {
      const prevDeal = state.customer.dealType;
      state.productSuite = card.dataset.suite;
      if (state.productSuite === 'discover') enterDiscoverSuite();
      // The suite chosen here wins over a deal type from Step A that belongs to the other suite
      if (state.productSuite === 'neo' && isDiscoverDealType()) state.customer.dealType = '';
      if (state.customer.dealType !== prevDeal && prevDeal) suiteNotice = `The deal type "${prevDeal}" doesn't apply to ${state.productSuite === 'neo' ? 'Nuix Neo' : 'Nuix Discover'}, so it has been cleared. Choose a new deal type on Step A.`;
      showStep(state.currentStep, true);
    });
  });

  // Step 4: pricing model cards
  document.querySelectorAll('[data-pricing]').forEach(card => {
    card.addEventListener('click', () => {
      if (state.pricingModel !== card.dataset.pricing) state.foundation.tierManuallySet = false;
      state.pricingModel = card.dataset.pricing;
      showStep(state.currentStep, true);
    });
  });

  // Step 5: Renewal builder events
  (function bindRenewalBuilder() {
    const skuInput   = $('f-ren-sku');
    const dropdown   = $('ren-sku-dropdown');
    const addBtn     = $('ren-bom-add');
    if (!skuInput || !dropdown || !addBtn) return;

    let selectedSkuObj = null;

    function doSearch(val) {
      const q = val.trim().toLowerCase();
      if (!q) { dropdown.style.display = 'none'; return; }
      const skus = window.LEGACY_SKUS || [];
      const matches = skus.filter(s =>
        s.sku.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      ).slice(0, 12);
      if (!matches.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = matches.map((s, i) => {
        const cohortBadge = s.cohort === 'L'
          ? `<span style="font-size:10px;font-weight:700;background:#FEF3C7;color:#92400E;border-radius:3px;padding:1px 5px;margin-left:6px">Legacy</span>` : '';
        const priceStr = s.price != null ? `<span style="font-size:11px;color:#6b7280;margin-left:auto;padding-left:12px;white-space:nowrap">$${s.price.toLocaleString()}</span>` : '';
        return `<div class="ren-dd-item" data-idx="${i}"
          style="display:flex;align-items:center;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f3f4f6;gap:0">
          <span style="font-weight:700;color:#003080;font-size:13px;min-width:100px">${s.sku}</span>
          ${cohortBadge}
          <span style="font-size:13px;color:#374151;flex:1;margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</span>
          ${priceStr}
        </div>`;
      }).join('');
      dropdown.style.display = 'block';
      // Store match array for click handler
      dropdown._matches = matches;
      dropdown.querySelectorAll('.ren-dd-item').forEach((el, i) => {
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          const match = dropdown._matches[i];
          selectedSkuObj = match;
          skuInput.value = match.sku;
          dropdown.style.display = 'none';
        });
      });
    }

    skuInput.addEventListener('input', () => {
      selectedSkuObj = null;
      doSearch(skuInput.value);
    });
    skuInput.addEventListener('blur', () => {
      setTimeout(() => { dropdown.style.display = 'none'; }, 150);
    });
    skuInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); }
    });

    addBtn.addEventListener('click', () => {
      const val = skuInput.value.trim();
      if (!val) return;
      if (selectedSkuObj) {
        const item = { sku: selectedSkuObj.sku, name: selectedSkuObj.name, cohort: selectedSkuObj.cohort, family: selectedSkuObj.family, price: selectedSkuObj.price, qty: 1 };
        if (!state.renewal.bom) state.renewal.bom = [];
        const existing = state.renewal.bom.find(b => b.sku.toUpperCase() === item.sku.toUpperCase());
        if (existing) existing.qty = (existing.qty || 1) + 1;
        else          state.renewal.bom.push(item);
        selectedSkuObj = null;
      } else {
        renewalAddSku(val);
      }
      skuInput.value = '';
      dropdown.style.display = 'none';
      const tbody = $('ren-bom-tbody');
      if (tbody) {
        tbody.innerHTML = renderBomRows(state.renewal.bom || []);
        bindRenewalBomEvents();
      }
      refreshRenewalOptions();
    });

    // Also bind existing BOM row events on initial load
    bindRenewalBomEvents();

    // Comma-formatting for currency fields: strip on focus, reformat on blur
    ['f-ren-currentacv', 'f-ren-neoacvtarget'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('focus', () => { el.value = stripCommas(el.value); });
      el.addEventListener('blur', () => {
        const n = parseFloat(stripCommas(el.value));
        if (!isNaN(n)) el.value = n.toLocaleString();
      });
    });

    // Live ACV / field updates — save state and refresh options
    [$('f-ren-currentacv'), $('f-ren-acvgrowth'), $('f-ren-neoacvtarget'), $('f-ren-neoworkers'), $('f-ren-neousers')].forEach(el => {
      if (!el) return;
      el.addEventListener('input', () => { saveRenewalStep(); refreshRenewalOptions(); });
    });
  })();

  // Step 7 (consumption): TB/yr + users → recommend tier + boosters
  ['f-tbperyear', 'f-users'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', () => {
      const tb = parseFloat($('f-tbperyear')?.value) || 0;
      const u  = parseFloat($('f-users')?.value)     || 0;
      // A changed TB/yr is a new requirement, so the recommendation follows it again.
      if (tb !== (parseFloat(state.foundation.tbPerYear) || 0)) state.foundation.tierManuallySet = false;
      state.foundation.tbPerYear   = tb;
      state.foundation.usersNeeded = u;
      if (tb > 0) {
        {
          // Respect a manually-picked tier (via the tier-switch pills) — only fall back
          // to the best-fit recommendation when nothing's been overridden.
          const tier = state.foundation.tierManuallySet ? state.foundation.selectedTier : bestFitConsumptionTier(tb);
          const t    = cfg().consumption_tiers[tier];
          state.foundation.selectedTier    = tier;
          state.foundation.boosters.volume = Math.max(0, tb - t.included_tb);
          state.foundation.boosters.users  = Math.max(0, u - t.users);
          $('consumption-pricing-area').innerHTML = renderConsumptionPricing();
          bindBoosterEvents();
        }
      }
      updateLiveQuote();
    });
  });

  // Step 7 (worker): input → recommend (skip for expansion — tier is locked)
  ['f-workers', 'f-users'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', () => {
      if (state.customer.dealType === 'Neo Expansion') return;
      const w = parseFloat($('f-workers')?.value) || 0;
      const u = parseFloat($('f-users')?.value)   || 0;
      // A changed worker count is a new requirement, so the recommendation follows it
      // again — any earlier manual pill pick no longer applies.
      if (w !== (parseFloat(state.foundation.workersNeeded) || 0)) state.foundation.tierManuallySet = false;
      // Always keep state in sync so upgrade calc uses current values
      state.foundation.workersNeeded = w;
      state.foundation.usersNeeded   = u;
      if (w > 0) {
        {
          // Respect a manually-picked tier (e.g. via the tier-switch pills) — only
          // fall back to the best-fit recommendation when nothing's been overridden.
          // Rapid plus boosters covers any worker/user count, uncapped.
          const tier = state.foundation.tierManuallySet ? state.foundation.selectedTier : bestFitTier(w);
          const t    = cfg().foundation_tiers[tier];
          state.foundation.selectedTier     = tier;
          state.foundation.boosters.workers = Math.max(0, w - t.workers);
          state.foundation.boosters.volume  = 0;
          state.foundation.boosters.users   = Math.max(0, u - t.users);
          $('tier-rec-area').innerHTML = renderTierRecommendation();
          bindBoosterEvents();
        }
      }
    });
  });

  bindBoosterEvents();

  // Step 3: AI toggles
  const byoAIKeys = ['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'];
  document.querySelectorAll('[data-ai]').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.ai;

      // The AI Bundle replaces Enrich/Semantic/Transcription — while it's active
      // those three cards are disabled and a click on them is a no-op.
      if (key !== 'aiBundle' && AI_BUNDLE_COMPONENT_KEYS.includes(key) && state.aiSuite.aiBundle) return;

      const turningOn = !state.aiSuite[key];

      if (key === 'aiBundle') {
        state.aiSuite.aiBundle = turningOn;
        if (turningOn) {
          // Selecting the Bundle replaces the three individual capabilities.
          AI_BUNDLE_COMPONENT_KEYS.forEach(k => state.aiSuite[k] = false);
          state.aiSuite.enrichManual = false;
        }
        syncSolutionsLibraryInclusion();
        showStep(state.currentStep, true);
        return;
      }

      // Agentic: AI - Advanced auto-adds Semantic Search (+ Solutions Library) and upgrades
      // support to Advantage Silver, which changes other cards and the summary — so apply the
      // dependencies and re-render the whole step rather than patching this one card.
      if (key === 'agenticAdvanced') {
        state.aiSuite.agenticAdvanced = turningOn;
        applyAgenticAdvancedDependencies(turningOn);
        showStep(state.currentStep, true);
        return;
      }

      // If turning on a BYO AI option, deselect the other two first
      if (turningOn && byoAIKeys.includes(key)) {
        byoAIKeys.filter(k => k !== key).forEach(other => {
          state.aiSuite[other] = false;
          const otherCard = document.querySelector(`[data-ai="${other}"]`);
          if (otherCard) {
            otherCard.classList.remove('selected');
            otherCard.querySelector('.toggle-icon').innerHTML = '';
          }
        });
      }
      state.aiSuite[key] = turningOn;
      if (key === 'enrich') state.aiSuite.enrichManual = turningOn;
      // Bundle-component pricing/badges depend on all three cards' state together
      // (and may trigger an auto-upgrade to the Bundle), so a lightweight class/icon
      // patch isn't enough here — re-render the whole step.
      if (AI_BUNDLE_COMPONENT_KEYS.includes(key)) {
        syncSolutionsLibraryInclusion();
        maybeAutoUpgradeToAiBundle();
        showStep(state.currentStep, true);
        return;
      }
      card.classList.toggle('selected', state.aiSuite[key]);
      card.querySelector('.toggle-icon').innerHTML = state.aiSuite[key] ? '' : '';
      if (byoAIKeys.includes(key)) {
        const warning = card.nextElementSibling;
        if (warning && warning.classList.contains('byo-ai-warning')) {
          warning.style.display = state.aiSuite[key] ? 'block' : 'none';
        }
        // Hide warnings on deselected BYO AI cards
        byoAIKeys.filter(k => k !== key).forEach(other => {
          const otherCard = document.querySelector(`[data-ai="${other}"]`);
          if (otherCard) {
            const otherWarning = otherCard.nextElementSibling;
            if (otherWarning && otherWarning.classList.contains('byo-ai-warning')) {
              otherWarning.style.display = 'none';
            }
          }
        });
      }
      if (key === 'byoAIGraph' && state.aiSuite[key]) {
        // Default to the Small bundle only if a bundle isn't already configured — don't
        // downgrade a bundle the user picked manually before enabling BYO AI - Graph.
        // Track that Graph is the one that turned it on, so switching Graph back off
        // can remove it again — but only if the user hasn't since made it their own by
        // picking a bundle tier directly.
        if (!state.visualisation.selected) {
          state.visualisation.bundleTier = 'small';
          state.visualisation.boosterUserQty = 0;
          state.visualisation.boosterMemoryQty = 0;
          state.visualisation.selected = true;
          state.visualisation.byoGraphAutoSelected = true;
        }
        // Only force Enrich on if the Bundle isn't already covering that requirement.
        // Same tracking logic: only remembered as Graph's doing if Enrich wasn't
        // already on for some other reason.
        if (!state.aiSuite.enrich && !state.aiSuite.aiBundle) {
          state.aiSuite.enrich = true;
          state.aiSuite.byoGraphAutoEnrich = true;
        }
        syncSolutionsLibraryInclusion();
        maybeAutoUpgradeToAiBundle();
        showStep(state.currentStep, true);
      } else if (key === 'byoAIGraph' && !state.aiSuite[key]) {
        // Turning Graph back off — undo whatever it auto-added, but never touch
        // Enrich or the Visualisation bundle if the user has since taken ownership
        // of them (enrichManual, or a direct bundle-tier pick clearing the auto flag).
        if (state.visualisation.byoGraphAutoSelected) {
          state.visualisation.selected = false;
          state.visualisation.byoGraphAutoSelected = false;
        }
        if (state.aiSuite.byoGraphAutoEnrich && !state.aiSuite.enrichManual && !state.visualisation.selected) {
          state.aiSuite.enrich = false;
          state.aiSuite.byoGraphAutoEnrich = false;
        }
        syncSolutionsLibraryInclusion();
        showStep(state.currentStep, true);
      }
    });
  });

  // Test Environments: each SKU is on (1 unit) or off
  document.querySelectorAll('[data-np-toggle]').forEach(chk => {
    chk.addEventListener('click', () => {
      const sku = chk.dataset.npToggle;
      if (state.nonProd.qty[sku]) delete state.nonProd.qty[sku];
      else state.nonProd.qty[sku] = 1;
      showStep(state.currentStep, true);
    });
  });

  // Nuix module checkboxes
  document.querySelectorAll('[data-ec-nuix]').forEach(chk => {
    chk.addEventListener('click', () => {
      const key = chk.dataset.ecNuix;
      const turningOn = !state.enhancedCap[key].selected;
      state.enhancedCap[key].selected = turningOn;
      showStep(state.currentStep, true);
    });
  });

  // Step 10: Visualisation Bundle — tier cards. Clicking the already-selected tier
  // deselects the bundle entirely (it's optional, unlike a Foundation tier). Clicking a
  // different tier resets any recommender-driven boosters and need-fields, since a direct
  // pick always means "just this bundle, at its included capacity."
  document.querySelectorAll('[data-vis-bundle]').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.visBundle;
      const alreadySelectedSameTier = state.visualisation.selected && state.visualisation.bundleTier === key;
      // Any direct click here is the user taking ownership of the bundle — clear the
      // "BYO AI - Graph auto-added this" flag so turning Graph off later leaves it alone.
      state.visualisation.byoGraphAutoSelected = false;
      if (alreadySelectedSameTier) {
        applyKgEnrichDependency(false);
        state.visualisation.selected = false;
      } else {
        if (!state.visualisation.selected) applyKgEnrichDependency(true);
        state.visualisation.selected = true;
        state.visualisation.bundleTier = key;
        state.visualisation.boosterUserTier = 'u20';
        state.visualisation.boosterUserQty = 0;
        state.visualisation.boosterMemoryTier = 'm64';
        state.visualisation.boosterMemoryQty = 0;
        state.visualisation.needUsers = '';
        state.visualisation.needGb = '';
      }
      showStep(state.currentStep, true);
    });
  });

  // Step 10: Visualisation Bundle — recommender inputs. Only the recommendation panel
  // re-renders on input (not the whole step), so focus isn't lost mid-type.
  ['vis-need-users', 'vis-need-gb'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', () => {
      state.visualisation.needUsers = $('vis-need-users')?.value || '';
      state.visualisation.needGb    = $('vis-need-gb')?.value    || '';
      const area = $('vis-rec-area');
      if (area) area.innerHTML = renderVisualisationRecommendation();
    });
  });

  // Third party checkboxes
  document.querySelectorAll('[data-ec-tp]').forEach(chk => {
    chk.addEventListener('click', () => {
      const key = chk.dataset.ecTp;
      const s = state.enhancedCap[key];
      if (s !== null && typeof s === 'object' && 'selected' in s) {
        s.selected = !s.selected;
      } else if (s !== null && typeof s === 'object' && 'connectors' in s) {
        // Q1: top-level toggle clears all connectors
        const anySelected = Object.values(s.connectors).some(v => v);
        if (anySelected) {
          s.connectors = {};
        } else {
          // select all
          const cfg = window.PRICING_CONFIG.enhanced_capabilities.third_party.q1_dynamics.connectors;
          cfg.forEach(c => { s.connectors[c.key] = true; });
        }
      } else {
        state.enhancedCap[key] = !state.enhancedCap[key];
      }
      showStep(state.currentStep, true);
    });
  });

  // Q1 individual connector checkboxes
  document.querySelectorAll('[data-q1-connector]').forEach(chk => {
    chk.addEventListener('click', e => {
      e.stopPropagation();
      const key = chk.dataset.q1Connector;
      const s = state.enhancedCap.q1_dynamics;
      s.connectors[key] = !s.connectors[key];
      showStep(state.currentStep, true);
    });
  });

  // Step 5: qty inputs for EC
  document.querySelectorAll('.ec-qty').forEach(input => {
    input.addEventListener('input', () => {
      const mod   = input.dataset.mod;
      const field = input.dataset.field;
      state.enhancedCap[mod][field] = input.type === 'checkbox' ? input.checked : (parseFloat(input.value) || 0);
      // Refresh the in-card volume-discount box and the quote panel in place — a full
      // showStep() re-render would drop focus mid-typing.
      const box = $('ds-vol-discount');
      if (box && mod === 'discover_saas') {
        box.innerHTML = discoverSaasDiscountBoxInner(state.enhancedCap.discover_saas, cfg().enhanced_capabilities.nuix_modules.discover_saas);
      }
      updateLiveQuote();
    });
  });

  // Discover SaaS add-ons: pay-as-you-go is exclusive with an upfront commit
  document.querySelectorAll('.ec-payg').forEach(chk => {
    chk.addEventListener('change', () => {
      const ds = state.enhancedCap.discover_saas;
      if (!ds.payg) ds.payg = {};
      ds.payg[chk.dataset.field] = chk.checked;
      if (chk.checked) ds[chk.dataset.field] = 0;
      showStep(state.currentStep, true);
    });
  });

  // Step 5: select dropdowns for EC (tier / package / mode pickers)
  document.querySelectorAll('.ec-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const mod   = sel.dataset.mod;
      const field = sel.dataset.field;
      state.enhancedCap[mod][field] = sel.value;
      showStep(state.currentStep, true);
    });
  });

  // Discount inputs — use 'change' (on blur/Enter) to avoid re-render destroying focus mid-type
  document.querySelectorAll('[data-disc]').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.disc;
      state.discounts[key] = Math.min(100, Math.max(-100, parseFloat(input.value) || 0));
      showStep(state.currentStep, true);
    });
  });

  // Target pricing inputs — goal-seek the blended discount from a target ACV or TCV.
  // Entering a value in one field clears the other so only one is ever active.
  document.querySelectorAll('[data-target]').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.target;
      if (!state.targets) state.targets = { acv: '', tcv: '' };
      state.targets[key] = parseFloat(input.value) || '';
      if (state.targets[key]) {
        const other = key === 'acv' ? 'tcv' : 'acv';
        state.targets[other] = '';
      }
      showStep(state.currentStep, true);
    });
  });
}

function bindBoosterEvents() {
  const isConsumption  = state.pricingModel === 'consumption';
  const isAdvantageStep = state.currentStep === 13;
  const areaId         = isConsumption ? 'consumption-pricing-area' : 'tier-rec-area';
  const renderer       = isConsumption ? renderConsumptionPricing   : renderTierRecommendation;

  const th = $('b-training-hours');
  if (th) th.addEventListener('input', () => {
    state.foundation.boosters.trainingHours = parseInt(th.value) || 0;
    if (isAdvantageStep) {
      showStep(state.currentStep, true);
    } else {
      const area = $(areaId);
      if (area) area.innerHTML = renderer();
      bindBoosterEvents();
    }
    updateLiveQuote();
  });

  document.querySelectorAll('[data-support]').forEach(opt => {
    opt.addEventListener('click', () => {
      const key = opt.dataset.support;
      // Hard block: refuse any selection that would drop the effective Advantage level
      // below a required floor (e.g. Agentic: AI - Advanced requires Silver). The locked
      // option is also greyed out in the UI; this is the belt-and-braces guard.
      const req = getRequiredSupportLevel();
      if (req) {
        const targetName = key === 'none' ? getTierBaseSupport() : (SUPPORT_KEY_NAME[key] || getTierBaseSupport());
        if (SUPPORT_ORDER[targetName] < SUPPORT_ORDER[req]) return;
      }
      state.foundation.boosters.support = key === 'none' ? null : key;
      if (isAdvantageStep) {
        showStep(state.currentStep, true);
      } else {
        const area = $(areaId);
        if (area) area.innerHTML = renderer();
        bindBoosterEvents();
      }
      updateLiveQuote();
    });
  });

  // Tier-switch pills (both pricing models) — lets the user knowingly override the
  // cheapest-tier recommendation even though the booster-inflated total costs more.
  document.querySelectorAll('[data-tier-switch]').forEach(pill => {
    pill.addEventListener('click', () => {
      const key = pill.dataset.tierSwitch;
      if (key === state.foundation.selectedTier) return;
      state.foundation.tierManuallySet = true;
      upgradeToTier(key);
      updateLiveQuote();
    });
  });

  const implPkgEl = $('adv-impl-pkg');
  if (implPkgEl) implPkgEl.addEventListener('change', () => {
    state.advantageServices.implementationPackage = implPkgEl.checked;
    showStep(state.currentStep, true);
    updateLiveQuote();
  });

  const solImplPkgEl = $('adv-sol-impl-pkg');
  if (solImplPkgEl) solImplPkgEl.addEventListener('change', () => {
    state.advantageServices.solutionImplementationPackage = solImplPkgEl.checked;
    showStep(state.currentStep, true);
    updateLiveQuote();
  });

}

// ─── Quote generator ─────────────────────────────────────────────────────────
function generatePOCQuote() {
  const C        = cfg();
  const cust     = state.customer;
  const dur      = cust.pocDuration || 3;
  const rm       = getRM();
  const listFee  = C.poc_price_per_month * dur * rm;
  const disc     = cust.pocDiscount || 0;
  const netFee   = listFee * (1 - disc / 100);
  const today    = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const quoteRef = 'QT-POC-' + Date.now().toString().slice(-6);
  const country  = cust.country || '';
  const rmLabel  = rm < 1 ? ` (${country} regional rate: ${(rm * 100).toFixed(0)}% of US)` : '';

  const inclusions = [
    { title: 'See value fast',              desc: 'We configure Nuix around your specific use case from day one — so your team is working with real workflows on real data, not a generic demo.' },
    { title: 'Up and running quickly',      desc: 'No complex infrastructure project required. The POC runs in a self-contained environment so you can get started without involving IT procurement.' },
    { title: 'A clear definition of success', desc: `We agree upfront on exactly what a successful outcome looks like — so at the end of ${dur} month${dur > 1 ? 's' : ''} you have a clear, evidence-based decision to make.` },
    { title: 'Full credit on conversion',   desc: `The entire POC fee is credited against your first year contract if you proceed. You're investing in the evaluation, not paying for it twice.` }
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix POC Quote – ${cust.name || 'Customer'} – ${quoteRef}</title>
  <style>
    @page { margin: 28mm 22mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; font-size: 13px; line-height: 1.6; background: #fff; }

    .page { max-width: 800px; margin: 0 auto; padding: 40px 0; }

    /* Header */
    .q-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; border-bottom: 3px solid #0056e3; margin-bottom: 32px; }
    .q-logo { height: 36px; width: auto; display: block; }
    .q-meta { text-align: right; }
    .q-meta .ref   { font-size: 18px; font-weight: 700; color: #003080; }
    .q-meta .date  { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .q-meta .draft { display: inline-block; background: #FEF3C7; color: #92400E; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 4px; margin-top: 6px; letter-spacing: 0.5px; }

    /* Section title */
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0056e3; margin-bottom: 12px; }

    /* Customer block */
    .customer-block { margin-bottom: 32px; }
    .customer-block h2 { font-size: 22px; font-weight: 800; color: #003080; margin-bottom: 4px; }
    .customer-meta { display: flex; gap: 20px; flex-wrap: wrap; }
    .customer-meta span { font-size: 12px; color: #6b7280; background: #f3f5f8; padding: 3px 10px; border-radius: 4px; font-weight: 500; }

    /* POC info strip */
    .info-strip { background: #f3f5f8; border-radius: 10px; padding: 18px 22px; margin-bottom: 32px; display: flex; gap: 32px; flex-wrap: wrap; }
    .info-item .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; margin-bottom: 4px; }
    .info-item .value { font-size: 15px; font-weight: 700; color: #003080; }

    /* Inclusions */
    .inclusions { margin-bottom: 32px; }
    .inclusion-row { display: flex; gap: 14px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid #eee; }
    .inclusion-row:last-child { border-bottom: none; }
    .inc-dot { width: 8px; height: 8px; background: #0056e3; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
    .inc-title { font-weight: 700; font-size: 13px; color: #003080; margin-bottom: 2px; }
    .inc-desc  { font-size: 12px; color: #6b7280; line-height: 1.5; }

    /* Pricing table */
    .pricing-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .pricing-table th { background: #003080; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; text-align: left; }
    .pricing-table td { padding: 12px 16px; border-bottom: 1px solid #eee; font-size: 13px; }
    .pricing-table tr:last-child td { border-bottom: none; }
    .pricing-table .net-row td { background: #EBF0FF; font-weight: 800; font-size: 15px; color: #003080; }
    .pricing-table .deduct { color: #059669; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }

    /* Terms */
    .terms { background: #f9fafb; border-left: 3px solid #0056e3; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 32px; font-size: 12px; color: #374151; line-height: 1.7; }
    .terms strong { color: #003080; }

    /* Footer */
    .q-footer { border-top: 1px solid #e5e7eb; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
    .q-footer .confidential { font-size: 11px; color: #9ca3af; font-style: italic; }
    .q-footer .nuix-footer  { font-size: 11px; color: #0056e3; font-weight: 700; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }

    /* Print button */
    .print-bar { background: #003080; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .print-bar span { color: rgba(255,255,255,0.7); font-size: 13px; }
    .print-btn { background: #0056e3; color: #fff; border: none; padding: 9px 22px; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .print-btn:hover { background: #0040CC; }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span>Nuix POC Quote — ${quoteRef} — Preview</span>
    <button class="print-btn" onclick="window.print()">🖨 Save as PDF / Print</button>
  </div>
  <div class="page">

    <div class="q-header">
      <img class="q-logo" src="Nuix_Logo_Wikipedia.png" alt="Nuix">
      <div class="q-meta">
        <div class="ref">${quoteRef}</div>
        <div class="date">Prepared: ${today}</div>
        <div class="draft">PRELIMINARY DRAFT</div>
      </div>
    </div>

    <div class="customer-block">
      <div class="section-label">Prepared for</div>
      <h2>${cust.name || 'Customer'}</h2>
      <div class="customer-meta" style="margin-top:10px">
        ${country ? `<span>📍 ${country}</span>` : ''}
        ${cust.type ? `<span>${cust.type}</span>` : ''}
      </div>
    </div>

    <div class="info-strip">
      <div class="info-item"><div class="label">Engagement type</div><div class="value">POC / Pilot</div></div>
      <div class="info-item"><div class="label">Duration</div><div class="value">${dur} month${dur > 1 ? 's' : ''}</div></div>
      <div class="info-item"><div class="label">Product</div><div class="value">Nuix Neo</div></div>
      <div class="info-item"><div class="label">Valid for</div><div class="value">30 days</div></div>
    </div>

    <div class="inclusions">
      <div class="section-label">What's included</div>
      ${inclusions.map(i => `
        <div class="inclusion-row">
          <div class="inc-dot"></div>
          <div><div class="inc-title">${i.title}</div><div class="inc-desc">${i.desc}</div></div>
        </div>`).join('')}
    </div>

    <div class="section-label">Pricing</div>
    <table class="pricing-table">
      <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        <tr><td>Nuix Neo POC / Pilot — ${dur} month${dur > 1 ? 's' : ''}${rmLabel}</td><td class="amount">${fmt(listFee)}</td></tr>
        ${disc > 0 ? `<tr><td class="deduct">Discount applied (${disc.toFixed(1)}%)</td><td class="amount deduct">−${fmt(listFee * disc / 100)}</td></tr>` : ''}
        <tr class="net-row"><td>Total POC fee</td><td class="amount">${fmt(netFee)}</td></tr>
      </tbody>
    </table>

    <div class="terms">
      <strong>Conversion credit:</strong> The full POC fee of <strong>${fmt(netFee)}</strong> will be credited against the first year of a standard Nuix Neo contract if the customer converts within 90 days of POC completion.<br><br>
      <strong>Payment terms:</strong> 100% payable upon execution of this agreement.<br><br>
      <strong>Validity:</strong> This quote is valid for 30 days from the date of issue. Pricing is subject to final commercial agreement.
    </div>

    <div class="q-footer">
      <div class="confidential">Confidential — prepared for ${cust.name || 'the named customer'} only</div>
      <div class="nuix-footer">nuix.com</div>
    </div>

  </div>
  <script>
    // Auto-open print dialog after a short delay to let page render
    // Uncomment if desired: setTimeout(() => window.print(), 800);
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function generateFullQuote() {
  const C       = cfg();
  const cust    = state.customer;
  const layers  = calcPrices();
  const rm      = getRM();
  const today   = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const quoteRef = 'QT-' + Date.now().toString().slice(-6);
  const country  = cust.country || '';
  const years      = getContractYears();
  const fqPeriods  = getContractPeriods();
  const yearCount  = fqPeriods.length;
  const yearRange  = fqPeriods; // alias so template references below work
  const autoD    = getAutoDisc();

  const totRegional = Object.values(layers).reduce((s, l) => s + l.regional, 0);
  const totAutoD    = Object.values(layers).reduce((s, l) => s + l.regional * (1 - l.autoDisc), 0);
  const totSalesD   = Object.values(layers).reduce((s, l) => s + l.salesDeduct, 0);
  const totNet      = Object.values(layers).reduce((s, l) => s + l.net, 0);
  const upliftPctFQ = parseFloat(cust.annualUplift) || 0;
  // The Implementation Packages are one-time Year 1 charges baked into the consulting layer's
  // net — strip them out before projecting later periods so they aren't repeated every year.
  const year1OnlyBaseFQ = (state.advantageServices?.implementationPackage ? C.consulting.cslt300_price : 0)
    + (state.advantageServices?.solutionImplementationPackage ? C.consulting.cslt301_price : 0);
  const year1OnlyNetFQ = year1OnlyBaseFQ * (1 - layers.consulting.salesDisc);
  const totRecurringFQ = totNet - year1OnlyNetFQ;
  const netForPeriodFQ = pi => pi === 0 ? totNet : totRecurringFQ;
  const totContract = fqPeriods.reduce((sum, p, pi) => sum + getPeriodPrice(netForPeriodFQ(pi), p), 0);

  // Prices are US list. Government/multi-year/regional no longer adjust the price
  // (they set the rep's discount ceiling), so the only price note here is the
  // real year-on-year annual uplift.
  const autoNotes = [];
  if (upliftPctFQ > 0 && yearCount > 1) autoNotes.push(`${upliftPctFQ}% annual uplift from Year 2`);

  const tier     = state.foundation.selectedTier;
  const tierName = C.foundation_tiers[tier]?.name || '';

  const secondaries = state.useCases.secondary;

  const layerOrder = ['foundation', 'aiSuite', 'useCases', 'enhanced', 'consulting', 'nonProd'];
  const colCount   = 1 + yearCount;
  const amtSpan    = yearCount > 1 ? ` colspan="${yearCount}"` : '';
  const layerRows  = layerOrder.map(key => {
    const l = layers[key];
    // Solutions Library is bundled at $0 with Enrich/Semantic Search/Transcription —
    // still show it explicitly rather than silently dropping a $0 layer.
    const bundledLibraryIncluded = key === 'useCases' && !state.useCases.foundationOnly;
    if (l.baseUSD === 0 && key !== 'foundation' && !bundledLibraryIncluded) return '';
    const disc     = (state.discounts[key] || 0);
    const hasSalesD = l.salesDisc > 0;
    const layerNetForPeriod = pi => (key === 'consulting' && pi > 0) ? (l.net - year1OnlyNetFQ) : l.net;
    const netCells = yearCount > 1
      ? fqPeriods.map((p, pi) => `<td class="amount" style="font-weight:700">${fmt(getPeriodPrice(layerNetForPeriod(pi), p))}</td>`).join('')
      : `<td class="amount" style="font-weight:700">${fmt(getPeriodPrice(layerNetForPeriod(0), fqPeriods[0]))}</td>`;
    return `
      <tr><td colspan="${colCount}" style="background:#f3f5f8;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:#003080;padding:10px 16px">${l.label}</td></tr>
      <tr><td style="padding-left:24px">List price${yearCount > 1 ? ' (per year)' : ''}</td><td class="amount"${amtSpan}>${fmt(l.regional)}</td></tr>
      ${hasSalesD ? `<tr class="deduct-row"><td style="padding-left:24px">Discount (${disc.toFixed(1)}%)${yearCount > 1 ? ' (per year)' : ''}</td><td class="amount deduct"${amtSpan}>−${fmt(-l.salesDeduct)}</td></tr>` : ''}
      <tr class="subtotal-row"><td style="padding-left:24px;font-weight:700">Net price${yearCount > 1 ? ' / year' : ''}</td>${netCells}</tr>`;
  }).join('');

  const aiSelected = ['enrich','semantic','transcription','agenticBYOAI','byoAIAdvanced','byoAIGraph'].filter(k => state.aiSuite[k]).map(k => {
    const ckMap = { enrich: 'enrich', semantic: 'semantic', transcription: 'transcription', agenticBYOAI: 'agentic_byo_ai', byoAIAdvanced: 'byo_ai_advanced', byoAIGraph: 'byo_ai_graph', agenticAdvanced: 'agentic_advanced' };
    return C.ai_suite_modules[ckMap[k]]?.name;
  }).filter(Boolean);

  const ecSelected = [];
  const ec = state.enhancedCap;
  if (ec.discover_saas.selected)     ecSelected.push(`Nuix Discover SaaS (${ec.discover_saas.active_gb} GB active, ${ec.discover_saas.archive_gb} GB archive)`);
  if (ec.discover_onprem.selected)   ecSelected.push(`Nuix Discover On-Prem (${ec.discover_onprem.instances} instance${ec.discover_onprem.instances>1?'s':''}, ${ec.discover_onprem.users} users)`);
  if (ec.adaptive_security.selected) ecSelected.push(`Adaptive Security (${ec.adaptive_security.endpoints} endpoints, ${ec.adaptive_security.users} users, ${ec.adaptive_security.servers} servers)`);
  if (state.visualisation.selected)  { const vbSel = getVisualisationBundlePricing(state.visualisation); ecSelected.push(`Knowledge Graph — ${vbSel.bundle.name}${vbSel.boosterUserQty > 0 || vbSel.boosterMemQty > 0 ? ` (+ ${vbSel.boosterUserQty} × ${vbSel.boosterUserTier.name}, ${vbSel.boosterMemQty} × ${vbSel.boosterMemTier.name} boosters)` : ''}`); }
  if (ec.ecc && ec.ecc.selected) ecSelected.push(`${C.enhanced_capabilities.nuix_modules.ecc?.name} (${ec.ecc.endpoints} endpoint${ec.ecc.endpoints>1?'s':''})`);
  if (ec.legal_hold?.selected)       ecSelected.push(`Nuix Automate Legal Hold (${ec.legal_hold.custodians} custodian${ec.legal_hold.custodians>1?'s':''})`);
  if (ec.automated_relativity?.selected) ecSelected.push('Automated Relativity Export and Orchestration');
  if (ec.abbyy?.selected) {
    const abbyyPkg = C.enhanced_capabilities.third_party.abbyy.packages.find(p => p.key === (ec.abbyy.pkg || 'abbfr002'));
    ecSelected.push(`ABBYY OCR (${ec.abbyy.qty || 1} × ${abbyyPkg?.name || ec.abbyy.pkg})`);
  }
  const q1Sel = Object.entries(ec.q1_dynamics?.connectors||{}).filter(([,v])=>v).map(([k])=>C.enhanced_capabilities.third_party.q1_dynamics.connectors.find(c=>c.key===k)?.name).filter(Boolean);
  if (q1Sel.length)               ecSelected.push(`Q1 Dynamics (${q1Sel.join(', ')})`);
  if (ec.t3k?.selected) {
    const tMode = ec.t3k.pricing_mode || 'tb';
    const tp3 = C.enhanced_capabilities.third_party.t3k;
    let tDetail = tMode === 'worker' ? `${ec.t3k.workers} workers`
      : tMode === 'tb'    ? (tp3.tb_tiers.find(t=>t.key===(ec.t3k.tb_tier||'tb10'))?.name || '')
      : (tp3.user_tiers.find(t=>t.key===(ec.t3k.user_tier||'ur10'))?.name || '');
    ecSelected.push(`T3K (${ec.t3k.instances} connector${ec.t3k.instances>1?'s':''}, ${tDetail})`);
  }
  if (ec.veritone?.selected) {
    const vtTier = C.enhanced_capabilities.third_party.veritone.transcription_tiers.find(t=>t.key===(ec.veritone.transcription_tier||'sml'));
    const langs = (ec.veritone.first_langs||0) + (ec.veritone.additional_langs||0);
    ecSelected.push(`Veritone (${ec.veritone.instances} connector, ${vtTier?.name||''}, ${langs} language${langs!==1?'s':''})`);
  }

  const scopeItems = [
    tierName ? `<li><strong>Foundation:</strong> ${tierName}` + (state.foundation.boosters.workers > 0 || state.foundation.boosters.volume > 0 || state.foundation.boosters.users > 0 ? ' + boosters' : '') + `</li>` : '',
    aiSelected.length ? `<li><strong>AI Suite:</strong> ${aiSelected.join(', ')}</li>` : '',
    !state.useCases.foundationOnly ? `<li><strong>Solutions Library:</strong> included at no charge (bundled with Enrich/Semantic Search/Transcription)</li>` : '',
    ecSelected.length ? `<li><strong>Enhanced capabilities:</strong> ${ecSelected.join(', ')}</li>` : '',
    nonProdSkuRows().length ? `<li><strong>Test Environments:</strong> ${nonProdSkuRows().map(r => r.name).join(', ')}</li>` : ''
  ].filter(Boolean).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix Quote – ${cust.name || 'Customer'} – ${quoteRef}</title>
  <style>
    @page { margin: 28mm 22mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; font-size: 13px; line-height: 1.6; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 0; }

    .q-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; border-bottom: 3px solid #0056e3; margin-bottom: 32px; }
    .q-logo { height: 36px; width: auto; display: block; }
    .q-meta { text-align: right; }
    .q-meta .ref  { font-size: 18px; font-weight: 700; color: #003080; }
    .q-meta .date { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .q-meta .draft { display: inline-block; background: #FEF3C7; color: #92400E; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 4px; margin-top: 6px; letter-spacing: 0.5px; }

    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0056e3; margin-bottom: 12px; }

    .customer-block { margin-bottom: 28px; }
    .customer-block h2 { font-size: 22px; font-weight: 800; color: #003080; margin-bottom: 4px; }
    .customer-meta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .customer-meta span { font-size: 12px; color: #6b7280; background: #f3f5f8; padding: 3px 10px; border-radius: 4px; font-weight: 500; }

    .info-strip { background: #f3f5f8; border-radius: 10px; padding: 18px 22px; margin-bottom: 28px; display: flex; gap: 32px; flex-wrap: wrap; }
    .info-item .ilabel { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; margin-bottom: 4px; }
    .info-item .ivalue { font-size: 15px; font-weight: 700; color: #003080; }

    .scope-block { margin-bottom: 28px; }
    .scope-block ul { list-style: none; padding: 0; }
    .scope-block li { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; color: #374151; }
    .scope-block li:last-child { border-bottom: none; }

    .pricing-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px; }
    .pricing-table th { background: #003080; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; text-align: left; }
    .pricing-table td { padding: 9px 16px; border-bottom: 1px solid #eee; }
    .pricing-table .deduct-row td { color: #059669; }
    .pricing-table .subtotal-row td { background: #EBF0FF; }
    .pricing-table .grand-row td { background: #003080; color: #fff; font-weight: 800; font-size: 16px; padding: 14px 16px; }
    .pricing-table .contract-row td { background: #0056e3; color: #fff; font-weight: 800; font-size: 14px; padding: 12px 16px; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }

    .auto-disc-note { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #166534; }

    .terms { background: #f9fafb; border-left: 3px solid #0056e3; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px; font-size: 12px; color: #374151; line-height: 1.8; }
    .terms strong { color: #003080; }

    .q-footer { border-top: 1px solid #e5e7eb; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
    .q-footer .confidential { font-size: 11px; color: #9ca3af; font-style: italic; }
    .q-footer .nuix-footer  { font-size: 11px; color: #0056e3; font-weight: 700; }

    .print-bar { background: #003080; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .print-bar span { color: rgba(255,255,255,0.7); font-size: 13px; }
    .print-btn { background: #0056e3; color: #fff; border: none; padding: 9px 22px; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .print-btn:hover { background: #0040CC; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span>Nuix Quote — ${quoteRef} — Preview</span>
    <button class="print-btn" onclick="window.print()">🖨 Save as PDF / Print</button>
  </div>
  <div class="page">

    <div class="q-header">
      <img class="q-logo" src="Nuix_Logo_Wikipedia.png" alt="Nuix">
      <div class="q-meta">
        <div class="ref">${quoteRef}</div>
        <div class="date">Prepared: ${today}</div>
        <div class="draft">PRELIMINARY DRAFT</div>
      </div>
    </div>

    <div class="customer-block">
      <div class="section-label">Prepared for</div>
      <h2>${cust.name || 'Customer'}</h2>
      <div class="customer-meta">
        ${country ? `<span>📍 ${country}</span>` : ''}
        ${cust.type ? `<span>${cust.type}</span>` : ''}
      </div>
    </div>

    <div class="info-strip">
      <div class="info-item"><div class="ilabel">Product</div><div class="ivalue">Nuix Neo</div></div>
      <div class="info-item"><div class="ilabel">Contract term</div><div class="ivalue">${cust.contractMonths || 12} months</div></div>
      ${cust.contractStartDate ? `<div class="info-item"><div class="ilabel">Start date</div><div class="ivalue">${cust.contractStartDate}</div></div>` : ''}
      ${upliftPctFQ > 0 && yearCount > 1 ? `<div class="info-item"><div class="ilabel">Annual uplift</div><div class="ivalue">${upliftPctFQ}%</div></div>` : ''}
      <div class="info-item"><div class="ilabel">Foundation tier</div><div class="ivalue">${tierName || '—'}</div></div>
      <div class="info-item"><div class="ilabel">Valid for</div><div class="ivalue">30 days</div></div>
    </div>

    ${scopeItems ? `
    <div class="scope-block">
      <div class="section-label">Scope of solution</div>
      <ul>${scopeItems}</ul>
    </div>` : ''}

    ${autoNotes.length ? `<div class="auto-disc-note">Price adjustments applied: ${autoNotes.join(' · ')}</div>` : ''}

    <div class="section-label">Pricing breakdown</div>
    <table class="pricing-table" style="overflow-x:auto">
      <thead><tr><th>Item</th>${fqPeriods.map(p => {
        const cumPct = upliftPctFQ > 0 && p.upliftExp > 0 ? ((Math.pow(1 + upliftPctFQ / 100, p.upliftExp) - 1) * 100).toFixed(1) : null;
        const fracNote = p.fraction < 1 ? `<br><span style="font-size:9px;font-weight:500;opacity:0.75">${p.months} mo pro-rated</span>` : (cumPct ? `<br><span style="font-size:9px;font-weight:500;opacity:0.75">+${cumPct}% on yr 1</span>` : '');
        return `<th class="amount">${p.label}${fracNote}`;
      }).join('')}</tr></thead>
      <tbody>
        ${layerRows}
        ${upliftPctFQ > 0 && fqPeriods.filter(p => p.fraction === 1).length > 1 ? `
        <tr><td colspan="${1 + yearCount}" style="background:#f0fdf4;padding:10px 16px;font-size:12px;color:#166534;border-top:1px solid #bbf7d0">
          <strong>Annual uplift of ${upliftPctFQ}% applied to full-year periods.</strong> Each full year's price = prior full year × ${(1 + upliftPctFQ / 100).toFixed(4)}.
          Period increases: ${fqPeriods.filter((p, i) => i > 0 && p.fraction === 1).map(p => `${p.label}: +${fmt(getPeriodPrice(totRecurringFQ, p) - getPeriodPrice(totRecurringFQ, fqPeriods.find(q => q.upliftExp === p.upliftExp - 1) || fqPeriods[0]))}`).join(' · ')}.
        </td></tr>` : ''}
        <tr class="grand-row"><td>Period subtotal</td>${fqPeriods.map((p, pi) => `<td class="amount">${fmt(getPeriodPrice(netForPeriodFQ(pi), p))}${p.fraction < 1 ? '' : ' /yr'}</td>`).join('')}</tr>
        ${yearCount > 1 ? `<tr class="contract-row"><td>Total contract value (${cust.contractMonths || 12} months${upliftPctFQ > 0 ? ` · ${upliftPctFQ}% annual uplift` : ''})</td><td class="amount" colspan="${yearCount}">${fmt(totContract)}</td></tr>` : ''}
      </tbody>
    </table>

    <div class="terms">
      <strong>Pricing basis:</strong> All amounts are US list price, shown in the selected currency at fixed exchange rates. The same list price applies in every region.<br><br>
      <strong>Payment terms:</strong> Annual in advance. Multi-year contracts invoiced annually unless otherwise agreed.<br><br>
      <strong>Validity:</strong> This quote is valid for 30 days from the date of issue and is subject to final commercial agreement and standard Nuix terms and conditions.
    </div>

    <div class="q-footer">
      <div class="confidential">Confidential — prepared for ${cust.name || 'the named customer'} only</div>
      <div class="nuix-footer">nuix.com</div>
    </div>

  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── Value & ROI step ────────────────────────────────────────────────────────
function renderValueWin() {
  const vw = state.valueWin;

  // Determine suggested levers from selected use case
  const allUCs = [state.customer.primaryUseCase].filter(Boolean);
  const suggested = new Set();
  allUCs.forEach(uc => (VALUE_LEVERS_BY_USE_CASE[uc] || []).forEach(k => suggested.add(k)));
  if (suggested.size === 0) Object.keys(VALUE_LEVERS).forEach(k => { if (!VALUE_LEVERS[k].subtract) suggested.add(k); });

  // Default all levers to off on first visit
  if (Object.keys(vw.activeLevers).length === 0) {
    Object.keys(VALUE_LEVERS).forEach(k => { vw.activeLevers[k] = false; });
  }
  // Tier-based volume defaults — midpoint of the tier's included volume
  const tierCfg = cfg().foundation_tiers[state.foundation.selectedTier];
  const tierGB  = tierCfg?.volume_tb ? Math.round(tierCfg.volume_tb / 2) * 1000 : 15000;
  // Reset if tier has changed since last render, or on first visit
  if (vw.inputs['rev_gb']  == null || vw._lastTier !== state.foundation.selectedTier) vw.inputs['rev_gb']  = tierGB;
  if (vw.inputs['stor_gb'] == null || vw._lastTier !== state.foundation.selectedTier) vw.inputs['stor_gb'] = tierGB;
  vw._lastTier = state.foundation.selectedTier;

  // Country-localised review cost per GB — reset when country changes
  const rm = getRM();
  if (vw.inputs['rev_cost_gb'] == null || vw._lastCountry !== state.customer.country) {
    vw.inputs['rev_cost_gb'] = Math.round(1000 * rm);
  }
  vw._lastCountry = state.customer.country;

  // Generic defaults (skips already-set values)
  Object.values(VALUE_LEVERS).forEach(lev => {
    lev.inputs.forEach(inp => {
      if (vw.inputs[inp.id] == null) vw.inputs[inp.id] = inp.default;
    });
  });

  const custName = state.customer.name || 'Customer';

  // Group all levers by category
  const categories = {};
  Object.entries(VALUE_LEVERS).forEach(([key, lev]) => {
    if (!categories[lev.category]) categories[lev.category] = [];
    categories[lev.category].push({ key, ...lev });
  });

  // Category icons
  const catIcon = { 'Risk & Liability Reduction': '🛡️', 'High-Stakes Insights': '🎯', 'Productivity Improvement': '⚡', 'Costs & Investment': '🏗️' };

  const leversHtml = Object.entries(categories).map(([cat, levers]) => `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:18px">${catIcon[cat] || ''}</span>
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#6B7280">${cat}</span>
      </div>
      ${levers.map(lev => {
        const active = !!vw.activeLevers[lev.key];
        const val = active ? lev.calc(vw.inputs) : 0;
        const isCost = !!lev.subtract;
        return `
        <div class="vw-lever-card${active ? (isCost ? ' vw-active-cost' : ' vw-active') : ''}" data-lever="${lev.key}">
          <div class="vw-lever-header" onclick="toggleLever('${lev.key}')">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="vw-toggle${active ? (isCost ? ' on-cost' : ' on') : ''}"></div>
              <span class="vw-lever-title">${lev.label}</span>
              ${isCost ? `<span style="font-size:11px;color:#EF4444;font-weight:600;background:#FEF2F2;padding:2px 7px;border-radius:4px">Cost</span>` : ''}
              ${lev.hint ? `<span style="font-size:11px;color:#9CA3AF;font-weight:500">${lev.hint}</span>` : ''}
              ${lev.prompts ? `<span class="vw-info-wrap" onclick="event.stopPropagation()"><span class="vw-info-icon">ℹ</span><span class="vw-tooltip">${lev.prompts.map(p => `<span class="vw-tooltip-q">· ${p}</span>`).join('')}</span></span>` : ''}
            </div>
            <div class="vw-lever-value${active ? (isCost ? ' cost' : '') : ' muted'}" id="vw-val-${lev.key}">${active ? (isCost ? '−' : '') + fmtWin(val) : '—'}</div>
          </div>
          ${active ? `
          <div class="vw-inputs">
            ${lev.inputs.map(inp => `
            <div class="vw-input-row">
              <label class="vw-input-label">${inp.label}</label>
              <div class="vw-input-wrap">
                ${inp.type === 'percent' ? `
                  <div style="display:flex;align-items:center;gap:12px">
                    <input type="range" class="vw-slider" id="vw-${inp.id}" min="${inp.min || 0}" max="${inp.max || 100}" step="1" value="${vw.inputs[inp.id] ?? inp.default}" oninput="updateWinInput('${inp.id}',this.value)">
                    <span class="vw-pct-display" id="vw-pct-${inp.id}">${vw.inputs[inp.id] ?? inp.default}%</span>
                  </div>
                ` : `
                  <div style="display:flex;align-items:center;gap:4px">
                    ${inp.type === 'currency' ? '<span style="color:#6B7280;font-size:13px">$</span>' : ''}
                    <input type="number" class="vw-num-input" id="vw-${inp.id}" value="${vw.inputs[inp.id] ?? inp.default}" oninput="updateWinInput('${inp.id}',this.value)">
                  </div>
                `}
              </div>
            </div>`).join('')}
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>`).join('');

  const selectedUC = vw.primaryUseCase || '';
  const ucOptions = [
    { key: 'Investigations', icon: '🔍', levers: 'Higher Win/Success Rates, Processing Labour Saved, Reviewer Time Saved' },
    { key: 'Legal',          icon: '⚖️', levers: 'Reviewer Time Saved, Processing Labour Saved, Storage Cost Reduction, Current Provider Cost Eliminated' },
    { key: 'Data Privacy',   icon: '🛡️', levers: 'Fines Avoided, Insurance Premium Reduction, Litigation Cost Avoided' }
  ];

  return `
  <div class="step-header">
    <div class="step-tag">Win</div>
    <h2>Customer Value</h2>
    <p>Estimate the business value Nuix delivers for <strong>${custName}</strong>. Toggle levers, adjust assumptions, and share the ROI story.</p>
  </div>

  <style>
    .vw-lever-card { background:#fff; border:1.5px solid #DDE1E8; border-radius:12px; margin-bottom:10px; overflow:visible; transition:border-color 0.15s; }
    .vw-lever-card.vw-active { border-color:#0056e3; }
    .vw-lever-card.vw-active-cost { border-color:#EF4444; }
    .vw-toggle.on-cost { background:#EF4444; }
    .vw-lever-value.cost { color:#EF4444; }
    .vw-lever-header { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; cursor:pointer; }
    .vw-lever-header:hover { background:#F9FAFB; }
    .vw-lever-title { font-size:14px; font-weight:700; color:#111; }
    .vw-lever-value { font-size:16px; font-weight:800; color:#0056e3; white-space:nowrap; }
    .vw-lever-value.muted { color:#9CA3AF; }
    .vw-toggle { width:36px; height:20px; border-radius:10px; background:#DDE1E8; flex-shrink:0; position:relative; transition:background 0.15s; }
    .vw-toggle.on { background:#0056e3; }
    .vw-toggle::after { content:''; position:absolute; top:3px; left:3px; width:14px; height:14px; border-radius:50%; background:#fff; transition:transform 0.15s; }
    .vw-toggle.on::after { transform:translateX(16px); }
    .vw-inputs { padding:0 18px 16px; border-top:1px solid #F3F5F8; display:flex; flex-direction:column; gap:12px; padding-top:14px; }
    .vw-input-row { display:flex; align-items:center; justify-content:space-between; gap:16px; }
    .vw-input-label { font-size:13px; color:#374151; flex:1; }
    .vw-input-wrap { flex-shrink:0; }
    .vw-num-input { width:130px; padding:7px 10px; border:1.5px solid #DDE1E8; border-radius:7px; font-size:14px; font-weight:600; color:#111; text-align:right; outline:none; transition:border-color 0.15s; }
    .vw-num-input:focus { border-color:#0056e3; }
    .vw-slider { width:160px; accent-color:#0056e3; cursor:pointer; }
    .vw-pct-display { font-size:14px; font-weight:700; color:#0056e3; width:42px; text-align:right; }
    .vw-roi-box { background:#003080; border-radius:14px; padding:28px 32px; color:#fff; margin-top:8px; }
    .vw-roi-headline { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px; opacity:0.7; margin-bottom:20px; }
    .vw-roi-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:24px; }
    .vw-roi-card { background:rgba(255,255,255,0.1); border-radius:10px; padding:16px 20px; }
    .vw-roi-card-label { font-size:11px; font-weight:600; opacity:0.7; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
    .vw-roi-card-value { font-size:22px; font-weight:800; }
    .vw-roi-card-value.accent { color:#7DD3FC; }
    .vw-roi-card-value.green { color:#6EE7B7; }
    .vw-bar-wrap { background:rgba(255,255,255,0.12); border-radius:8px; height:12px; overflow:hidden; margin-top:16px; }
    .vw-bar { background:#7DD3FC; height:100%; border-radius:8px; transition:width 0.4s; }
    .vw-bar-labels { display:flex; justify-content:space-between; font-size:11px; opacity:0.65; margin-top:6px; }
    .vw-zero-state { text-align:center; padding:32px; color:#9CA3AF; font-size:13px; }
    .vw-uc-section { background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:20px 22px; margin-bottom:24px; }
    .vw-uc-heading { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#6B7280; margin-bottom:4px; }
    .vw-uc-subheading { font-size:13px; color:#6B7280; margin-bottom:16px; }
    .vw-uc-options { display:flex; gap:12px; }
    .vw-uc-btn { flex:1; border:1.5px solid #DDE1E8; border-radius:10px; padding:14px 16px; background:#fff; cursor:pointer; text-align:left; transition:border-color 0.15s, background 0.15s; }
    .vw-uc-btn:hover { border-color:#0056e3; background:#EFF6FF; }
    .vw-uc-btn.selected { border-color:#0056e3; background:#EFF6FF; }
    .vw-uc-btn-icon { font-size:20px; margin-bottom:8px; }
    .vw-uc-btn-name { font-size:14px; font-weight:700; color:#111; margin-bottom:6px; }
    .vw-uc-btn-levers { font-size:11px; color:#6B7280; line-height:1.5; }
    .vw-uc-btn.selected .vw-uc-btn-name { color:#0056e3; }
  </style>

  <div class="vw-uc-section">
    <div class="vw-uc-heading">Optional: Primary Use Case</div>
    <div class="vw-uc-subheading">Select for suggested customer value levers</div>
    <div class="vw-uc-options">
      ${ucOptions.map(uc => `
        <button class="vw-uc-btn${selectedUC === uc.key ? ' selected' : ''}" onclick="selectValueUseCase('${uc.key}')">
          <div class="vw-uc-btn-icon">${uc.icon}</div>
          <div class="vw-uc-btn-name">${uc.key}</div>
          <div class="vw-uc-btn-levers">${uc.levers}</div>
        </button>
      `).join('')}
    </div>
  </div>

  <div>
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin-bottom:16px">Value Levers — select which to include</div>
    ${leversHtml}
  </div>`;
}

function fmtWin(n) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  const s = cur.symbol;
  if (!n || isNaN(n)) return s + '0';
  const v = n * cur.rate;
  if (v >= 1000000) return s + (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000)    return s + Math.round(v / 1000) + 'K';
  return s + Math.round(v).toLocaleString();
}

function selectValueUseCase(uc) {
  const vw = state.valueWin;
  if (vw.primaryUseCase === uc) {
    vw.primaryUseCase = '';
    Object.keys(VALUE_LEVERS).forEach(k => { vw.activeLevers[k] = false; });
  } else {
    vw.primaryUseCase = uc;
    const suggested = new Set(VALUE_LEVERS_BY_USE_CASE[uc] || []);
    Object.keys(VALUE_LEVERS).forEach(k => { vw.activeLevers[k] = suggested.has(k); });
  }
  showStep(6, true);
}

function toggleLever(key) {
  state.valueWin.activeLevers[key] = !state.valueWin.activeLevers[key];
  showStep(6, true);
}

function updateWinInput(id, val) {
  state.valueWin.inputs[id] = parseFloat(val) || 0;
  // Update all lever values and ROI summary without full re-render
  Object.entries(VALUE_LEVERS).forEach(([key, lev]) => {
    if (!state.valueWin.activeLevers[key]) return;
    const el = $(`vw-val-${key}`);
    if (el) el.textContent = (lev.subtract ? '−' : '') + fmtWin(lev.calc(state.valueWin.inputs));
  });
  // Update % display if this is a slider
  const pctEl = $(`vw-pct-${id}`);
  if (pctEl) pctEl.textContent = Math.round(val) + '%';
  // Refresh the RHS panel to reflect updated value
  updateLiveQuote();
}

function renderROISummary() {
  const vw   = state.valueWin;
  const cust = state.customer;
  const activeCount = Object.values(vw.activeLevers).filter(Boolean).length;
  const years = Math.max(getContractYears(), 1/12);

  let totalAnnualValue = 0;
  Object.entries(VALUE_LEVERS).forEach(([key, lev]) => {
    if (vw.activeLevers[key]) totalAnnualValue += lev.subtract ? -lev.calc(vw.inputs) : lev.calc(vw.inputs);
  });
  const valueOverTerm = totalAnnualValue * years;

  const leverRows = Object.entries(VALUE_LEVERS)
    .filter(([k]) => vw.activeLevers[k])
    .map(([, lev]) => {
      const v = lev.calc(vw.inputs);
      const costStyle = lev.subtract ? 'color:#EF4444' : '';
      return `<div class="qp-layer">
        <div class="qp-layer-head">
          <span class="qp-layer-name" style="${costStyle}">${lev.label}</span>
          <span class="qp-layer-net" style="${costStyle}">${lev.subtract ? '−' : ''}${fmtWin(v)}/yr</span>
        </div>
      </div>`;
    }).join('');

  const emptyState = activeCount === 0
    ? `<div class="qp-empty">Toggle value levers on the left to build the customer value case.</div>`
    : '';

  return `<div class="qp-inner">
    <div class="qp-section-label">Customer Value</div>
    <div class="qp-customer">${cust.name || 'Your customer'}</div>

    <div class="qp-hero">
      <div class="qp-hero-label">Annual Value</div>
      ${activeCount === 0
        ? `<div class="qp-hero-zero">—</div><div class="qp-hero-sub">Toggle value levers to see estimate</div>`
        : `<div class="qp-hero-price">${fmtWin(totalAnnualValue)}</div>
           <div class="qp-hero-sub">per year</div>`
      }
      ${activeCount > 0 && years > 1/12 ? `
        <div class="qp-hero-divider"></div>
        <div class="qp-hero-total">
          <span>Value over ${cust.contractMonths || 12}-month term</span>
          <span>${fmtWin(valueOverTerm)}</span>
        </div>` : ''}
    </div>

    ${activeCount > 0
      ? `<div class="qp-breakdown">${leverRows}</div>`
      : emptyState
    }
  </div>`;
}

function renderROIPanel() {
  const vw    = state.valueWin;
  const layers = calcPrices();
  const cust  = state.customer;
  const years = Math.max(getContractYears(), 1/12);

  let totalAnnualValue = 0;
  Object.entries(VALUE_LEVERS).forEach(([key, lev]) => {
    if (vw.activeLevers[key]) totalAnnualValue += lev.subtract ? -lev.calc(vw.inputs) : lev.calc(vw.inputs);
  });

  const totalNet      = Object.values(layers).reduce((s, l) => s + l.net, 0);
  const roiPeriods    = getContractPeriods();
  const contractTotal = roiPeriods.reduce((sum, p) => sum + getPeriodPrice(totalNet, p), 0);
  const valueOverTerm = totalAnnualValue * years;
  const netBenefit    = valueOverTerm - contractTotal;
  const valueMult     = contractTotal > 0 ? valueOverTerm / contractTotal : 0;
  const roi           = contractTotal > 0 ? netBenefit / contractTotal * 100 : 0;
  const paybackMonths = totalAnnualValue > totalNet && totalNet > 0 ? totalNet / totalAnnualValue * 12 : null;

  const hasValue = totalAnnualValue > 0;
  const hasCost  = totalNet > 0;

  if (!hasValue && !hasCost) {
    return `<div class="qp-inner"><div class="qp-section-label">ROI Summary</div><div class="qp-empty">Complete pricing and the Customer Value step to see ROI here.</div></div>`;
  }

  const row = (label, val, accent) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e8edf5;font-size:12px">
      <span style="color:#64748b">${label}</span>
      <strong style="${accent ? 'color:#0056e3' : 'color:#0a0f2e'}">${val}</strong>
    </div>`;

  return `<div class="qp-inner">
    <div class="qp-section-label">ROI Summary</div>
    <div class="qp-customer">${cust.name || 'Customer'}</div>

    ${hasValue ? `
    <div style="background:#f0fdf4;border-radius:10px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#16a34a;margin-bottom:4px">Annual Value</div>
      <div style="font-size:22px;font-weight:800;color:#15803d">${fmtWin(totalAnnualValue)}</div>
      <div style="font-size:11px;color:#16a34a;margin-top:2px">${fmtWin(valueOverTerm)} over ${Math.floor(years)} yr${years > 1 ? 's' : ''}</div>
    </div>` : ''}

    ${hasCost ? `
    <div style="background:#0a1f6e;border-radius:10px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px">Annual Investment</div>
      <div style="font-size:22px;font-weight:800;color:#fff">${fmt(totalNet)}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">${fmt(contractTotal)} over ${Math.floor(years)} yr${years > 1 ? 's' : ''}</div>
    </div>` : ''}

    ${hasValue && hasCost ? `
    <div style="background:#f0f4ff;border-radius:10px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:4px">Value Multiple</div>
      <div style="font-size:26px;font-weight:800;color:#0056e3">${valueMult.toFixed(1)}&times;</div>
    </div>
    ${row(`Net benefit over ${Math.floor(years)} yr${years > 1 ? 's' : ''}`, fmtWin(netBenefit), true)}
    ${paybackMonths != null ? row('Payback period', paybackMonths < 12 ? Math.round(paybackMonths) + ' months' : (paybackMonths / 12).toFixed(1) + ' yrs') : ''}
    ` : ''}
  </div>`;
}


// Opens a generated quote document in a new tab. If the browser blocks the popup (or it
// can't open one, e.g. an embedded preview), show it in a full-screen overlay instead so
// the quote can still be viewed, printed or saved as PDF from there.
function openQuoteDocument(html) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    return;
  }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#fff;display:flex;flex-direction:column';
  overlay.innerHTML = '<div style="padding:8px 14px;background:#003080;display:flex;justify-content:flex-end"><button style="background:#fff;color:#003080;border:none;border-radius:6px;padding:6px 14px;font-weight:700;cursor:pointer">Close ✕</button></div><iframe style="flex:1;border:0;width:100%"></iframe>';
  overlay.querySelector('iframe').srcdoc = html;
  overlay.querySelector('button').onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

function generateSKUOrder() {
  const C    = cfg();
  const cust = state.customer;
  const showPartnerMargins = !isPartnerMarginsSkipped();
  const today    = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const quoteRef = 'SKU-' + Date.now().toString().slice(-6);
  const isPOC      = !!cust.isPOC;
  const skuPeriods = getContractPeriodsWithDates();
  const years      = skuPeriods.length;
  const yearRange  = skuPeriods; // alias
  const upliftPct  = getAnnualUplift();

  const layers  = calcPrices();
  const rm      = getRM();
  const govDisc = isGov() ? C.discount_rules.government_max : 0;
  const myd     = getMultiYearDisc();

  const cur    = CURRENCIES[state.currency] || CURRENCIES.USD;
  const fmt    = n => {
    if (n === 0 || !n) return '—';
    const converted = Math.round((n * cur.rate) / 100) * 100;
    return cur.symbol + converted.toLocaleString('en-US');
  };
  const fmtpct = n => (n * 100).toFixed(1) + '%';

  function lineYr(netUnitPrice, qty, year) {
    return netUnitPrice * qty * Math.pow(1 + upliftPct, year - 1);
  }

  const rows = buildSkuRows();

  // ── Year-column helpers ──────────────────────────────────────────────────────
  const yrHeaders = skuPeriods.map(p => {
    const upNote   = upliftPct > 0 && p.upliftExp > 0 && p.fraction === 1 ? `<br><span style="font-size:9px;opacity:.65;font-weight:400">+${((Math.pow(1+upliftPct,p.upliftExp)-1)*100).toFixed(1)}%</span>` : '';
    const fracNote = p.fraction < 1 ? `<br><span style="font-size:9px;opacity:.65;font-weight:400">${p.months} mo pro-rated</span>` : '';
    const dateNote = p.dateFrom ? `<br><span style="font-size:9px;opacity:.55;font-weight:400">${fmtDate(p.dateFrom)} – ${fmtDate(p.dateTo)}</span>` : '';
    return `<th style="text-align:right;min-width:100px;white-space:nowrap">${p.label}${upNote}${fracNote}${dateNote}</th>`;
  }).join('');

  // ── SKU line-item rows ───────────────────────────────────────────────────────
  const rowsHtml = rows.map(r => {
    const p = unitP(r.unitBaseUSD, r.layer, layers, rm);
    const yrCells = skuPeriods.map((period, pi) => {
      if (r.year1Only && pi > 0) return `<td style="text-align:right;font-size:12px;padding:9px 10px;color:#9ca3af">—</td>`;
      const tot = getPeriodPrice(p.netUnitPrice * r.qty, period);
      return `<td style="text-align:right;font-size:12px;padding:9px 10px;font-weight:${pi===0?'700':'400'};color:${pi===0?'#1a1a2e':'#4b5563'}">${fmt(tot)}</td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid #f0f2f8">
      <td style="font-family:monospace;font-size:11px;font-weight:700;color:#003080;white-space:nowrap;padding:9px 10px">${r.sku}</td>
      <td style="font-size:12px;padding:9px 10px">${r.name}</td>
      <td style="text-align:center;font-size:12px;font-weight:700;padding:9px 10px">${r.qty}</td>
      <td style="font-size:11px;color:#6b7280;white-space:nowrap;padding:9px 10px">${r.unit}</td>
      <td style="text-align:right;font-size:11px;padding:9px 10px;color:#6b7280">${p.listUnit ? fmt(p.listUnit) : '—'}</td>
      <td style="text-align:center;font-size:11px;padding:9px 10px;color:${p.discPct>0.001?'#dc2626':'#6b7280'}">${p.discPct > 0.001 ? fmtpct(p.discPct) : '—'}</td>
      <td style="text-align:right;font-size:12px;padding:9px 10px;color:#059669;font-weight:600">${fmt(p.netUnitPrice)}</td>
      ${yrCells}
      <td style="font-size:10px;color:#9ca3af;padding:9px 10px">${r.notes}</td>
    </tr>`;
  }).join('');

  // ── Pricing layer summary data ───────────────────────────────────────────────
  const layerDefs = [
    { key: 'foundation', label: 'NEO Foundation'              },
    { key: 'aiSuite',    label: 'AI Suite'                    },
    { key: 'useCases',   label: 'Solutions Library'           },
    { key: 'enhanced',   label: 'Enhanced Capability'         },
    { key: 'consulting', label: 'Consulting & Services'       },
    { key: 'nonProd',    label: 'Test Environments'           },
  ];
  const totNetY1      = Object.values(layers).reduce((s, l) => s + l.net, 0);
  const totListUSD    = Object.values(layers).reduce((s, l) => s + l.baseUSD, 0);
  const totRegional   = Object.values(layers).reduce((s, l) => s + l.regional, 0);
  const totAfterAuto  = Object.values(layers).reduce((s, l) => s + l.afterAuto, 0);
  const totAutoDiscAmt   = totRegional  - totAfterAuto;
  const totSalesDiscAmt  = totAfterAuto - totNetY1;
  // Calculate net value of year1Only rows so we can exclude them from year 2+ totals
  const year1OnlyNet  = rows.filter(r => r.year1Only).reduce((s, r) => s + unitP(r.unitBaseUSD, r.layer, layers, rm).netUnitPrice * r.qty, 0);
  const totRecurring  = totNetY1 - year1OnlyNet;
  const totContractVal = skuPeriods.reduce((s, period, pi) => s + (pi === 0 ? getPeriodPrice(totNetY1, period) : getPeriodPrice(totRecurring, period)), 0);

  const layerSummaryYrHdrs = skuPeriods.map(p => {
    const dateNote = p.dateFrom ? `<br><span style="font-size:9px;font-weight:400;opacity:.6">${fmtDate(p.dateFrom)} – ${fmtDate(p.dateTo)}</span>` : '';
    return `<th style="text-align:right;min-width:100px">${p.label}${p.fraction < 1 ? ` (${p.months}mo)` : ''}${dateNote}</th>`;
  }).join('');
  const layerRowsHtml = layerDefs.map(({ key, label }) => {
    const l = layers[key];
    // Solutions Library is bundled at $0 with Enrich/Semantic Search/Transcription —
    // still show it explicitly rather than silently dropping a $0 layer.
    const bundledLibraryIncluded = key === 'useCases' && !state.useCases.foundationOnly;
    if (!l || (l.baseUSD === 0 && !bundledLibraryIncluded)) return '';
    const salesDiscAmt = l.afterAuto * l.salesDisc;
    // Strip the one-time Implementation Package net out of years 2+ so it isn't repeated
    // — and so annual uplift, which only compounds from year 2 onward, never touches it.
    const yrCells = skuPeriods.map((period, pi) => {
      const layerNet = (key === 'consulting' && pi > 0) ? (l.net - year1OnlyNet) : l.net;
      const yp = getPeriodPrice(layerNet, period);
      return `<td style="text-align:right;padding:8px 10px;font-size:12px;font-weight:${pi===0?'700':'400'}">${fmt(yp)}</td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid #f0f2f8">
      <td style="padding:8px 10px;font-size:12px;font-weight:600">${label}</td>
      <td style="text-align:right;padding:8px 10px;font-size:11px;color:#6b7280">${fmt(l.baseUSD)}</td>
      <td style="text-align:center;padding:8px 10px;font-size:11px;color:${Math.abs(l.salesDisc)>0.001?'#dc2626':'#6b7280'}">${Math.abs(l.salesDisc) > 0.001 ? (l.salesDisc > 0 ? fmtpct(l.salesDisc) : '+'+fmtpct(-l.salesDisc)) : '—'}</td>
      <td style="text-align:right;padding:8px 10px;font-size:11px;color:${salesDiscAmt>0.5?'#dc2626':'#6b7280'}">${salesDiscAmt > 0.5 ? '–'+fmt(salesDiscAmt) : (salesDiscAmt < -0.5 ? '+'+fmt(-salesDiscAmt) : '—')}</td>
      ${yrCells}
    </tr>`;
  }).filter(Boolean).join('');
  const totYrCells = skuPeriods.map((period, pi) => `<td style="text-align:right;padding:9px 10px;font-size:13px;font-weight:800;color:#003080">${fmt(pi === 0 ? getPeriodPrice(totNetY1, period) : getPeriodPrice(totRecurring, period))}</td>`).join('');

  // ── Partner margins table (hidden — see isPartnerMarginsSkipped) ──────────────
  let pricedRows = [], pmYrHdrs = '', pmRowsHtml = '', pmFooterCells = '';
  if (showPartnerMargins) {
    pricedRows = rows.map(r => ({ ...r, price: unitP(r.unitBaseUSD, r.layer, layers, rm) }));
    const pm         = state.partnerMargins;
    const pmCatGroups = [
      { key: 'nuixSoftware', label: 'Nuix Software' },
      { key: 'nuixServices', label: 'Nuix Services' },
      { key: 'thirdParty',   label: 'Third Party Software' },
    ];
    pmYrHdrs = skuPeriods.map((p, i) => {
      const upNote   = upliftPct > 0 && p.upliftExp > 0 ? ` (+${((Math.pow(1+upliftPct,p.upliftExp)-1)*100).toFixed(1)}%)` : '';
      const fracNote = p.fraction < 1 ? ` (${p.months}mo)` : '';
      const dateNote = p.dateFrom ? `<br><span style="font-size:9px;font-weight:400;opacity:.55">${fmtDate(p.dateFrom)} – ${fmtDate(p.dateTo)}</span>` : '';
      return `<th style="text-align:center;min-width:120px">${p.label}${upNote}${fracNote}${dateNote}<br><span style="font-size:9px;font-weight:400;opacity:.7">Margin% · Partner $ · Disc%</span></th>`;
    }).join('');
    pmRowsHtml = pmCatGroups.map(cat => {
      const catRows = pricedRows.filter(r => r.category === cat.key);
      if (catRows.length === 0) return '';
      const header = `<tr><td colspan="${4 + skuPeriods.length}" style="padding:6px 10px;background:#f1f5f9;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px">${cat.label}</td></tr>`;
      const body = catRows.map(row => {
        const cells = skuPeriods.map((period, pi) => {
          const marginPct = pm.bySku[row.key]?.[pi + 1] ?? 0;
          const yrNet      = (row.year1Only && pi > 0) ? 0 : getPeriodPrice(row.price.netUnitPrice * row.qty, period);
          const partnerPay = yrNet * (marginPct / 100);
          return `<td style="padding:8px 10px;text-align:center;vertical-align:middle">
            <div style="font-size:12px;font-weight:700;color:#1a1a2e">${fmtpct(marginPct/100)}</div>
            <div style="font-size:12px;color:#059669;font-weight:600;margin-top:2px">${fmt(partnerPay)}</div>
            <div style="font-size:10px;color:#dc2626;margin-top:1px">${row.price.discPct > 0.001 ? '–'+fmtpct(row.price.discPct)+' disc.' : '—'}</div>
          </td>`;
        }).join('');
        return `<tr style="border-bottom:1px solid #f0f2f8">
          <td style="font-family:monospace;font-size:11px;font-weight:700;color:#003080;white-space:nowrap;padding:8px 10px">${row.sku}</td>
          <td style="font-size:12px;padding:8px 10px">${row.name}</td>
          <td style="text-align:center;font-size:12px;padding:8px 10px">${row.qty}</td>
          <td style="font-size:11px;color:#6b7280;white-space:nowrap;padding:8px 10px">${row.unit}</td>
          ${cells}
        </tr>`;
      }).join('');
      return header + body;
    }).join('');
    pmFooterCells = skuPeriods.map((period, pi) => {
      const periodTotal = pricedRows.reduce((s, row) => {
        const marginPct = pm.bySku[row.key]?.[pi + 1] ?? 0;
        const yrNet = (row.year1Only && pi > 0) ? 0 : getPeriodPrice(row.price.netUnitPrice * row.qty, period);
        return s + yrNet * (marginPct / 100);
      }, 0);
      return `<td style="text-align:center;padding:9px 10px;font-weight:700;color:#059669">${fmt(periodTotal)}</td>`;
    }).join('');
  }

  // ── Discount notes ───────────────────────────────────────────────────────────
  // Prices are US list. Government/multi-year/regional set the discount ceiling
  // (max discount before CEO approval), shown as a single note here.
  const ceilingPctSku = getMaxThreshold() * 100;
  const discNotes = [`Discount ceiling: ${ceilingPctSku.toFixed(1)}% off list before CEO approval`];
  const salesDiscNotes = Object.entries(layers).filter(([,l]) => l.salesDisc > 0.001).map(([k, l]) => {
    const lbl = { foundation: 'Foundation', aiSuite: 'AI Suite', useCases: 'Use Cases', enhanced: 'Enhanced', consulting: 'Consulting', nonProd: 'Test Envs' }[k] || k;
    return `${lbl} ${fmtpct(l.salesDisc)} sales disc.`;
  });

  // ── Component License Extension (optional free-text quote numbers) ─────────
  const escHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const cleQuotes = (state.advantageServices?.componentLicenseExtension || '')
    .split(/[,\n]/).map(s => s.trim()).filter(Boolean);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix SKU Order – ${quoteRef}</title>
  <style>
    @page { margin: 18mm 14mm; size: landscape; }
    /* Force colors/backgrounds to print as authored — many browsers default to
       stripping background fills on print/Save-as-PDF, which is what was making
       white-on-navy elements below disappear (leaving invisible white text). */
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1a1a2e; font-size: 12px; }
    .print-bar { background: #f0f4ff; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #dde3f0; }
    .print-btn { background: #003080; color: #fff; border: none; padding: 7px 18px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none; } }
    .page { max-width: 1200px; margin: 24px auto; padding: 0 20px 60px; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .doc-logo { height: 28px; }
    .doc-meta { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.8; }
    .doc-meta strong { color: #1a1a2e; font-size: 14px; display: block; margin-bottom: 2px; }
    h2 { font-size: 20px; font-weight: 800; color: #003080; margin-bottom: 6px; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
    .badge { font-size: 11px; color: #6b7280; background: #f3f5f8; padding: 3px 10px; border-radius: 4px; font-weight: 500; }
    .badge-blue { background: #eff6ff; color: #1d4ed8; }
    .badge-red  { background: #fef2f2; color: #dc2626; }
    .shdr { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 20px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 12px; }
    thead tr { background: #eef1f8; border-bottom: 2px solid #003080; }
    th { padding: 8px 10px; font-size: 10px; font-weight: 800; color: #003080; text-align: left; text-transform: uppercase; letter-spacing: 0.4px; }
    tbody tr:hover { background: #f9fafb; }
    tfoot tr { background: #f0f4ff; border-top: 2px solid #003080; }
    tfoot td { font-weight: 700; padding: 9px 10px; font-size: 12px; }
    .tcv { display: inline-flex; gap: 20px; background: #eef1f8; color: #003080; border: 2px solid #003080; border-radius: 10px; padding: 14px 22px; margin-bottom: 16px; }
    .tcv-i { text-align: center; }
    .tcv-i .val { font-size: 22px; font-weight: 800; color: #003080; }
    .tcv-i .lbl { font-size: 10px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
    .summary-box { background: #f0f4ff; border-radius: 8px; padding: 14px 18px; font-size: 11px; color: #374151; line-height: 1.8; margin-top: 20px; }
    .summary-box strong { color: #003080; }
    footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
<div class="print-bar no-print">
  <span style="font-size:13px;font-weight:600;color:#374151">SKU Order Sheet — ${quoteRef} — Internal Use Only</span>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</div>
<div class="page">

  <div class="doc-header">
    <img class="doc-logo" src="Nuix_Logo_Wikipedia.png" alt="Nuix">
    <div class="doc-meta">
      <strong>SKU Order Sheet — Internal</strong>
      Ref: ${quoteRef} &nbsp;·&nbsp; ${today}<br>
      ${isPOC ? `POC — ${cust.pocDuration||3} months` : `${years}-year contract`}${cust.dealType ? ` &nbsp;·&nbsp; ${cust.dealType}` : ''}${cust.channel ? ` &nbsp;·&nbsp; ${cust.channel}` : ''}
    </div>
  </div>

  <h2>${cust.name || 'Customer'}</h2>
  <div class="badges">
    ${cust.country       ? `<span class="badge">${cust.country}</span>` : ''}
    ${cust.type          ? `<span class="badge">${cust.type}</span>` : ''}
    <span class="badge badge-blue">${cur.name}</span>
    <span class="badge badge-blue">Discount ceiling ${ceilingPctSku.toFixed(1)}%</span>
  </div>

  ${state.approvalNotes ? `
  <div style="background:#fefce8;border:1.5px solid #eab308;border-radius:8px;padding:12px 16px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#713f12;margin-bottom:5px">Pricing Approval Notes</div>
    <div style="font-size:13px;color:#1a1a2e;line-height:1.7;white-space:pre-wrap">${state.approvalNotes.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  </div>` : ''}

  <div class="tcv">
    <div class="tcv-i"><div class="val">${fmt(totNetY1)}</div><div class="lbl">Year 1 Net ACV</div></div>
    ${years > 1 ? `<div class="tcv-i"><div class="val">${fmt(totContractVal)}</div><div class="lbl">${years}-Year TCV</div></div>` : ''}
    ${totListUSD > 0 && totSalesDiscAmt > 0.5 ? `<div class="tcv-i"><div class="val">${fmtpct(totSalesDiscAmt/totListUSD)}</div><div class="lbl">Applied Discount</div></div>` : ''}
    <div class="tcv-i"><div class="val">${ceilingPctSku.toFixed(1)}%</div><div class="lbl">Ceiling before CEO</div></div>
  </div>

  <div style="color:#dc2626;font-weight:700;font-size:12px;margin-bottom:10px">
    Please PDF and email to <a href="mailto:pppquotecreation@nuix.com" style="color:#dc2626;text-decoration:underline">PPP Quote Creation</a> for Salesforce CPQ quote creation. Salesforce Quote creation requires a valid Opportunity Link.
    <div style="margin-top:4px">Opportunity Link: ${cust.opportunityLink ? `<a href="${cust.opportunityLink}" target="_blank" style="color:#dc2626;text-decoration:underline">${cust.opportunityLink}</a>` : 'Not provided'}</div>
  </div>

  <!-- SECTION 1: SKU LINE ITEMS -->
  <div class="shdr">1 — SKU Line Items for CRM Entry &nbsp;(${rows.length} line${rows.length!==1?'s':''})</div>
  <table>
    <thead><tr>
      <th>SKU</th><th>Description</th>
      <th style="text-align:center">Qty</th><th>Unit</th>
      <th style="text-align:right">List Price</th>
      <th style="text-align:center">Disc%</th>
      <th style="text-align:right">Net Unit</th>
      ${yrHeaders}
      <th>Notes</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <!-- SECTION 2: PRICING LAYER SUMMARY -->
  <div class="shdr">2 — Pricing Layer Summary &amp; Discount Detail</div>
  ${discNotes.length ? `<div style="font-size:11px;color:#6b7280;margin-bottom:8px">${discNotes.join(' &nbsp;·&nbsp; ')}</div>` : ''}
  <table>
    <thead><tr>
      <th>Layer</th>
      <th style="text-align:right">List Price</th>
      <th style="text-align:center">Applied Disc%</th>
      <th style="text-align:right">Applied Disc $</th>
      ${layerSummaryYrHdrs}
    </tr></thead>
    <tbody>${layerRowsHtml}</tbody>
    <tfoot><tr>
      <td>TOTAL</td>
      <td style="text-align:right">${fmt(totListUSD)}</td>
      <td style="text-align:center;color:#dc2626">${totSalesDiscAmt > 0.5 ? '–'+fmtpct(totSalesDiscAmt/totAfterAuto) : '—'}</td>
      <td style="text-align:right;color:#dc2626">${totSalesDiscAmt > 0.5 ? '–'+fmt(totSalesDiscAmt) : '—'}</td>
      ${totYrCells}
    </tr></tfoot>
  </table>

  ${showPartnerMargins ? `
  <!-- SECTION 3: PARTNER MARGINS & DISCOUNTS -->
  <div class="shdr">3 — Partner Margins &amp; Discounts</div>
  ${pricedRows.length === 0
    ? `<p style="font-size:12px;color:#6b7280;margin-bottom:16px">No partner margin data configured for this deal.</p>`
    : `<table>
    <thead><tr>
      <th>SKU</th><th>Description</th><th style="text-align:center">Qty</th><th>Unit</th>
      ${pmYrHdrs}
    </tr></thead>
    <tbody>${pmRowsHtml}</tbody>
    <tfoot><tr>
      <td colspan="4">Total Partner Payment</td>
      ${pmFooterCells}
    </tr></tfoot>
  </table>
  <p style="font-size:10px;color:#6b7280;margin-top:4px">Margin % is applied to Nuix net revenue. Disc% shown is the applied discount from US list price.</p>`}
  ` : ''}

  ${cleQuotes.length ? `
  <!-- SECTION 4: COMPONENT LICENSE EXTENSION -->
  <div class="shdr">${showPartnerMargins ? 4 : 3} — Component License Extension</div>
  <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:8px;padding:12px 16px;margin-bottom:16px">
    <p style="font-size:12px;color:#374151;margin:0 0 8px">Customer is eligible for an automatic six-month extension of component licenses on the following existing quote(s):</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${cleQuotes.map(q => `<span style="background:#fff;border:1px solid #93c5fd;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:600;color:#1d4ed8;font-family:monospace">${escHtml(q)}</span>`).join('')}
    </div>
  </div>` : ''}

  <div class="summary-box">
    <strong>For internal use only.</strong> Generated by the Nuix Neo Pricing Tool for CRM order entry and internal processing. All prices are US list in USD (converted to the selected currency at fixed rates for display). Subject to final commercial sign-off.${upliftPct > 0 && years > 1 ? ` <strong>Annual uplift of ${(upliftPct*100).toFixed(1)}% applies from Year 2.</strong>` : ''}${salesDiscNotes.length ? ` Applied discounts: ${salesDiscNotes.join(', ')}.` : ''}
  </div>
  <footer>Nuix Neo Pricing Tool &nbsp;·&nbsp; ${today} &nbsp;·&nbsp; Ref: ${quoteRef} &nbsp;·&nbsp; Internal use only</footer>
</div>
</body>
</html>`;

  openQuoteDocument(html);
}

function generateBudgetQuote(variant) {
  const C    = cfg();
  const cust = state.customer;
  const tier = state.foundation.selectedTier;
  const bst  = state.foundation.boosters;
  const t    = tier ? C.foundation_tiers[tier] : null;
  const b    = tier ? C.foundation_boosters[tier] : null;
  const tierSuffix = tier === 'light' ? 'L' : tier === 'core' ? 'C' : tier === 'rapid' ? 'R' : null;

  const today      = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const validD     = new Date(); validD.setDate(validD.getDate() + 30);
  const validStr   = validD.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const isPOC      = !!cust.isPOC;
  const skuPeriods = getContractPeriodsWithDates();
  const years      = skuPeriods.length;
  const upliftPct  = getAnnualUplift();
  const layers     = calcPrices();
  const rm         = getRM();

  const cur  = CURRENCIES[state.currency] || CURRENCIES.USD;
  const fmtC = n => {
    if (n === 0 || !n) return '—';
    const converted = Math.round((n * cur.rate) / 100) * 100;
    return cur.symbol + converted.toLocaleString('en-US');
  };
  const fmtDate2 = d => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  function unitNetPrice(unitBaseUSD, layerKey) {
    if (!unitBaseUSD) return 0;
    const l = layers[layerKey];
    const regionalUnit = unitBaseUSD * rm;
    const autoF  = layerKey === 'consulting' ? 1 : l.autoDisc;
    const salesF = 1 - l.salesDisc;
    return regionalUnit * autoF * salesF;
  }

  // ── Build rows in workflow order ─────────────────────────────────────────────
  // Order: 1-Foundation tier · 2-Boosters · 3-Solutions Library · 4-AI SKUs · 5-Add Ons · 6-Advantage & Implementation
  const rows = [];

  // 1 — Foundation tier
  const refTier2     = tier;
  const refTierSize2 = refTier2 === 'light' ? 'S' : refTier2 === 'core' ? 'MD' : refTier2 === 'rapid' ? 'L' : tierSuffix;
  const refTierName2 = refTier2 ? refTier2.charAt(0).toUpperCase() + refTier2.slice(1) : '';

  if (state.pricingModel === 'consumption') {
    const ct = C.consumption_tiers[tier];
    rows.push({ sku: ct.sku, name: ct.name, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: ct.price });
  } else {
    const foundationSkus = { light: 'NEO007S', core: 'NEO007MD', rapid: 'NEO007L' };
    const isExpansionDeal = cust.dealType === 'Neo Expansion';
    if (!isExpansionDeal) {
      if (tierSuffix) {
        rows.push({ sku: foundationSkus[tier], name: `Nuix Neo Foundation – ${t.name.replace('NEO – ','')}`, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: t.price });
      }
    }
  }

  // 2 — Boosters (capacity only: workers/volume/users for worker model, TB/users for consumption)
  if (state.pricingModel === 'consumption' && tier) {
    const ct       = C.consumption_tiers[tier];
    const userSkus = { light: 'NEOBRS', core: 'NEOBRMD', rapid: 'NEOBRL' };
    const tierName = tierDisplayName(tier);
    if (bst.volume > 0) rows.push({ sku: ct.tb_booster_sku, name: `Additional TB – ${tierName} (Consumption)`, qty: bst.volume, unit: 'Per TB/yr', layer: 'foundation', unitBaseUSD: ct.tb_booster_rate });
    if (bst.users  > 0) rows.push({ sku: userSkus[tier],    name: `Additional Concurrent User – ${tierName}`,  qty: bst.users,  unit: 'Per user/yr', layer: 'foundation', unitBaseUSD: b.user });
  } else if (tierSuffix) {
    const workerSkus = { light: 'NEOBWS', core: 'NEOBWMD', rapid: 'NEOBWL' };
    const volumeSkus = { light: 'NEO-BOOST-VOL-L', core: 'NEO-BOOST-VOL-C', rapid: 'NEO-BOOST-VOL-R' };
    const userSkus   = { light: 'NEOBRS', core: 'NEOBRMD', rapid: 'NEOBRL' };
    const tierName   = tier ? tierDisplayName(tier) : '';
    if (bst.workers > 0) rows.push({ sku: workerSkus[tier], name: `Additional Worker – ${tierName}`,           qty: bst.workers, unit: 'Per worker/yr', layer: 'foundation', unitBaseUSD: b.worker });
    if (bst.volume  > 0) rows.push({ sku: volumeSkus[tier], name: `Additional Volume – ${tierName}`,           qty: bst.volume,  unit: 'Per TB/yr',     layer: 'foundation', unitBaseUSD: b.volume_tb });
    if (bst.users   > 0) rows.push({ sku: userSkus[tier],   name: `Additional Concurrent User – ${tierName}`, qty: bst.users,   unit: 'Per user/yr',   layer: 'foundation', unitBaseUSD: b.user });
  }

  // 3 — Solutions Library
  if (!state.useCases.foundationOnly && refTierSize2) {
    const ucPrice = refTier2 ? (C.use_case_modules.solution_pack?.price[refTier2] || 0) : 0;
    rows.push({ sku: `NEOSLIB${refTierSize2}`, name: `Solutions Library – ${refTierName2}`, qty: 1, unit: 'Per year', layer: 'useCases', unitBaseUSD: ucPrice });
  }

  // 4 — AI SKUs
  const aiDisplayMap = { aiBundle: ['NEOAIBNDL01','AI Bundle'], enrich: ['NEOAI001','Enrich'], semantic: ['NEOS001','Semantic Search'], transcription: ['NEOS002','Transcription'], agenticBYOAI: ['NEOAI002','BYO AI'], byoAIAdvanced: ['NEOAI003','BYO AI - Advanced'], byoAIGraph: ['NEOAI004','BYO AI - Graph'], agenticAdvanced: ['NEOAI005','Agentic: AI - Advanced'] };
  Object.entries(state.aiSuite).forEach(([key, on]) => {
    if (on && refTierSize2 && aiDisplayMap[key]) {
      const [base, name] = aiDisplayMap[key];
      const aiPrice = getAiModuleBaseUSD(key, refTier2, state.aiSuite);
      rows.push({ sku: `${base}${refTierSize2}`, name: `${name} – ${refTierName2}`, qty: 1, unit: 'Per year', layer: 'aiSuite', unitBaseUSD: aiPrice });
    }
  });

  // 5 — Add Ons (Enhanced capabilities)
  const ec = state.enhancedCap;
  const nm = C.enhanced_capabilities.nuix_modules;
  const tp = C.enhanced_capabilities.third_party;
  if (ec.discover_saas?.selected)   discoverSaasSkuRows(ec.discover_saas, nm.discover_saas).forEach(r     => rows.push({ layer: 'enhanced', ...r }));
  if (ec.discover_onprem?.selected) discoverOnpremSkuRows(ec.discover_onprem, nm.discover_onprem).forEach(r => rows.push({ layer: 'enhanced', ...r }));
  discoverAdvantageSkuRows().forEach(r => rows.push({ layer: 'enhanced', ...r }));
  if (ec.adaptive_security?.selected) {
    if (ec.adaptive_security.endpoints > 0) rows.push({ sku: 'ENDPT001',  name: 'Adaptive Security – Endpoint', qty: ec.adaptive_security.endpoints, unit: 'Per endpoint/yr', layer: 'enhanced', unitBaseUSD: nm.adaptive_security.price_per_endpoint });
    if (ec.adaptive_security.users > 0)     rows.push({ sku: 'ENDPTUSER', name: 'Adaptive Security – User',     qty: ec.adaptive_security.users,     unit: 'Per user/yr',    layer: 'enhanced', unitBaseUSD: nm.adaptive_security.price_per_user });
    if (ec.adaptive_security.servers > 0)   rows.push({ sku: 'ENDPTSVR',  name: 'Adaptive Security – Server',   qty: ec.adaptive_security.servers,   unit: 'Per server/yr',  layer: 'enhanced', unitBaseUSD: nm.adaptive_security.price_per_server });
  }
  if (state.visualisation.selected) {
    const vb = getVisualisationBundlePricing(state.visualisation);
    if (vb.bundle.sku) rows.push({ sku: vb.bundle.sku, name: vb.bundle.name, qty: 1, unit: 'Per bundle/yr', layer: 'enhanced', unitBaseUSD: vb.bundle.price });
    if (vb.boosterUserQty > 0) rows.push({ sku: vb.boosterUserTier.sku, name: `Visualisation Bundle Booster – ${vb.boosterUserTier.name}`, qty: vb.boosterUserQty, unit: 'Per pack/yr', layer: 'enhanced', unitBaseUSD: vb.boosterUserTier.price });
    if (vb.boosterMemQty > 0)  rows.push({ sku: vb.boosterMemTier.sku,  name: `Visualisation Bundle Booster – ${vb.boosterMemTier.name}`,  qty: vb.boosterMemQty,  unit: 'Per pack/yr', layer: 'enhanced', unitBaseUSD: vb.boosterMemTier.price });
  }
  if (ec.ecc?.selected && ec.ecc.endpoints > 0)
    rows.push({ sku: 'ENDPT101', name: 'ECC (Enterprise Collection Centre)', qty: ec.ecc.endpoints, unit: 'Per endpoint/yr', layer: 'enhanced', unitBaseUSD: nm.ecc.price_per_endpoint });
  if (ec.legal_hold?.selected && ec.legal_hold.custodians > 0)
    rows.push({ sku: 'RALH001', name: 'Nuix Automate Legal Hold', qty: ec.legal_hold.custodians, unit: 'Per custodian/month ×12', layer: 'enhanced', unitBaseUSD: nm.legal_hold.price_per_custodian_month * 12 });
  if (ec.automated_relativity?.selected)
    rows.push({ sku: 'NEOREL01', name: 'Automated Relativity Export and Orchestration', qty: 1, unit: 'Per year', layer: 'enhanced', unitBaseUSD: nm.automated_relativity.list_price });
  if (ec.abbyy?.selected && (ec.abbyy.qty || 1) > 0) {
    const abbyyPkg = tp.abbyy.packages.find(p => p.key === (ec.abbyy.pkg || 'abbfr002'));
    if (abbyyPkg) rows.push({ sku: abbyyPkg.sku, name: `ABBYY – ${abbyyPkg.name}`, qty: ec.abbyy.qty || 1, unit: 'Per unit/yr', layer: 'enhanced', unitBaseUSD: abbyyPkg.price });
  }
  Object.entries(ec.q1_dynamics?.connectors || {}).filter(([,v]) => v).forEach(([k]) => {
    const con2 = tp.q1_dynamics.connectors.find(x => x.key === k);
    if (con2) rows.push({ sku: con2.sku || 'Q1', name: 'Q1 – ' + con2.name, qty: 1, unit: 'Per year', layer: 'enhanced', unitBaseUSD: con2.price });
  });
  if (ec.t3k?.selected) {
    const tMode = ec.t3k.pricing_mode || 'tb';
    if ((ec.t3k.instances || 0) > 0) rows.push({ sku: 'T3KCON001', name: 'T3K – Nuix Connector', qty: ec.t3k.instances, unit: 'Per instance/yr', layer: 'enhanced', unitBaseUSD: tp.t3k.price_per_instance });
    if (tMode === 'worker' && (ec.t3k.workers || 0) > 0) {
      rows.push({ sku: 'T3KCORE001', name: 'T3K – CORE Image Analysis', qty: ec.t3k.workers, unit: 'Per worker/yr', layer: 'enhanced', unitBaseUSD: tp.t3k.price_per_worker });
    } else if (tMode === 'tb') {
      const tbT = tp.t3k.tb_tiers.find(t2 => t2.key === (ec.t3k.tb_tier || 'tb10'));
      if (tbT) rows.push({ sku: tbT.sku, name: `T3K – CORE Image Analysis (${tbT.name})`, qty: 1, unit: 'Per unit/yr', layer: 'enhanced', unitBaseUSD: tbT.price });
    } else if (tMode === 'users') {
      const urT = tp.t3k.user_tiers.find(t2 => t2.key === (ec.t3k.user_tier || 'ur10'));
      if (urT) rows.push({ sku: urT.sku, name: `T3K – CORE Image Analysis (${urT.name})`, qty: 1, unit: 'Per unit/yr', layer: 'enhanced', unitBaseUSD: urT.price });
    }
  }
  if (ec.veritone?.selected) {
    const vtP = tp.veritone;
    if ((ec.veritone.instances || 0) > 0) rows.push({ sku: 'VERTSCPCON2', name: 'Veritone – Nuix Connector', qty: ec.veritone.instances, unit: 'Per instance/yr', layer: 'enhanced', unitBaseUSD: vtP.price_per_instance });
    const vtT = vtP.transcription_tiers.find(t2 => t2.key === (ec.veritone.transcription_tier || 'sml'));
    if (vtT) rows.push({ sku: vtT.sku, name: `Veritone – Transcription (${vtT.name})`, qty: 1, unit: 'Per instance/yr', layer: 'enhanced', unitBaseUSD: vtT.price });
    if ((ec.veritone.first_langs || 0) > 0)      rows.push({ sku: 'VERTSLTLAN1', name: 'Veritone – Translation (First Language)',      qty: ec.veritone.first_langs,      unit: 'Per language/yr', layer: 'enhanced', unitBaseUSD: vtP.price_first_language });
    if ((ec.veritone.additional_langs || 0) > 0) rows.push({ sku: 'VERTSLTLANS', name: 'Veritone – Translation (Additional Language)', qty: ec.veritone.additional_langs, unit: 'Per language/yr', layer: 'enhanced', unitBaseUSD: vtP.price_additional_language });
  }

  // 6 — Advantage & Implementation (training hours, support, BYO AI training, implementation, consulting)
  // Training hours booster
  if (state.pricingModel === 'consumption') {
    const trainingRate = C.foundation_boosters[refTier2]?.training_hour || 0;
    rows.push({ sku: 'TRNNEO001', name: 'Training Credits', qty: C.consumption_tiers[tier].training_hours, unit: 'Credits', layer: 'foundation', unitBaseUSD: 0 });
    if (bst.trainingHours > 0)
      rows.push({ sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours', qty: bst.trainingHours, unit: 'Per 24-hr pack', layer: 'foundation', unitBaseUSD: trainingRate });
    const supNamesQ = { bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' };
    const includedSupportSkusQ = { 'Advantage Bronze': 'CSLT101F', 'Advantage Silver': 'CSLT102F', 'Advantage Gold': 'CSLT103F' };
    const effectiveSupportQ = bst.support ? supNamesQ[bst.support] : C.consumption_tiers[tier].support;
    rows.push({ sku: includedSupportSkusQ[effectiveSupportQ], name: effectiveSupportQ, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: 0 });
    if (bst.support) {
      const supSkus  = { bronze: 'CSLT101U', silver: 'CSLT102U', gold: 'CSLT103U' };
      rows.push({ sku: supSkus[bst.support], name: `Support Upgrade – ${supNamesQ[bst.support]}`, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: getSupportIncrementalCost(bst.support, C.consumption_tiers[tier].support) });
    }
  } else if (tierSuffix) {
    rows.push({ sku: 'TRNNEO001', name: 'Training Credits', qty: t.training_hours, unit: 'Credits', layer: 'foundation', unitBaseUSD: 0 });
    if (bst.trainingHours > 0)
      rows.push({ sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours', qty: bst.trainingHours, unit: 'Per 24-hr pack', layer: 'foundation', unitBaseUSD: b.training_hour });
    const supNames = { bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' };
    const includedSupportSkus = { 'Advantage Bronze': 'CSLT101F', 'Advantage Silver': 'CSLT102F', 'Advantage Gold': 'CSLT103F' };
    const effectiveSupport = bst.support ? supNames[bst.support] : t.support;
    rows.push({ sku: includedSupportSkus[effectiveSupport], name: effectiveSupport, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: 0 });
    if (bst.support) {
      const supSkus  = { bronze: 'CSLT101U', silver: 'CSLT102U', gold: 'CSLT103U' };
      rows.push({ sku: supSkus[bst.support], name: `Support Upgrade – ${supNames[bst.support]}`, qty: 1, unit: 'Per year', layer: 'foundation', unitBaseUSD: getSupportIncrementalCost(bst.support, t.support) });
    }
  }
  // BYO AI implementation training hours
  if (['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k])) {
    const byoRate = b ? b.training_hour : (C.foundation_boosters[refTier2]?.training_hour || 0);
    rows.push({ sku: 'CSLT107', name: 'Nuix Advantage – Top Up 24 Hours (BYO AI Implementation)', qty: 7, unit: 'Per 24-hr pack', layer: 'foundation', unitBaseUSD: byoRate });
  }
  // Implementation package & consulting
  if (state.advantageServices?.implementationPackage) {
    rows.push({ sku: 'CSLT300', name: 'Nuix Neo Foundation Implementation Package', qty: 1, unit: 'Per instance', layer: 'consulting', unitBaseUSD: C.consulting.cslt300_price, year1Only: true });
  }
  if (state.advantageServices?.solutionImplementationPackage) {
    rows.push({ sku: 'CSLT301', name: 'Nuix Neo Solution Implementation Package', qty: 1, unit: 'Per instance', layer: 'consulting', unitBaseUSD: C.consulting.cslt301_price, year1Only: true });
  }
  // 7 — Test Environments
  nonProdSkuRows().forEach(r => rows.push({ layer: 'nonProd', ...r, name: r.notes ? `${r.name} (${r.notes})` : r.name }));

  // ── Pre-compute net prices per row per period ─────────────────────────────────
  const rowsWithPrices = rows.map(r => {
    const net = unitNetPrice(r.unitBaseUSD, r.layer);
    const periodPrices = skuPeriods.map((period, pi) => {
      if (r.year1Only && pi > 0) return 0;
      return getPeriodPrice(net * r.qty, period);
    });
    return { ...r, net, periodPrices };
  });

  // ── Annual totals per period ──────────────────────────────────────────────────
  const annualTotals = skuPeriods.map((_, pi) =>
    rowsWithPrices.reduce((s, r) => s + (r.periodPrices[pi] || 0), 0)
  );
  const tcv = annualTotals.reduce((s, v) => s + v, 0);

  // ── Customer value (from Value step) ─────────────────────────────────────────
  const vwQ = state.valueWin;
  let totalAnnualValueQ = 0;
  Object.entries(VALUE_LEVERS).forEach(([key, lev]) => {
    if (vwQ.activeLevers[key]) totalAnnualValueQ += lev.subtract ? -lev.calc(vwQ.inputs) : lev.calc(vwQ.inputs);
  });
  const valueOverTermQ = totalAnnualValueQ * years;
  const showValuePanel = valueOverTermQ > 0 && tcv > 0;
  const valueMultipleQ = showValuePanel ? (valueOverTermQ / tcv) : 0;

  const fmtCValue = n => {
    const converted = Math.round((n * cur.rate) / 1000) * 1000;
    if (converted >= 1_000_000) return cur.symbol + (converted / 1_000_000).toFixed(1) + 'M';
    if (converted >= 1_000)     return cur.symbol + (converted / 1_000).toFixed(0) + 'K';
    return cur.symbol + converted.toLocaleString('en-US');
  };

  const valuePanelHtml = showValuePanel ? `
  <div style="margin-top:20px;background:linear-gradient(135deg,#f0f7ff 0%,#e8f4e8 100%);border:1.5px solid #bfdbfe;border-radius:10px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1d4ed8;margin-bottom:4px">Estimated Customer Value</div>
      <div style="font-size:28px;font-weight:800;color:#1e3a5f;letter-spacing:-0.5px">${fmtCValue(valueOverTermQ)}</div>
      <div style="font-size:11px;color:#4b5563;margin-top:3px">over ${years} year${years !== 1 ? 's' : ''} · ${cur.name}</div>
    </div>
    <div style="text-align:center;background:#1d4ed8;border-radius:8px;padding:14px 20px;min-width:90px">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.7);margin-bottom:4px">Value Multiple</div>
      <div style="font-size:32px;font-weight:800;color:#fff;line-height:1">${valueMultipleQ.toFixed(1)}x</div>
      <div style="font-size:9px;color:rgba(255,255,255,.6);margin-top:3px">value vs. price</div>
    </div>
  </div>` : '';

  // ── Variant: title and page orientation ──────────────────────────────────────
  const variantTitles = { itemised: 'Itemised Budget Quote', annual: 'Annual Price Budget Quote', total: 'Total Price Budget Quote' };
  const docTitle = variantTitles[variant] || 'Budget Quote';
  const pageSize = 'portrait';

  // ── Shared product list HTML ──────────────────────────────────────────────────
  const showPrices = variant === 'itemised';
  const yrColHeaders = showPrices ? skuPeriods.map((p, pi) => {
    const dateStr = p.dateFrom ? `<div style="font-size:8px;font-weight:400;color:rgba(255,255,255,.75);margin-top:2px">${fmtDate2(p.dateFrom)} – ${fmtDate2(p.dateTo)}</div>` : '';
    return `<th style="text-align:right;min-width:85px;padding:8px 8px;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.4px">${p.label}${dateStr}</th>`;
  }).join('') : '';

  const productRowsHtml = rowsWithPrices.map((r, ri) => {
    const yrCells = showPrices ? r.periodPrices.map((price, pi) =>
      `<td style="text-align:right;padding:7px 8px;font-size:11px;color:${pi===0?'#003080':'#374151'};font-weight:${pi===0?'600':'400'}">${fmtC(price) || '—'}</td>`
    ).join('') : '';
    return `<tr style="background:${ri%2===0?'#fff':'#f9fafb'};border-bottom:1px solid #e5e7eb">
      <td style="padding:7px 8px;font-size:12px;font-weight:500;color:#111827">${r.name}</td>
      <td style="padding:7px 8px;font-family:monospace;font-size:10px;font-weight:600;color:#4b5563;white-space:nowrap">${r.sku}</td>
      <td style="padding:7px 8px;text-align:center;font-size:11px;color:#374151">${r.qty}</td>
      <td style="padding:7px 8px;font-size:10px;color:#6b7280;white-space:nowrap">${r.unit}</td>
      ${yrCells}
    </tr>`;
  }).join('');

  const productTableFooter = showPrices ? `<tfoot><tr style="background:#f0f4ff;border-top:2px solid #003080">
    <td colspan="4" style="padding:8px 8px;font-size:11px;font-weight:700;color:#003080">Total</td>
    ${annualTotals.map((tot, pi) => `<td style="text-align:right;padding:8px 8px;font-size:12px;font-weight:800;color:#003080">${fmtC(tot)}</td>`).join('')}
  </tr></tfoot>` : '';

  const productTable = `
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#003080">
      <th style="padding:8px 8px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.4px">Product</th>
      <th style="padding:8px 8px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.4px">SKU</th>
      <th style="padding:8px 8px;text-align:center;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.4px">Qty</th>
      <th style="padding:8px 8px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.4px">Unit</th>
      ${yrColHeaders}
    </tr></thead>
    <tbody>${productRowsHtml}</tbody>
    ${productTableFooter}
  </table>`;

  // ── Variant-specific pricing section ─────────────────────────────────────────
  let pricingSection = '';

  if (variant === 'annual') {
    const annualRows = skuPeriods.map((p, pi) => {
      const dateStr = p.dateFrom ? `${fmtDate2(p.dateFrom)} – ${fmtDate2(p.dateTo)}` : '';
      return `<tr style="background:${pi%2===0?'#fff':'#f9fafb'};border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#003080">${p.label}</td>
        <td style="padding:12px 16px;font-size:12px;color:#6b7280">${dateStr}</td>
        <td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:700;color:#003080">${fmtC(annualTotals[pi])}</td>
      </tr>`;
    }).join('');
    pricingSection = `
    <div style="margin-top:28px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">Annual Pricing Summary</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#003080">
          <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px;width:20%">Period</th>
          <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px">Contract Dates</th>
          <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px;width:25%">Annual Price (${cur.name})</th>
        </tr></thead>
        <tbody>${annualRows}</tbody>
        ${years > 1 ? `<tfoot><tr style="background:#f0f4ff;border-top:2px solid #003080">
          <td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;color:#003080">Total Contract Value</td>
          <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:800;color:#003080">${fmtC(tcv)}</td>
        </tr></tfoot>` : ''}
      </table>
    </div>
    ${valuePanelHtml}`;
  }

  if (variant === 'total') {
    const contractDesc = isPOC
      ? `${cust.pocDuration || 3}-month POC`
      : skuPeriods.length > 0 && skuPeriods[0].dateFrom
        ? `${fmtDate2(skuPeriods[0].dateFrom)} – ${fmtDate2(skuPeriods[skuPeriods.length-1].dateTo)}`
        : `${years}-year contract`;
    pricingSection = `
    <div style="margin-top:28px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">Contract Price Summary</div>
      <div style="background:#003080;border-radius:12px;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px">
        <div>
          <div style="font-size:12px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Total Contract Value</div>
          <div style="font-size:40px;font-weight:800;color:#fff;letter-spacing:-1px">${fmtC(tcv)}</div>
          <div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:6px">${contractDesc} · ${cur.name}</div>
        </div>
        ${showValuePanel ? `
        <div style="text-align:center;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:10px;padding:18px 24px;min-width:160px">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.65);margin-bottom:6px">Est. Customer Value</div>
          <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px">${fmtCValue(valueOverTermQ)}</div>
          <div style="margin-top:10px;background:rgba(255,255,255,0.18);border-radius:6px;padding:6px 10px">
            <div style="font-size:10px;color:rgba(255,255,255,.65);margin-bottom:2px">Value Multiple</div>
            <div style="font-size:22px;font-weight:800;color:#fff">${valueMultipleQ.toFixed(1)}x</div>
          </div>
        </div>` : `
        <div style="text-align:right">
          <div style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:4px">Currency</div>
          <div style="font-size:20px;font-weight:700;color:#fff">${cur.name}</div>
        </div>`}
      </div>
    </div>`;
  }

  // ── Contract period dates (for annual/total header context) ──────────────────
  const contractPeriodStr = isPOC
    ? `POC — ${cust.pocDuration || 3} months`
    : skuPeriods.length > 0 && skuPeriods[0].dateFrom
      ? `${fmtDate2(skuPeriods[0].dateFrom)} – ${fmtDate2(skuPeriods[skuPeriods.length-1].dateTo)}`
      : `${years} year${years !== 1 ? 's' : ''}`;

  // ── Foundation capability summary (workers / users / training / Advantage tier) ──
  // Shown as a pill/box on the budget quotes so the customer sees what capacity and
  // support level is actually included, not just line-item SKUs and prices.
  const tierBadgeColors = { light: '#64748b', core: '#0066d6', rapid: '#0056e3' };
  const supportTierNames = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
  const byoAITrainingPacks = ['agenticBYOAI', 'byoAIAdvanced', 'byoAIGraph'].some(k => state.aiSuite[k]) ? 7 : 0;

  let cap = null;
  if (state.pricingModel === 'consumption' && tier) {
    const ct = C.consumption_tiers[tier];
    const totalUsers    = (ct.users || 0) + (bst.users || 0);
    const baseSupportKey = (ct.support || '').replace('Advantage ', '').toLowerCase();
    const effSupportKey  = bst.support || baseSupportKey;
    const advantageHours = (C.support_included_hours?.[effSupportKey] || 0) + ((bst.trainingHours || 0) + byoAITrainingPacks) * 24;
    cap = {
      workersVal: `${((ct.included_tb || 0) + (bst.volume || 0)).toLocaleString('en-US')} TB/yr`,
      workersNote: bst.volume > 0 ? `${ct.included_tb} TB included + ${bst.volume}` : '',
      usersVal: totalUsers.toLocaleString('en-US'),
      usersNote: bst.users > 0 ? `${ct.users} included + ${bst.users}` : '',
      trainingVal: (ct.training_hours || 0).toLocaleString('en-US'),
      supportVal: supportTierNames[effSupportKey] || (ct.support || '').replace('Advantage ', ''),
      supportHoursNote: `${advantageHours} professional service hours included`,
      supportNote: (bst.support && bst.support !== baseSupportKey) ? `Upgraded from ${supportTierNames[baseSupportKey]}` : ''
    };
  } else if (tierSuffix && t) {
    const totalWorkers  = (t.workers || 0) + (bst.workers || 0);
    const totalUsers    = (t.users || 0) + (bst.users || 0);
    const baseSupportKey = (t.support || '').replace('Advantage ', '').toLowerCase();
    const effSupportKey  = bst.support || baseSupportKey;
    const advantageHours = (C.support_included_hours?.[effSupportKey] || 0) + ((bst.trainingHours || 0) + byoAITrainingPacks) * 24;
    cap = {
      workersVal: totalWorkers.toLocaleString('en-US'),
      workersNote: bst.workers > 0 ? `${t.workers} included + ${bst.workers}` : '',
      usersVal: totalUsers.toLocaleString('en-US'),
      usersNote: bst.users > 0 ? `${t.users} included + ${bst.users}` : '',
      trainingVal: (t.training_hours || 0).toLocaleString('en-US'),
      supportVal: supportTierNames[effSupportKey] || (t.support || '').replace('Advantage ', ''),
      supportHoursNote: `${advantageHours} professional service hours included`,
      supportNote: (bst.support && bst.support !== baseSupportKey) ? `Upgraded from ${supportTierNames[baseSupportKey]}` : ''
    };
  }

  const capacityBoxHtml = cap ? `
  <div style="margin-bottom:16px;background:linear-gradient(135deg,#f8faff 0%,#eef4ff 100%);border:1.5px solid #dbe4f3;border-radius:10px;padding:16px 20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280">Nuix Neo Foundation — Included Capacity</div>
      <span style="background:${tierBadgeColors[tier] || '#64748b'};color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:3px 10px;border-radius:20px">${tierDisplayName(tier)}</span>
    </div>
    <div style="display:flex">
      <div style="flex:1;text-align:center;padding:0 10px;border-right:1px solid #dbe4f3">
        <div style="font-size:22px;font-weight:800;color:#003080;line-height:1">${cap.workersVal}</div>
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-top:4px">${state.pricingModel === 'consumption' ? 'Included data volume' : 'Processing workers'}</div>
        ${cap.workersNote ? `<div style="font-size:10px;color:#059669;font-weight:600;margin-top:3px">${cap.workersNote}</div>` : ''}
      </div>
      <div style="flex:1;text-align:center;padding:0 10px;border-right:1px solid #dbe4f3">
        <div style="font-size:22px;font-weight:800;color:#003080;line-height:1">${cap.usersVal}</div>
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-top:4px">Concurrent review users</div>
        ${cap.usersNote ? `<div style="font-size:10px;color:#059669;font-weight:600;margin-top:3px">${cap.usersNote}</div>` : ''}
      </div>
      <div style="flex:1;text-align:center;padding:0 10px;border-right:1px solid #dbe4f3">
        <div style="font-size:22px;font-weight:800;color:#003080;line-height:1">${cap.trainingVal}</div>
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-top:4px">Training Credits</div>
      </div>
      <div style="flex:1;text-align:center;padding:0 10px">
        <div style="font-size:22px;font-weight:800;color:#003080;line-height:1">${cap.supportVal}</div>
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-top:4px">Nuix Advantage support</div>
        ${cap.supportHoursNote ? `<div style="font-size:10px;color:#059669;font-weight:600;margin-top:3px">${cap.supportHoursNote}</div>` : ''}
        ${cap.supportNote ? `<div style="font-size:10px;color:#d97706;font-weight:600;margin-top:3px">${cap.supportNote}</div>` : ''}
      </div>
    </div>
  </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} – ${cust.name || 'Customer'}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111827; font-size: 12px; line-height: 1.5; }
    .print-bar { background: #f8faff; padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #dde3f0; }
    .print-btn { background: #003080; color: #fff; border: none; padding: 8px 20px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none !important; } }
    .page { max-width: 780px; margin: 20px auto; padding: 0 20px 40px; }
  </style>
</head>
<body>
<div class="print-bar no-print">
  <span style="font-size:13px;font-weight:600;color:#374151">${docTitle} — ${cust.name || 'Customer'}</span>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</div>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e5e7eb">
    <img src="Nuix_Logo_Wikipedia.png" alt="Nuix" style="height:52px">
    <div style="text-align:right;font-size:11px;color:#6b7280;line-height:1.9">
      ${today}<br>
      Valid to ${validStr}<br>
      ${contractPeriodStr}
    </div>
  </div>

  <!-- Budget Quote Banner -->
  <div style="margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#003080;margin-bottom:4px"><strong>Budget Quote — Indicative Pricing Only</strong></div>
    <div style="font-size:22px;font-weight:800;color:#111827">${cust.name || 'Customer'}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      ${cust.country ? `<span style="font-size:11px;background:#f3f4f6;color:#374151;padding:3px 10px;border-radius:4px;font-weight:500">${cust.country}</span>` : ''}
      <span style="font-size:11px;background:#eff6ff;color:#1d4ed8;padding:3px 10px;border-radius:4px;font-weight:500">${cur.name}</span>
      ${isPOC ? `<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:4px;font-weight:500">POC</span>` : ''}
    </div>
  </div>

  ${capacityBoxHtml}

  <!-- Product / SKU List -->
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">Products &amp; SKUs</div>
  ${productTable}
  ${variant === 'itemised' ? valuePanelHtml : ''}

  <!-- Variant-specific pricing section -->
  ${pricingSection}

  <!-- Footer disclaimer -->
  <div style="margin-top:36px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;line-height:1.7">
    This is an indicative budget quote only and is not a binding offer. All prices are in ${cur.name} and are subject to final commercial sign-off, contract terms, and Nuix standard terms and conditions. Prices exclude applicable taxes. This document is prepared for budget planning purposes only and is confidential to the named customer.<br>
    <span style="margin-top:4px;display:inline-block">Prepared ${today} &nbsp;·&nbsp; Nuix Limited</span>
  </div>

</div>
</body>
</html>`;

  openQuoteDocument(html);
}

function generateBundledQuote() {
  const C        = cfg();
  const cust     = state.customer;
  const layers   = calcPrices();
  const rm       = getRM();
  const today    = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const quoteRef = 'QT-' + Date.now().toString().slice(-6);
  const country  = cust.country || '';
  const years       = getContractYears();
  const bqPeriods   = getContractPeriods();
  const yearCountBQ = bqPeriods.length;
  const yearRangeBQ = bqPeriods;
  const totNet   = Object.values(layers).reduce((s, l) => s + l.net, 0);
  const upliftPctBQ = parseFloat(cust.annualUplift) || 0;
  // The Implementation Packages are one-time Year 1 charges baked into the consulting layer's
  // net — strip them out before projecting later periods so they aren't repeated every year.
  const year1OnlyBaseBQ = (state.advantageServices?.implementationPackage ? C.consulting.cslt300_price : 0)
    + (state.advantageServices?.solutionImplementationPackage ? C.consulting.cslt301_price : 0);
  const year1OnlyNetBQ = year1OnlyBaseBQ * (1 - layers.consulting.salesDisc);
  const totRecurringBQ = totNet - year1OnlyNetBQ;
  const netForPeriodBQ = pi => pi === 0 ? totNet : totRecurringBQ;
  const totContract = bqPeriods.reduce((sum, p, pi) => sum + getPeriodPrice(netForPeriodBQ(pi), p), 0);

  // Prices are US list; government/regional don't change the price. Only factual
  // contract-shape notes (term, annual uplift) are surfaced on the quote.
  const autoNotes = [];
  const myd = getMultiYearDisc();
  if (myd > 0)           autoNotes.push(`${cust.contractMonths || 12}-month contract term`);
  if (upliftPctBQ > 0 && yearCountBQ > 1) autoNotes.push(`${upliftPctBQ}% annual uplift`);

  const tier     = state.foundation.selectedTier;
  const tierName = C.foundation_tiers[tier]?.name || '';
  const t        = tier ? C.foundation_tiers[tier] : null;
  const bst      = state.foundation.boosters;
  const b        = t ? C.foundation_boosters[tier] : null;

  // Build inclusions list
  const inclusions = [];

  // Foundation
  if (state.pricingModel === 'consumption') {
    const ct         = C.consumption_tiers[tier];
    const bqAddUsers = bst.users || 0;
    const bqSupportName = bst.support
      ? ({ bronze: 'Advantage Bronze', silver: 'Advantage Silver', gold: 'Advantage Gold' }[bst.support] ?? ct.support)
      : ct.support;
    inclusions.push({
      group: `NEO Foundation — ${ct.name}`,
      items: [
        `${ct.included_tb + (bst.volume || 0)} TB/yr`,
        `${ct.users + bqAddUsers} concurrent users (${ct.users} included${bqAddUsers > 0 ? `, ${bqAddUsers} additional` : ''})`,
        `${bqSupportName} support`,
      ].filter(Boolean)
    });
  } else if (tierName) {
    const workers  = t ? (t.workers  + (bst.workers  || 0)) : '—';
    const volume   = t ? (t.workers + (bst.workers || 0)) * 5 : '—';
    const users    = t ? (t.users    + (bst.users    || 0)) : '—';
    const training = t ? (t.training_hours + (bst.trainingHours || 0)) : '—';
    const support  = bst.support ? bst.support.charAt(0).toUpperCase() + bst.support.slice(1) : (t?.support_level || '');
    inclusions.push({
      group: 'NEO Foundation — ' + tierName,
      items: [
        `${workers} processing workers`,

        `${users} concurrent users`,
        `${training} training credits`,
        support ? `Advantage ${support} support` : null,
      ].filter(Boolean)
    });
  }

  // AI Suite
  const aiMap = { enrich: 'enrich', semantic: 'semantic', transcription: 'transcription', agenticBYOAI: 'agentic_byo_ai', byoAIAdvanced: 'byo_ai_advanced', byoAIGraph: 'byo_ai_graph', agenticAdvanced: 'agentic_advanced' };
  const aiSelected = Object.entries(state.aiSuite).filter(([,v])=>v).map(([k]) => C.ai_suite_modules[aiMap[k]]?.name).filter(Boolean);
  if (aiSelected.length) inclusions.push({ group: 'AI Suite', items: aiSelected });

  // Solutions Library — bundled at no charge with Enrich/Semantic Search/Transcription
  if (!state.useCases.foundationOnly) {
    inclusions.push({ group: 'Solutions Library', items: ['Included at no charge'] });
  }

  // Enhanced
  const ec = state.enhancedCap;
  const ecItems = [
    ec.discover_saas.selected     && `Nuix Discover SaaS (${ec.discover_saas.active_gb} GB active / ${ec.discover_saas.archive_gb} GB archive)`,
    ec.discover_onprem.selected   && `Nuix Discover On-Prem (${ec.discover_onprem.instances} instance${ec.discover_onprem.instances>1?'s':''}, ${ec.discover_onprem.users} users)`,
    ec.adaptive_security.selected && `Adaptive Security (${ec.adaptive_security.endpoints} endpoints, ${ec.adaptive_security.users} users, ${ec.adaptive_security.servers} servers)`,
    state.visualisation.selected  && (vbSum => `Knowledge Graph — ${vbSum.bundle.name}`)(getVisualisationBundlePricing(state.visualisation)),
    ...(ec.ecc && ec.ecc.selected ? [C.enhanced_capabilities.nuix_modules.ecc?.name] : []),
    ...(ec.legal_hold?.selected ? [`Nuix Automate Legal Hold (${ec.legal_hold.custodians} custodian${ec.legal_hold.custodians>1?'s':''})`] : []),
    ...(ec.automated_relativity?.selected ? ['Automated Relativity Export and Orchestration'] : []),
    ...(ec.abbyy?.selected ? ['ABBYY OCR'] : []),
    ...(Object.values(ec.q1_dynamics?.connectors||{}).some(v=>v) ? ['Q1 Dynamics'] : []),
    ...(ec.t3k?.selected ? ['T3K (Media Analysis)'] : []),
    ...(ec.veritone?.selected ? ['Veritone'] : []),
  ].filter(Boolean);
  if (ecItems.length) inclusions.push({ group: 'Enhanced Capabilities', items: ecItems });

  const inclusionsHtml = inclusions.map(g => `
    <div class="inc-group">
      <div class="inc-group-title">${g.group}</div>
      <ul>${g.items.map(i=>`<li>${i}</li>`).join('')}</ul>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix Quote – ${cust.name || 'Customer'} – ${quoteRef}</title>
  <style>
    @page { margin: 28mm 22mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; font-size: 13px; line-height: 1.6; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 0; }
    .q-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; border-bottom: 3px solid #0056e3; margin-bottom: 32px; }
    .q-logo { height: 36px; width: auto; display: block; }
    .q-meta { text-align: right; }
    .q-meta .ref  { font-size: 18px; font-weight: 700; color: #003080; }
    .q-meta .date { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .q-meta .draft { display: inline-block; background: #FEF3C7; color: #92400E; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 4px; margin-top: 6px; letter-spacing: 0.5px; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0056e3; margin-bottom: 12px; }
    .customer-block { margin-bottom: 28px; }
    .customer-block h2 { font-size: 22px; font-weight: 800; color: #003080; margin-bottom: 4px; }
    .customer-meta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .customer-meta span { font-size: 12px; color: #6b7280; background: #f3f5f8; padding: 3px 10px; border-radius: 4px; font-weight: 500; }
    .info-strip { background: #f3f5f8; border-radius: 10px; padding: 18px 22px; margin-bottom: 28px; display: flex; gap: 32px; flex-wrap: wrap; }
    .info-item .ilabel { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; margin-bottom: 4px; }
    .info-item .ivalue { font-size: 15px; font-weight: 700; color: #003080; }
    .price-hero { background: linear-gradient(135deg, #003080 0%, #0046c0 100%); border-radius: 14px; padding: 32px 36px; margin-bottom: 28px; color: #fff; }
    .price-hero .ph-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.55); margin-bottom: 10px; }
    .price-hero .ph-price { font-size: 44px; font-weight: 900; letter-spacing: -2px; line-height: 1; margin-bottom: 6px; }
    .price-hero .ph-sub   { font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 20px; }
    .price-hero .ph-divider { height: 1px; background: rgba(255,255,255,0.15); margin-bottom: 16px; }
    .price-hero .ph-contract { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.65); }
    .price-hero .ph-contract span:last-child { font-weight: 700; color: #818cf8; font-size: 15px; }
    .adj-note { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #166534; }
    .inc-group { margin-bottom: 20px; }
    .inc-group-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #003080; background: #EBF0FF; padding: 7px 14px; border-radius: 6px; margin-bottom: 8px; }
    .inc-group ul { list-style: none; padding: 0; }
    .inc-group li { padding: 7px 14px; border-bottom: 1px solid #f0f2f8; font-size: 13px; color: #374151; display: flex; align-items: center; gap: 8px; }
    .inc-group li::before { content: '✓'; color: #059669; font-weight: 700; flex-shrink: 0; }
    .inc-group li:last-child { border-bottom: none; }
    .terms { background: #f9fafb; border-left: 3px solid #0056e3; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 28px 0; font-size: 12px; color: #374151; line-height: 1.8; }
    .terms strong { color: #003080; }
    .q-footer { border-top: 1px solid #e5e7eb; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
    .q-footer .confidential { font-size: 11px; color: #9ca3af; font-style: italic; }
    .q-footer .nuix-footer  { font-size: 11px; color: #0056e3; font-weight: 700; }
    .print-bar { background: #003080; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .print-bar span { color: rgba(255,255,255,0.7); font-size: 13px; }
    .print-btn { background: #0056e3; color: #fff; border: none; padding: 9px 22px; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span>Nuix Bundled Quote — ${quoteRef} — Preview</span>
    <button class="print-btn" onclick="window.print()">🖨 Save as PDF / Print</button>
  </div>
  <div class="page">
    <div class="q-header">
      <img class="q-logo" src="Nuix_Logo_Wikipedia.png" alt="Nuix">
      <div class="q-meta">
        <div class="ref">${quoteRef}</div>
        <div class="date">Prepared: ${today}</div>
        <div class="draft">PRELIMINARY DRAFT</div>
      </div>
    </div>

    <div class="customer-block">
      <div class="section-label">Prepared for</div>
      <h2>${cust.name || 'Customer'}</h2>
      <div class="customer-meta">
        ${country  ? `<span>📍 ${country}</span>` : ''}
        ${cust.type ? `<span>${cust.type}</span>` : ''}
      </div>
    </div>

    <div class="info-strip">
      <div class="info-item"><div class="ilabel">Product</div><div class="ivalue">Nuix NEO</div></div>
      <div class="info-item"><div class="ilabel">Contract term</div><div class="ivalue">${cust.contractMonths || 12} months</div></div>
      ${cust.contractStartDate ? `<div class="info-item"><div class="ilabel">Start date</div><div class="ivalue">${cust.contractStartDate}</div></div>` : ''}
      ${upliftPctBQ > 0 && yearCountBQ > 1 ? `<div class="info-item"><div class="ilabel">Annual uplift</div><div class="ivalue">${upliftPctBQ}%</div></div>` : ''}
      <div class="info-item"><div class="ilabel">Foundation tier</div><div class="ivalue">${tierName || '—'}</div></div>
      <div class="info-item"><div class="ilabel">Valid for</div><div class="ivalue">30 days</div></div>
    </div>

    <div class="price-hero">
      <div class="ph-label">Year 1 Annual Contract Value</div>
      <div class="ph-price">${fmt(totNet)}</div>
      <div class="ph-sub">per year${country ? ' · ' + country : ''}${autoNotes.length ? ' · ' + autoNotes.join(' · ') : ''}</div>
      ${yearCountBQ > 1 ? `<div class="ph-divider"></div>
      ${bqPeriods.map((p, pi) => `<div class="ph-contract"><span>${p.label}${p.upliftExp > 0 && p.fraction === 1 ? ` <span style="font-size:11px;opacity:0.65">(+${((Math.pow(1+upliftPctBQ/100,p.upliftExp)-1)*100).toFixed(1)}% on yr 1)</span>` : p.fraction < 1 ? ` <span style="font-size:11px;opacity:0.65">(${p.months} mo pro-rated)</span>` : ''}</span><span>${fmt(getPeriodPrice(netForPeriodBQ(pi), p))}</span></div>`).join('')}
      <div class="ph-contract" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.15)"><span>Total contract value (${cust.contractMonths || 12} months)</span><span>${fmt(totContract)}</span></div>
      ${upliftPctBQ > 0 ? `<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:6px">${upliftPctBQ}% annual uplift applied from Year 2</div>` : ''}` : ''}
    </div>

    <div class="section-label">What's included</div>
    ${inclusionsHtml}

    <div class="terms">
      <strong>Pricing basis:</strong> All amounts in USD. This is a bundled quote price — individual component pricing is available on request.<br><br>
      <strong>Payment terms:</strong> Annual in advance. Multi-year contracts invoiced annually unless otherwise agreed.<br><br>
      <strong>Validity:</strong> This quote is valid for 30 days from the date of issue and is subject to final commercial agreement and standard Nuix terms and conditions.
    </div>

    <div class="q-footer">
      <div class="confidential">Confidential — prepared for ${cust.name || 'the named customer'} only</div>
      <div class="nuix-footer">nuix.com</div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── Price List ───────────────────────────────────────────────────────────────

function updateConfigValue(path, value) {
  const parts = path.split('.');
  let obj = window.PRICING_CONFIG;
  for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
  obj[parts[parts.length - 1]] = value;
}

function showRegionalPricing() {
  const C   = cfg();
  const rm  = C.regional_multipliers;
  const src = C.regional_data_source;
  const govDisc = C.discount_rules.government_max;

  // Build country → index map so JS in child window can look up by index
  let rowIdx = 0;
  const countryIndex = {};

  const regionRows = Object.entries(C.regions).map(([region, countries]) => {
    const sorted = [...countries].sort((a, b) => (rm[b] ?? 1) - (rm[a] ?? 1) || a.localeCompare(b));
    const rows = sorted.map(country => {
      const idx    = rowIdx++;
      countryIndex[idx] = country;
      const mult   = rm[country] ?? 1;
      const basis  = src[country] || '—';
      const basisShort = basis.startsWith('ILO') ? 'ILO actual' : basis.startsWith('GDP') ? 'GDP regression' : basis;
      const discPct = Math.round((1 - mult) * 100);
      const bar    = Math.min(100, Math.round(mult * 100));
      const barCol = mult >= 0.90 ? '#059669' : mult >= 0.75 ? '#0056e3' : mult >= 0.60 ? '#D97706' : '#DC2626';
      const discHtml = discPct > 0 ? `+${discPct}%` : discPct < 0 ? `−${Math.abs(discPct)}%` : '<span style="color:#9ca3af">—</span>';
      return `
        <tr class="rp-row">
          <td class="rp-country">${country}</td>
          <td class="rp-mult">
            <div class="rp-input-wrap">
              <span class="rp-input-static">${(mult * 100).toFixed(0)}</span>
              <span class="rp-of">% of US</span>
            </div>
          </td>
          <td class="rp-disc" id="disc-${idx}">${discHtml}</td>
          <td class="rp-bar-cell">
            <div class="rp-bar-track">
              <div class="rp-bar-fill" id="bar-${idx}" style="width:${bar}%;background:${barCol}"></div>
            </div>
          </td>
          <td class="rp-basis" title="${basis}">${basisShort}</td>
        </tr>`;
    }).join('');
    return `
      <tbody>
        <tr class="rp-region-header"><td colspan="5">${region}</td></tr>
        ${rows}
      </tbody>`;
  }).join('');

  const countryMapJson = JSON.stringify(countryIndex);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix NEO — Regional Pricing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f6fa; color: #1a1a2e; }
    header { background: #0056e3; padding: 0 32px; height: 60px; display: flex; align-items: center; gap: 16px; }
    header img { height: 30px; display: block; }
    .hdiv { width: 1px; height: 28px; background: rgba(255,255,255,0.2); }
    header h1 { color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
    .container { max-width: 900px; margin: 32px auto; padding: 0 24px 80px; }

    .intro-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); padding: 24px 28px; margin-bottom: 24px; display: flex; gap: 32px; flex-wrap: wrap; align-items: flex-start; }
    .intro-card h2 { font-size: 18px; font-weight: 800; color: #003080; margin-bottom: 6px; }
    .intro-card p  { font-size: 13px; color: #6b7280; line-height: 1.6; max-width: 480px; }
    .legend { display: flex; gap: 16px; flex-wrap: wrap; margin-left: auto; }
    .leg-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #374151; }
    .leg-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    .rp-table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    .rp-region-header td { background: #0056e3; color: #fff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 10px 20px; }
    .rp-row { border-bottom: 1px solid #f0f2f8; }
    .rp-row:last-child { border-bottom: none; }
    .rp-row:hover { background: #f8f9fc; }
    .rp-country { padding: 13px 20px; font-size: 14px; font-weight: 600; color: #1a1a2e; width: 200px; }
    .rp-mult { padding: 8px 16px; font-size: 15px; font-weight: 700; color: #003080; white-space: nowrap; width: 140px; }
    .rp-input-wrap { display: flex; align-items: center; gap: 6px; }
    .rp-input-static { font-size: 14px; font-weight: 700; color: #003080; min-width: 32px; text-align: right; }
    .rp-of { font-size: 12px; font-weight: 500; color: #6b7280; }
    .rp-disc { padding: 13px 16px; font-size: 13px; font-weight: 600; color: #059669; width: 80px; }
    .rp-bar-cell { padding: 13px 20px 13px 8px; }
    .rp-bar-track { background: #f0f2f8; border-radius: 6px; height: 8px; width: 100%; overflow: hidden; }
    .rp-bar-fill  { height: 100%; border-radius: 6px; transition: width 0.3s, background 0.3s; }
    .rp-basis { padding: 13px 20px 13px 8px; font-size: 11px; font-weight: 600; color: #6b7280; white-space: nowrap; }

    .gov-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); padding: 24px 28px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
    .gov-card h3 { font-size: 15px; font-weight: 700; color: #003080; margin-bottom: 4px; }
    .gov-card p  { font-size: 12px; color: #6b7280; }
    .gov-badge { font-size: 28px; font-weight: 900; color: #0056e3; }

    .note { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 14px 20px; margin-top: 24px; font-size: 12px; color: #92400E; line-height: 1.6; }

    .method-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); padding: 24px 28px; margin-top: 24px; }
    .method-card h2 { font-size: 16px; font-weight: 800; color: #003080; margin-bottom: 16px; }
    .method-row { display: flex; gap: 20px; padding: 12px 0; border-top: 1px solid #f0f2f8; }
    .method-row:first-of-type { border-top: none; }
    .method-label { width: 170px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: #003080; text-transform: uppercase; letter-spacing: 0.4px; }
    .method-text { font-size: 13px; color: #374151; line-height: 1.6; }
    .method-sources { font-size: 11px; color: #9ca3af; margin-top: 16px; line-height: 1.6; }
  </style>
</head>
<body>
<header>
  <img src="NXL.AX_BIG.D-4e4ae371.png" alt="Nuix">
  <div class="hdiv"></div>
  <h1>NEO — Regional Pricing</h1>
</header>
<div class="container">

  <div class="intro-card">
    <div>
      <h2>Regional Localisation</h2>
      <p>Nuix NEO list prices are set in USD and every customer is quoted that same list price, in their deal currency. Country-based price localisation does not reduce the price, it widens the allowed discount ceiling (before CEO approval), compounding with the standard 20% Additional Discount, plus any government and multi-year deal based discounts.</p>
    </div>
    <div class="legend">
      <div class="leg-item"><div class="leg-dot" style="background:#059669"></div>90–100% of US</div>
      <div class="leg-item"><div class="leg-dot" style="background:#0056e3"></div>75–89% of US</div>
      <div class="leg-item"><div class="leg-dot" style="background:#D97706"></div>60–74% of US</div>
      <div class="leg-item"><div class="leg-dot" style="background:#DC2626"></div>Below 60% of US</div>
    </div>
  </div>

  <div class="rp-table-wrap">
    <table>
      <thead>
        <tr style="background:#f0f4ff">
          <th style="padding:11px 20px;font-size:11px;font-weight:700;text-align:left;color:#003080;text-transform:uppercase;letter-spacing:0.5px">Country</th>
          <th style="padding:11px 16px;font-size:11px;font-weight:700;text-align:left;color:#003080;text-transform:uppercase;letter-spacing:0.5px">Localisation Rate</th>
          <th style="padding:11px 16px;font-size:11px;font-weight:700;text-align:left;color:#003080;text-transform:uppercase;letter-spacing:0.5px">Ceiling Headroom</th>
          <th style="padding:11px 20px 11px 8px;font-size:11px;font-weight:700;text-align:left;color:#003080;text-transform:uppercase;letter-spacing:0.5px">Relative to USD</th>
          <th style="padding:11px 20px 11px 8px;font-size:11px;font-weight:700;text-align:left;color:#003080;text-transform:uppercase;letter-spacing:0.5px">Basis</th>
        </tr>
      </thead>
      ${regionRows}
    </table>
  </div>

  <div class="note">
    <strong>How the ceiling is built:</strong> The price stays at US list. Levers compound (multiplicative, not additive) to size the discount ceiling. For example, a country at 88% of US, a government customer (20%), and the standard 20% Additional Discount give a floor of 80% × 88% × 80% = 56.3% of list — a discount ceiling of <strong>43.7% off list</strong> before CEO approval. Multi-year term adds further headroom.
  </div>

  <div class="method-card">
    <h2>Methodology — how the index is built</h2>
    <div class="method-row">
      <div class="method-label">Objective</div>
      <div class="method-text">Calibrate Nuix Neo list pricing to local purchasing power across every country Nuix has ever sold in, using white-collar/professional labor cost as the anchor, since this is the labor category Nuix Neo substitutes.</div>
    </div>
    <div class="method-row">
      <div class="method-label">Primary data source</div>
      <div class="method-text">ILO median monthly earnings by occupation (ISCO-08 classification, category 2 "Professionals"), converted to USD at market exchange rates — not purchasing-power-adjusted rates — since Nuix invoices and collects revenue in hard currency. This directly covered 75 of the 121 countries Nuix has ever billed in.</div>
    </div>
    <div class="method-row">
      <div class="method-label">Imputation method</div>
      <div class="method-text">For the 37 remaining countries lacking a direct USD-converted ILO figure (mainly Gulf states and select smaller/developing markets), Professional wages were estimated using a log-log OLS regression of the 28 highest-confidence ILO actuals against IMF nominal GDP per capita (current USD prices, 2025). The regression achieved R² = 0.89. The same fitted coefficients were applied to every imputed country for consistency.</div>
    </div>
    <div class="method-row">
      <div class="method-label">Index construction</div>
      <div class="method-text">Each country's Professional wage (actual or estimated) was indexed against the United States (index = 100). Countries pricing above the US are capped at 100. Countries at the low end are floored at 55, so no market prices below 55% of US list price.</div>
    </div>
    <div class="method-row">
      <div class="method-label">Data provenance</div>
      <div class="method-text">Every country is tagged "ILO actual" (directly measured) or "GDP per capita (nominal) regression" (estimated) — shown in the Basis column above — so confidence levels remain visible.</div>
    </div>
    <div class="method-row">
      <div class="method-label">Countries excluded</div>
      <div class="method-text">9 small territories/dependencies had no usable ILO or IMF data and were excluded from the index entirely: Bermuda, British Virgin Islands, Cocos (Keeling) Islands, Gibraltar, Greenland, Guernsey, Isle of Man, Jersey, and Monaco. These are generally small offshore territories whose economies are closely tied to a parent or neighboring jurisdiction (e.g. Greenland to Denmark, Gibraltar/Jersey/Guernsey/Isle of Man to the UK, Cocos (Keeling) Islands to Australia). If pricing is needed for any of these, peg manually to the nearest comparable market rather than treating the absence as a zero or default rate.</div>
    </div>
    <div class="method-sources">
      Sources: ILO, Median monthly earnings by sex and occupation (ILOSTAT), extracted 14 July 2026. IMF, World Economic Outlook Database — GDP per capita, current prices (U.S. dollars per capita), extracted 15 July 2026.<br>
      Full workbook: "Revised Regional Localisation and Methodology Final.xlsx" — Country Pricing Index tab (raw data + Final Index (bounded)) and Methodology tab (full derivation).
    </div>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function showPriceList() {
  const C = cfg();
  const win = window.open('', '_blank');
  const tierKeys = ['light', 'core', 'rapid'];
  const nm = C.enhanced_capabilities.nuix_modules;

  const countryOpts = Object.entries(C.regions).map(([region, countries]) =>
    `<optgroup label="${region}">${countries.map(c =>
      `<option value="${c}" ${c === 'United States' ? 'selected' : ''}>${c}</option>`
    ).join('')}</optgroup>`
  ).join('');

  // All config data embedded as mutable JS object
  const CONFIG_JSON = JSON.stringify({
    rm:      C.regional_multipliers,
    govDisc: C.discount_rules.government_max,
    currencies:     CURRENCIES,
    countryCurrency: COUNTRY_CURRENCY,
    tiers:   tierKeys.map(k => ({ key: k, name: C.foundation_tiers[k].name, price: C.foundation_tiers[k].price })),
    boost:   tierKeys.map(k => ({ key: k, name: C.foundation_tiers[k].name, b: C.foundation_boosters[k] })),
    consTiers: tierKeys.map(k => ({ key: k, name: C.consumption_tiers[k].name, price: C.consumption_tiers[k].price, included_tb: C.consumption_tiers[k].included_tb, users: C.consumption_tiers[k].users, training_hours: C.consumption_tiers[k].training_hours, tb_booster_rate: C.consumption_tiers[k].tb_booster_rate })),
    support: [
      { key: 'bronze', name: 'Advantage Bronze upgrade', desc: 'Included in Standard', price: C.support_booster_prices.bronze },
      { key: 'silver', name: 'Advantage Silver upgrade', desc: 'Upgrade from Advantage Bronze',     price: C.support_booster_prices.silver },
      { key: 'gold',   name: 'Advantage Gold upgrade',   desc: 'Upgrade from Advantage Silver',     price: C.support_booster_prices.gold   }
    ],
    ai: Object.entries(C.ai_suite_modules).map(([key, m]) => ({ key, name: m.name, prices: tierKeys.map(k => m.price[k]) })),
    uc: Object.entries(C.use_case_modules).map(([key, m]) => ({ key, name: m.label, desc: m.description, prices: tierKeys.map(k => m.price[k]) })),
    nm: {
      discover_saas:     { name: nm.discover_saas.name,     desc: nm.discover_saas.description,     active_gb_month: nm.discover_saas.active_gb_month, archive_gb_month: nm.discover_saas.archive_gb_month },
      discover_onprem:   { name: nm.discover_onprem.name,   desc: nm.discover_onprem.description,   price_per_instance: nm.discover_onprem.price_per_instance, price_per_user: nm.discover_onprem.price_per_user },
      adaptive_security: { name: nm.adaptive_security.name, desc: nm.adaptive_security.description, price_per_endpoint: nm.adaptive_security.price_per_endpoint, price_per_user: nm.adaptive_security.price_per_user, price_per_server: nm.adaptive_security.price_per_server },
      linkurious:        { name: nm.linkurious.name,        desc: nm.linkurious.description,        user_tiers: nm.linkurious.user_tiers, memory_tiers: nm.linkurious.memory_tiers },
      ecc:               { name: nm.ecc.name,               desc: nm.ecc.description,               price_per_endpoint: nm.ecc.price_per_endpoint },
      legal_hold:        { name: nm.legal_hold.name,        desc: nm.legal_hold.description,        price_per_custodian_month: nm.legal_hold.price_per_custodian_month },
      automated_relativity: { name: nm.automated_relativity.name, desc: nm.automated_relativity.description, list_price: nm.automated_relativity.list_price }
    },
    tp:   C.enhanced_capabilities.third_party,
    poc:    C.poc_price_per_month,
    cons:   C.consulting.roles,
    cslt300: C.consulting.cslt300_price,
    cslt301: C.consulting.cslt301_price,
    nonProd: C.non_prod.skus
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix Neo — Price List</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f6fa; color: #1a1a2e; }
    header { background: #0056e3; padding: 0 32px; height: 60px; display: flex; align-items: center; gap: 16px; }
    header img { height: 30px; display: block; }
    .hdiv { width: 1px; height: 28px; background: rgba(255,255,255,0.2); }
    header h1 { color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
    .filter-bar { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 14px 40px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .fl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; }
    .filter-bar select { border: 1.5px solid #d1d5db; border-radius: 8px; padding: 6px 12px; font-size: 13px; color: #1a1a2e; background: #fff; cursor: pointer; }
    .tog { display: flex; border: 1.5px solid #d1d5db; border-radius: 8px; overflow: hidden; }
    .tbtn { padding: 6px 16px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: #fff; color: #6b7280; }
    .tbtn.on { background: #0056e3; color: #fff; }
    #fsumm { margin-left: auto; font-size: 12px; color: #374151; }
    #fsumm strong { color: #003080; }
      .container { max-width: 1060px; margin: 28px auto; padding: 0 24px 80px; }
    .section { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); margin-bottom: 24px; overflow: hidden; }
    .stitle { background: #0056e3; color: #fff; padding: 11px 22px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f0f4ff; }
    th { padding: 9px 18px; font-size: 11px; font-weight: 700; color: #003080; text-align: right; text-transform: uppercase; letter-spacing: 0.4px; }
    th:first-child { text-align: left; }
    tbody tr { border-bottom: 1px solid #f0f2f8; }
    tbody tr:last-child { border-bottom: none; }
    td { padding: 11px 18px; vertical-align: middle; }
    td.lbl { width: 30%; vertical-align: top; padding-top: 13px; }
    .iname { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 2px; }
    .idesc { font-size: 11px; color: #6b7280; line-height: 1.4; }
    td.pc { text-align: right; vertical-align: middle; }
    .pfield { display: inline-block; text-align: right; }
    .pfield .pv { display: block; }
    .pfield .pv .adj-val { font-size: 15px; font-weight: 700; color: #003080; }
    .pfield .pv .suf-val { font-size: 11px; color: #9ca3af; }
    .pfield .pv .usd-list { display: block; font-size: 11px; color: #9ca3af; text-decoration: line-through; margin-top: 2px; }
    .note { background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 13px 20px; margin-bottom: 24px; font-size: 13px; color: #166534; }
    .note strong { display: block; margin-bottom: 3px; }
    footer { text-align: center; padding: 28px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
<header>
  <img src="NXL.AX_BIG.D-4e4ae371.png" alt="Nuix">
  <div class="hdiv"></div>
  <h1>NEO — Price List</h1>
</header>

<div class="filter-bar">
  <span class="fl">Country</span>
  <select id="fc" onchange="refresh()">${countryOpts}</select>
  <span class="fl">Customer</span>
  <div class="tog">
    <button class="tbtn on" id="bc" onclick="setGov(false)">Commercial</button>
    <button class="tbtn"    id="bg" onclick="setGov(true)">Government</button>
  </div>
  <span id="fsumm">Showing <strong>USD list prices</strong></span>
</div>

<div class="container">
  <div id="content"></div>
  <div class="note">
    <strong>Discount ceiling — not a price cut</strong>
    Every customer is quoted the US list price above — the country picker's currency conversion is a display convenience only, at fixed rates, and never changes the underlying price. Government and regional selections widen the rep's discount ceiling; multi-year adds 5%/yr more headroom (up to 30%). Selling past the ceiling requires CEO approval.
  </div>
</div>
<footer>Nuix Neo Pricing Tool — For internal use only · Prices subject to change</footer>

<script>
  const D = ${CONFIG_JSON};

  // SKU codes for the rows below. Consumption tiers, Knowledge Graph, ABBYY and Q1
  // already carry their SKUs in D (from pricing.config.js); the rest are mapped here
  // from the master SKU catalogue (same codes as the SKU List page).
  const SKU = {
    foundation:    { light: 'NEO007S',  core: 'NEO007MD', rapid: 'NEO007L' },
    consumption:   { light: 'NEO007CS', core: 'NEO007CMD', rapid: 'NEO007CL' },
    consumptionTb: { light: 'NEOBTBS',  core: 'NEOBTBMD', rapid: 'NEOBTBL' },
    worker:        { light: 'NEOBWS',   core: 'NEOBWMD',  rapid: 'NEOBWL' },
    volume:        { light: 'NEO-BOOST-VOL-L', core: 'NEO-BOOST-VOL-C', rapid: 'NEO-BOOST-VOL-R' },
    user:          { light: 'NEOBRS',   core: 'NEOBRMD',  rapid: 'NEOBRL' },
    support:       { bronze: 'CSLT101U', silver: 'CSLT102U', gold: 'CSLT103U' },
    ai: {
      ai_bundle:        { light: 'NEOAIBNDL01S', core: 'NEOAIBNDL01MD', rapid: 'NEOAIBNDL01L' },
      enrich:           { light: 'NEOAI001S', core: 'NEOAI001MD', rapid: 'NEOAI001L' },
      semantic:         { light: 'NEOS001S',  core: 'NEOS001MD',  rapid: 'NEOS001L' },
      transcription:    { light: 'NEOS002S',  core: 'NEOS002MD',  rapid: 'NEOS002L' },
      agentic_byo_ai:   { light: 'NEOAI002S', core: 'NEOAI002MD', rapid: 'NEOAI002L' },
      byo_ai_advanced:  { light: 'NEOAI003S', core: 'NEOAI003MD', rapid: 'NEOAI003L' },
      byo_ai_graph:     { light: 'NEOAI004S', core: 'NEOAI004MD', rapid: 'NEOAI004L' },
      agentic_advanced: { light: 'NEOAI005S', core: 'NEOAI005MD', rapid: 'NEOAI005L' }
    },
    solution_pack: { light: 'NEOSLIBS', core: 'NEOSLIBMD', rapid: 'NEOSLIBL' },
    nm: {
      discover_saas:     { active: 'NRTCLGB', archive: 'NRTCLAD' },
      discover_onprem:   { instance: 'NRTOPINST', user: 'NRTOPUSER' },
      adaptive_security: { endpoint: 'ENDPT001', user: 'ENDPTUSER', server: 'ENDPTSVR' },
      ecc:               'ENDPT101',
      legal_hold:        'RALH001',
      automated_relativity: 'NEOREL01'
    }
  };

  let isGov = false, factor = 1, curSym = '$';

  function setGov(v) {
    isGov = v;
    document.getElementById('bc').classList.toggle('on', !v);
    document.getElementById('bg').classList.toggle('on',  v);
    refresh();
  }

  // The underlying price is always US list — country never discounts it. But the
  // country picker does drive a display-only currency conversion (same fixed rates
  // as the main tool's currency picker), plus the discount ceiling below.
  function getCurrency() {
    const country = document.getElementById('fc').value;
    const code = D.countryCurrency[country] || 'USD';
    return D.currencies[code] || D.currencies.USD;
  }
  function getCeiling() {
    const country = document.getElementById('fc').value;
    const rm = D.rm[country] || 1;
    const floor = 0.80 * rm * (isGov ? (1 - D.govDisc) : 1);
    return 1 - floor;   // max discount before CEO approval (excl. multi-year)
  }

  function f(n) { return curSym + Math.round(n).toLocaleString('en-US'); }

  function inp(usd, path, suf) {
    const sufVal = suf ? '<span class="suf-val"> ' + suf + '</span>' : '';
    const adj    = Math.round(usd * factor);
    return '<div class="pfield">'
      + '<div class="pv" data-usd="' + usd + '" data-suf="' + (suf||'') + '">'
      + '<span class="adj-val">' + f(adj) + '</span>' + sufVal
      + (factor !== 1 ? '<span class="usd-list">$' + Math.round(usd).toLocaleString('en-US') + ' USD list</span>' : '')
      + '</div>'
      + '</div>';
  }

  function refresh() {
    const cur = getCurrency();
    factor = cur.rate;
    curSym = cur.symbol;
    const country = document.getElementById('fc').value;
    const ceilPct = (getCeiling() * 100).toFixed(1);
    const who = isGov ? country + ' · Government' : country;
    const priceLine = factor !== 1 ? 'Showing <strong>' + cur.name + '</strong> (converted from USD list)' : 'US list';
    document.getElementById('fsumm').innerHTML =
      priceLine + ' · <strong>' + ceilPct + '% discount ceiling</strong> for ' + who + ' (before CEO approval, excl. multi-year)';

    // Update all price cells with fresh adjusted prices
    document.querySelectorAll('.pfield').forEach(field => {
      const pv     = field.querySelector('.pv');
      const usd    = parseFloat(pv.dataset.usd) || 0;
      const suf    = pv.dataset.suf || '';
      const adj    = Math.round(usd * factor);
      const sufHtml = suf ? '<span class="suf-val"> ' + suf + '</span>' : '';
      const strike  = factor !== 1 ? '<span class="usd-list">$' + Math.round(usd).toLocaleString('en-US') + ' USD list</span>' : '';
      pv.innerHTML  = '<span class="adj-val">' + f(adj) + '</span>' + sufHtml + strike;
    });
  }

  function pc(content) { return '<td class="pc">' + content + '</td>'; }
  function lbl(name, desc) { return '<td class="lbl"><div class="iname">' + name + '</div>' + (desc ? '<div class="idesc">' + desc + '</div>' : '') + '</td>'; }
  function sect(title, thead, rows) {
    return '<div class="section"><div class="stitle">' + title + '</div><table>'
      + (thead ? '<thead><tr>' + thead + '</tr></thead>' : '')
      + '<tbody>' + rows + '</tbody></table></div>';
  }

  // Build static HTML
  let html = '';

  // Foundation tiers
  html += sect('Foundation Tiers (Worker-based)', null, D.tiers.map(t =>
    '<tr>' + lbl(t.name, t.key === 'light' ? '10 workers · 10 users · 100 training credits · Advantage Bronze'
                        : t.key === 'core'  ? '30 workers · 30 users · 300 training credits · Advantage Bronze'
                        :                     '60 workers · 60 users · 600 training credits · Advantage Silver')
    + pc(inp(t.price, 'foundation_tiers.' + t.key + '.price', '/ yr · ' + SKU.foundation[t.key])) + '</tr>'
  ).join(''));

  // Consumption model — same tier pricing, metered in TB instead of workers
  html += sect('Foundation Tiers (Consumption)', null, D.consTiers.map(t =>
    '<tr>' + lbl(t.name, t.included_tb + ' TB · ' + t.users + ' users · ' + t.training_hours + ' training credits')
    + pc(inp(t.price, 'consumption_tiers.' + t.key + '.price', '/ yr · ' + SKU.consumption[t.key])) + '</tr>'
  ).join(''));

  // Boosters
  html += sect('Foundation Boosters (Worker-based)',
    '<th>Tier</th><th>Worker</th><th>Volume (TB)</th><th>User</th><th>Training Credit</th>',
    D.boost.map(r =>
      '<tr>' + lbl(r.name, '')
      + pc(inp(r.b.worker,        'foundation_boosters.' + r.key + '.worker',        '/worker · ' + SKU.worker[r.key]))
      + pc(inp(r.b.volume_tb,     'foundation_boosters.' + r.key + '.volume_tb',     '/TB · ' + SKU.volume[r.key]))
      + pc(inp(r.b.user,          'foundation_boosters.' + r.key + '.user',          '/user · ' + SKU.user[r.key]))
      + pc(inp(r.b.training_hour, 'foundation_boosters.' + r.key + '.training_hour', '/credit'))
      + '</tr>'
    ).join(''));

  // Consumption model TB booster — different rate to the worker-model volume booster above
  html += sect('Foundation Boosters (Consumption)',
    '<th>Tier</th><th>Additional TB</th>',
    D.consTiers.map(t =>
      '<tr>' + lbl(t.name, '')
      + pc(inp(t.tb_booster_rate, 'consumption_tiers.' + t.key + '.tb_booster_rate', '/TB · ' + SKU.consumptionTb[t.key]))
      + '</tr>'
    ).join(''));

  // Advantage & Implementation
  html += sect('Layer 4 — Advantage & Implementation', null, [
    ...D.support.map(s =>
      '<tr>' + lbl(s.name, s.desc) + pc(inp(s.price, 'support_booster_prices.' + s.key, '/ yr · ' + SKU.support[s.key])) + '</tr>'
    ),
    '<tr>' + lbl('Nuix Advantage Top-Up 24 (CSLT107)', 'Sold in packs of 24 hrs · all tiers')
      + pc('<div class="pfield"><div class="pv" data-usd="280" data-suf="/hr"><span class="adj-val">$280</span><span class="suf-val"> /hr</span></div></div>')
      + '</tr>',
    '<tr>' + lbl('Foundation Implementation Package (CSLT300)', 'One-off · Year 1 only for multi-year deals')
      + pc('<div class="pfield"><div class="pv" data-usd="' + D.cslt300 + '" data-suf="one-off"><span class="adj-val">' + f(D.cslt300) + '</span><span class="suf-val"> one-off</span></div></div>')
      + '</tr>',
    '<tr>' + lbl('Solution Implementation Package (CSLT301)', 'One-off · Year 1 only for multi-year deals')
      + pc('<div class="pfield"><div class="pv" data-usd="' + D.cslt301 + '" data-suf="one-off"><span class="adj-val">' + f(D.cslt301) + '</span><span class="suf-val"> one-off</span></div></div>')
      + '</tr>'
  ].join(''));

  // AI Suite
  html += sect('AI Suite (per year)',
    '<th>Module</th>' + D.tiers.map(t => '<th>' + t.name + '</th>').join(''),
    D.ai.map(m =>
      '<tr>' + lbl(m.name, '') + D.tiers.map((t, i) =>
        pc(inp(m.prices[i], 'ai_suite_modules.' + m.key + '.price.' + t.key, '/yr · ' + SKU.ai[m.key][t.key]))
      ).join('') + '</tr>'
    ).join(''));

  // Use cases
  html += sect('Solutions Library (per year)',
    '<th>Module</th>' + D.tiers.map(t => '<th>' + t.name + '</th>').join(''),
    D.uc.map(m =>
      '<tr>' + lbl(m.name, m.desc) + D.tiers.map((t, i) =>
        pc(inp(m.prices[i], 'use_case_modules.' + m.key + '.price.' + t.key, '/yr · ' + SKU.solution_pack[t.key]))
      ).join('') + '</tr>'
    ).join(''));

  // Enhanced — Nuix
  const nm = D.nm;
  html += sect('Enhanced Capabilities — Nuix Modules', null, [
    '<tr>' + lbl(nm.discover_saas.name, nm.discover_saas.desc)
      + pc(inp(nm.discover_saas.active_gb_month,  'enhanced_capabilities.nuix_modules.discover_saas.active_gb_month',  '/GB/mo active · ' + SKU.nm.discover_saas.active)
        + inp(nm.discover_saas.archive_gb_month,  'enhanced_capabilities.nuix_modules.discover_saas.archive_gb_month', '/GB/mo archive · ' + SKU.nm.discover_saas.archive))
      + '</tr>',
    '<tr>' + lbl(nm.discover_onprem.name, nm.discover_onprem.desc)
      + pc(inp(nm.discover_onprem.price_per_instance, 'enhanced_capabilities.nuix_modules.discover_onprem.price_per_instance', '/instance/yr · ' + SKU.nm.discover_onprem.instance)
        + inp(nm.discover_onprem.price_per_user,      'enhanced_capabilities.nuix_modules.discover_onprem.price_per_user',     '/user/yr · ' + SKU.nm.discover_onprem.user))
      + '</tr>',
    '<tr>' + lbl(nm.adaptive_security.name, nm.adaptive_security.desc)
      + pc(inp(nm.adaptive_security.price_per_endpoint, 'enhanced_capabilities.nuix_modules.adaptive_security.price_per_endpoint', '/endpoint · ' + SKU.nm.adaptive_security.endpoint)
        + inp(nm.adaptive_security.price_per_user,      'enhanced_capabilities.nuix_modules.adaptive_security.price_per_user',     '/user/yr · ' + SKU.nm.adaptive_security.user)
        + inp(nm.adaptive_security.price_per_server,    'enhanced_capabilities.nuix_modules.adaptive_security.price_per_server',   '/server/yr · ' + SKU.nm.adaptive_security.server))
      + '</tr>',
    '<tr>' + lbl(nm.linkurious.name + ' — Named Users', nm.linkurious.desc)
      + pc(nm.linkurious.user_tiers.map(t => inp(t.price, '', '/' + t.name + ' · ' + t.sku)).join(''))
      + '</tr>',
    '<tr>' + lbl(nm.linkurious.name + ' — Memory', '')
      + pc(nm.linkurious.memory_tiers.map(t => inp(t.price, '', '/' + t.name + ' · ' + t.sku)).join(''))
      + '</tr>',
    '<tr>' + lbl(nm.ecc.name, nm.ecc.desc)
      + pc(inp(nm.ecc.price_per_endpoint, 'enhanced_capabilities.nuix_modules.ecc.price_per_endpoint', '/endpoint/yr · ' + SKU.nm.ecc))
      + '</tr>',
    '<tr>' + lbl(nm.legal_hold.name, nm.legal_hold.desc)
      + pc(inp(nm.legal_hold.price_per_custodian_month, 'enhanced_capabilities.nuix_modules.legal_hold.price_per_custodian_month', '/custodian/month · ' + SKU.nm.legal_hold))
      + '</tr>',
    '<tr>' + lbl(nm.automated_relativity.name, nm.automated_relativity.desc)
      + pc(inp(nm.automated_relativity.list_price, 'enhanced_capabilities.nuix_modules.automated_relativity.list_price', '/year · ' + SKU.nm.automated_relativity))
      + '</tr>'
  ].join(''));

  // Third party
  const tp = D.tp;
  html += sect('Enhanced Capabilities — Third Party', null, [
    '<tr>' + lbl(tp.abbyy.name, tp.abbyy.description + ' — package prices below')
      + pc('<span style="font-size:12px;color:#6b7280">See packages</span>')
      + '</tr>',
    ...tp.abbyy.packages.map(p =>
      '<tr><td style="padding:6px 16px 6px 32px;font-size:12px;color:#374151">' + p.sku + ' — ' + p.name + '</td>'
      + '<td style="text-align:right;padding:6px 16px;font-size:13px;font-weight:700;color:#003080">$' + p.price.toLocaleString() + '/yr</td>'
      + '</tr>'
    ),
    '<tr>' + lbl(tp.t3k.name, tp.t3k.description)
      + pc(inp(tp.t3k.price_per_instance, 'enhanced_capabilities.third_party.t3k.price_per_instance', '/connector · T3KCON001')
        + inp(tp.t3k.price_per_worker,    'enhanced_capabilities.third_party.t3k.price_per_worker',   '/worker · T3KCORE001'))
      + '</tr>',
    '<tr><td colspan="2" style="padding:2px 16px 2px 32px;font-size:11px;color:#9ca3af">T3K TB tiers (USD): 10TB $32,000 (T3KCORETB10) · 30TB $68,000 (T3KCORETB30) · 50TB $90,000 (T3KCORETB50) · 100TB $120,000 (T3KCORETB100) · 150TB $154,000 (T3KCORETB150)</td></tr>',
    '<tr><td colspan="2" style="padding:2px 16px 8px 32px;font-size:11px;color:#9ca3af">T3K user tiers (USD): 10 users $20,440 (T3KCOREUR10) · 15 $26,040 (T3KCOREUR15) · 20 $29,120 (T3KCOREUR20) · 30 $37,800 (T3KCOREUR30) · 50 $53,200 (T3KCOREUR50)</td></tr>',
    '<tr>' + lbl(tp.veritone.name, tp.veritone.description)
      + pc(inp(tp.veritone.price_per_instance,        'enhanced_capabilities.third_party.veritone.price_per_instance',        '/connector · VERTSCPCON2')
        + inp(tp.veritone.price_first_language,       'enhanced_capabilities.third_party.veritone.price_first_language',      '/1st lang · VERTSLTLAN1')
        + inp(tp.veritone.price_additional_language,  'enhanced_capabilities.third_party.veritone.price_additional_language', '/add. lang · VERTSLTLANS'))
      + '</tr>',
    '<tr><td colspan="2" style="padding:2px 16px 8px 32px;font-size:11px;color:#9ca3af">Veritone transcription tiers (USD): 15K hrs $33,010 (VERTSCPSML) · 40K $82,500 (VERTSCPMED) · 67K $132,000 (VERTSCPLRG) · 135K $220,000 (VERTSCPXLG)</td></tr>',
    '<tr>' + lbl(tp.q1_dynamics.name, tp.q1_dynamics.description + ' — individual connector prices below')
      + pc('<span style="font-size:12px;color:#6b7280">See connectors</span>')
      + '</tr>',
    ...tp.q1_dynamics.connectors.map(c =>
      '<tr><td style="padding:6px 16px 6px 32px;font-size:12px;color:#374151">' + c.sku + ' — ' + c.name + '</td>'
      + '<td style="text-align:right;padding:6px 16px;font-size:13px;font-weight:700;color:#003080">$' + c.price.toLocaleString() + '/yr</td>'
      + '</tr>'
    ),
  ].join(''));

  // Test Environments — list_price is null until pricing is confirmed, shown as TBC
  html += sect('Layer 5 — Test Environments', null, D.nonProd.map(s =>
    '<tr>' + lbl(s.name, s.description)
      + pc(s.list_price == null
        ? '<span style="font-size:12px;color:#6b7280">Price TBC · ' + s.sku + '</span>'
        : inp(s.list_price, 'non_prod.skus', '/unit/yr · ' + s.sku))
      + '</tr>'
  ).join(''));


  document.getElementById('content').innerHTML = html;
  refresh();

</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

// ─── SKU List page ────────────────────────────────────────────────────────────

function showSKUListPage() {
  const skuRows = [
    ['Layer 1 – Nuix Neo Foundation','NEO007S','Nuix Neo Foundation – Standard','Per year','$155,000','10 workers · 10 users · 100 training hrs · Advantage Bronze'],
    ['Layer 1 – Nuix Neo Foundation','NEO007MD','Nuix Neo Foundation – Accelerate','Per year','$400,000','30 workers · 30 users · 300 training hrs · Advantage Bronze'],
    ['Layer 1 – Nuix Neo Foundation','NEO007L','Nuix Neo Foundation – Performance','Per year','$720,000','60 workers · 60 users · 600 training hrs · Advantage Silver'],
    ['Layer 1 – Nuix Neo Foundation (Consumption)','NEO007CS','Nuix Neo Foundation – Standard (Consumption)','Per year','$155,000','10TB · 10 users · 100 training hrs · Advantage Bronze'],
    ['Layer 1 – Nuix Neo Foundation (Consumption)','NEO007CMD','Nuix Neo Foundation – Accelerate (Consumption)','Per year','$400,000','40TB · 30 users · 300 training hrs · Advantage Bronze'],
    ['Layer 1 – Nuix Neo Foundation (Consumption)','NEO007CL','Nuix Neo Foundation – Performance (Consumption)','Per year','$720,000','75TB · 60 users · 600 training hrs · Advantage Silver'],
    ['Layer 1 – Foundation Booster','NEOBWS','Additional Worker – Standard','Per worker/yr','$31,000',''],
    ['Layer 1 – Foundation Booster','NEOBWMD','Additional Worker – Accelerate','Per worker/yr','$27,000',''],
    ['Layer 1 – Foundation Booster','NEOBWL','Additional Worker – Performance','Per worker/yr','$24,000',''],
    ['Layer 1 – Foundation Booster','NEOBRS','Additional Concurrent User – Standard','Per user/yr','$9,000',''],
    ['Layer 1 – Foundation Booster','NEOBRMD','Additional Concurrent User – Accelerate','Per user/yr','$6,000',''],
    ['Layer 1 – Foundation Booster','NEOBRL','Additional Concurrent User – Performance','Per user/yr','$3,000',''],
    ['Layer 1 – Foundation Booster (Consumption)','NEOBTBS','Additional TB – Standard (Consumption)','Per TB/yr','$31,000',''],
    ['Layer 1 – Foundation Booster (Consumption)','NEOBTBMD','Additional TB – Accelerate (Consumption)','Per TB/yr','$20,000',''],
    ['Layer 1 – Foundation Booster (Consumption)','NEOBTBL','Additional TB – Performance (Consumption)','Per TB/yr','$19,200',''],
    ['Layer 4 – Advantage & Implementation','CSLT101U','Support Upgrade – Advantage Bronze','Per year','$30,000','Included in Standard; incremental for Accelerate/Performance'],
    ['Layer 4 – Advantage & Implementation','CSLT102U','Support Upgrade – Advantage Silver','Per year','$60,000','$30,000 incremental from Bronze'],
    ['Layer 4 – Advantage & Implementation','CSLT103U','Support Upgrade – Advantage Gold','Per year','$105,000','$75,000 from Bronze · $45,000 from Silver'],
    ['Layer 4 – Advantage & Implementation','CSLT101F','Advantage Bronze','Per year','$0','Included with Foundation tier'],
    ['Layer 4 – Advantage & Implementation','CSLT102F','Advantage Silver','Per year','$0','Included with Foundation tier'],
    ['Layer 4 – Advantage & Implementation','CSLT103F','Advantage Gold','Per year','$0','Included with Foundation tier'],
    ['Layer 4 – Advantage & Implementation','TRNNEO001','Training Credits','Per year','$0','Included with Foundation tier — 100/300/800 credits by tier'],
    ['Layer 4 – Advantage & Implementation','CSLT107','Nuix Advantage - Top Up 24 Hours','Per hour','$280','Sold in packs of 24 hrs'],
    ['Layer 4 – Advantage & Implementation','CSLT300','Nuix Neo Foundation Implementation Package','Per instance','$31,310','One-off · Year 1 only for multi-year deals'],
    ['Layer 4 – Advantage & Implementation','CSLT301','Nuix Neo Solution Implementation Package','Per instance','$46,020','One-off · Year 1 only for multi-year deals'],
    ['Layer 2 – AI Suite','NEOAIBNDL01S','AI Bundle – Standard','Per year','$105,000','Enrich + Semantic Search + Transcription + Solutions Library · 30% below buying separately'],
    ['Layer 2 – AI Suite','NEOAIBNDL01MD','AI Bundle – Accelerate','Per year','$241,500','Enrich + Semantic Search + Transcription + Solutions Library · 30% below buying separately'],
    ['Layer 2 – AI Suite','NEOAIBNDL01L','AI Bundle – Performance','Per year','$420,000','Enrich + Semantic Search + Transcription + Solutions Library · 30% below buying separately'],
    ['Layer 2 – AI Suite','NEOAI001S','Enrich – Standard','Per year','$50,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOAI001MD','Enrich – Accelerate','Per year','$115,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOAI001L','Enrich – Performance','Per year','$200,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOS001S','Semantic – Standard','Per year','$50,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOS001MD','Semantic – Accelerate','Per year','$115,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOS001L','Semantic – Performance','Per year','$200,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOS002S','Transcription – Standard','Per year','$50,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOS002MD','Transcription – Accelerate','Per year','$115,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOS002L','Transcription – Performance','Per year','$200,000','Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOAI002S','BYO AI – Standard','Per year','$100,000',''],
    ['Layer 2 – AI Suite','NEOAI002MD','BYO AI – Accelerate','Per year','$135,000',''],
    ['Layer 2 – AI Suite','NEOAI002L','BYO AI – Performance','Per year','$200,000',''],
    ['Layer 2 – AI Suite','NEOAI003S','BYO AI - Advanced – Standard','Per year','$180,000',''],
    ['Layer 2 – AI Suite','NEOAI003MD','BYO AI - Advanced – Accelerate','Per year','$240,000',''],
    ['Layer 2 – AI Suite','NEOAI003L','BYO AI - Advanced – Performance','Per year','$360,000',''],
    ['Layer 2 – AI Suite','NEOAI004S','BYO AI - Graph – Standard','Per year','$300,000','Requires Knowledge Graph — auto-added as a separate line item'],
    ['Layer 2 – AI Suite','NEOAI004MD','BYO AI - Graph – Accelerate','Per year','$400,000','Requires Knowledge Graph — auto-added as a separate line item'],
    ['Layer 2 – AI Suite','NEOAI004L','BYO AI - Graph – Performance','Per year','$600,000','Requires Knowledge Graph — auto-added as a separate line item'],
    ['Layer 2 – AI Suite','NEOAI005S','Agentic: AI - Advanced – Standard','Per year','$240,000','Neo 3.0 · Local Deployment only · Requires Semantic Search + Advantage Silver · Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOAI005MD','Agentic: AI - Advanced – Accelerate','Per year','$400,000','Neo 3.0 · Local Deployment only · Requires Semantic Search + Advantage Silver · Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOAI005L','Agentic: AI - Advanced – Performance','Per year','$600,000','Neo 3.0 · Local Deployment only · Requires Semantic Search + Advantage Silver · Includes Solutions Library'],
    ['Layer 2 – AI Suite','NEOSLIBS','Solutions Library – Standard','Per year','$0','Bundled at no charge with Enrich/Semantic Search/Transcription'],
    ['Layer 2 – AI Suite','NEOSLIBMD','Solutions Library – Accelerate','Per year','$0','Bundled at no charge with Enrich/Semantic Search/Transcription'],
    ['Layer 2 – AI Suite','NEOSLIBL','Solutions Library – Performance','Per year','$0','Bundled at no charge with Enrich/Semantic Search/Transcription'],
    ['Layer 3 – Enhanced Capability','NRTCLGB','Nuix Discover SaaS – Active Storage','Per GB/month','$14.75','Pooled with NRTCLAD/NRTCLFT/NRTCLREF for volume discounting — see P&P Guide'],
    ['Layer 3 – Enhanced Capability','NRTCLAD','Nuix Discover SaaS – Archive Storage','Per GB/month','$3.70','Pooled with NRTCLGB/NRTCLFT/NRTCLREF for volume discounting — see P&P Guide'],
    ['Layer 3 – Enhanced Capability','NRTCLFT','Nuix Discover SaaS – File Transfer Data','Per GB/month','$3.70','Pooled with NRTCLGB/NRTCLAD/NRTCLREF for volume discounting — see P&P Guide'],
    ['Layer 3 – Enhanced Capability','NRTCLREF','Nuix Discover SaaS – Inactive Data','Per GB/month','$3.70','Pooled with NRTCLGB/NRTCLAD/NRTCLFT for volume discounting — see P&P Guide'],
    ['Layer 3 – Enhanced Capability','NRTECA','Nuix Discover SaaS – Early Case Assessment','Per GB/month','$4.90',''],
    ['Layer 3 – Enhanced Capability','NRTAIACT','Nuix Discover SaaS – Gen AI Review (Active Data)','Per GB/month','$5','Choose one Gen AI Review pricing method · applied to active data GB'],
    ['Layer 3 – Enhanced Capability','NRTAIDOC','Nuix Discover SaaS – Gen AI Review (Document)','Per document','$0.06','Choose one Gen AI Review pricing method · one-off, not annualized'],
    ['Layer 3 – Enhanced Capability','NRTAUDIO','Nuix Discover SaaS – Audio Transcription','Per minute/month','$0.35',''],
    ['Layer 3 – Enhanced Capability','NRTMLT','Nuix Discover SaaS – Machine Language Translation','Per document/month','$0.40','35,000 characters = 1 document'],
    ['Layer 3 – Enhanced Capability','NRTTFA','Nuix Discover SaaS – Two-Factor Authentication','Per user/month','$6.80',''],
    ['Layer 3 – Enhanced Capability','NRTERDOC','Nuix Discover SaaS – Excel Redaction','Per document','$1.00','One-off, not annualized'],
    ['Layer 3 – Enhanced Capability','NRTOPINST','Nuix Discover On-Prem – Instance','Per instance/yr','$59,540',''],
    ['Layer 3 – Enhanced Capability','NRTOPUSER','Nuix Discover On-Prem – User','Per user/yr','$2,380',''],
    ['Layer 3 – Enhanced Capability','NRTHGB','Nuix Discover On-Prem – Capacity (GB)','Per GB/yr','$4.32','Alternative capacity metric to User'],
    ['Layer 3 – Enhanced Capability','NRTPCODE','Nuix Discover On-Prem – Predictive Coding Add-on','Per instance/yr','$34,020',''],
    ['Layer 3 – Enhanced Capability','NRTDISCAI01','Nuix Discover On-Prem – AI Review','Per instance/yr','$45,500',''],
    ['Layer 3 – Enhanced Capability','NRTDISCAI02','Nuix Discover On-Prem – Enrich (OOTB Models)','Per instance/yr','$45,500',''],
    ['Layer 3 – Enhanced Capability','NRTDISC01','Nuix Discover On-Prem – Ingestions','Per worker/yr','$22,340',''],
    ['Layer 3 – Enhanced Capability','NRTDISCXLR01','Nuix Discover On-Prem – Native Excel Redaction','Per instance/yr','$7,000',''],
    ['Layer 3 – Enhanced Capability','ENDPT001','Adaptive Security – Endpoint','Per endpoint/yr','$20',''],
    ['Layer 3 – Enhanced Capability','ENDPTUSER','Adaptive Security – User','Per user/yr','$3,000',''],
    ['Layer 3 – Enhanced Capability','ENDPTSVR','Adaptive Security – Server','Per server/yr','$30,000',''],
    ['Layer 3 – Enhanced Capability','ENDPT101','ECC (Enterprise Collection Centre)','Per endpoint/yr','$8',''],
    ['Layer 3 – Enhanced Capability','RALH001','Nuix Automate Legal Hold','Per custodian/month','$2',''],
    ['Layer 3 – Enhanced Capability','NEOREL01','Automated Relativity Export and Orchestration','Per year','$75,000',''],
    ['Layer 3 – Visualisation','VISBNDL001S','Visualisation Bundle – Small','Per bundle/yr','$95,860','10 Named Users · 64GB Memory'],
    ['Layer 3 – Visualisation','VISBNDL001MD','Visualisation Bundle – Medium','Per bundle/yr','$168,970','25 Named Users · 128GB Memory'],
    ['Layer 3 – Visualisation','VISBNDL001L','Visualisation Bundle – Large','Per bundle/yr','$228,720','50 Named Users · 256GB Memory'],
    ['Layer 3 – Visualisation','KGU002','Knowledge Graph – 20 Named Users','Per pack/yr','$83,240','Bundle booster'],
    ['Layer 3 – Visualisation','KGU003','Knowledge Graph – 50 Named Users','Per pack/yr','$142,700','Bundle booster'],
    ['Layer 3 – Visualisation','KGU004','Knowledge Graph – 100 Named Users','Per pack/yr','$214,040','Bundle booster'],
    ['Layer 3 – Visualisation','KGU005','Knowledge Graph – 200 Named Users','Per pack/yr','$416,200','Bundle booster'],
    ['Layer 3 – Visualisation','KGM001','Knowledge Graph – 64GB Memory','Per pack/yr','$36,400','Bundle booster'],
    ['Layer 3 – Visualisation','KGM002','Knowledge Graph – 128GB Memory','Per pack/yr','$56,000','Bundle booster'],
    ['Layer 3 – Visualisation','KGM003','Knowledge Graph – 256GB Memory','Per pack/yr','$86,020','Bundle booster'],
    ['Layer 3 – Visualisation','KGM004','Knowledge Graph – 512GB Memory','Per pack/yr','$143,360','Bundle booster'],
    ['Layer 3 – Visualisation','KGM005','Knowledge Graph – 1024GB Memory','Per pack/yr','$229,380','Bundle booster'],
    ['Layer 3 – Third Party','ABBFR002','ABBYY – 100,000 pages','Per unit/yr','$1,588',''],
    ['Layer 3 – Third Party','ABBFR003','ABBYY – 200,000 pages','Per unit/yr','$2,430',''],
    ['Layer 3 – Third Party','ABBFR004','ABBYY – 500,000 pages','Per unit/yr','$4,900',''],
    ['Layer 3 – Third Party','ABBFR005','ABBYY – 1,000,000 pages','Per unit/yr','$8,624',''],
    ['Layer 3 – Third Party','ABBFR001','ABBYY Fine Reader Server (renewal)','Per unit/yr','$4,100','Renewals only'],
    ['Layer 3 – Third Party','Q1CNOP370','Q1 – CW Splitter','Per year','$40,180',''],
    ['Layer 3 – Third Party','Q1CNOP400','Q1 – Cisco Webex','Per year','$20,870',''],
    ['Layer 3 – Third Party','Q1CNOP310','Q1 – EV On-Prem','Per year','$22,570',''],
    ['Layer 3 – Third Party','Q1CNSS320','Q1 – EV Cloud','Per year','$26,130',''],
    ['Layer 3 – Third Party','Q1CNOP390','Q1 – IBM FileNet','Per year','$20,870',''],
    ['Layer 3 – Third Party','Q1CNOP350','Q1 – Google Gmail','Per year','$19,010',''],
    ['Layer 3 – Third Party','Q1CNOP340','Q1 – Google Vault','Per year','$30,880',''],
    ['Layer 3 – Third Party','Q1CNOP330','Q1 – OpenText LL','Per year','$28,510',''],
    ['Layer 3 – Third Party','Q1CNOP410','Q1 – OpenText TRIM','Per year','$21,460',''],
    ['Layer 3 – Third Party','Q1CNOP300','Q1 – Source One','Per year','$13,520',''],
    ['Layer 3 – Third Party','Q1CNOP380','Q1 – Symphony','Per year','$20,870',''],
    ['Layer 3 – Third Party','Q1CNOP360','Q1 – Google Virtru','Per year','$23,800',''],
    ['Layer 3 – Third Party','Q1DSOP200','Q1 – DSAR On-Prem','Per year','$41,580',''],
    ['Layer 3 – Third Party','Q1LHOP100','Q1 – Legal Hold On-Prem','Per year','$29,400',''],
    ['Layer 3 – Third Party','Q1DSSS210','Q1 – DSAR Hosted','Per year','$53,460',''],
    ['Layer 3 – Third Party','Q1LHSS110','Q1 – Legal Hold Hosted','Per year','$53,460',''],
    ['Layer 3 – Third Party','Q1SF24C7MS','Q1 – Mulesoft','Per year','$11,060',''],
    ['Layer 3 – Third Party','Q1SF24C7TA','Q1 – Salesforce','Per year','$16,660',''],
    ['Layer 3 – Third Party','Q1CF24C7JR','Q1 – Jira','Per year','$16,660',''],
    ['Layer 3 – Third Party','Q1CF30T4WJ','Q1 – Confluence','Per year','$16,660',''],
    ['Layer 3 – Third Party','T3KCON001','T3K – Nuix Connector','Per instance/yr','$22,000',''],
    ['Layer 3 – Third Party','T3KCORE001','T3K – CORE (per worker)','Per worker/yr','$4,000','For component / worker-based deals'],
    ['Layer 3 – Third Party','T3KCORETB10','T3K – CORE 10TB','Per unit/yr','$32,000',''],
    ['Layer 3 – Third Party','T3KCORETB30','T3K – CORE 30TB','Per unit/yr','$68,000',''],
    ['Layer 3 – Third Party','T3KCORETB50','T3K – CORE 50TB','Per unit/yr','$90,000',''],
    ['Layer 3 – Third Party','T3KCORETB100','T3K – CORE 100TB','Per unit/yr','$120,000',''],
    ['Layer 3 – Third Party','T3KCORETB150','T3K – CORE 150TB','Per unit/yr','$154,000',''],
    ['Layer 3 – Third Party','T3KCOREUR10','T3K – CORE 10 Concurrent Users','Per unit/yr','$20,440',''],
    ['Layer 3 – Third Party','T3KCOREUR15','T3K – CORE 15 Concurrent Users','Per unit/yr','$26,040',''],
    ['Layer 3 – Third Party','T3KCOREUR20','T3K – CORE 20 Concurrent Users','Per unit/yr','$29,120',''],
    ['Layer 3 – Third Party','T3KCOREUR30','T3K – CORE 30 Concurrent Users','Per unit/yr','$37,800',''],
    ['Layer 3 – Third Party','T3KCOREUR50','T3K – CORE 50 Concurrent Users','Per unit/yr','$53,200',''],
    ['Layer 3 – Third Party','VERTSCPCON2','Veritone – Nuix Connector','Per instance/yr','$22,000',''],
    ['Layer 3 – Third Party','VERTSCPSML','Veritone – Transcription 15,000 hrs (Small)','Per instance/yr','$33,010',''],
    ['Layer 3 – Third Party','VERTSCPMED','Veritone – Transcription 40,000 hrs (Medium)','Per instance/yr','$82,500',''],
    ['Layer 3 – Third Party','VERTSCPLRG','Veritone – Transcription 67,000 hrs (Large)','Per instance/yr','$132,000',''],
    ['Layer 3 – Third Party','VERTSCPXLG','Veritone – Transcription 135,000 hrs (X-Large)','Per instance/yr','$220,000',''],
    ['Layer 3 – Third Party','VERTSLTLAN1','Veritone – Translation (First Language)','Per language/yr','$27,500',''],
    ['Layer 3 – Third Party','VERTSLTLANS','Veritone – Translation (Additional Language)','Per language/yr','$5,500',''],
    ...cfg().non_prod.skus.map(s => ['Layer 5 – Test Environments', s.sku, s.name, 'Per unit/yr', s.list_price == null ? 'TBC' : '$' + s.list_price.toLocaleString('en-US'), 'Test environment']),
  ];

  const layerColors = {
    'Layer 1 – Nuix Neo Foundation': '#003080',
    'Layer 1 – Foundation Booster': '#004ea3',
    'Layer 2 – AI Suite': '#0056e3',
    'Layer 3 – Enhanced Capability': '#1a5cbf',
    'Layer 3 – Visualisation': '#3b7dd1',
    'Layer 3 – Third Party': '#2666a8',
    'Layer 4 – Advantage & Implementation': '#0d4080',
    'Layer 5 – Test Environments': '#5b6b85',
    'Other': '#475569',
  };

  let lastLayer = '';
  const rowsHtml = skuRows.map(([layer, sku, name, unit, price, notes]) => {
    const isNew = layer !== lastLayer;
    lastLayer = layer;
    const color = layerColors[layer] || '#333';
    const groupRow = isNew ? `<tr><td colspan="5" style="background:${color};color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:7px 16px">${layer}</td></tr>` : '';
    return groupRow + `<tr>
      <td style="font-family:monospace;font-size:12px;font-weight:700;color:#003080;white-space:nowrap;padding:10px 16px">${sku}</td>
      <td style="font-size:13px;font-weight:500;padding:10px 16px">${name}</td>
      <td style="font-size:12px;color:#6b7280;padding:10px 16px">${unit}</td>
      <td style="font-size:13px;font-weight:700;color:#003080;text-align:right;padding:10px 16px;white-space:nowrap">${price}</td>
      <td style="font-size:11px;color:#9ca3af;padding:10px 16px">${notes}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix NEO — SKU List</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f6fa; color: #1a1a2e; }
    header { background: #0056e3; padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
    header img { height: 30px; display: block; }
    .hdiv { width: 1px; height: 28px; background: rgba(255,255,255,0.2); }
    .hdr-left { display: flex; align-items: center; gap: 14px; }
    header h1 { color: rgba(255,255,255,0.85); font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
    .print-btn { background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.3); color: #fff; padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; letter-spacing: 0.2px; }
    .container { max-width: 1100px; margin: 28px auto; padding: 0 24px 80px; }
    .sku-summary { background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); padding: 16px 24px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; }
    .sku-count { font-size: 32px; font-weight: 800; color: #003080; line-height: 1; }
    .sku-count-label { font-size: 13px; color: #6b7280; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f0f4ff; }
    th { padding: 10px 16px; font-size: 11px; font-weight: 700; color: #003080; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
    th:nth-child(4) { text-align: right; }
    tbody tr { border-bottom: 1px solid #f0f2f8; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: #f8f9ff; }
    footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
    @media print { header .print-btn { display: none; } }
  </style>
</head>
<body>
<header>
  <div class="hdr-left">
    <img src="NXL.AX_BIG.D-4e4ae371.png" alt="Nuix">
    <div class="hdiv"></div>
    <h1>NEO — SKU List</h1>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</header>
<div class="container">
  <div class="sku-summary">
    <div class="sku-count">${skuRows.length}</div>
    <div class="sku-count-label">Total SKUs across all layers</div>
  </div>
  <div class="card">
    <table>
      <thead>
        <tr>
          <th>SKU</th><th>Name</th><th>Unit</th>
          <th style="text-align:right">List Price (USD)</th><th>Notes</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>
</div>
<footer>Nuix Neo Pricing Tool · ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })} · Prices subject to change</footer>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ─── Pricing & Packaging Guide ───────────────────────────────────────────────

function showPricingGuide() {
  const win = window.open('', '_pricingGuide');
  const C = cfg();
  const regionalCountryOptions = Object.entries(C.regions).map(([region, countries]) => {
    const sorted = [...countries].sort((a, b) => (C.regional_multipliers[b] ?? 1) - (C.regional_multipliers[a] ?? 1) || a.localeCompare(b));
    const opts = sorted.map(country => {
      const mult = C.regional_multipliers[country] ?? 1;
      return `<option value="${mult}">${country} (×${mult.toFixed(2)})</option>`;
    }).join('');
    return `<optgroup label="${region}">${opts}</optgroup>`;
  }).join('');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix NEO — Pricing &amp; Packaging Guide</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f4ff;color:#1a1a2e;display:flex;flex-direction:column;min-height:100vh}
    /* ── Header ── */
    header{background:#0056e3;padding:0 32px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;flex-shrink:0}
    .hdr-left{display:flex;align-items:center;gap:14px}
    header img{height:30px;display:block}
    .hdiv{width:1px;height:28px;background:rgba(255,255,255,0.2)}
    header h1{color:rgba(255,255,255,0.85);font-size:15px;font-weight:600;letter-spacing:-0.2px}
    .hdr-actions{display:flex;gap:8px}
    .hdr-btn{background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.3);color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.2px;transition:background 0.15s}
    .hdr-btn:hover{background:rgba(255,255,255,0.22)}
    /* ── Layout ── */
    .page-body{display:flex;flex:1;min-height:0}
    /* ── Sticky sidenav ── */
    .sidenav{width:220px;flex-shrink:0;position:sticky;top:60px;height:calc(100vh - 60px);overflow-y:auto;padding:20px 0 40px;background:#fff;border-right:1px solid #e2e8f0}
    .sidenav-title{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;padding:0 18px 8px}
    .nav-item{display:flex;flex-direction:column;gap:2px;padding:8px 18px;font-size:12px;font-weight:500;color:#64748b;text-decoration:none;cursor:pointer;border-left:3px solid transparent;transition:all 0.15s;line-height:1.4}
    .nav-item:hover{color:#0056e3;background:#f0f4ff}
    .nav-item.active{color:#0056e3;font-weight:700;border-left-color:#0056e3;background:#f0f4ff}
    .nav-item .nav-badge{font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;line-height:1}
    .nav-item.active .nav-badge{color:#0056e3;opacity:0.7}
    .nav-item:hover .nav-badge{color:#0056e3;opacity:0.7}
    .nav-divider{height:1px;background:#f1f5f9;margin:8px 18px}
    /* ── Main content ── */
    .main{flex:1;padding:28px 32px 80px;overflow-y:auto;min-width:0}
    /* ── Section cards ── */
    .section{background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:24px;overflow:hidden;scroll-margin-top:80px}
    .section-header{background:#0056e3;padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none}
    .section-header-left{display:flex;align-items:center;gap:12px}
    .badge{background:rgba(255,255,255,0.18);color:#fff;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border-radius:20px;white-space:nowrap}
    .section-header h2{color:#fff;font-size:15px;font-weight:700}
    .collapse-icon{color:rgba(255,255,255,0.8);font-size:18px;transition:transform 0.25s;flex-shrink:0}
    .section.collapsed .collapse-icon{transform:rotate(-90deg)}
    .section-body{padding:20px 24px;transition:none}
    .section.collapsed .section-body{display:none}
    .section-intro{font-size:13px;color:#475569;line-height:1.6;margin-bottom:18px}
    /* ── Layer colors ── */
    .l1{background:#003080!important}.l2{background:#0056e3!important}.l3{background:#0066d6!important}.l4{background:#1a5cbf!important}.l5{background:#0d4080!important}.l6{background:#5b6b85!important}.lother{background:#475569!important}
    /* ── Stack diagram ── */
    .stack-wrap{display:flex;flex-direction:column;gap:0;max-width:720px;margin:0 auto}
    .stack-layer{border-radius:10px;overflow:hidden;position:relative;transition:transform 0.15s,box-shadow 0.15s}
    .stack-layer:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,86,227,0.18)}
    .stack-layer+.stack-layer{margin-top:6px}
    .stack-head{padding:14px 20px;display:flex;align-items:center;gap:14px;color:#fff}
    .stack-num{font-size:11px;font-weight:800;letter-spacing:1px;opacity:0.7;text-transform:uppercase;min-width:52px}
    .stack-name{font-size:16px;font-weight:700;flex:1}
    .stack-price{font-size:13px;font-weight:600;opacity:0.9;white-space:nowrap;background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:20px}
    .stack-body{background:#f8f9ff;padding:10px 20px 14px 86px;font-size:12px;color:#475569;line-height:1.6}
    /* ── Tier cards ── */
    .tier-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    .tier-card{border-radius:10px;overflow:hidden;border:2px solid #e2e8f0;transition:border-color 0.15s,box-shadow 0.15s}
    .tier-card:hover{border-color:#0056e3;box-shadow:0 4px 16px rgba(0,86,227,0.12)}
    .tier-card-head{padding:16px 14px 12px;text-align:center}
    .tc-chip{display:inline-block;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px}
    .chip-light{background:#64748b}.chip-core{background:#0066d6}.chip-rapid{background:#0056e3}
    .tc-price{font-size:26px;font-weight:800;color:#003080;line-height:1}
    .tc-price-sub{font-size:11px;color:#94a3b8;margin-top:3px}
    .tier-card-body{background:#f8f9ff;padding:12px 14px;border-top:1px solid #e2e8f0}
    .tc-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;border-bottom:1px solid #eef0f6}
    .tc-row:last-child{border-bottom:none}
    .tc-label{color:#64748b}.tc-value{font-weight:600;color:#1e293b}
    .tc-support{margin-top:8px;text-align:center;font-size:11px;font-weight:600;color:#0056e3;background:#e0e7ff;border-radius:6px;padding:4px 8px}
    /* ── Tables ── */
    table{width:100%;border-collapse:collapse}
    th{background:#f0f4ff;padding:9px 14px;font-size:11px;font-weight:700;color:#003080;text-transform:uppercase;letter-spacing:0.5px;text-align:left}
    th.right{text-align:right}
    td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f0f2f8;vertical-align:top}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:#f8f9ff}
    .price-cell{font-weight:700;color:#003080;white-space:nowrap}
    .sub-text{font-size:11px;color:#94a3b8;margin-top:2px}
    .incl-tag{display:inline-block;background:#f0f4ff;color:#003080;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;margin:2px 2px 0 0}
    /* ── EC matrix ── */
    .ec-matrix th{text-align:center}.ec-matrix th.left{text-align:left}
    .ec-matrix td{text-align:center}.ec-matrix td.left{text-align:left;font-weight:600;color:#1e293b}
    .check{color:#0056e3;font-size:15px;font-weight:700}.dash{color:#cbd5e1}
    /* ── Booster section ── */
    .booster-head{font-size:12px;font-weight:700;color:#003080;text-transform:uppercase;letter-spacing:0.5px;padding:6px 14px;background:#f8f9ff;border-bottom:1px solid #e8edf5;margin-top:16px}
    /* ── Dependencies ── */
    .dep-row{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f0f2f8}
    .dep-row:last-child{border-bottom:none}
    .dep-arrow{color:#0056e3;font-weight:700;font-size:14px;flex-shrink:0;margin-top:1px}
    .dep-text{font-size:13px;color:#374151}
    .dep-note{font-size:11px;color:#94a3b8;margin-top:2px}
    /* ── Discount calculator ── */
    .disc-layout{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .disc-checks{display:flex;flex-direction:column;gap:10px}
    .disc-check-item{background:#f8f9ff;border-radius:8px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s}
    .disc-check-item:hover{border-color:#c7d7f9}
    .disc-check-item.active{border-color:#0056e3;background:#eef3ff}
    .disc-check-item input[type=checkbox]{width:17px;height:17px;accent-color:#0056e3;flex-shrink:0;margin-top:2px;cursor:pointer}
    .disc-check-label{flex:1}
    .disc-check-title{font-size:13px;font-weight:700;color:#1e293b}
    .disc-check-sub{font-size:11px;color:#64748b;margin-top:2px;line-height:1.4}
    .disc-num-wrap{display:flex;align-items:center;gap:6px;margin-top:8px}
    .disc-num-label{font-size:11px;color:#64748b}
    .disc-num-inp{width:60px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:600;color:#003080;text-align:center}
    .disc-result{background:linear-gradient(135deg,#003080,#0056e3);border-radius:12px;padding:28px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;position:sticky;top:80px}
    .disc-result-label{font-size:12px;font-weight:600;opacity:0.7;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
    .disc-result-pct{font-size:56px;font-weight:900;line-height:1}
    .disc-result-sub{font-size:12px;opacity:0.7;margin-top:8px;line-height:1.5}
    .disc-breakdown{margin-top:16px;width:100%;background:rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px}
    .disc-b-row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.1)}
    .disc-b-row:last-child{border-bottom:none}
    .disc-approval{margin-top:12px;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;background:rgba(255,255,255,0.15)}
    .disc-approval.ok{background:rgba(74,222,128,0.25);color:#bbf7d0}
    .disc-approval.warn{background:rgba(251,191,36,0.25);color:#fef08a}
    .disc-approval.danger{background:rgba(248,113,113,0.25);color:#fecaca}
    /* ── Deal sandbox ── */
    .sandbox-banner{background:linear-gradient(135deg,#1e3a5f,#0056e3);border-radius:10px;padding:14px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px}
    .sandbox-banner-icon{font-size:28px}
    .sandbox-banner-text h3{color:#fff;font-size:15px;font-weight:700}
    .sandbox-banner-text p{color:rgba(255,255,255,0.7);font-size:12px;margin-top:2px}
    .sandbox-layout{display:grid;grid-template-columns:1fr 340px;gap:20px}
    .sandbox-controls{display:flex;flex-direction:column;gap:14px}
    .sb-section{background:#f8f9ff;border-radius:10px;padding:16px}
    .sb-section-title{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:12px}
    .sb-tier-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    .sb-tier-btn{padding:10px 6px;border-radius:8px;border:2px solid #e2e8f0;background:#fff;font-size:12px;font-weight:700;color:#475569;cursor:pointer;text-align:center;transition:all 0.15s}
    .sb-tier-btn:hover{border-color:#0056e3;color:#0056e3}
    .sb-tier-btn.selected{border-color:#0056e3;background:#0056e3;color:#fff}
    .sb-tier-btn .tb-price{font-size:10px;font-weight:500;opacity:0.8;margin-top:2px}
    .sb-toggles{display:flex;flex-direction:column;gap:6px}
    .sb-toggle{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;transition:all 0.15s}
    .sb-toggle:hover{border-color:#0056e3}
    .sb-toggle.on{border-color:#0056e3;background:#eef3ff}
    .sb-toggle-left{display:flex;align-items:center;gap:8px}
    .sb-toggle-dot{width:10px;height:10px;border-radius:50%;background:#e2e8f0;transition:background 0.15s;flex-shrink:0}
    .sb-toggle.on .sb-toggle-dot{background:#0056e3}
    .sb-toggle-name{font-size:12px;font-weight:600;color:#1e293b}
    .sb-toggle-price{font-size:11px;color:#94a3b8}
    .sb-toggle-val{font-size:12px;font-weight:700;color:#0056e3}
    /* Sticky price panel */
    .sb-price-panel{position:sticky;top:80px;background:linear-gradient(160deg,#001f5c,#003080,#0056e3);border-radius:12px;padding:24px;color:#fff}
    .sb-panel-title{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:0.6;margin-bottom:4px}
    .sb-panel-note{font-size:11px;opacity:0.5;font-style:italic;margin-bottom:16px}
    .sb-total{font-size:42px;font-weight:900;line-height:1;letter-spacing:-1px}
    .sb-total-sub{font-size:12px;opacity:0.6;margin-top:4px;margin-bottom:20px}
    .sb-line-items{background:rgba(255,255,255,0.08);border-radius:8px;padding:12px;max-height:320px;overflow-y:auto}
    .sb-line{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-size:12px}
    .sb-line:last-child{border-bottom:none}
    .sb-line-name{opacity:0.8;flex:1;padding-right:8px}
    .sb-line-price{font-weight:700;white-space:nowrap}
    .sb-line.total-row{padding-top:10px;margin-top:4px;border-top:1px solid rgba(255,255,255,0.3)!important;font-size:13px;font-weight:800}
    .sb-empty{text-align:center;opacity:0.4;font-size:12px;padding:16px 0}
    .sb-reset{margin-top:14px;width:100%;padding:9px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);color:#fff;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.15s}
    .sb-reset:hover{background:rgba(255,255,255,0.22)}
    .sb-disclaimer{margin-top:12px;font-size:10px;opacity:0.45;line-height:1.5;text-align:center}
    /* ── Consulting ── */
    /* ── POC ── */
    .poc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .poc-stat{background:#f8f9ff;border-radius:8px;padding:14px 16px;text-align:center}
    .poc-stat .big{font-size:28px;font-weight:800;color:#003080;line-height:1}
    .poc-stat .lbl{font-size:12px;color:#64748b;margin-top:4px}
    .poc-note{margin-top:14px;background:#e0e7ff;border-radius:8px;padding:12px 16px;font-size:13px;color:#003080;line-height:1.5}
    footer{text-align:center;padding:24px;color:#9ca3af;font-size:12px}
    @media print{.sidenav,.hdr-actions{display:none!important}.page-body{display:block}.section.collapsed .section-body{display:block!important}}
  </style>
</head>
<body>
<header>
  <div class="hdr-left">
    <img src="NXL.AX_BIG.D-4e4ae371.png" alt="Nuix">
    <div class="hdiv"></div>
    <h1>Nuix NEO &mdash; Pricing &amp; Packaging Guide &nbsp;&middot;&nbsp; <span style="opacity:0.6;font-weight:400">Internal use only</span></h1>
  </div>
  <div class="hdr-actions">
    <button class="hdr-btn" onclick="document.querySelectorAll('.section').forEach(s=>s.classList.remove('collapsed'))">Expand All</button>
    <button class="hdr-btn" onclick="document.querySelectorAll('.section').forEach(s=>s.classList.add('collapsed'))">Collapse All</button>
    <button class="hdr-btn" onclick="window.print()">Print / PDF</button>
  </div>
</header>

<div class="page-body">
  <!-- ── Sticky side nav ── -->
  <nav class="sidenav" id="sidenav">
    <div class="sidenav-title">Sections</div>
    <a class="nav-item" data-target="sec-overview"><span class="nav-badge">Overview</span>Pricing &amp; Packaging Framework</a>
    <a class="nav-item" data-target="sec-foundation"><span class="nav-badge">Layer 1</span>Nuix Neo Foundation — Tiers</a>
    <a class="nav-item" data-target="sec-consumption"><span class="nav-badge">Layer 1 — Consumption</span>Neo Foundation — Consumption Pricing</a>
    <a class="nav-item" data-target="sec-boosters"><span class="nav-badge">Layer 1 — Boosters</span>Foundation Boosters</a>
    <a class="nav-item" data-target="sec-ai"><span class="nav-badge">Layer 2</span>AI Suite</a>
    <a class="nav-item" data-target="sec-visualisation"><span class="nav-badge">Layer 3</span>Visualisation Bundle</a>
    <a class="nav-item" data-target="sec-discover-pricing"><span class="nav-badge">Layer 3</span>Discover — Pricing Detail</a>
    <a class="nav-item" data-target="sec-ec-pricing"><span class="nav-badge">Layer 3</span>Add Ons — Pricing Detail</a>
    <a class="nav-item" data-target="sec-ec-matrix"><span class="nav-badge">Layer 3 — Use Case Fit</span>Add Ons</a>
    <a class="nav-item" data-target="sec-advantage"><span class="nav-badge">Layer 4</span>Advantage &amp; Implementation</a>
    <a class="nav-item" data-target="sec-testenv"><span class="nav-badge">Layer 5</span>Test Environments</a>
    <a class="nav-item" data-target="sec-deps"><span class="nav-badge">Dependencies</span>Product Dependencies</a>
    <a class="nav-item" data-target="sec-discounts"><span class="nav-badge">Discounting</span>Discount Calculator</a>
    <a class="nav-item" data-target="sec-currency"><span class="nav-badge">Currency</span>Currency Conversion Rates</a>
  </nav>

  <div class="main" id="main-scroll">

    <!-- ── 1. Framework Overview ── -->
    <div class="section" id="sec-overview">
      <div class="section-header l2" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Overview</span><h2>Nuix NEO — Pricing &amp; Packaging Framework</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">The Nuix NEO framework follows the same 7-step workflow as the Pricing Tool. Every deal starts with Step 1 — Nuix Neo Foundation; each subsequent step adds an optional layer on top.</p>
        <div class="stack-wrap">
          <div class="stack-layer l6">
            <div class="stack-head"><span class="stack-num">Step 7</span><span class="stack-name">Test Environments</span><span class="stack-price">Optional · $5K – $50K / unit / yr</span></div>
            <div class="stack-body">Optional non-production test environment licences for Nuix Discover, Nuix Neo, ECC and Adaptive Security (Standard and Performance variants), sold per unit per year alongside the production deal.</div>
          </div>
          <div class="stack-layer l5">
            <div class="stack-head"><span class="stack-num">Step 6</span><span class="stack-name">Advantage &amp; Implementation</span><span class="stack-price">Optional / one-off</span></div>
            <div class="stack-body">Advantage support upgrades (Bronze → Silver → Gold), Advantage Hours Top Up packs (CSLT107), the Foundation (CSLT300) and Solution (CSLT301) Implementation Packages, and the optional Component License Extension for eligible Nuix Neo renewals.</div>
          </div>
          <div class="stack-layer l4">
            <div class="stack-head"><span class="stack-num">Step 5</span><span class="stack-name">Add Ons</span><span class="stack-price">Usage-based</span></div>
            <div class="stack-body">Nuix modules (Adaptive Security, ECC (Enterprise Collection Centre), Automate Legal Hold) and certified third-party integrations (ABBYY, Q1 Dynamics, T3K, Veritone), priced per GB, endpoint, user or connector.</div>
          </div>
          <div class="stack-layer l4">
            <div class="stack-head"><span class="stack-num">Step 4</span><span class="stack-name">Discover</span><span class="stack-price">Usage-based</span></div>
            <div class="stack-body">Nuix Discover SaaS (metered per GB/user/minute/document per month) and Discover On-Prem (licensed per instance/user/GB/worker per year) — split into their own step given the size of the Discover SKU set.</div>
          </div>
          <div class="stack-layer l3">
            <div class="stack-head"><span class="stack-num">Step 3</span><span class="stack-name">Visualisation</span><span class="stack-price">$96K – $229K / yr</span></div>
            <div class="stack-body">Knowledge Graph analytics (powered by Linkurious), sold as a Small/Medium/Large bundle of Named Users + Memory, with booster packs for additional users or memory. Requires Enrich, which is auto-added to the quote if not already present.</div>
          </div>
          <div class="stack-layer l2">
            <div class="stack-head"><span class="stack-num">Step 2</span><span class="stack-name">AI Suite</span><span class="stack-price">$50K – $600K / yr</span></div>
            <div class="stack-body">AI-powered processing modules: Enrich, Semantic Search, Transcription, BYO AI, BYO AI - Advanced, and BYO AI - Graph. Priced per Foundation tier. Enrich, Semantic Search and Transcription each include the Solutions Library — pre-packaged OOTB workflows, dashboards and reports — bundled automatically at no extra charge, and buying all three individually auto-upgrades the quote to the discounted AI Bundle.</div>
          </div>
          <div class="stack-layer l1">
            <div class="stack-head"><span class="stack-num">Step 1</span><span class="stack-name">Nuix Neo Foundation</span><span class="stack-price">$155K – $720K+ / yr</span></div>
            <div class="stack-body">Required base for every deployment. Core platform: workers, data volume, Concurrent Review users, training credits and Advantage support. Available in Standard, Accelerate and Performance tiers.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 2. Foundation Tiers ── -->
    <div class="section" id="sec-foundation">
      <div class="section-header l1" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 1</span><h2>Nuix Neo Foundation — Tier Pricing</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Foundation is mandatory for all deployments. Each tier bundles workers, Concurrent Review users, training credits and Advantage support. Right-tier the customer — boosters carry a 2× per-unit premium. Volume-based pricing is available under the Consumption model.</p>
        <div class="tier-cards">
          <div class="tier-card">
            <div class="tier-card-head">
              <div><span class="tc-chip chip-light">Standard</span></div>
              <div class="tc-price">$155K</div>
              <div class="tc-price-sub">per year</div>
            </div>
            <div class="tier-card-body">
              <div class="tc-row"><span class="tc-label">Workers</span><span class="tc-value">10</span></div>
              <div class="tc-row"><span class="tc-label">Users</span><span class="tc-value">10</span></div>
              <div class="tc-row"><span class="tc-label">Training</span><span class="tc-value">100 credits</span></div>
              <div class="tc-support">Advantage Bronze</div>
            </div>
          </div>
          <div class="tier-card">
            <div class="tier-card-head">
              <div><span class="tc-chip chip-core">Accelerate</span></div>
              <div class="tc-price">$400K</div>
              <div class="tc-price-sub">per year</div>
            </div>
            <div class="tier-card-body">
              <div class="tc-row"><span class="tc-label">Workers</span><span class="tc-value">30</span></div>
              <div class="tc-row"><span class="tc-label">Users</span><span class="tc-value">30</span></div>
              <div class="tc-row"><span class="tc-label">Training</span><span class="tc-value">300 credits</span></div>
              <div class="tc-support">Advantage Bronze</div>
            </div>
          </div>
          <div class="tier-card">
            <div class="tier-card-head">
              <div><span class="tc-chip chip-rapid">Performance</span></div>
              <div class="tc-price">$720K</div>
              <div class="tc-price-sub">per year</div>
            </div>
            <div class="tier-card-body">
              <div class="tc-row"><span class="tc-label">Workers</span><span class="tc-value">60</span></div>
              <div class="tc-row"><span class="tc-label">Users</span><span class="tc-value">60</span></div>
              <div class="tc-row"><span class="tc-label">Training</span><span class="tc-value">600 credits</span></div>
              <div class="tc-support">Advantage Silver</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 2b. Consumption Pricing ── -->
    <div class="section" id="sec-consumption">
      <div class="section-header l1" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 1 — Consumption</span><h2>Nuix Neo Foundation — Consumption Pricing</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Consumption is the same Foundation packaging as the fixed tiers — one tier SKU plus boosters — metered in TB/yr instead of workers. It suits customers who'd rather commit by data volume, particularly irregular workloads or customers early in their data programme. Tier prices match the worker-based tiers exactly; Performance plus TB boosters covers any volume this tool quotes.</p>

        <div class="booster-head">How it works</div>
        <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:16px">
          The rep enters the customer's estimated TB/yr and concurrent users, and the tool recommends the best-fit tier (the largest tier whose included TB doesn't exceed the requirement) plus any TB or user boosters needed, and flags the cheapest tier as Best Value — exactly the same recommend-and-upgrade flow as the worker-based model. Each tier bundles a fixed included TB volume, concurrent users, training credits and Advantage support; going over the included TB is priced via the tier's TB booster.
        </p>

        <div class="tier-cards">
          <div class="tier-card">
            <div class="tier-card-head">
              <div><span class="tc-chip chip-light">Standard</span></div>
              <div class="tc-price">$155K</div>
              <div class="tc-price-sub">per year · SKU NEO007CS</div>
            </div>
            <div class="tier-card-body">
              <div class="tc-row"><span class="tc-label">Included TB/yr</span><span class="tc-value">10</span></div>
              <div class="tc-row"><span class="tc-label">Users</span><span class="tc-value">10</span></div>
              <div class="tc-row"><span class="tc-label">Training</span><span class="tc-value">100 credits</span></div>
              <div class="tc-support">Advantage Bronze</div>
            </div>
          </div>
          <div class="tier-card">
            <div class="tier-card-head">
              <div><span class="tc-chip chip-core">Accelerate</span></div>
              <div class="tc-price">$400K</div>
              <div class="tc-price-sub">per year · SKU NEO007CMD</div>
            </div>
            <div class="tier-card-body">
              <div class="tc-row"><span class="tc-label">Included TB/yr</span><span class="tc-value">40</span></div>
              <div class="tc-row"><span class="tc-label">Users</span><span class="tc-value">30</span></div>
              <div class="tc-row"><span class="tc-label">Training</span><span class="tc-value">300 credits</span></div>
              <div class="tc-support">Advantage Bronze</div>
            </div>
          </div>
          <div class="tier-card">
            <div class="tier-card-head">
              <div><span class="tc-chip chip-rapid">Performance</span></div>
              <div class="tc-price">$720K</div>
              <div class="tc-price-sub">per year · SKU NEO007CL</div>
            </div>
            <div class="tier-card-body">
              <div class="tc-row"><span class="tc-label">Included TB/yr</span><span class="tc-value">75</span></div>
              <div class="tc-row"><span class="tc-label">Users</span><span class="tc-value">60</span></div>
              <div class="tc-row"><span class="tc-label">Training</span><span class="tc-value">600 credits</span></div>
              <div class="tc-support">Advantage Silver</div>
            </div>
          </div>
        </div>

        <div class="booster-head" style="margin-top:20px">Consumption Boosters</div>
        <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:12px">
          TB boosters are priced at 2&times; the tier's own included effective $/TB rate (e.g. Standard: $155,000 &divide; 10 TB = $15,500/TB &times; 2 = $31,000/TB) — the same right-size-the-customer principle as the worker-side boosters. Additional Concurrent User boosters reuse the same per-tier rates as the worker model.
        </p>
        <table>
          <thead><tr><th>Resource</th><th class="right">Standard /yr</th><th class="right">Accelerate /yr</th><th class="right">Performance /yr</th></tr></thead>
          <tbody>
            <tr><td><strong>Additional TB</strong><div class="sub-text">SKU NEOBTBS · NEOBTBMD · NEOBTBL</div></td><td class="price-cell" style="text-align:right">$31,000</td><td class="price-cell" style="text-align:right">$20,000</td><td class="price-cell" style="text-align:right">$19,200</td></tr>
            <tr><td><strong>Additional Concurrent User</strong></td><td class="price-cell" style="text-align:right">$9,000</td><td class="price-cell" style="text-align:right">$6,000</td><td class="price-cell" style="text-align:right">$3,000</td></tr>
          </tbody>
        </table>

        <div class="booster-head" style="margin-top:20px">Discounts &amp; adjustments</div>
        <p style="font-size:13px;color:#374151;line-height:1.7">Consumption pricing follows the same discount-ceiling model as fixed tiers: the tier and booster charges are billed at US list, and Government / public sector (up to 20%), multi-year term (5% per additional year, capped 30%) and regional localisation each widen the rep's discount ceiling rather than cutting the price. The factors compound multiplicatively; see the Discount Ceiling Calculator below.</p>
      </div>
    </div>

    <!-- ── 3. Foundation Boosters ── -->
    <div class="section" id="sec-boosters">
      <div class="section-header" style="background:#004ea3" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 1 — Boosters</span><h2>Foundation Boosters</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Boosters add incremental capacity beyond the bundled tier. Booster unit pricing is approximately 2× the effective bundled rate — use this to right-size tier conversations rather than defaulting to boosters.</p>
        <table>
          <thead><tr><th>Resource</th><th class="right">Standard /yr</th><th class="right">Accelerate /yr</th><th class="right">Performance /yr</th></tr></thead>
          <tbody>
            <tr><td><strong>Additional Worker</strong></td><td class="price-cell" style="text-align:right">$31,000</td><td class="price-cell" style="text-align:right">$27,000</td><td class="price-cell" style="text-align:right">$24,000</td></tr>
            <tr><td><strong>Additional Concurrent User</strong></td><td class="price-cell" style="text-align:right">$9,000</td><td class="price-cell" style="text-align:right">$6,000</td><td class="price-cell" style="text-align:right">$3,000</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 4. AI Suite ── -->
    <div class="section" id="sec-ai">
      <div class="section-header l2" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 2</span><h2>AI Suite</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">AI modules are annual add-ons priced per Foundation tier. Enrich, Semantic Search and Transcription each include the Solutions Library at no extra charge — priced up accordingly. The AI Bundle packages all three (plus the Solutions Library) in one SKU at 30% below buying them separately, and is mutually exclusive with selecting them individually — selecting all three individually auto-upgrades the quote to the Bundle. BYO AI variants carry a significant premium reflecting LLM orchestration and custom workflow capability. BYO AI - Graph requires Knowledge Graph and Enrich (or the AI Bundle), each auto-added to the quote.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:16px">
          <div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:4px">Solutions Library — bundled, not sold standalone</div>
          <p style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:8px">Pre-configured workflows, dashboards and reports for Investigations, Legal and Data Privacy. No longer sold or priced separately — it's included automatically at no charge with any of Enrich, Semantic Search or Transcription, and still appears as its own $0 SKU on the quote and order so it's provisioned to the customer.</p>
          <span class="incl-tag">Pre-configured Workflows</span><span class="incl-tag">Case Dashboards</span><span class="incl-tag">Compliance Reporting</span>
        </div>
        <table>
          <thead><tr><th>Module</th><th class="right">Standard</th><th class="right">Accelerate</th><th class="right">Performance</th></tr></thead>
          <tbody>
            <tr><td><strong>AI Bundle</strong><span class="incl-tag" style="background:#dcfce7;color:#166534;border-color:#86efac;margin-left:6px">Save 30%</span><div class="sub-text">Enrich + Semantic Search + Transcription + Solutions Library, one SKU · 30% below buying separately</div></td><td class="price-cell" style="text-align:right">$105,000</td><td class="price-cell" style="text-align:right">$241,500</td><td class="price-cell" style="text-align:right">$420,000</td></tr>
            <tr><td><strong>Enrich</strong><div class="sub-text">Auto-classify and enrich data with metadata and tags · includes Solutions Library</div></td><td class="price-cell" style="text-align:right">$50,000</td><td class="price-cell" style="text-align:right">$115,000</td><td class="price-cell" style="text-align:right">$200,000</td></tr>
            <tr><td><strong>Semantic Search</strong><div class="sub-text">Deep semantic search beyond keyword matching · includes Solutions Library</div></td><td class="price-cell" style="text-align:right">$50,000</td><td class="price-cell" style="text-align:right">$115,000</td><td class="price-cell" style="text-align:right">$200,000</td></tr>
            <tr><td><strong>Transcription</strong><div class="sub-text">Convert audio/video files to searchable text · includes Solutions Library</div></td><td class="price-cell" style="text-align:right">$50,000</td><td class="price-cell" style="text-align:right">$115,000</td><td class="price-cell" style="text-align:right">$200,000</td></tr>
            <tr><td><strong>BYO AI</strong><div class="sub-text">Bring your own LLM; build custom AI-powered workflows</div></td><td class="price-cell" style="text-align:right">$100,000</td><td class="price-cell" style="text-align:right">$135,000</td><td class="price-cell" style="text-align:right">$200,000</td></tr>
            <tr><td><strong>BYO AI - Advanced</strong><div class="sub-text">Includes all standard BYO AI features, plus advanced LLM orchestration with enhanced model capabilities and custom AI workflows at scale</div></td><td class="price-cell" style="text-align:right">$180,000</td><td class="price-cell" style="text-align:right">$240,000</td><td class="price-cell" style="text-align:right">$360,000</td></tr>
            <tr><td><strong>BYO AI - Graph</strong><div class="sub-text">Includes all standard BYO AI and BYO AI - Advanced features, plus graph-powered AI combining knowledge graph analytics with LLM workflows. Requires a separate Knowledge Graph order (auto-added to the quote as its own line item).</div></td><td class="price-cell" style="text-align:right">$300,000</td><td class="price-cell" style="text-align:right">$400,000</td><td class="price-cell" style="text-align:right">$600,000</td></tr>
            <tr><td><strong>Agentic: AI - Advanced</strong><div class="sub-text">AI-powered case review and investigation — document Q&amp;A, summarisation, translation, timeline generation, automated tagging and agentic workflows, with governance, security, audit logging and enterprise LLM support. Neo 3.0 · Local Deployment only · requires Semantic Search + Advantage Silver (each auto-added to the quote) · includes Solutions Library.</div></td><td class="price-cell" style="text-align:right">$240,000</td><td class="price-cell" style="text-align:right">$400,000</td><td class="price-cell" style="text-align:right">$600,000</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 4b. Visualisation Bundle ── -->
    <div class="section" id="sec-visualisation">
      <div class="section-header l2" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 3</span><h2>Visualisation Bundle</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Knowledge Graph (powered by Linkurious, following the Linkurious acquisition) is sold on its own "Visualisation" step as a fixed Small/Medium/Large bundle of Named Users + Memory. Reps can pick a bundle directly, or enter the customer's desired Named Users and Memory and the tool recommends the cheapest bundle plus any booster packs needed. Bundle prices are simply the sum of the underlying KGU/KGM component prices at the cheapest pack combination that covers the bundle's included capacity — there is no bundle discount. Like the AI Suite, Knowledge Graph requires Enrich (and brings the bundled Solutions Library with it); Enrich is auto-added to the quote if not already present.</p>
        <table>
          <thead><tr><th>Bundle</th><th class="right">Included</th><th class="right">Price /yr</th></tr></thead>
          <tbody>
            <tr><td><strong>Small</strong> <span class="sub-text">VISBNDL001S</span></td><td class="right">10 Named Users · 64GB Memory</td><td class="price-cell" style="text-align:right">$95,860</td></tr>
            <tr><td><strong>Medium</strong> <span class="sub-text">VISBNDL001MD</span></td><td class="right">25 Named Users · 128GB Memory</td><td class="price-cell" style="text-align:right">$168,970</td></tr>
            <tr><td><strong>Large</strong> <span class="sub-text">VISBNDL001L</span></td><td class="right">50 Named Users · 256GB Memory</td><td class="price-cell" style="text-align:right">$228,720</td></tr>
          </tbody>
        </table>
        <p class="section-intro" style="margin-top:14px">Boosters — additional Named Users or Memory beyond a bundle's included capacity — are sold as whole KGU/KGM packs at these same prices, in multiples of the existing pack sizes only (no partial packs). Boosters are never picked manually — the recommender works out which pack (and how many) covers the shortfall at the lowest cost:</p>
        <table>
          <thead><tr><th>Pack</th><th class="right">Price /yr</th></tr></thead>
          <tbody>
            <tr><td>KGU002 — 20 Named Users</td><td class="price-cell" style="text-align:right">$83,240</td></tr>
            <tr><td>KGU003 — 50 Named Users</td><td class="price-cell" style="text-align:right">$142,700</td></tr>
            <tr><td>KGU004 — 100 Named Users</td><td class="price-cell" style="text-align:right">$214,040</td></tr>
            <tr><td>KGU005 — 200 Named Users</td><td class="price-cell" style="text-align:right">$416,200</td></tr>
            <tr><td>KGM001 — 64GB Memory</td><td class="price-cell" style="text-align:right">$36,400</td></tr>
            <tr><td>KGM002 — 128GB Memory</td><td class="price-cell" style="text-align:right">$56,000</td></tr>
            <tr><td>KGM003 — 256GB Memory</td><td class="price-cell" style="text-align:right">$86,020</td></tr>
            <tr><td>KGM004 — 512GB Memory</td><td class="price-cell" style="text-align:right">$143,360</td></tr>
            <tr><td>KGM005 — 1024GB Memory</td><td class="price-cell" style="text-align:right">$229,380</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 5a. Discover Pricing ── -->
    <div class="section" id="sec-discover-pricing">
      <div class="section-header l4" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 3</span><h2>Discover — Pricing Detail</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Active Data, Archive Data, File Transfer Data and Inactive Data are pooled for volume discounting: their combined list-price total is projected across the full contract (with annual uplift compounding) into a total contract value (TCV), and one blended discount is applied equally to all four — 20% under $100K TCV, rising to 30/40/50/60% at the $100K/$200K/$300K/$400K breakpoints. Rates below are list, before that discount.</p>
        <table>
          <thead><tr><th>Capability</th><th>Pricing Model</th><th class="right">Rate</th></tr></thead>
          <tbody>
            <tr><td><strong>Nuix Discover SaaS — Active data</strong></td><td>Per GB/month</td><td class="price-cell" style="text-align:right">$14.75</td></tr>
            <tr><td style="padding-left:24px">Archive data <span class="sub-text">NRTCLAD</span></td><td>Per GB/month</td><td class="price-cell" style="text-align:right">$3.70</td></tr>
            <tr><td style="padding-left:24px">File transfer data <span class="sub-text">NRTCLFT</span></td><td>Per GB/month</td><td class="price-cell" style="text-align:right">$3.70</td></tr>
            <tr><td style="padding-left:24px">Inactive data <span class="sub-text">NRTCLREF</span></td><td>Per GB/month</td><td class="price-cell" style="text-align:right">$3.70</td></tr>
            <tr><td style="padding-left:24px">Early case assessment <span class="sub-text">NRTECA</span></td><td>Per GB/month</td><td class="price-cell" style="text-align:right">$4.90</td></tr>
            <tr><td style="padding-left:24px">Gen AI Review — active data <span class="sub-text">NRTAIACT · choose one Gen AI Review pricing method</span></td><td>Per GB/month</td><td class="price-cell" style="text-align:right">$5.00</td></tr>
            <tr><td style="padding-left:24px">Gen AI Review — per document <span class="sub-text">NRTAIDOC · choose one Gen AI Review pricing method</span></td><td>Per document</td><td class="price-cell" style="text-align:right">$0.06</td></tr>
            <tr><td style="padding-left:24px">Audio transcription <span class="sub-text">NRTAUDIO</span></td><td>Per minute/month</td><td class="price-cell" style="text-align:right">$0.35</td></tr>
            <tr><td style="padding-left:24px">Machine language translation <span class="sub-text">NRTMLT · 35,000 characters = 1 document</span></td><td>Per document/month</td><td class="price-cell" style="text-align:right">$0.40</td></tr>
            <tr><td style="padding-left:24px">Two-factor authentication <span class="sub-text">NRTTFA</span></td><td>Per user/month</td><td class="price-cell" style="text-align:right">$6.80</td></tr>
            <tr><td style="padding-left:24px">Excel redaction <span class="sub-text">NRTERDOC · one-off, not annualized</span></td><td>Per document</td><td class="price-cell" style="text-align:right">$1.00</td></tr>
            <tr><td><strong>Nuix Discover On-Prem — Instance</strong></td><td>Per instance/yr</td><td class="price-cell" style="text-align:right">$59,540</td></tr>
            <tr><td style="padding-left:24px">User <span class="sub-text">NRTOPUSER</span></td><td>Per user/yr</td><td class="price-cell" style="text-align:right">$2,380</td></tr>
            <tr><td style="padding-left:24px">Capacity (GB) <span class="sub-text">NRTHGB · alternative capacity metric to User</span></td><td>Per GB/yr</td><td class="price-cell" style="text-align:right">$4.32</td></tr>
            <tr><td style="padding-left:24px">Predictive coding add-on <span class="sub-text">NRTPCODE</span></td><td>Per instance/yr</td><td class="price-cell" style="text-align:right">$34,020</td></tr>
            <tr><td style="padding-left:24px">AI Review <span class="sub-text">NRTDISCAI01</span></td><td>Per instance/yr</td><td class="price-cell" style="text-align:right">$45,500</td></tr>
            <tr><td style="padding-left:24px">Enrich — OOTB models <span class="sub-text">NRTDISCAI02</span></td><td>Per instance/yr</td><td class="price-cell" style="text-align:right">$45,500</td></tr>
            <tr><td style="padding-left:24px">Ingestions <span class="sub-text">NRTDISC01</span></td><td>Per worker/yr</td><td class="price-cell" style="text-align:right">$22,340</td></tr>
            <tr><td style="padding-left:24px">Native Excel redaction <span class="sub-text">NRTDISCXLR01</span></td><td>Per instance/yr</td><td class="price-cell" style="text-align:right">$7,000</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 5. EC Pricing ── -->
    <div class="section" id="sec-ec-pricing">
      <div class="section-header l4" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 3</span><h2>Add Ons — Pricing Detail</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <table>
          <thead><tr><th>Capability</th><th>Pricing Model</th><th class="right">Rate</th></tr></thead>
          <tbody>
            <tr><td><strong>Adaptive Security</strong></td><td>Per endpoint / user / server /yr</td><td class="price-cell" style="text-align:right">$20/endpoint &nbsp;·&nbsp; $3,000/user &nbsp;·&nbsp; $30,000/server</td></tr>
            <tr><td><strong>ECC (Enterprise Collection Centre)</strong></td><td>Per endpoint/yr</td><td class="price-cell" style="text-align:right">$8/endpoint</td></tr>
            <tr><td><strong>Nuix Automate Legal Hold</strong></td><td>Per custodian/month</td><td class="price-cell" style="text-align:right">$2</td></tr>
            <tr><td><strong>ABBYY OCR</strong></td><td>Per page-volume package/yr</td><td class="price-cell" style="text-align:right">$1,588 (100K) – $8,624 (1M pages)</td></tr>
            <tr><td><strong>Q1 Dynamics</strong></td><td>Per connector/yr (20 connectors available)</td><td class="price-cell" style="text-align:right">$11,060 – $53,460 / connector</td></tr>
            <tr><td><strong>T3K (Media Analysis)</strong></td><td>Connector + volume tier or user tier /yr</td><td class="price-cell" style="text-align:right">$22,000/connector &nbsp;·&nbsp; $32,000–$154,000 (TB) &nbsp;·&nbsp; $20,440–$53,200 (users)</td></tr>
            <tr><td><strong>Veritone</strong></td><td>Connector + transcription tier + translation /yr</td><td class="price-cell" style="text-align:right">$22,000/connector &nbsp;·&nbsp; $33,010–$220,000 transcription &nbsp;·&nbsp; $27,500/1st lang</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 6. EC Matrix ── -->
    <div class="section" id="sec-ec-matrix">
      <div class="section-header l4" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 3 — Use Case Fit</span><h2>Add Ons</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Position add-ons in context of the customer's primary workflow. Avoid presenting all options at once — use this matrix to select the two or three most relevant capabilities per deal.</p>
        <table class="ec-matrix">
          <thead><tr><th class="left" style="min-width:220px">Capability</th><th>Investigations</th><th>Legal</th><th>Data Privacy</th></tr></thead>
          <tbody>
            <tr><td class="left"><strong>Nuix Discover (SaaS or On-Prem)</strong><div class="sub-text">Review, analytics &amp; production platform</div></td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td></tr>
            <tr><td class="left"><strong>Adaptive Security</strong><div class="sub-text">Endpoint, user &amp; server monitoring</div></td><td class="check">✓</td><td class="dash">—</td><td class="check">✓</td></tr>
            <tr><td class="left"><strong>ECC (Enterprise Collection Centre)</strong><div class="sub-text">Capture &amp; review Teams, Slack, email</div></td><td class="check">✓</td><td class="check">✓</td><td class="dash">—</td></tr>
            <tr><td class="left"><strong>ABBYY OCR</strong><div class="sub-text">Scanned document recognition</div></td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td></tr>
            <tr><td class="left"><strong>Q1 Dynamics Connectors</strong><div class="sub-text">Enterprise system data collection</div></td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td></tr>
            <tr><td class="left"><strong>T3K (Media Analysis)</strong><div class="sub-text">Image/video classification &amp; CSAM detection</div></td><td class="check">✓</td><td class="dash">—</td><td class="dash">—</td></tr>
            <tr><td class="left"><strong>Veritone (Transcription &amp; Translation)</strong><div class="sub-text">AI-powered multimedia transcription &amp; translation</div></td><td class="check">✓</td><td class="check">✓</td><td class="dash">—</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 7. Advantage & Implementation ── -->
    <div class="section" id="sec-advantage">
      <div class="section-header" style="background:#0d4080" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 4</span><h2>Advantage &amp; Implementation</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Advantage support upgrades and the Foundation and Solution Implementation Packages sit in Layer 4. Support upgrades are priced incrementally — the customer pays only the difference from their tier's included level. Advantage Hours Top Up packs, CSLT300, and CSLT301 are one-off or optional add-ons available at this layer.</p>
        <div class="booster-head">Support Upgrade (incremental from tier's included level)</div>
        <table>
          <thead><tr><th>Upgrade to</th><th class="right">Standard /yr<div class="sub-text">from Bronze</div></th><th class="right">Accelerate /yr<div class="sub-text">from Bronze</div></th><th class="right">Performance /yr<div class="sub-text">from Silver</div></th></tr></thead>
          <tbody>
            <tr><td><strong>Advantage Silver</strong></td><td class="price-cell" style="text-align:right">$30,000</td><td class="price-cell" style="text-align:right">$30,000</td><td class="price-cell" style="text-align:right;color:#6b7280;font-style:italic">Included</td></tr>
            <tr><td><strong>Advantage Gold</strong></td><td class="price-cell" style="text-align:right">$75,000</td><td class="price-cell" style="text-align:right">$75,000</td><td class="price-cell" style="text-align:right">$45,000</td></tr>
          </tbody>
        </table>
        <div class="booster-head">Advantage Hours Top Up (CSLT107)</div>
        <table>
          <thead><tr><th>SKU</th><th>Description</th><th class="right">List Price</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td><strong>CSLT107</strong></td><td>Nuix Advantage – Top Up 24 Hours</td><td class="price-cell" style="text-align:right">$280 / hr</td><td><div class="sub-text">Sold in packs of 24 hrs ($6,720 / pack) · all tiers</div></td></tr>
          </tbody>
        </table>
        <div class="booster-head">Implementation Packages (CSLT300, CSLT301)</div>
        <table>
          <thead><tr><th>SKU</th><th>Description</th><th class="right">List Price</th><th>Notes</th></tr></thead>
          <tbody>
            <tr><td><strong>CSLT300</strong></td><td>Nuix Neo Foundation Implementation Package</td><td class="price-cell" style="text-align:right">$31,310</td><td><div class="sub-text">One-off · Year 1 only for multi-year deals · per instance</div></td></tr>
            <tr><td><strong>CSLT301</strong></td><td>Nuix Neo Solution Implementation Package</td><td class="price-cell" style="text-align:right">$46,020</td><td><div class="sub-text">One-off · Year 1 only for multi-year deals · per instance</div></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Layer 5. Test Environments ── -->
    <div class="section" id="sec-testenv">
      <div class="section-header" style="background:#5b6b85" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Layer 5</span><h2>Test Environments</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Optional test environment licences for customers who need a non-production instance alongside production. Each SKU is sold per unit per year and can be selected independently.</p>
        <table>
          <thead><tr><th>SKU</th><th>Description</th><th class="right">List Price</th><th>Notes</th></tr></thead>
          <tbody>
            ${C.non_prod.skus.map(s => `<tr><td><strong>${s.sku}</strong></td><td>${s.name}</td><td class="price-cell" style="text-align:right">${s.list_price == null ? 'TBC' : '$' + s.list_price.toLocaleString('en-US')}</td><td><div class="sub-text">Per unit/yr · ${s.description}</div></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── 8. Dependencies ── -->
    <div class="section" id="sec-deps">
      <div class="section-header" style="background:#1e40af" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Dependencies</span><h2>Product Dependencies</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Communicate these clearly to avoid configuration or licensing issues post-sale.</p>
        <div class="dep-row"><div class="dep-arrow">⟶</div><div><div class="dep-text"><strong>Layer 1 (Nuix Neo Foundation)</strong> is required for all other layers.</div><div class="dep-note">No AI Suite, use case, enhanced capability or consulting engagement can be sold without a Foundation tier.</div></div></div>
        <div class="dep-row"><div class="dep-arrow">⟶</div><div><div class="dep-text"><strong>Layer 2 (AI Suite)</strong> modules require the corresponding Foundation tier or higher.</div><div class="dep-note">AI module pricing is tier-matched — an Accelerate AI add-on requires at minimum an Accelerate Foundation.</div></div></div>
        <div class="dep-row"><div class="dep-arrow">⟶</div><div><div class="dep-text"><strong>Solutions Library</strong> is no longer sold or configured separately.</div><div class="dep-note">It's bundled automatically at $0 with Enrich, Semantic Search or Transcription (Layer 2) — selecting any one of those adds the matching-tier Solutions Library SKU to the quote at no charge.</div></div></div>
        <div class="dep-row"><div class="dep-arrow">⟶</div><div><div class="dep-text"><strong>Visualisation Bundle / Knowledge Graph</strong> requires Enrich (Layer 2).</div><div class="dep-note">Enrich is auto-added to the quote if not already present (or already covered by the AI Bundle) — and brings the bundled Solutions Library along with it at no extra charge.</div></div></div>
        <div class="dep-row"><div class="dep-arrow">⟶</div><div><div class="dep-text"><strong>Nuix Discover</strong> (SaaS or On-Prem) is a standalone add-on and can be positioned across all use cases.</div><div class="dep-note">Does not require a specific use case to be active.</div></div></div>
        <div class="dep-row"><div class="dep-arrow">⟶</div><div><div class="dep-text"><strong>Third-party integrations</strong> require the relevant Nuix Foundation tier to be active.</div><div class="dep-note">Do not commit to third-party capability without confirming Foundation entitlement.</div></div></div>
      </div>
    </div>

    <!-- ── 9. Discount Calculator ── -->
    <div class="section" id="sec-discounts">
      <div class="section-header" style="background:#0d4080" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Discounting</span><h2>Discount Ceiling Calculator</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">Every customer is quoted the same US list price. The factors below don't cut the price — they widen the rep's <strong>discount ceiling</strong> (the most a rep can discount before CEO approval). Every rep starts with a 20% standard Additional Discount; each applicable factor compounds on top. Selling past the ceiling is still allowed but needs CEO sign-off.</p>
        <div class="disc-layout">
          <div class="disc-checks">
            <label class="disc-check-item" id="dci-gov">
              <input type="checkbox" id="dc-gov" onchange="calcDiscount()">
              <div class="disc-check-label">
                <div class="disc-check-title">Government / Public Sector</div>
                <div class="disc-check-sub">Adds up to 20% of discount headroom for government and public sector customers.</div>
                <div class="disc-num-wrap"><span class="disc-num-label">Discount %</span><input class="disc-num-inp" id="dc-gov-pct" type="number" value="20" min="1" max="20" oninput="calcDiscount()"></div>
              </div>
            </label>
            <label class="disc-check-item" id="dci-my">
              <input type="checkbox" id="dc-my" onchange="calcDiscount()">
              <div class="disc-check-label">
                <div class="disc-check-title">Multi-Year Contract</div>
                <div class="disc-check-sub">Adds 5% of headroom per additional year (multiplicative), capped at 30%. A 3-year deal adds ~10%.</div>
                <div class="disc-num-wrap"><span class="disc-num-label">Contract years</span><input class="disc-num-inp" id="dc-my-yrs" type="number" value="3" min="2" max="5" oninput="calcDiscount()"></div>
              </div>
            </label>
            <label class="disc-check-item" id="dci-reg">
              <input type="checkbox" id="dc-reg" onchange="calcDiscount()">
              <div class="disc-check-label">
                <div class="disc-check-title">Regional Localisation</div>
                <div class="disc-check-sub">Country-based price localisation — the multiplier becomes discount headroom, not a price cut.</div>
                <div class="disc-num-wrap" style="margin-top:8px">
                  <select id="dc-reg-country" onchange="calcDiscount()" style="padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;color:#003080;font-weight:600;background:#fff;cursor:pointer">
                    ${regionalCountryOptions}
                  </select>
                </div>
              </div>
            </label>
          </div>
          <div class="disc-result" id="disc-result">
            <div class="disc-result-label">Discount ceiling · before CEO approval</div>
            <div class="disc-result-pct" id="disc-pct-display">20.0%</div>
            <div class="disc-result-sub" id="disc-result-sub">Additional Discount only — add factors on the left</div>
            <div class="disc-breakdown" id="disc-breakdown" style="display:none"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 10. Currency Conversion ── -->
    <div class="section" id="sec-currency">
      <div class="section-header" style="background:#0d4080" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="badge">Currency</span><h2>Currency Conversion Rates</h2></div>
        <span class="collapse-icon">&#8964;</span>
      </div>
      <div class="section-body">
        <p class="section-intro">All list prices in the tool are denominated in USD and every customer is quoted that same US list price. When a supported currency is selected, the tool converts the USD list price using the fixed exchange rates below — it is a display conversion only and does not affect the underlying USD contract value. Regional localisation, government and multi-year affect the discount ceiling, not this price.</p>

        <div class="booster-head">Supported currencies</div>
        <table>
          <thead><tr><th>Currency</th><th>Code</th><th>Symbol</th><th class="right">Rate (per 1 USD)</th><th>Countries auto-assigned in tool</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>US Dollar</strong></td><td>USD</td><td>$</td><td class="price-cell" style="text-align:right">1.0000 <span style="font-size:11px;opacity:0.55">(base)</span></td>
              <td style="font-size:12px;color:#6b7280">United States · all other countries not listed below</td>
            </tr>
            <tr>
              <td><strong>Australian Dollar</strong></td><td>AUD</td><td>A$</td><td class="price-cell" style="text-align:right">1.4286</td>
              <td style="font-size:12px;color:#6b7280">Australia</td>
            </tr>
            <tr>
              <td><strong>Canadian Dollar</strong></td><td>CAD</td><td>C$</td><td class="price-cell" style="text-align:right">1.3275</td>
              <td style="font-size:12px;color:#6b7280">Canada</td>
            </tr>
            <tr>
              <td><strong>Euro</strong></td><td>EUR</td><td>€</td><td class="price-cell" style="text-align:right">0.8832</td>
              <td style="font-size:12px;color:#6b7280">Germany · France · Netherlands · Belgium · Switzerland · Sweden · Norway · Denmark · Spain · Italy</td>
            </tr>
            <tr>
              <td><strong>British Pound</strong></td><td>GBP</td><td>£</td><td class="price-cell" style="text-align:right">0.7895</td>
              <td style="font-size:12px;color:#6b7280">United Kingdom</td>
            </tr>
          </tbody>
        </table>

        <div class="booster-head" style="margin-top:20px">How pricing is calculated</div>
        <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:10px">The price shown to every customer is the US list price — regional localisation, government and multi-year no longer cut the price. The chain applied by the tool is:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;font-size:13px;color:#1e3a5f;line-height:2;font-family:monospace">
          USD list price<br>
          &nbsp;&nbsp;× currency rate (display only)<br>
          &nbsp;&nbsp;= <strong>displayed list price in selected currency</strong>
        </div>
        <p style="font-size:13px;color:#374151;line-height:1.7;margin:12px 0 10px">Regional localisation, government status and multi-year term instead set the rep's <strong>discount ceiling</strong> — the maximum discount off list before CEO approval:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;font-size:13px;color:#1e3a5f;line-height:2;font-family:monospace">
          floor = (1 − 20% standard Additional Discount)<br>
          &nbsp;&nbsp;× regional localisation multiplier (if applicable)<br>
          &nbsp;&nbsp;× (1 − government headroom) (if applicable)<br>
          &nbsp;&nbsp;× (1 − multi-year headroom) (if applicable)<br>
          &nbsp;&nbsp;→ <strong>discount ceiling = 1 − floor</strong>
        </div>
        <p style="font-size:12px;color:#6b7280;margin-top:10px">Note: countries without a mapped currency (e.g. Brazil, UAE, Singapore, Japan) display in USD regardless of the selected currency picker. The currency picker in the tool can be overridden manually for any quote.</p>
      </div>
    </div>


    <!-- sandbox removed -->
    <div style="display:none"><div class="section-body">
        <div class="sandbox-banner">
          <div class="sandbox-banner-icon">&#127358;</div>
          <div class="sandbox-banner-text">
            <h3>Explore scenarios — not a formal quote</h3>
            <p>Use this sandbox to quickly model deal shapes and communicate indicative pricing. For formal proposals, use the full Pricing Tool which applies regional multipliers, multi-year terms, discounts and generates a full quote sheet.</p>
          </div>
        </div>
        <div class="sandbox-layout">
          <div class="sandbox-controls">
            <!-- Foundation tier -->
            <div class="sb-section">
              <div class="sb-section-title">1 — Foundation Tier (required)</div>
              <div class="sb-tier-grid">
                <div class="sb-tier-btn" data-tier="light" data-price="150000" onclick="sbSelectTier(this)">Standard<div class="tb-price">$150K/yr</div></div>
                <div class="sb-tier-btn" data-tier="core"  data-price="400000" onclick="sbSelectTier(this)">Accelerate<div class="tb-price">$400K/yr</div></div>
                <div class="sb-tier-btn" data-tier="rapid" data-price="800000" onclick="sbSelectTier(this)">Performance<div class="tb-price">$800K/yr</div></div>
              </div>
            </div>
            <!-- AI Suite -->
            <div class="sb-section">
              <div class="sb-section-title">2 — AI Suite (optional)</div>
              <div class="sb-toggles" id="sb-ai">
                <div class="sb-toggle" data-name="Enrich"          data-prices="30000,30000,50000" onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">Enrich</div></div><div class="sb-toggle-price sb-tprice">$30K / $30K / $50K</div></div>
                <div class="sb-toggle" data-name="Semantic Search" data-prices="30000,30000,50000" onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">Semantic Search</div></div><div class="sb-toggle-price sb-tprice">$30K / $30K / $50K</div></div>
                <div class="sb-toggle" data-name="Transcription"   data-prices="30000,30000,50000" onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">Transcription</div></div><div class="sb-toggle-price sb-tprice">$30K / $30K / $50K</div></div>
                <div class="sb-toggle" data-name="BYO AI" data-prices="100000,135000,200000" onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">BYO AI</div></div><div class="sb-toggle-price sb-tprice">$100K / $135K / $200K</div></div>
                <div class="sb-toggle" data-name="BYO AI - Advanced" data-prices="180000,240000,360000" onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">BYO AI - Advanced</div></div><div class="sb-toggle-price sb-tprice">$180K / $240K / $360K</div></div>
                <div class="sb-toggle" data-name="BYO AI - Graph" data-prices="300000,400000,600000" onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">BYO AI - Graph</div></div><div class="sb-toggle-price sb-tprice">$300K / $400K / $600K</div></div>
              </div>
            </div>
            <!-- Use Cases -->
            <div class="sb-section">
              <div class="sb-section-title">3 — Use Cases (optional)</div>
              <div class="sb-toggles">
                <div class="sb-toggle" data-name="Investigations"  data-prices="18750,50000,100000"  onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">Investigations</div></div><div class="sb-toggle-price sb-tprice">$18.75K / $50K / $100K</div></div>
                <div class="sb-toggle" data-name="Legal"           data-prices="26250,70000,140000"  onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">Legal</div></div><div class="sb-toggle-price sb-tprice">$26.25K / $70K / $140K</div></div>
                <div class="sb-toggle" data-name="Data Privacy"    data-prices="22500,60000,120000"  onclick="sbToggle(this)"><div class="sb-toggle-left"><div class="sb-toggle-dot"></div><div class="sb-toggle-name">Data Privacy</div></div><div class="sb-toggle-price sb-tprice">$22.5K / $60K / $120K</div></div>
              </div>
            </div>
            <!-- Consulting estimate -->
            <div class="sb-section">
              <div class="sb-section-title">5 — Consulting estimate (optional)</div>
              <div class="sb-toggles">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                  <div>
                    <div style="font-size:11px;color:#64748b;margin-bottom:4px">Role</div>
                    <select id="sb-cons-role" onchange="sbUpdateConsulting()" style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#fff">
                      <option value="0">None</option>
                      <option value="2700">Consultant ($2,700/day)</option>
                      <option value="3600">Senior Consultant ($3,600/day)</option>
                      <option value="4500">Principal Consultant ($4,500/day)</option>
                      <option value="5500">SME ($5,500/day)</option>
                    </select>
                  </div>
                  <div>
                    <div style="font-size:11px;color:#64748b;margin-bottom:4px">Days</div>
                    <input id="sb-cons-days" type="number" value="10" min="1" onchange="sbUpdateConsulting()" style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px">
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Price panel -->
          <div class="sb-price-panel">
            <div class="sb-panel-title">Indicative Annual Value</div>
            <div class="sb-panel-note">List price · USD · Before discounts</div>
            <div class="sb-total" id="sb-total">$0</div>
            <div class="sb-total-sub">per year</div>
            <div class="sb-line-items" id="sb-lines"><div class="sb-empty">Select a Foundation tier to begin</div></div>
            <button class="sb-reset" onclick="sbReset()">&#8635; Reset sandbox</button>
            <div class="sb-disclaimer">This sandbox is for internal reference only. Regional multipliers, negotiated discounts, and multi-year terms are not applied here. Use the full Pricing Tool to generate a formal quote.</div>
          </div>
        </div>
      </div>
    </div>

    <footer>Nuix NEO Pricing &amp; Packaging Guide &nbsp;·&nbsp; GNG Partners &nbsp;·&nbsp; Internal use only</footer>
  </div><!-- /main -->
</div><!-- /page-body -->

<script>
  // ── Collapsible sections ──
  function toggleSection(header) {
    header.closest('.section').classList.toggle('collapsed');
  }

  // ── Sticky nav highlight ──
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = document.getElementById(item.dataset.target);
      if (target) {
        // Expand if collapsed
        target.classList.remove('collapsed');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const mainEl = document.getElementById('main-scroll');
  function updateNav() {
    const sections = document.querySelectorAll('.section[id]');
    let current = null;
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= 100) current = sec.id;
    });
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.target === current);
    });
  }
  mainEl.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // ── Discount calculator ──
  function calcDiscount() {
    const govOn = document.getElementById('dc-gov').checked;
    const myOn  = document.getElementById('dc-my').checked;
    const regOn = document.getElementById('dc-reg').checked;

    // Update active state on cards
    ['gov','my','reg'].forEach(k => {
      document.getElementById('dci-'+k).classList.toggle('active', document.getElementById('dc-'+k).checked);
    });

    // Factors compound to size the discount CEILING (max discount before CEO
    // approval), not the price. Every rep starts with a 20% standard Additional Discount;
    // the "floor" is the share of list still charged at maximum discount.
    let floor = 0.80;                       // standard Additional Discount (1 − 20%)
    const rows = [['Additional Discount', '20%']];

    if (govOn) {
      const pct = Math.min(20, parseFloat(document.getElementById('dc-gov-pct').value) || 0);
      floor *= (1 - pct / 100);
      rows.push(['Government / Public Sector', '+' + pct + '%']);
    }
    if (regOn) {
      const regMult = parseFloat(document.getElementById('dc-reg-country').value) || 1;
      const country = document.getElementById('dc-reg-country').options[document.getElementById('dc-reg-country').selectedIndex].text.split(' (')[0];
      floor *= regMult;
      rows.push([country + ' (Localisation)', '+' + Math.round((1 - regMult) * 100) + '%']);
    }
    if (myOn) {
      const yrs = Math.max(2, parseInt(document.getElementById('dc-my-yrs').value) || 2);
      const pct = Math.min(30, (yrs - 1) * 5);
      floor *= (1 - pct / 100);
      rows.push(['Multi-Year (' + yrs + ' yrs)', '+' + pct + '%']);
    }

    const ceilingPct = (1 - floor) * 100;
    const pctEl = document.getElementById('disc-pct-display');
    const subEl = document.getElementById('disc-result-sub');
    const brkEl = document.getElementById('disc-breakdown');

    pctEl.textContent = ceilingPct.toFixed(1) + '%';

    brkEl.style.display = 'block';
    brkEl.innerHTML = rows.map(([l,v]) =>
      '<div class="disc-b-row"><span>' + l + '</span><span>' + v + '</span></div>'
    ).join('')
      + '<div class="disc-b-row" style="border-top:1px solid rgba(255,255,255,0.25);margin-top:4px;padding-top:6px"><span>Still charged at floor</span><span>' + (floor * 100).toFixed(1) + '%</span></div>'
      + '<div class="disc-b-row" style="font-weight:700"><span>Ceiling before CEO</span><span>' + ceilingPct.toFixed(1) + '%</span></div>';
    subEl.textContent = (rows.length > 1)
      ? 'Customer pays ≥ ' + (floor * 100).toFixed(1) + '% of list before CEO sign-off'
      : 'Additional Discount only — add factors on the left';
  }
  calcDiscount();
</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}


// ─── Battle Cards ────────────────────────────────────────────────────────────

function showBattleCards() {
  const win = window.open('', '_battleCards');

  const competitors = [
    {
      id: 'relativity',
      name: 'Relativity',
      tagline: 'Legacy review platform dominant in US legal',
      useCases: ['Legal', 'Investigations'],
      logo_color: '#e85d04',
      overview: 'Relativity is the dominant eDiscovery review platform in the US market, with deep penetration in large law firms and corporate legal departments. They compete primarily on review workflow, an extensive partner ecosystem, and brand familiarity with legal reviewers.',
      their_strengths: [
        'Market leader brand in US legal — reviewers are already trained on it',
        'Large partner ecosystem (RelativityOne, Marketplace apps)',
        'Strong legal review UI with established workflows',
        'Cloud-native RelativityOne has accelerated enterprise adoption',
        'Deep integrations with legal hold and matter management tools',
      ],
      nuix_advantages: [
        { point: 'Processing speed at scale', detail: 'Nuix processes data 10–100× faster than Relativity at high volume — critical for large investigations and tight court deadlines.' },
        { point: 'Data source breadth', detail: 'Nuix natively ingests 1,000+ data types including forensic images, mobile, cloud and unstructured sources. Relativity depends on third-party processors.' },
        { point: 'Investigations capability', detail: 'Relativity is a review tool. Nuix is an investigation platform — timeline analysis, knowledge graph, entity extraction, communications analysis all built in.' },
        { point: 'Single platform vs point solution', detail: 'Relativity requires separate tools for collection, processing, review and analysis. Nuix does all of this in one platform, reducing vendor complexity and cost.' },
        { point: 'Government and regulated industries', detail: 'Nuix has deep presence in law enforcement, intelligence and government where Relativity has limited footprint and security certifications.' },
      ],
      objections: [
        { obj: '"Our reviewers all know Relativity"', response: 'Nuix handles collection, processing and analysis — the heavy lifting before review. Export directly to Relativity for review if needed. You get Nuix speed and capability, your team keeps their workflow.' },
        { obj: '"Relativity is already deployed"', response: 'Nuix complements Relativity — many large firms use both. Nuix upstream for processing and investigation, Relativity downstream for attorney review. TCO is lower than expanding Relativity licensing.' },
        { obj: '"RelativityOne is cloud-native"', response: 'Nuix NEO is available as SaaS (Nuix Discover) and on-prem. For regulated and government customers, on-prem data sovereignty is non-negotiable — Relativity cannot match that.' },
      ],
      win_themes: ['Speed at volume', 'Investigation depth', 'Government / regulated sector', 'Data source breadth', 'Platform consolidation'],
      best_fit: 'Legal + Investigations, large enterprises, government, high-volume matters',
    },
    {
      id: 'cellebrite',
      name: 'Cellebrite',
      tagline: 'Mobile forensics specialist expanding into enterprise',
      useCases: ['Investigations'],
      logo_color: '#1a73e8',
      overview: 'Cellebrite is the dominant vendor in mobile device forensics, with strong law enforcement and government presence. They are expanding into enterprise investigations with UFED and Pathfinder, but remain primarily a mobile/endpoint specialist.',
      their_strengths: [
        'Best-in-class mobile device extraction and decoding',
        'Very strong law enforcement and government relationships',
        'Pathfinder analytics platform growing in capability',
        'Hardware + software bundle creates switching costs',
        'Brand recognition in digital forensics community',
      ],
      nuix_advantages: [
        { point: 'Enterprise data scale', detail: 'Cellebrite is built for device-level forensics. Nuix scales to petabytes of enterprise data — email, cloud, file shares, databases — not just mobile devices.' },
        { point: 'Multi-source correlation', detail: 'Nuix correlates data across all sources simultaneously — mobile, email, Teams, SharePoint, network logs. Cellebrite works source by source.' },
        { point: 'Legal and compliance workflows', detail: 'Nuix has native legal hold, Relativity export, ECA and production capabilities. Cellebrite has no legal workflow — investigations without an output path.' },
        { point: 'AI and analytics depth', detail: 'Nuix AI Suite (Enrich, Semantic, Transcription, BYO AI) provides automated classification and insight generation at scale. Cellebrite Pathfinder is limited to mobile data analytics.' },
        { point: 'Corporate investigations', detail: 'Cellebrite has limited traction in corporate HR, fraud and workplace misconduct investigations. Nuix is purpose-built for these workflows.' },
      ],
      objections: [
        { obj: '"We already use Cellebrite for mobile forensics"', response: 'Nuix and Cellebrite are complementary — Cellebrite for mobile extraction, Nuix for processing and analysing everything else at scale. Many agencies run both.' },
        { obj: '"Cellebrite is cheaper for our investigators"', response: 'Cellebrite is priced per device/seat for mobile work. When you factor in the enterprise data that cannot be processed by Cellebrite, the total cost of running both point tools exceeds a single Nuix deployment.' },
        { obj: '"Our team knows UFED"', response: 'Nuix ingests Cellebrite UFED output directly. Investigators keep their mobile workflow, gain enterprise-scale analysis capability on top.' },
      ],
      win_themes: ['Enterprise scale investigations', 'Multi-source correlation', 'Legal workflow output', 'Corporate investigations', 'AI-powered analytics'],
      best_fit: 'Enterprise investigations, corporate fraud, AML, insider threat, government agencies needing enterprise-scale',
    },
    {
      id: 'opentext',
      name: 'OpenText / Axcelerate',
      tagline: 'Legacy enterprise content and eDiscovery suite',
      useCases: ['Legal', 'Data Privacy'],
      logo_color: '#007bff',
      overview: 'OpenText competes through their Axcelerate eDiscovery platform and broader ECM/information management suite. They win on incumbent relationships and bundled pricing within large enterprise content management deployments.',
      their_strengths: [
        'Deep incumbent relationships in large enterprise accounts',
        'Bundled into broader OpenText ECM / EIM contracts',
        'Long track record in information governance and compliance',
        'Documentum and Content Suite integration for existing customers',
        'Global support and professional services organisation',
      ],
      nuix_advantages: [
        { point: 'Modern architecture', detail: 'Nuix NEO is purpose-built for the current data landscape. OpenText Axcelerate is aging technology with significant technical debt and a complex legacy stack.' },
        { point: 'Processing performance', detail: 'Nuix consistently outperforms OpenText on ingestion speed, especially for large unstructured data sets and complex file types.' },
        { point: 'Investigations capability', detail: 'OpenText is a content management and review platform. Nuix adds investigations, insider threat, AI enrichment and forensic-grade analysis that OpenText cannot match.' },
        { point: 'AI-native', detail: 'Nuix AI Suite is a core product capability. OpenText AI is largely bolted-on via acquisitions with limited deep integration.' },
        { point: 'Total cost of ownership', detail: 'OpenText contracts balloon with add-on modules, user licenses and professional services. Nuix\'s tiered model is predictable and scales cleanly.' },
      ],
      objections: [
        { obj: '"OpenText is already in our enterprise agreement"', response: 'OpenText bundles eDiscovery as an add-on to content management — it is not their core capability. The question is whether you want best-of-breed for your legal and investigation workflows, or a checkbox feature in a broader contract.' },
        { obj: '"We have OpenText for content management"', response: 'Nuix connects to OpenText as a data source — you do not need to rip and replace. Nuix sits upstream for investigation and analysis, OpenText continues as your content repository.' },
        { obj: '"OpenText has a bigger support organisation"', response: 'Nuix Advantage support includes dedicated engineers with deep forensic and legal expertise. OpenText support is generalist. For complex investigations, specialist support is what matters.' },
      ],
      win_themes: ['Modern platform', 'Processing speed', 'Investigation depth', 'AI-native capability', 'Predictable licensing'],
      best_fit: 'Customers ready to modernise aging OpenText deployments, legal + investigations use cases',
    },
    {
      id: 'purview',
      name: 'Microsoft Purview',
      tagline: 'M365-native compliance bundled with existing licences',
      useCases: ['Legal', 'Data Privacy', 'Investigations'],
      logo_color: '#0078d4',
      overview: 'Microsoft Purview (formerly Compliance Center) competes primarily on incumbent advantage — it is already included in many M365 E3/E5 licences. It wins on "good enough for M365 data" positioning but has significant limitations outside the Microsoft ecosystem.',
      their_strengths: [
        'Already licensed with M365 E3/E5 — "free" to decision-makers',
        'Native integration with Teams, Exchange, SharePoint and OneDrive',
        'Familiar to IT and compliance teams already in the Microsoft stack',
        'Continuous investment from Microsoft R&D',
        'Strong data governance and DLP capabilities within M365',
      ],
      nuix_advantages: [
        { point: 'Beyond Microsoft data', detail: 'Purview only covers M365 data sources well. Most investigations involve Slack, Google Workspace, legacy email, file shares, databases, mobile, and cloud apps. Nuix processes all of them.' },
        { point: 'Investigation-grade capability', detail: 'Purview is a compliance tool. Nuix is a forensic investigation platform — tamper-evident collection, chain of custody, court-admissible output. Purview cannot meet evidence standards for legal proceedings.' },
        { point: 'Processing speed and scale', detail: 'Purview struggles with very large data sets. Nuix processes petabytes reliably with predictable performance — critical for large litigation and investigations.' },
        { point: 'Insider threat and forensics', detail: 'Purview Insider Risk Management is policy-based alerting. Nuix provides deep forensic investigation of suspected incidents — the evidence layer Purview cannot provide.' },
        { point: 'Vendor independence', detail: 'Purview locks you into the Microsoft compliance ecosystem. Nuix is vendor-neutral — works with any data source, any cloud, any review platform.' },
      ],
      objections: [
        { obj: '"We already pay for Purview in our E5 licence"', response: 'Purview is included but not free — E5 is $57/user/month vs E3 at $36. The premium is for compliance features. For legal proceedings and serious investigations, Purview lacks forensic-grade capability. The cost of a failed investigation or inadmissible evidence far exceeds Nuix licensing.' },
        { obj: '"Most of our data is in M365 anyway"', response: 'That may be true for collaboration data — but investigations typically require mobile, cloud apps, endpoint artifacts, databases and legacy archives. The moment you go beyond M365, Purview cannot help.' },
        { obj: '"Microsoft keeps improving Purview"', response: 'Microsoft is building a compliance tool, not an investigation platform. The roadmap is DLP, retention and governance — not forensics, knowledge graphs or cross-source investigation workflows.' },
      ],
      win_themes: ['Multi-source coverage', 'Forensic-grade evidence', 'Investigation workflows', 'Vendor independence', 'Scale beyond M365'],
      best_fit: 'Any customer with data outside M365, legal proceedings, insider threat investigations, regulated industries',
    },
    {
      id: 'magnet',
      name: 'Magnet Forensics / AXIOM',
      tagline: 'Device forensics specialist growing into enterprise',
      useCases: ['Investigations'],
      logo_color: '#e63946',
      overview: 'Magnet Forensics competes with AXIOM for endpoint and mobile forensics, primarily in law enforcement and corporate investigations. Following their merger with Grayshift (mobile unlock), they have a strong device forensics portfolio but limited enterprise-scale data analysis capability.',
      their_strengths: [
        'AXIOM is widely used and trusted in law enforcement',
        'Grayshift integration provides mobile unlock + extraction capability',
        'Strong community, training and certification programme',
        'Good cloud artifact support (Google, iCloud, social media)',
        'AXIOM Cyber growing in corporate investigation market',
      ],
      nuix_advantages: [
        { point: 'Enterprise data volume', detail: 'Magnet AXIOM is designed for case-level forensics on a handful of devices. Nuix scales to entire enterprise environments — thousands of endpoints, petabytes of email and file data simultaneously.' },
        { point: 'Structured and unstructured data', detail: 'Magnet focuses on artifacts and application data from devices. Nuix processes structured databases, financial records, and proprietary file formats that Magnet cannot handle.' },
        { point: 'Legal and regulatory output', detail: 'Nuix produces legal hold, production sets, Relativity exports and court-ready reports. Magnet case reports are forensic investigation documents — not legal production format.' },
        { point: 'Corporate compliance workflows', detail: 'HR investigations, regulatory responses, data privacy assessments and DSARs require compliance workflow that Magnet has no capability in.' },
        { point: 'AI enrichment at scale', detail: 'Nuix AI Suite applies entity extraction, classification and semantic search across petabytes. Magnet\'s analytics are device-scoped and do not scale to enterprise investigations.' },
      ],
      objections: [
        { obj: '"Our investigators are certified on AXIOM"', response: 'Nuix ingests Magnet case files directly. Investigators keep AXIOM for device forensics and use Nuix for the enterprise data that AXIOM cannot process.' },
        { obj: '"Magnet is cheaper per case"', response: 'Magnet pricing is per examiner. For enterprise investigations involving thousands of custodians and terabytes of data, per-examiner pricing becomes uneconomical versus Nuix\'s volume-based model.' },
      ],
      win_themes: ['Enterprise scale', 'Multi-source correlation', 'Legal workflow output', 'Corporate compliance', 'AI at scale'],
      best_fit: 'Enterprise corporate investigations, large-scale fraud, AML, regulatory matters — anywhere data volume exceeds device-level forensics',
    },
    {
      id: 'exterro',
      name: 'Exterro',
      tagline: 'Legal GRC and eDiscovery workflow platform',
      useCases: ['Legal', 'Data Privacy'],
      logo_color: '#6d28d9',
      overview: 'Exterro competes in the Legal GRC space — legal hold, matter management, eDiscovery workflow and data privacy. They acquired AccessData (forensics) and ZL Technologies (information governance) to broaden their portfolio. Primary strength is legal workflow automation, not data processing.',
      their_strengths: [
        'Strong legal hold and matter management workflows',
        'End-to-end eDiscovery from hold to production in one platform',
        'DSAR and data privacy automation capabilities',
        'AccessData acquisition adds some forensic capability',
        'Growing presence in corporate legal departments',
      ],
      nuix_advantages: [
        { point: 'Processing power', detail: 'Exterro relies on third-party processors for data ingestion at scale. Nuix is the processing engine — faster, more reliable, and handles more file types natively.' },
        { point: 'Investigation depth', detail: 'Exterro is a workflow and governance platform. Nuix provides deep forensic investigation capability — entity analysis, timeline reconstruction, communications analysis — that Exterro cannot replicate.' },
        { point: 'AI-native capabilities', detail: 'Nuix AI Suite is purpose-built for intelligent data analysis. Exterro AI features are primarily workflow automation, not substantive data intelligence.' },
        { point: 'Scalability', detail: 'Exterro enterprise deployments frequently require significant professional services to scale. Nuix\'s architecture is built for high-volume enterprise environments.' },
        { point: 'Forensic grade', detail: 'Post AccessData acquisition, Exterro forensics remains a different product line — not an integrated capability. Nuix is a single platform with forensic-grade processing throughout.' },
      ],
      objections: [
        { obj: '"Exterro gives us legal hold + eDiscovery in one tool"', response: 'Nuix NEO includes legal hold, ECA, review export and full eDiscovery workflow — alongside investigation, AI enrichment and data privacy. It is a broader platform, not just an eDiscovery tool.' },
        { obj: '"Exterro handles our DSAR requirements"', response: 'Nuix Data Privacy use case delivers DSAR automation, PII detection and compliance reporting — built on a processing engine that can handle the full volume of a DSAR across all enterprise data sources, not just structured repositories.' },
      ],
      win_themes: ['Processing power', 'Investigation depth', 'Single platform breadth', 'AI-native capability', 'Scalability'],
      best_fit: 'Corporate legal teams wanting to consolidate from Exterro + processor combinations, data privacy at scale',
    },
  ];

  const tabButtonsHtml = competitors.map((c, i) =>
    `<button class="bc-tab${i === 0 ? ' active' : ''}" data-idx="${i}" onclick="switchTab(${i})" style="--tc:${c.logo_color}">
      <span class="bc-tab-pip" style="background:${c.logo_color}"></span>
      ${c.name}
    </button>`
  ).join('');

  const panelsHtml = competitors.map((c, i) => `
    <div class="bc-panel${i === 0 ? ' active' : ''}" id="bc-panel-${i}">
      <div class="bc-panel-head" style="background:${c.logo_color}">
        <div class="bc-head-left">
          <div class="bc-cname">${c.name}</div>
          <div class="bc-tagline">${c.tagline}</div>
        </div>
        <div class="bc-ucs">${c.useCases.map(u => `<span class="bc-uc-chip">${u}</span>`).join('')}</div>
      </div>
      <div class="bc-panel-body">
        <p class="bc-overview">${c.overview}</p>
        <div class="bc-two-col">
          <div class="bc-col">
            <div class="bc-col-head danger">Their Strengths — Know Before You Go</div>
            <ul class="bc-list">
              ${c.their_strengths.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
          <div class="bc-col">
            <div class="bc-col-head win">Nuix Advantages</div>
            <div class="bc-adv-list">
              ${c.nuix_advantages.map(a => `
                <div class="bc-adv-item">
                  <div class="bc-adv-point">&#10003; ${a.point}</div>
                  <div class="bc-adv-detail">${a.detail}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="bc-objections">
          <div class="bc-col-head objection">Common Objections &amp; Responses</div>
          ${c.objections.map(o => `
            <div class="bc-obj-item">
              <div class="bc-obj-q">&#8220;${o.obj}&#8221;</div>
              <div class="bc-obj-a">${o.response}</div>
            </div>
          `).join('')}
        </div>
        <div class="bc-footer-row">
          <div class="bc-win-themes">
            <span class="bc-ft-label">Win Themes</span>
            ${c.win_themes.map(t => `<span class="bc-theme-chip">${t}</span>`).join('')}
          </div>
          <div class="bc-best-fit">
            <span class="bc-ft-label">Best-fit Scenarios</span>
            <span class="bc-fit-text">${c.best_fit}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix — Battle Cards</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f4ff;color:#1a1a2e;display:flex;flex-direction:column;height:100vh;overflow:hidden}
    header{background:#0056e3;padding:0 28px;height:56px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .hdr-left{display:flex;align-items:center;gap:14px}
    header img{height:28px;display:block}
    .hdiv{width:1px;height:24px;background:rgba(255,255,255,0.2)}
    header h1{color:rgba(255,255,255,0.85);font-size:14px;font-weight:600}
    .hdr-btn{background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.3);color:#fff;padding:5px 14px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer}
    /* Tab bar */
    .bc-tab-bar{display:flex;gap:0;background:#fff;border-bottom:2px solid #e2e8f0;padding:0 20px;overflow-x:auto;flex-shrink:0;scrollbar-width:none}
    .bc-tab-bar::-webkit-scrollbar{display:none}
    .bc-tab{display:flex;align-items:center;gap:8px;padding:14px 20px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap;transition:all 0.15s;font-family:inherit}
    .bc-tab:hover{color:#1e293b;background:#f8f9ff}
    .bc-tab.active{color:var(--tc);border-bottom-color:var(--tc)}
    .bc-tab-pip{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    /* Panels */
    .bc-panels{flex:1;overflow-y:auto;min-height:0}
    .bc-panel{display:none;padding:24px 28px 60px;max-width:1100px;margin:0 auto}
    .bc-panel.active{display:block}
    /* Panel head */
    .bc-panel-head{border-radius:12px;padding:20px 24px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}
    .bc-cname{font-size:24px;font-weight:800;color:#fff;line-height:1}
    .bc-tagline{font-size:13px;color:rgba(255,255,255,0.75);margin-top:5px}
    .bc-ucs{display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;padding-top:3px}
    .bc-uc-chip{background:rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:12px;white-space:nowrap}
    /* Panel body */
    .bc-panel-body{}
    .bc-overview{font-size:13px;color:#475569;line-height:1.65;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #e8edf5;background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
    .bc-two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
    .bc-col{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
    .bc-col-head{font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;padding:10px 16px}
    .bc-col-head.danger{background:#fef2f2;color:#dc2626}
    .bc-col-head.win{background:#f0fdf4;color:#16a34a}
    .bc-col-head.objection{background:#fefce8;color:#ca8a04}
    .bc-list{padding:12px 16px 14px 32px;font-size:12px;color:#374151;line-height:1.9}
    .bc-adv-list{padding:10px 14px 14px}
    .bc-adv-item{padding:8px 0;border-bottom:1px solid #e8edf5}
    .bc-adv-item:last-child{border-bottom:none}
    .bc-adv-point{font-size:12px;font-weight:700;color:#003080;margin-bottom:3px}
    .bc-adv-detail{font-size:11px;color:#64748b;line-height:1.5}
    .bc-objections{background:#fff;border-radius:10px;overflow:hidden;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
    .bc-obj-item{padding:12px 16px;border-bottom:1px solid #eef0f6}
    .bc-obj-item:last-child{border-bottom:none}
    .bc-obj-q{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;font-style:italic}
    .bc-obj-a{font-size:12px;color:#475569;line-height:1.6;padding-left:12px;border-left:3px solid #0056e3}
    .bc-footer-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .bc-win-themes,.bc-best-fit{background:#fff;border-radius:8px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
    .bc-ft-label{display:block;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:8px}
    .bc-theme-chip{display:inline-block;background:#0056e3;color:#fff;font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;margin:2px 3px 2px 0}
    .bc-fit-text{font-size:12px;color:#374151;line-height:1.6}
    .internal-banner{background:#fef3c7;border-top:1px solid #fde68a;text-align:center;padding:8px;font-size:11px;color:#92400e;font-weight:600;flex-shrink:0}
    @media print{header,.bc-tab-bar,.internal-banner{display:none!important}.bc-panels{overflow:visible;height:auto}.bc-panel{display:block!important;page-break-after:always}}
  </style>
</head>
<body>
<header>
  <div class="hdr-left">
    <img src="NXL.AX_BIG.D-4e4ae371.png" alt="Nuix">
    <div class="hdiv"></div>
    <h1>Battle Cards &nbsp;&middot;&nbsp; <span style="opacity:0.6;font-weight:400">Internal use only</span></h1>
  </div>
  <button class="hdr-btn" onclick="window.print()">Print / PDF</button>
</header>
<div class="bc-tab-bar">
  ${tabButtonsHtml}
</div>
<div class="bc-panels">
  ${panelsHtml}
</div>
<div class="internal-banner">&#x1F512; Internal use only &mdash; Do not share externally</div>
<script>
  function switchTab(idx) {
    document.querySelectorAll('.bc-tab').forEach(function(t,i){ t.classList.toggle('active', i===idx); });
    document.querySelectorAll('.bc-panel').forEach(function(p,i){ p.classList.toggle('active', i===idx); });
    document.querySelector('.bc-panels').scrollTop = 0;
  }
</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ─── Customer One-Pager ───────────────────────────────────────────────────────

function generateOnePager() {
  const win   = window.open('', '_onePager_' + Date.now());
  const C     = cfg();
  const cust  = state.customer;
  const layers = calcPrices();
  const rm    = getRM();
  const years = Math.max(getContractYears(), 1/12);
  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const totNet      = Object.values(layers).reduce((s,l) => s + l.net, 0);
  const upliftPctOP = parseFloat(cust.annualUplift) || 0;
  const opPeriods   = getContractPeriods();
  const yearCountOP = opPeriods.length;
  const yearRangeOP = opPeriods;
  // The Implementation Packages are one-time Year 1 charges baked into the consulting layer's
  // net — strip them out before projecting later periods so they aren't repeated every year.
  const year1OnlyBaseOP = (state.advantageServices?.implementationPackage ? C.consulting.cslt300_price : 0)
    + (state.advantageServices?.solutionImplementationPackage ? C.consulting.cslt301_price : 0);
  const year1OnlyNetOP = year1OnlyBaseOP * (1 - layers.consulting.salesDisc);
  const totRecurringOP = totNet - year1OnlyNetOP;
  const netForPeriodOP = pi => pi === 0 ? totNet : totRecurringOP;
  const totContract = opPeriods.reduce((sum, p, pi) => sum + getPeriodPrice(netForPeriodOP(pi), p), 0);

  // Build capability bullets — business language, no SKUs
  const tier = state.foundation.selectedTier;
  const tierLabel = {
    light: 'Nuix NEO Standard',
    core:  'Nuix NEO Accelerate',
    rapid: 'Nuix NEO Performance',
  }[tier] || 'Nuix NEO';

  const tierDesc = {
    light:      'Intelligent data processing and investigation for focused teams',
    core:       'Enterprise-grade investigation and legal intelligence at scale',
    rapid:      'High-volume, rapid-response data intelligence for demanding environments',
  }[tier] || 'Enterprise data intelligence platform';

  const inclusions = [];

  // Foundation
  const t = tier && C.foundation_tiers[tier];
  if (t) {
    const bits = [];
    const totalWorkers = t.workers + (state.foundation.boosters.workers || 0);
    if (totalWorkers) bits.push(`${totalWorkers} processing workers`);

    if (t.users) bits.push(`${t.users} concurrent users`);
    inclusions.push({ icon: '&#9654;', label: tierLabel, detail: bits.join(' · ') });
  }

  // AI Suite
  const aiMap = { enrich: 'AI Enrichment', semantic: 'Semantic Search & Concept Analysis', transcription: 'AI Transcription', agenticBYOAI: 'BYO AI Integration', byoAIAdvanced: 'BYO AI - Advanced', byoAIGraph: 'BYO AI - Graph' };
  const aiDesc = { enrich: 'Automated entity extraction, classification and data enrichment across all data sources', semantic: 'Natural language search and concept clustering to surface connections without keyword dependency', transcription: 'Automated transcription of audio and video evidence at scale', agenticBYOAI: 'Connect your own AI models and automate custom investigation workflows', byoAIAdvanced: 'Advanced LLM orchestration with enhanced model capabilities and custom AI workflows at scale', byoAIGraph: 'Graph-powered AI combining knowledge graph analytics with custom LLM workflows and relationship intelligence' };
  Object.entries(aiMap).forEach(([k, label]) => {
    if (state.aiSuite[k]) inclusions.push({ icon: '&#129302;', label, detail: aiDesc[k] });
  });

  // Solutions Library — bundled at no charge with Enrich/Semantic Search/Transcription
  if (!state.useCases.foundationOnly) {
    inclusions.push({ icon: '&#9678;', label: 'Solutions Library', detail: 'Pre-configured workflows, dashboards and reports — included at no charge' });
  }

  // Enhanced Caps — friendly names
  const ec = state.enhancedCap;
  if (ec.discover_saas?.selected || ec.discover_onprem?.selected) inclusions.push({ icon: '&#128196;', label: 'Nuix Discover Review Platform', detail: 'Integrated document review environment for legal teams and reviewers' });
  if (ec.adaptive_security?.selected) inclusions.push({ icon: '&#128274;', label: 'Adaptive Security', detail: 'Continuous endpoint and user monitoring for insider threat and data loss prevention' });
  if (state.visualisation.selected) inclusions.push({ icon: '&#128202;', label: 'Knowledge Graph Analytics', detail: 'Visual network analysis and relationship mapping for complex investigations' });
  if (ec.ecc?.selected) inclusions.push({ icon: '&#128172;', label: 'ECC (Enterprise Collection Centre)', detail: 'Capture, process and review email, Teams, Slack and other communications data for investigations and legal matters' });
  if (ec.legal_hold?.selected) inclusions.push({ icon: '&#128274;', label: 'Nuix Automate Legal Hold', detail: 'Initiate and manage legal holds over custodian data for legal and regulatory matters' });
  if (ec.automated_relativity?.selected) inclusions.push({ icon: '&#128260;', label: 'Automated Relativity Export and Orchestration', detail: 'Automated Relativity exports and workflow orchestration as part of Automate workflows, and other advanced export functions' });

  // Value highlights from ROI calc
  const roiRows = [];
  if (state.valueWin?.activeLevers) {
    const levers = state.valueWin.activeLevers;
    const inputs = state.valueWin.inputs || {};
    Object.entries(levers).forEach(([k, on]) => {
      if (!on) return;
      const lever = VALUE_LEVERS[k];
      if (!lever) return;
      const val = lever.calc(inputs);
      if (val > 0) roiRows.push({ label: lever.label, value: val });
    });
  }
  const totalROI = roiRows.reduce((s,r) => s + r.value, 0);

  // Why Nuix bullets — adapt by use case
  const whyNuix = [
    { head: 'Speed at scale', body: 'Process petabytes of data faster than any alternative — critical when evidence windows are tight and investigation timelines are measured in hours, not weeks.' },
    { head: '1,000+ data source support', body: 'Email, cloud storage, mobile, endpoint artifacts, financial records and proprietary formats — all processed natively in a single platform.' },
    { head: 'Forensic-grade integrity', body: 'Tamper-evident processing with full chain of custody and court-admissible output — built for the highest evidentiary standards.' },
    { head: 'Single platform, lower TCO', body: 'Replace multiple point solutions — collection, processing, analysis, review and AI — with one fully integrated platform.' },
  ];

  // Case studies — keyed by use case
  const caseStudyData = {
    Investigations: [
      {
        org: 'Global Financial Institution',
        industry: 'Banking & Financial Services',
        challenge: 'A complex insider trading investigation spanning five years of communications data across 3,200 custodians and multiple jurisdictions required rapid, defensible evidence collection and analysis.',
        outcome: 'Investigation timeline reduced from 11 weeks to 6 days. 47 TB of communications and trading records processed and correlated in under 72 hours — delivering court-ready output ahead of regulatory deadline.',
        stat: '6 days', stat_label: 'vs. 11 weeks previously',
      },
      {
        org: 'National Law Enforcement Agency',
        industry: 'Government & Law Enforcement',
        challenge: 'Seized digital evidence from a multi-country organised crime operation totalled 28 TB across 640 devices — all required processing and review within a strict judicial timeframe.',
        outcome: 'All seized data processed and made searchable within 48 hours. Investigators identified 1,200 key evidence items across 18M documents using AI-powered entity extraction, accelerating charges by three months.',
        stat: '48 hrs', stat_label: 'to process 28 TB of seized evidence',
      },
    ],
    Legal: [
      {
        org: 'Top-10 Global Law Firm',
        industry: 'Legal Services',
        challenge: 'A major cross-border M&A transaction required reviewing 9.2M documents across five data rooms in four languages under an aggressive six-week timeline, with significant cost pressure from the client.',
        outcome: 'AI-assisted early case assessment reduced the reviewable document population by 74%, cutting attorney review time from an estimated 18 weeks to 4.5. Final production delivered five days ahead of schedule.',
        stat: '74%', stat_label: 'reduction in reviewable document population',
      },
      {
        org: 'ASX-Listed Energy Corporation',
        industry: 'Energy & Resources',
        challenge: 'A regulatory investigation by ASIC required preserving and producing 3.8 TB of email, Teams and SharePoint data within 21 days, with full chain of custody documentation.',
        outcome: 'Legal hold placed on all custodians within two hours of instruction. Full production delivered in 14 days — seven days ahead of the regulatory deadline — with complete audit trail and Relativity-ready load files.',
        stat: '14 days', stat_label: 'full production ahead of 21-day deadline',
      },
    ],
    'Data Privacy': [
      {
        org: 'European Banking Group',
        industry: 'Banking & Financial Services',
        challenge: 'Under GDPR, the organisation was receiving 340+ data subject access requests per month across 22 data systems. Manual fulfilment was taking 28 days on average, creating regulatory risk and customer complaints.',
        outcome: 'Nuix automated PII discovery and DSAR assembly across all 22 systems, reducing average fulfilment time to 4 days and automating 91% of requests end-to-end — achieving full compliance with the 30-day regulatory requirement.',
        stat: '91%', stat_label: 'of DSARs fulfilled automatically',
      },
      {
        org: 'National Healthcare Network',
        industry: 'Healthcare & Life Sciences',
        challenge: 'A suspected data breach affecting patient records required urgent identification of all exposed data across 12 disparate clinical and administrative systems before mandatory notification deadlines.',
        outcome: 'Complete scope of breach identified across all 12 systems within 72 hours. Nuix\'s cross-system data mapping identified 4,200 affected patient records and enabled precise notification within the statutory timeframe, avoiding regulatory penalties.',
        stat: '72 hrs', stat_label: 'full breach scope identified across 12 systems',
      },
    ],
  };

  // Value proof stats — shown when ROI calculator not completed
  const valueProofStats = {
    Investigations: [
      { stat: '10–100×', label: 'faster data processing vs. legacy tools' },
      { stat: '1,000+', label: 'natively supported data source types' },
      { stat: '4+', label: 'point solutions replaced by a single platform' },
      { stat: '48 hrs', label: 'average time to process multi-TB seized evidence' },
    ],
    Legal: [
      { stat: '74%', label: 'average reduction in reviewable document population' },
      { stat: '60%', label: 'reduction in review cost reported by enterprise clients' },
      { stat: '100%', label: 'court deadlines met — with time to spare' },
      { stat: '3×', label: 'faster early case assessment vs. traditional methods' },
    ],
    'Data Privacy': [
      { stat: '91%', label: 'of data subject access requests automated end-to-end' },
      { stat: '4 days', label: 'average DSAR fulfilment time (vs. 28-day industry average)' },
      { stat: '22+', label: 'data systems scanned simultaneously for PII' },
      { stat: '72 hrs', label: 'to identify full breach scope across enterprise environment' },
    ],
  };

  const rawUC = cust.primaryUseCase || '';
  const primaryUC = rawUC.startsWith('Legal') ? 'Legal'
                  : rawUC.startsWith('Data Privacy') ? 'Data Privacy'
                  : 'Investigations';
  const caseStudies = caseStudyData[primaryUC] || caseStudyData['Investigations'];
  const proofStats  = valueProofStats[primaryUC] || valueProofStats['Investigations'];

  // Investment display
  const multiYear = years > 1;
  const hasPOC    = cust.isPOC;
  const yearCount = hasPOC ? 1 : Math.min(Math.max(Math.floor(years), 1), 7);
  const yearRange = Array.from({length: yearCount}, (_, i) => i + 1);

  const incHtml = inclusions.map(inc => `
    <div class="inc-item">
      <div class="inc-icon">${inc.icon}</div>
      <div class="inc-body">
        <div class="inc-label">${inc.label}</div>
        <div class="inc-detail">${inc.detail}</div>
      </div>
    </div>
  `).join('');

  const whyHtml = whyNuix.map(w => `
    <div class="why-item">
      <div class="why-check">&#10003;</div>
      <div>
        <div class="why-head">${w.head}</div>
        <div class="why-body">${w.body}</div>
      </div>
    </div>
  `).join('');

  // Value section: ROI calc results if available, otherwise use-case proof stats
  const roiHtml = roiRows.length ? `
    <div class="value-section">
      <div class="section-label">Your Business Value Model</div>
      <div class="roi-grid">
        ${roiRows.map(r => `
          <div class="roi-card">
            <div class="roi-value">${fmt(r.value)}</div>
            <div class="roi-label">${r.label}</div>
          </div>
        `).join('')}
        ${roiRows.length > 1 ? `
          <div class="roi-card roi-total">
            <div class="roi-value">${fmt(totalROI)}</div>
            <div class="roi-label">Total Annual Value</div>
          </div>
        ` : ''}
      </div>
      <div class="roi-note">Value model based on inputs provided during discovery. Figures are indicative estimates for planning purposes.</div>
    </div>
  ` : `
    <div class="value-section">
      <div class="section-label">Proven Customer Value</div>
      <div class="proof-grid">
        ${proofStats.map(s => `
          <div class="proof-card">
            <div class="proof-stat">${s.stat}</div>
            <div class="proof-label">${s.label}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const caseStudiesHtml = `
    <div class="cs-section">
      <div class="section-label">Customers Like You</div>
      <div class="cs-grid">
        ${caseStudies.map(cs => `
          <div class="cs-card">
            <div class="cs-header">
              <div class="cs-org">${cs.org}</div>
              <div class="cs-industry">${cs.industry}</div>
            </div>
            <div class="cs-body">
              <div class="cs-block">
                <div class="cs-block-label">Challenge</div>
                <div class="cs-block-text">${cs.challenge}</div>
              </div>
              <div class="cs-block">
                <div class="cs-block-label">Outcome</div>
                <div class="cs-block-text">${cs.outcome}</div>
              </div>
            </div>
            <div class="cs-stat-bar">
              <span class="cs-stat">${cs.stat}</span>
              <span class="cs-stat-label">${cs.stat_label}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nuix NEO — ${cust.name || 'Proposed Solution'}</title>
  <style>
    @page{margin:20mm 18mm}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#fff;color:#1e293b;font-size:13px;line-height:1.55}
    .page-wrap{max-width:860px;margin:0 auto;padding:32px 28px 60px}
    /* Header */
    .doc-header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:24px;border-bottom:3px solid #0056e3;margin-bottom:28px}
    .doc-prepared{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px}
    .doc-customer{font-size:28px;font-weight:800;color:#0a0f2e;letter-spacing:-0.5px;line-height:1.1;margin-bottom:6px}
    .doc-subtitle{font-size:13px;color:#475569}
    .doc-header-right{text-align:right;flex-shrink:0;padding-top:4px}
    .doc-header-right img{height:32px;display:block;margin-left:auto;margin-bottom:8px}
    .doc-date{font-size:11px;color:#94a3b8}
    /* Tier hero */
    .tier-hero{background:linear-gradient(135deg,#0a1f6e 0%,#0056e3 100%);border-radius:12px;padding:22px 24px;margin-bottom:24px}
    .tier-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:6px}
    .tier-name{font-size:22px;font-weight:800;color:#fff;margin-bottom:4px}
    .tier-desc{font-size:12px;color:rgba(255,255,255,0.75);max-width:460px;line-height:1.5}
    /* Section label */
    .section-label{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;margin-bottom:14px}
    /* Inclusions */
    .inclusions-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px}
    .inc-item{display:flex;gap:12px;align-items:flex-start;background:#f8f9ff;border-radius:8px;padding:12px 14px}
    .inc-icon{font-size:16px;flex-shrink:0;line-height:1;margin-top:1px;color:#0056e3}
    .inc-label{font-size:12px;font-weight:700;color:#0a0f2e;margin-bottom:2px}
    .inc-detail{font-size:11px;color:#64748b;line-height:1.45}
    /* Value / ROI */
    .value-section{margin-bottom:28px}
    .roi-grid{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
    .roi-card{background:#fef9f0;border-radius:8px;padding:14px 18px;flex:1;min-width:140px;text-align:center}
    .roi-card.roi-total{background:#0056e3}
    .roi-value{font-size:20px;font-weight:800;color:#0a0f2e;margin-bottom:3px}
    .roi-total .roi-value{color:#fff}
    .roi-label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
    .roi-total .roi-label{color:rgba(255,255,255,0.75)}
    .roi-note{font-size:10px;color:#94a3b8;font-style:italic}
    /* Proof stats */
    .proof-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .proof-card{background:#f0f4ff;border-radius:10px;padding:16px 14px;text-align:center}
    .proof-stat{font-size:22px;font-weight:800;color:#0056e3;margin-bottom:4px;letter-spacing:-0.5px}
    .proof-label{font-size:10px;color:#475569;line-height:1.4}
    /* Case studies */
    .cs-section{margin-bottom:28px}
    .cs-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .cs-card{background:#f8f9ff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}
    .cs-header{background:#0a1f6e;padding:14px 16px}
    .cs-org{font-size:13px;font-weight:700;color:#fff;margin-bottom:2px}
    .cs-industry{font-size:10px;color:rgba(255,255,255,0.6);font-weight:600;text-transform:uppercase;letter-spacing:0.8px}
    .cs-body{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
    .cs-block-label{font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;margin-bottom:3px}
    .cs-block-text{font-size:11px;color:#374151;line-height:1.5}
    .cs-stat-bar{background:#0056e3;padding:10px 16px;display:flex;align-items:center;gap:10px}
    .cs-stat{font-size:18px;font-weight:800;color:#fff;white-space:nowrap}
    .cs-stat-label{font-size:11px;color:rgba(255,255,255,0.8);line-height:1.3}
    /* Why Nuix */
    .why-section{margin-bottom:28px}
    .why-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .why-item{display:flex;gap:12px;align-items:flex-start;background:#f0fdf4;border-radius:8px;padding:12px 14px}
    .why-check{width:20px;height:20px;background:#16a34a;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;margin-top:1px}
    .why-head{font-size:12px;font-weight:700;color:#14532d;margin-bottom:2px}
    .why-body{font-size:11px;color:#374151;line-height:1.45}
    /* Investment */
    .investment-box{background:#0a1f6e;border-radius:12px;padding:22px 24px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;gap:20px}
    .inv-eyebrow{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-bottom:6px}
    .inv-amount{font-size:30px;font-weight:800;color:#fff;letter-spacing:-0.5px;margin-bottom:4px}
    .inv-sub{font-size:12px;color:rgba(255,255,255,0.6)}
    .inv-note{font-size:11px;color:rgba(255,255,255,0.5);max-width:200px;text-align:right;line-height:1.5}
    .inv-roi-block{text-align:center;background:rgba(255,255,255,0.08);border-radius:10px;padding:14px 20px;min-width:130px;flex-shrink:0}
    .inv-roi-label{font-size:9px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:4px}
    .inv-roi-value{font-size:28px;font-weight:800;color:#4ade80;letter-spacing:-0.5px;line-height:1}
    .inv-roi-sub{font-size:10px;color:rgba(255,255,255,0.5);margin-top:4px;line-height:1.4}
    /* CTA */
    .cta-box{background:#f8f9ff;border-radius:10px;padding:18px 20px;border:1.5px solid #e2e8f0;margin-bottom:28px}
    .cta-head{font-size:14px;font-weight:700;color:#0a0f2e;margin-bottom:10px}
    .cta-steps{list-style:none;counter-reset:step}
    .cta-steps li{font-size:12px;color:#374151;padding:4px 0;display:flex;gap:8px;align-items:flex-start}
    .cta-steps li::before{content:counter(step);counter-increment:step;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;min-width:18px;background:#0056e3;color:#fff;border-radius:50%;font-size:10px;font-weight:800;margin-top:1px}
    /* Footer */
    .doc-footer{padding-top:16px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between}
    .doc-footer-left{font-size:10px;color:#94a3b8}
    .doc-footer-right{font-size:10px;color:#94a3b8;text-align:right}
    @media print{
      body{font-size:12px}
      .page-wrap{padding:0;max-width:100%}
    }
  </style>
</head>
<body>
<div class="page-wrap">

  <div class="doc-header">
    <div class="doc-header-left">
      <div class="doc-prepared">Prepared for</div>
      <div class="doc-customer">${cust.name || 'Your Organisation'}</div>
      <div class="doc-subtitle">Nuix NEO &mdash; Proposed Solution Overview</div>
    </div>
    <div class="doc-header-right">
      <img src="NXL.AX_BIG.D-4e4ae371.png" alt="Nuix">
      <div class="doc-date">${today}${cust.country ? ' &nbsp;&middot;&nbsp; ' + cust.country : ''}</div>
    </div>
  </div>

  <div class="tier-hero">
    <div class="tier-eyebrow">Proposed Platform</div>
    <div class="tier-name">${tierLabel}</div>
    <div class="tier-desc">${tierDesc}</div>
  </div>

  ${inclusions.length ? `
  <div class="section-label">What's Included in Your Solution</div>
  <div class="inclusions-grid">${incHtml}</div>
  ` : ''}

  ${roiHtml}

  ${caseStudiesHtml}

  <div class="why-section">
    <div class="section-label">Why Nuix</div>
    <div class="why-grid">${whyHtml}</div>
  </div>

  ${totNet > 0 ? (() => {
    const roiMultiple = (totalROI > 0 && totNet > 0) ? totalROI / totNet : 0;
    const roiBlock = roiMultiple > 0 ? `
      <div class="inv-roi-block">
        <div class="inv-roi-label">Value / ROI</div>
        <div class="inv-roi-value">${roiMultiple.toFixed(1)}×</div>
        <div class="inv-roi-sub">return on<br>investment</div>
      </div>` : '';
    const yearSchedule = multiYear && !hasPOC ? `
      <div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap">
        ${opPeriods.map((p, pi) => {
          const cumPct = upliftPctOP > 0 && p.upliftExp > 0 && p.fraction === 1 ? `+${((Math.pow(1 + upliftPctOP / 100, p.upliftExp) - 1) * 100).toFixed(1)}%` : '';
          const fracNote = p.fraction < 1 ? `${p.months}mo` : '';
          return `
          <div style="background:rgba(255,255,255,0.1);border-radius:6px;padding:6px 11px;text-align:center;flex:1;min-width:56px">
            <div style="font-size:9px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:2px">${p.label}</div>
            ${cumPct ? `<div style="font-size:8px;color:rgba(255,255,255,0.35);margin-bottom:2px">${cumPct} uplift</div>` : ''}
            ${fracNote ? `<div style="font-size:8px;color:rgba(255,255,255,0.35);margin-bottom:2px">pro-rated</div>` : ''}
            <div style="font-size:13px;font-weight:700;color:#fff">${fmt(getPeriodPrice(netForPeriodOP(pi), p))}</div>
          </div>`;
        }).join('')}
        <div style="background:rgba(0,86,227,0.5);border-radius:6px;padding:6px 11px;text-align:center;flex:2;min-width:80px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:9px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-bottom:3px">TCV</div>
          <div style="font-size:15px;font-weight:800;color:#fff">${fmt(totContract)}</div>
        </div>
      </div>` : '';
    return `
  <div class="investment-box">
    <div style="flex:1">
      <div class="inv-eyebrow">Indicative Investment</div>
      <div class="inv-amount">${fmt(totNet)}<span style="font-size:16px;font-weight:500;opacity:0.7"> / year</span></div>
      ${hasPOC ? `<div class="inv-sub">Proof of Concept — ${cust.pocDuration || 3} months</div>` : ''}
      ${yearSchedule}
    </div>
    ${roiBlock}
    <div>
      <div class="inv-note">Pricing is indicative and subject to final commercial terms. Pricing in USD.</div>
    </div>
  </div>`;
  })() : ''}

  <div class="cta-box">
    <div class="cta-head">Recommended Next Steps</div>
    <ol class="cta-steps">
      <li>Align on scope and any technical requirements with your Nuix team</li>
      <li>Schedule a live product demonstration using your own data and use case</li>
      <li>Proceed to formal commercial proposal and contracting</li>
    </ol>
  </div>

  <div class="doc-footer">
    <div class="doc-footer-left">Nuix NEO &nbsp;&middot;&nbsp; nuix.com</div>
    <div class="doc-footer-right">Indicative commercial information &mdash; intended for the named recipient only.</div>
  </div>

</div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}


// ─── Save / Load Quote ────────────────────────────────────────────────────────

function saveQuote() {
  const customerName = (state.customer.name || 'Quote').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Quote';
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${customerName} - ${today}.json`;
  const payload = JSON.stringify({ _tool: 'NuixNeoPricingTool', _version: 1, state }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadQuote() {
  document.getElementById('load-quote-input').value = '';
  document.getElementById('load-quote-input').click();
}

function onLoadQuoteFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed._tool || !parsed.state) {
        alert('This file does not appear to be a valid Nuix Neo Pricing Tool quote.');
        return;
      }
      Object.assign(state, parsed.state);
      migrateLoadedState();
      showStep(state.currentStep || 1);
    } catch {
      alert('Could not read the file. Please make sure it is a valid quote file.');
    }
  };
  reader.readAsText(file);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function initApp() {
  document.getElementById('app').innerHTML = `
    <header>
      <div style="display:flex;align-items:center;gap:16px">
        <img src="NXL.AX_BIG.D-4e4ae371.png" alt="Nuix" style="height:30px;display:block">
        <div style="width:1px;height:28px;background:rgba(255,255,255,0.2)"></div>
        <span style="color:rgba(255,255,255,0.85);font-size:15px;font-weight:600;letter-spacing:-0.2px">Nuix Pricing Tool</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px">
        <button onclick="saveQuote()" style="background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.5);color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.2px">💾 Save Quote</button>
        <button onclick="loadQuote()" style="background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.5);color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.2px">📂 Load Quote</button>
        <input type="file" id="load-quote-input" accept=".json" style="display:none" onchange="onLoadQuoteFile(event)">
        <button onclick="startNewQuote()" style="background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.5);color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.2px">🆕 New Quote</button>
        <div style="width:1px;height:20px;background:rgba(255,255,255,0.2)"></div>
        <button onclick="showPriceList()"style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.3);color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.2px">List Price</button>
        <button onclick="showSKUListPage()" style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.3);color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.2px">SKU List</button>
        <button onclick="showRegionalPricing()" style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.3);color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.2px">Regional Localisation</button>
        <button onclick="showPricingGuide()" style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.3);color:#fff;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.2px">Pricing &amp; Packaging Guide</button>
      </div>
    </header>
    <div class="app-layout">
      <aside class="sidebar">
        <div id="sidebar-nav"></div>
        <div class="sidebar-currency">
          <div class="sidebar-currency-label">Currency</div>
          <select id="currency-picker" onchange="setCurrency(this.value)" class="sidebar-currency-select">
            <option value="USD">$ USD</option>
            <option value="AUD">A$ AUD</option>
            <option value="CAD">C$ CAD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
      </aside>
      <div class="main-wrap">
        <main>
          <div id="step-content"></div>
        </main>
        <div class="nav-footer">
          <div class="nav-footer-inner">
            <button class="btn btn-secondary" id="btn-prev" onclick="prevStep()">← Back</button>
            <span class="step-count" id="step-count"></span>
            <button class="btn btn-primary" id="btn-next" onclick="nextStep()">Next →</button>
          </div>
        </div>
      </div>
      <aside class="quote-panel" id="quote-panel"></aside>
    </div>`;

  const resumed = restoreState();
  showStep(resumed ? (state.currentStep || 1) : 1);
}

window.addEventListener('beforeunload', () => {
  saveCurrentStep();
  persistState();
});

document.addEventListener('DOMContentLoaded', initApp);
