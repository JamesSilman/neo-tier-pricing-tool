window.PRICING_CONFIG = {

  foundation_tiers: {
    light:      { name: 'NEO – Standard',    price: 155000, workers: 10,  volume_tb: 50,  users: 10,  training_hours: 100,  support: 'Advantage Bronze'     },
    core:       { name: 'NEO – Accelerate',  price: 400000, workers: 30,  volume_tb: 150, users: 30,  training_hours: 300,  support: 'Advantage Bronze'     },
    rapid:      { name: 'NEO – Performance', price: 800000, workers: 80,  volume_tb: 400, users: 80,  training_hours: 800,  support: 'Advantage Silver'     }
  },

  foundation_boosters: {
    light:      { worker: 25000, volume_tb: 6000, user: 9000, training_hour: 6720 },
    core:       { worker: 16000, volume_tb: 5333, user: 6000, training_hour: 6720 },
    rapid:      { worker: 10000, volume_tb: 4000, user: 3000, training_hour: 6720 }
  },

  support_booster_prices: {
    bronze: 30000,
    silver: 60000,
    gold:   105000
  },

  support_included_hours: {
    bronze: 40,
    silver: 140,
    gold:   300
  },

  // Consumption Foundation — same packaging as foundation_tiers/foundation_boosters,
  // metered in TB instead of workers. Tier prices match the worker-side tiers; TB
  // boosters are priced at 2x the tier's own included effective $/TB rate. Rapid +
  // boosters cover any consumption volume this tool quotes — no ceiling tier needed.
  consumption_tiers: {
    light: { name: 'NEO – Standard (Consumption)',    sku: 'NEO007CS',  price: 155000, included_tb: 10,  users: 10, training_hours: 100, support: 'Advantage Bronze', tb_booster_sku: 'NEOBTBS',   tb_booster_rate: 31000 },
    core:  { name: 'NEO – Accelerate (Consumption)',  sku: 'NEO007CMD', price: 400000, included_tb: 40,  users: 30, training_hours: 300, support: 'Advantage Bronze', tb_booster_sku: 'NEOBTBMD',  tb_booster_rate: 20000 },
    rapid: { name: 'NEO – Performance (Consumption)', sku: 'NEO007CL',  price: 800000, included_tb: 100, users: 80, training_hours: 800, support: 'Advantage Silver', tb_booster_sku: 'NEOBTBL',   tb_booster_rate: 16000 },
  },

  ai_suite_modules: {
    // ai_bundle must stay the FIRST key — the AI Suite step renders cards in object-key
    // order, and the bundle should be the first option offered. It's Enrich + Semantic
    // Search + Transcription (which already bundles the Solutions Library) at 30% below
    // buying the three separately — selecting it disables the three individual cards, and
    // selecting all three individually auto-upgrades to this bundle.
    ai_bundle:      { name: 'AI Bundle',        question: 'Do you need Enrich, Semantic Search and Transcription together? Bundle them for 30% off buying them separately.', price: { light: 105000, core: 241500, rapid: 420000 } },
    // Enrich, Semantic Search and Transcription each bundle the Solutions Library's
    // dashboards, workflows and reports at no extra charge (see use_case_modules.solution_pack) —
    // priced up from 30k/30k/50k to reflect that bundled value.
    enrich:         { name: 'Enrich',           question: 'Do you need to automatically classify and enrich your data with additional metadata and tags?',                 price: { light: 50000, core: 115000, rapid: 200000 } },
    semantic:       { name: 'Semantic Search',  question: 'Do you need deep semantic search across text and images — understanding meaning and context beyond keyword matching? Includes facial recognition on Neo v2.2+.',                 price: { light: 50000, core: 115000, rapid: 200000 } },
    transcription:  { name: 'Transcription',    question: 'Do you need to transcribe audio or video files into searchable, reviewable text?',                            price: { light: 50000, core: 115000, rapid: 200000 } },
    agentic_byo_ai:  { name: 'BYO AI',           question: 'Do you want to bring your own Large Language Model (LLM) or build custom AI-powered automated workflows?',   price: { light: 100000, core: 135000, rapid: 200000 } },
    byo_ai_advanced: { name: 'BYO AI - Advanced', question: 'Includes everything in standard BYO AI, plus advanced LLM orchestration with enhanced model capabilities and custom AI workflows at scale — do you need that extra depth?',   price: { light: 180000, core: 240000, rapid: 360000 } },
    byo_ai_graph:    { name: 'BYO AI - Graph',    question: 'Includes everything in standard BYO AI and BYO AI - Advanced, plus graph-powered AI that combines knowledge graph analytics with custom LLM workflows and relationship intelligence — do you need that too?', price: { light: 300000, core: 400000, rapid: 600000 } },
    // Agentic case-review & investigation layer built on Semantic Search. Business rule:
    // requires Semantic Search (which auto-includes the Solutions Library) and Advantage
    // Silver support — both auto-added when this is selected (see applyAgenticAdvancedDependencies
    // in app.js). Flat $240k across all three tiers. Not part of the BYO/agentic-approval family:
    // selectable alongside the BYO AI modules, no Oliver Harvey approval warning, no extra
    // training-hour packs. Neo 3.0 · Local Deployment only (descriptive note only — the tool
    // has no version/deployment gating).
    agentic_advanced: { name: 'Agentic: AI - Advanced', question: 'Do you need AI-powered case review and investigation — document Q&A, summarisation, translation, timeline generation, automated tagging and agentic workflows, with governance, security, audit logging and enterprise LLM support?', availabilityNote: 'Neo 3.0 · Local Deployment only · Requires Semantic Search + Advantage Silver', price: { light: 240000, core: 240000, rapid: 240000 } }
  },

  use_case_modules: {
    // No longer sold standalone — bundled at $0 whenever Enrich, Semantic Search or
    // Transcription is selected (see ai_suite_modules above). Kept as a zero-priced SKU
    // so it still appears on the order and gets provisioned to the customer.
    solution_pack: {
      label: 'Solutions Library',
      description: 'Pre-configured workflows, dashboards and reports — included automatically with Enrich, Semantic Search or Transcription.',
      inclusions: ['Pre-configured workflows', 'Case dashboards', 'Compliance reporting'],
      price: { light: 0, core: 0, rapid: 0 }
    }
  },

  enhanced_capabilities: {
    nuix_modules: {
      discover_saas:     { name: 'Nuix Discover – SaaS',    description: 'Cloud-hosted review and analytics. Pay per GB of active or archived data stored.',        pricing_model: 'saas',                  active_gb_month: 10,       archive_gb_month: 2,       gen_ai_review_per_gb: 5                    },
      discover_onprem:   { name: 'Nuix Discover – On-Prem', description: 'On-premises review and analytics platform deployed in your own environment.',              pricing_model: 'per_instance_and_user', price_per_instance: 30000, price_per_user: 2000                          },
      adaptive_security: { name: 'Adaptive Security',       description: 'Endpoint security and insider threat detection across endpoints, users and servers.',       pricing_model: 'compound',              price_per_endpoint: 20,    price_per_user: 3000, price_per_server: 30000 },
      linkurious:        { name: 'Knowledge Graph',           description: 'Graph analytics for complex network and relationship analysis.',                           pricing_model: 'linkurious_tiers',
        user_tiers: [
          { key: 'u5',   sku: 'KGU001', name: '5 Named Users',   price: 29730,  users: 5   },
          { key: 'u20',  sku: 'KGU002', name: '20 Named Users',  price: 83240,  users: 20  },
          { key: 'u50',  sku: 'KGU003', name: '50 Named Users',  price: 142700, users: 50  },
          { key: 'u100', sku: 'KGU004', name: '100 Named Users', price: 214040, users: 100 },
          { key: 'u200', sku: 'KGU005', name: '200 Named Users', price: 416200, users: 200 },
        ],
        memory_tiers: [
          { key: 'm64',   sku: 'KGM001', name: '64GB Memory',   price: 36400,  gb: 64   },
          { key: 'm128',  sku: 'KGM002', name: '128GB Memory',  price: 56000,  gb: 128  },
          { key: 'm256',  sku: 'KGM003', name: '256GB Memory',  price: 86020,  gb: 256  },
          { key: 'm512',  sku: 'KGM004', name: '512GB Memory',  price: 143360, gb: 512  },
          { key: 'm1024', sku: 'KGM005', name: '1024GB Memory', price: 229380, gb: 1024 },
        ]
      },
      ecc:               { name: 'ECC (Enterprise Collection Centre)', description: 'Capture, process and review email, Teams, Slack and other communications data for investigations and legal matters.', pricing_model: 'per_endpoint', price_per_endpoint: 8 },
      legal_hold:        { name: 'Nuix Automate Legal Hold',       description: 'Initiate and manage legal holds over data within your environment, preserving custodian data for legal and regulatory matters.', pricing_model: 'per_custodian_month', price_per_custodian_month: 2 }
    },
    third_party: {
      abbyy: {
        name: 'ABBYY OCR',
        description: 'Optical character recognition for scanned documents and image-based files.',
        pricing_model: 'abbyy_packages',
        packages: [
          { key: 'abbfr002', sku: 'ABBFR002', name: '100,000 pages',              price: 1588 },
          { key: 'abbfr003', sku: 'ABBFR003', name: '200,000 pages',              price: 2430 },
          { key: 'abbfr004', sku: 'ABBFR004', name: '500,000 pages',              price: 4900 },
          { key: 'abbfr005', sku: 'ABBFR005', name: '1,000,000 pages',            price: 8624 },
          { key: 'abbfr001', sku: 'ABBFR001', name: 'Fine Reader Server (renewal)', price: 4100 },
        ]
      },
      q1_dynamics: {
        name: 'Q1 Dynamics',
        description: 'Specialist data connectors for enterprise systems and proprietary data sources.',
        pricing_model: 'q1_connectors',
        connectors: [
          { key: 'cw_splitter',      sku: 'Q1CNOP370',  name: 'CW Splitter',          price: 40180 },
          { key: 'cisco_webex',      sku: 'Q1CNOP400',  name: 'Cisco Webex',           price: 20870 },
          { key: 'ev_onprem',        sku: 'Q1CNOP310',  name: 'EV On-Prem',            price: 22570 },
          { key: 'ev_cloud',         sku: 'Q1CNSS320',  name: 'EV Cloud',              price: 26130 },
          { key: 'filenet',          sku: 'Q1CNOP390',  name: 'IBM FileNet',           price: 20870 },
          { key: 'gmail',            sku: 'Q1CNOP350',  name: 'Google Gmail',          price: 13250 },
          { key: 'google_vault',     sku: 'Q1CNOP340',  name: 'Google Vault',          price: 23800 },
          { key: 'll',               sku: 'Q1CNOP330',  name: 'OpenText LL',           price: 13520 },
          { key: 'opentext_tt',      sku: 'Q1CNOP410',  name: 'OpenText TRIM',         price: 21460 },
          { key: 's1',               sku: 'Q1CNOP300',  name: 'Source One',            price: 13520 },
          { key: 'symphony',         sku: 'Q1CNOP380',  name: 'Symphony',              price: 20870 },
          { key: 'virtru',           sku: 'Q1CNOP360',  name: 'Google Virtru',         price: 23800 },
          { key: 'dsar_onprem',      sku: 'Q1DSOP200',  name: 'DSAR On-Prem',          price: 41580 },
          { key: 'legalhold_onprem', sku: 'Q1LHOP100',  name: 'Legal Hold On-Prem',    price: 29400 },
          { key: 'dsar_hosted',      sku: 'Q1DSSS210',  name: 'DSAR Hosted',           price: 53460 },
          { key: 'legalhold_hosted', sku: 'Q1LHSS110',  name: 'Legal Hold Hosted',     price: 53460 },
          { key: 'mulesoft',         sku: 'Q1SF24C7MS', name: 'Mulesoft',              price: 11060 },
          { key: 'salesforce',       sku: 'Q1SF24C7TA', name: 'Salesforce',            price: 16660 },
          { key: 'jira',             sku: 'Q1CF24C7JR', name: 'Jira',                  price: 16660 },
          { key: 'confluence',       sku: 'Q1CF30T4WJ', name: 'Confluence',            price: 16660 },
        ]
      },
      t3k: {
        name: 'T3K (Media Analysis)',
        description: 'AI-powered image and video content classification, hash matching and CSAM detection.',
        pricing_model: 't3k',
        price_per_instance: 22000,
        price_per_worker:   4000,
        tb_tiers: [
          { key: 'tb10',  sku: 'T3KCORETB10',  name: '10TB',  price: 32000  },
          { key: 'tb30',  sku: 'T3KCORETB30',  name: '30TB',  price: 68000  },
          { key: 'tb50',  sku: 'T3KCORETB50',  name: '50TB',  price: 90000  },
          { key: 'tb100', sku: 'T3KCORETB100', name: '100TB', price: 120000 },
          { key: 'tb150', sku: 'T3KCORETB150', name: '150TB', price: 154000 },
        ],
        user_tiers: [
          { key: 'ur10', sku: 'T3KCOREUR10', name: '10 Concurrent Users', price: 20440 },
          { key: 'ur15', sku: 'T3KCOREUR15', name: '15 Concurrent Users', price: 26040 },
          { key: 'ur20', sku: 'T3KCOREUR20', name: '20 Concurrent Users', price: 29120 },
          { key: 'ur30', sku: 'T3KCOREUR30', name: '30 Concurrent Users', price: 37800 },
          { key: 'ur50', sku: 'T3KCOREUR50', name: '50 Concurrent Users', price: 53200 },
        ]
      },
      veritone: {
        name: 'Veritone',
        description: 'AI-powered transcription and translation for multimedia evidence and cross-border investigations.',
        pricing_model: 'veritone',
        price_per_instance: 22000,
        transcription_tiers: [
          { key: 'sml', sku: 'VERTSCPSML', name: '15,000 hrs (Small)',    price: 33010  },
          { key: 'med', sku: 'VERTSCPMED', name: '40,000 hrs (Medium)',   price: 82500  },
          { key: 'lrg', sku: 'VERTSCPLRG', name: '67,000 hrs (Large)',    price: 132000 },
          { key: 'xlg', sku: 'VERTSCPXLG', name: '135,000 hrs (X-Large)', price: 220000 },
        ],
        price_first_language:      27500,
        price_additional_language: 5500
      }
    }
  },

  // Visualisation Bundle — Knowledge Graph packaged with the Linkurious acquisition.
  // No discount vs. buying the underlying KGU/KGM SKUs separately — each bundle price is
  // simply the sum of the cheapest KGU/KGM pack combination that covers its included
  // users/memory exactly (see enhanced_capabilities.nuix_modules.linkurious above).
  //   Small:  2×KGU001 (2×5 users, $59,460)              + 1×KGM001 (64GB,  $36,400)  = $95,860
  //   Medium: 1×KGU002 + 1×KGU001 (20+5 users, $112,970) + 1×KGM002 (128GB, $56,000)  = $168,970
  //   Large:  1×KGU003 (50 users, $142,700)               + 1×KGM003 (256GB, $86,020)  = $228,720
  // Boosters beyond the included users/memory are sold as additional whole KGU/KGM packs
  // at the same per-pack prices — see getVisualisationBundlePricing in app.js.
  visualisation_bundles: {
    small:  { key: 'small',  sku: 'VISBNDL001S',  name: 'Visualisation Bundle – Small',  included_users: 10, included_memory_gb: 64,  price: 95860  },
    medium: { key: 'medium', sku: 'VISBNDL001MD', name: 'Visualisation Bundle – Medium', included_users: 25, included_memory_gb: 128, price: 168970 },
    large:  { key: 'large',  sku: 'VISBNDL001L',  name: 'Visualisation Bundle – Large',  included_users: 50, included_memory_gb: 256, price: 228720 },
  },

  consulting: {
    cslt300_price: 31310,
    cslt301_price: 46020,
    roles: {
      consultant:           { name: 'Consultant',           daily_rate_usd: 2700 },
      senior_consultant:    { name: 'Senior Consultant',    daily_rate_usd: 3600 },
      principal_consultant: { name: 'Principal Consultant', daily_rate_usd: 4500 },
      sme:                  { name: 'Subject Matter Expert', daily_rate_usd: 5500 },
    }
  },

  poc_price_per_month: 5000,

  discount_rules: {
    auto_approve_threshold: 0.20,
    government_max:         0.20,
    multi_use_case:         0.30,
    multi_year_per_year:    0.05,
    short_contract_premium: 0.50
  },

  // Sales regions + PPP index sourced from "Revised Regional Localisation and Methodology
  // Final.xlsx" (Country Pricing Index / Final Index (bounded) column, 15 Jul 2026).
  // Covers every country Nuix has ever billed in. See regional_data_source below and the
  // Methodology block rendered on the Regional Localisation page for how these were derived.
  regions: {
    'Americas': ['Argentina', 'Bahamas', 'Bolivia', 'Brazil', 'Canada', 'Chile', 'Colombia', 'Dominican Republic', 'Ecuador', 'Guatemala', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Peru', 'United States', 'Venezuela'],
    'International': ['Algeria', 'Angola', 'Armenia', 'Australia', 'Austria', 'Bahrain', 'Bangladesh', 'Belgium', 'Bhutan', 'Botswana', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Cambodia', 'China', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Liechtenstein', 'Libya', 'Lithuania', 'Luxembourg', 'Macau', 'Malawi', 'Malaysia', 'Maldives', 'Malta', 'Mauritius', 'Micronesia', 'Moldova', 'Mongolia', 'Montenegro', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Papua New Guinea', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Tanzania', 'Thailand', 'Togo', 'Tunisia', 'Turkey', 'Tuvalu', 'UAE', 'Uganda', 'Ukraine', 'United Kingdom', 'Vanuatu', 'Vietnam', 'Zambia']
  },

  // Final Index (bounded) / 100, floor 0.55 / ceiling 1.00, anchored to United States = 1.00.
  regional_multipliers: {
    'United States': 1.00, 'Canada': 0.670, 'Brazil': 0.55, 'Mexico': 0.55,
    'Argentina': 0.55, 'Bahamas': 0.55, 'Bolivia': 0.55, 'Chile': 0.55, 'Colombia': 0.55,
    'Dominican Republic': 0.55, 'Ecuador': 0.55, 'Guatemala': 0.55, 'Honduras': 0.55,
    'Jamaica': 0.55, 'Nicaragua': 0.55, 'Panama': 0.55, 'Peru': 0.55, 'Venezuela': 0.55,
    'United Kingdom': 0.692, 'Germany': 0.839, 'France': 0.55, 'Netherlands': 0.940,
    'Belgium': 1.00, 'Switzerland': 1.00, 'Sweden': 0.682, 'Norway': 0.914,
    'Denmark': 1.00, 'Spain': 0.654, 'Italy': 0.566, 'UAE': 0.606,
    'South Africa': 0.55, 'Saudi Arabia': 0.55,
    'Australia': 0.772, 'New Zealand': 0.587, 'Singapore': 1.00, 'Japan': 0.55,
    'Hong Kong': 0.683, 'South Korea': 0.55, 'India': 0.55, 'Malaysia': 0.55, 'Thailand': 0.55,
    'Algeria': 0.55, 'Angola': 0.55, 'Armenia': 0.55, 'Austria': 0.901, 'Bahrain': 0.55,
    'Bangladesh': 0.55, 'Bhutan': 0.55, 'Botswana': 0.55, 'Brunei': 0.55, 'Bulgaria': 0.55,
    'Burkina Faso': 0.55, 'Cambodia': 0.55, 'China': 0.55, 'Croatia': 0.55, 'Cyprus': 0.55,
    'Czech Republic': 0.55, 'Egypt': 0.55, 'Estonia': 0.55, 'Finland': 0.909, 'Ghana': 0.55,
    'Greece': 0.55, 'Hungary': 0.55, 'Iceland': 1.00, 'Indonesia': 0.55, 'Iraq': 0.55,
    'Ireland': 0.953, 'Israel': 0.723, 'Jordan': 0.55, 'Kazakhstan': 0.55, 'Kenya': 0.55,
    'Kuwait': 0.55, 'Latvia': 0.55, 'Lebanon': 0.55, 'Liechtenstein': 1.00, 'Libya': 0.55,
    'Lithuania': 0.55, 'Luxembourg': 1.00, 'Macau': 0.886, 'Malawi': 0.55, 'Maldives': 0.55,
    'Malta': 0.55, 'Mauritius': 0.55, 'Micronesia': 0.55, 'Moldova': 0.55, 'Mongolia': 0.55,
    'Montenegro': 0.55, 'Morocco': 0.55, 'Nigeria': 0.55, 'Oman': 0.55, 'Pakistan': 0.55,
    'Papua New Guinea': 0.55, 'Philippines': 0.55, 'Poland': 0.55, 'Portugal': 0.55,
    'Qatar': 0.831, 'Romania': 0.55, 'Serbia': 0.55, 'Slovakia': 0.55, 'Slovenia': 0.579,
    'Sri Lanka': 0.55, 'Taiwan': 0.55, 'Tanzania': 0.55, 'Togo': 0.55, 'Tunisia': 0.55,
    'Turkey': 0.55, 'Tuvalu': 0.55, 'Uganda': 0.55, 'Ukraine': 0.55, 'Vanuatu': 0.55,
    'Vietnam': 0.55, 'Zambia': 0.55
  },

  // Data provenance per country: 'ILO actual' (directly measured) or
  // 'GDP per capita (nominal) regression' (imputed from IMF GDP/capita where no
  // direct ILO figure exists). Drives the Basis column on the Regional Localisation page.
  regional_data_source: {
    'United States': 'ILO actual', 'Canada': 'GDP per capita (nominal) regression', 'Brazil': 'ILO actual', 'Mexico': 'GDP per capita (nominal) regression',
    'Argentina': 'ILO actual', 'Bahamas': 'ILO actual', 'Bolivia': 'GDP per capita (nominal) regression', 'Chile': 'ILO actual', 'Colombia': 'ILO actual',
    'Dominican Republic': 'ILO actual', 'Ecuador': 'ILO actual', 'Guatemala': 'ILO actual', 'Honduras': 'ILO actual',
    'Jamaica': 'ILO actual', 'Nicaragua': 'ILO actual', 'Panama': 'ILO actual', 'Peru': 'ILO actual', 'Venezuela': 'GDP per capita (nominal) regression',
    'United Kingdom': 'GDP per capita (nominal) regression', 'Germany': 'ILO actual', 'France': 'ILO actual', 'Netherlands': 'ILO actual',
    'Belgium': 'ILO actual', 'Switzerland': 'GDP per capita (nominal) regression', 'Sweden': 'ILO actual', 'Norway': 'ILO actual',
    'Denmark': 'ILO actual', 'Spain': 'ILO actual', 'Italy': 'ILO actual', 'UAE': 'GDP per capita (nominal) regression',
    'South Africa': 'ILO actual', 'Saudi Arabia': 'GDP per capita (nominal) regression',
    'Australia': 'ILO actual', 'New Zealand': 'GDP per capita (nominal) regression', 'Singapore': 'GDP per capita (nominal) regression', 'Japan': 'GDP per capita (nominal) regression',
    'Hong Kong': 'GDP per capita (nominal) regression', 'South Korea': 'GDP per capita (nominal) regression', 'India': 'ILO actual', 'Malaysia': 'GDP per capita (nominal) regression', 'Thailand': 'ILO actual',
    'Algeria': 'GDP per capita (nominal) regression', 'Angola': 'ILO actual', 'Armenia': 'ILO actual', 'Austria': 'ILO actual', 'Bahrain': 'GDP per capita (nominal) regression',
    'Bangladesh': 'ILO actual', 'Bhutan': 'GDP per capita (nominal) regression', 'Botswana': 'ILO actual', 'Brunei': 'ILO actual', 'Bulgaria': 'ILO actual',
    'Burkina Faso': 'ILO actual', 'Cambodia': 'ILO actual', 'China': 'GDP per capita (nominal) regression', 'Croatia': 'ILO actual', 'Cyprus': 'ILO actual',
    'Czech Republic': 'ILO actual', 'Egypt': 'ILO actual', 'Estonia': 'ILO actual', 'Finland': 'ILO actual', 'Ghana': 'ILO actual',
    'Greece': 'ILO actual', 'Hungary': 'ILO actual', 'Iceland': 'ILO actual', 'Indonesia': 'ILO actual', 'Iraq': 'GDP per capita (nominal) regression',
    'Ireland': 'ILO actual', 'Israel': 'GDP per capita (nominal) regression', 'Jordan': 'ILO actual', 'Kazakhstan': 'GDP per capita (nominal) regression', 'Kenya': 'ILO actual',
    'Kuwait': 'GDP per capita (nominal) regression', 'Latvia': 'ILO actual', 'Lebanon': 'ILO actual', 'Liechtenstein': 'GDP per capita (nominal) regression', 'Libya': 'GDP per capita (nominal) regression',
    'Lithuania': 'ILO actual', 'Luxembourg': 'ILO actual', 'Macau': 'GDP per capita (nominal) regression', 'Malawi': 'ILO actual', 'Maldives': 'ILO actual',
    'Malta': 'ILO actual', 'Mauritius': 'ILO actual', 'Micronesia': 'GDP per capita (nominal) regression', 'Moldova': 'ILO actual', 'Mongolia': 'ILO actual',
    'Montenegro': 'GDP per capita (nominal) regression', 'Morocco': 'GDP per capita (nominal) regression', 'Nigeria': 'ILO actual', 'Oman': 'GDP per capita (nominal) regression', 'Pakistan': 'ILO actual',
    'Papua New Guinea': 'GDP per capita (nominal) regression', 'Philippines': 'ILO actual', 'Poland': 'ILO actual', 'Portugal': 'GDP per capita (nominal) regression',
    'Qatar': 'GDP per capita (nominal) regression', 'Romania': 'ILO actual', 'Serbia': 'ILO actual', 'Slovakia': 'ILO actual', 'Slovenia': 'ILO actual',
    'Sri Lanka': 'GDP per capita (nominal) regression', 'Taiwan': 'GDP per capita (nominal) regression', 'Tanzania': 'GDP per capita (nominal) regression', 'Togo': 'ILO actual', 'Tunisia': 'ILO actual',
    'Turkey': 'ILO actual', 'Tuvalu': 'GDP per capita (nominal) regression', 'Uganda': 'ILO actual', 'Ukraine': 'GDP per capita (nominal) regression', 'Vanuatu': 'ILO actual',
    'Vietnam': 'ILO actual', 'Zambia': 'ILO actual'
  },

  customer_archetypes: {
    'Gov Agency': {
      'Investigations': [
        { name: 'Single departmental investigation',      description: 'Discrete internal matter involving a single department — limited custodians and contained data scope.',                                              workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Cross-departmental investigation',       description: 'Multi-department investigation spanning procurement, expenses or conduct — significant custodian count and data from multiple systems.',             workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Large-scale inquiry',                    description: 'Royal Commission or national inquiry — broad custodian scope, extended duration and high-volume complex data sources.',                              workers: 100, volume_tb: 300, users: 100 }
      ],
      'Legal': [
        { name: 'Single regulatory legal matter',         description: 'Agency responding to a single FOI, judicial review or tribunal with contained document scope and a small legal team.',                              workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Agency litigation programme',            description: 'Ongoing legal needs across multiple active matters — legal hold, document review and production across several concurrent proceedings.',             workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Multi-agency legal operation',           description: 'Large-scale coordinated legal programme across agencies — class actions, constitutional matters or treaty disputes with high data volumes.',          workers: 100, volume_tb: 300, users: 100 }
      ],
      'Data Privacy': [
        { name: 'Departmental PII audit',                 description: 'Single agency classifying PII holdings to meet a specific privacy reporting or legislative obligation — contained data estate.',                     workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Agency-wide privacy programme',          description: 'PII discovery, DSAR handling and breach response across an entire agency — multiple systems, custodians and data types.',                           workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Whole-of-government privacy governance', description: 'Enterprise privacy governance across a portfolio of agencies — large-scale discovery, classification and remediation to meet legislative requirements.', workers: 100, volume_tb: 300, users: 100 }
      ]
    },
    'Gov Law Enforcement': {
      'Investigations': [
        { name: 'Local investigation unit',               description: 'City or regional team investigating a discrete matter — device forensics, financial records and communications from a small custodian set.',           workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'State / multi-agency task force',        description: 'State-level unit or task force running concurrent investigations — multi-custodian, complex data and cross-agency evidence sharing.',                 workers: 30,  volume_tb: 100, users: 30  },
        { name: 'National enforcement operation',         description: 'National enforcement with high-volume data processing, multi-jurisdictional evidence and complex analytics across concurrent matters.',                workers: 100, volume_tb: 300, users: 100 }
      ],
      'Legal': [
        { name: 'Evidence package — single prosecution',  description: 'Preparing digital evidence for a single criminal prosecution — device forensics, communications and financial records for court production.',          workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Ongoing prosecution programme',          description: 'Litigation support across multiple active prosecutions — coordinating evidence, legal hold and production across concurrent criminal matters.',         workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Joint agency prosecution operation',     description: 'Coordinated multi-agency prosecution across jurisdictions — task force evidence management, shared review platform and large-scale production.',        workers: 100, volume_tb: 300, users: 100 }
      ],
      'Data Privacy': [
        { name: 'Intelligence holdings PII audit',        description: 'Classifying PII within intelligence holdings to meet oversight body requirements and privacy legislation obligations.',                                 workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Agency-wide privacy programme',          description: 'PII discovery, DSAR handling and breach response across an agency — case management systems, communications and operational data.',                    workers: 30,  volume_tb: 100, users: 30  },
        { name: 'National privacy governance',            description: 'Enterprise privacy programme across a national law enforcement agency — large-scale discovery, classification, breach response and DSAR at scale.',    workers: 100, volume_tb: 300, users: 100 }
      ]
    },
    'Law Firm': {
      'Investigations': [
        { name: 'Single client investigation mandate',    description: 'Boutique firm retained for a discrete investigation — limited custodians, focused data scope and a small review team.',                                workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Multi-client investigations practice',   description: 'Regional firm running several concurrent investigation mandates — multi-custodian, significant email and financial data across matters.',               workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Global investigations at scale',         description: 'Top-tier firm managing complex cross-border investigations — multi-jurisdiction, high custodian counts and foreign language data.',                     workers: 100, volume_tb: 300, users: 100 }
      ],
      'Legal': [
        { name: 'Small firm — discrete legal matter',     description: 'Boutique or specialist firm handling a single litigation or regulatory matter with focused data scope and a small review team.',                        workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Mid-size firm — active legal practice',  description: 'Regional firm with a steady pipeline — legal hold, document review and production across concurrent commercial litigation and compliance matters.',      workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Large global firm — legal at scale',     description: 'Top-tier firm managing large-scale cross-border matters — multiple jurisdictions, Relativity integration, high custodian counts and tight deadlines.',  workers: 100, volume_tb: 300, users: 100 }
      ],
      'Data Privacy': [
        { name: 'Client privacy audit — single mandate',  description: 'Firm retained to conduct a PII discovery and classification exercise for a single corporate client with contained data scope.',                         workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Privacy advisory practice',              description: 'Firm advising multiple clients on GDPR, CCPA and privacy compliance — PII classification, DSAR handling and breach response across matters.',           workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Large-scale privacy programme',          description: 'Top-tier firm managing major privacy programmes — enterprise-wide PII audits, breach class actions and high-volume DSAR processing.',                   workers: 100, volume_tb: 300, users: 100 }
      ]
    },
    'Corporate': {
      'Investigations': [
        { name: 'Internal investigation — single matter',  description: 'One-off internal investigation triggered by a whistleblower or audit flag — single department, limited custodians and contained data.',                workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Regulatory investigation response',       description: 'Responding to a regulator inquiry — significant custodian count, legal hold obligations and review pressure across multiple teams.',                    workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Cross-border investigation',              description: 'Large corporate investigation — multi-jurisdiction, high custodian counts and complex financial and communications data.',                               workers: 100, volume_tb: 300, users: 100 }
      ],
      'Legal': [
        { name: 'Single legal matter',                     description: 'In-house legal team managing a single commercial dispute or regulatory inquiry — legal hold, document review and production.',                          workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Active legal programme',                  description: 'Ongoing legal management — multiple concurrent commercial disputes, regulatory matters, compliance reviews and legal hold obligations.',                 workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Major litigation or M&A due diligence',  description: 'Large-scale litigation or M&A transaction — high-volume data processing, complex productions and multi-jurisdiction legal requirements.',                workers: 100, volume_tb: 300, users: 100 }
      ],
      'Data Privacy': [
        { name: 'Privacy programme — single jurisdiction', description: 'In-house team managing PII, DSARs and breach response for a single country under applicable privacy legislation.',                                      workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Multi-jurisdiction privacy programme',    description: 'Privacy management across multiple countries or business units — PII classification, DSAR handling and breach response under GDPR, CCPA and other regimes.', workers: 30, volume_tb: 100, users: 30 },
        { name: 'Enterprise privacy operation',            description: 'Group-wide PII governance, breach response and DSAR processing across a multinational — multiple jurisdictions, systems and business units.',           workers: 100, volume_tb: 300, users: 100 }
      ]
    },
    'ASP': {
      'Investigations': [
        { name: 'Boutique investigations provider',        description: 'Specialised firm serving a handful of clients with discrete investigation mandates — focused data scope and a small analytical team.',                  workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Mid-size investigations firm',            description: 'Regional provider with a steady pipeline of concurrent investigation mandates — multi-custodian, significant data volumes across matters.',             workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Large investigations managed service',    description: 'High-volume provider serving major corporates and law firms — large-scale concurrent mandates, complex analytics and multi-jurisdiction cases.',        workers: 100, volume_tb: 300, users: 100 }
      ],
      'Legal': [
        { name: 'Boutique legal services provider',        description: 'Specialised firm serving a handful of law firm clients — targeted matters, contained data volumes and a small review team.',                            workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Mid-size legal services provider',        description: 'Regional provider with ongoing work across multiple law firm clients — eDiscovery, litigation support and compliance across concurrent matters.',        workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Large legal managed service',             description: 'High-volume provider serving major law firms and corporates — concurrent large-scale matters, complex productions and tight SLAs.',                     workers: 100, volume_tb: 300, users: 100 }
      ],
      'Data Privacy': [
        { name: 'Boutique privacy consultancy',            description: 'Privacy specialist firm providing PII discovery, DSAR and breach response services to a small corporate client base.',                                  workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Regional privacy managed service',        description: 'Provider delivering ongoing privacy compliance to multiple clients — PII classification, DSAR processing and breach response.',                         workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Enterprise privacy managed service',      description: 'Large provider managing privacy obligations at scale for major corporates — multi-jurisdiction, high-volume PII, DSAR and breach workloads.',           workers: 100, volume_tb: 300, users: 100 }
      ]
    },
    'LSV': {
      'Investigations': [
        { name: 'Single investigation processing project', description: 'One-off large-scale investigation data processing — tight timelines, high custodian count and complex financial and communications data.',              workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Ongoing investigation processing service',description: 'Continuous investigation processing across multiple concurrent mandates for law firms, corporates and government clients.',                              workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Enterprise investigations managed service',description:'Full managed service for ongoing large-scale investigation processing — high data volumes, complex workflows and multi-client environment.',            workers: 100, volume_tb: 300, users: 100 }
      ],
      'Legal': [
        { name: 'Single high-volume legal project',        description: 'One-off large-scale legal processing project — major litigation, eDiscovery or compliance matter with aggressive data volumes and deadlines.',          workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Ongoing legal processing service',        description: 'Continuous high-volume legal processing across concurrent matters for law firms and corporate legal teams.',                                              workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Enterprise legal managed service',        description: 'Full managed service for large-scale continuous legal processing — complex productions, Relativity integration and multi-client SLAs.',                 workers: 100, volume_tb: 300, users: 100 }
      ],
      'Data Privacy': [
        { name: 'Single privacy processing project',       description: 'One-off high-volume PII discovery, breach scoping or DSAR processing project — large data estate, tight timelines and regulatory obligations.',        workers: 10,  volume_tb: 30,  users: 10  },
        { name: 'Ongoing privacy processing service',      description: 'Continuous privacy processing across multiple clients — PII classification, DSAR fulfilment, breach response and compliance reporting.',                workers: 30,  volume_tb: 100, users: 30  },
        { name: 'Enterprise privacy managed service',      description: 'Full managed service for large-scale privacy processing — multi-jurisdiction, multi-client PII, DSAR and breach workloads at scale.',                  workers: 100, volume_tb: 300, users: 100 }
      ]
    }
  }
};
