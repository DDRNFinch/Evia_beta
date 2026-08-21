import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const writeJson = (relativePath, value) =>
  writeFile(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);

const st0264Common = {
  K1: "H&S regulations, standards & guidance",
  K2: "PPE, RPE & safety controls",
  K3: "Safe systems of work",
  K4: "Environmental impact & sustainable resources",
  K5: "Building & modern construction principles",
  K6: "Digital design & modelling systems",
  K7: "Carpentry standards & regulations",
  K8: "Drawings & specifications",
  K9: "Timber & material characteristics",
  K10: "Timber decay & repair",
  K11: "Carpentry/joinery products & ironmongery",
  K12: "Material estimating & cutting lists",
  K13: "Verbal communication & construction terminology",
  K14: "Hand tools: use & storage",
  K15: "Hand tool maintenance & sharpening",
  K16: "Jigs",
  K17: "Power tools: use & storage",
  K18: "Team working",
  K19: "Inclusion, equity & diversity",
  K20: "Wellbeing & support",
  K40: "Employment & self-employment",
  S1: "Comply with H&S requirements",
  S2: "Use PPE/RPE & safety controls",
  S3: "Sustainability & waste management",
  S4: "Industry standards & regulations",
  S5: "Prepare a safe work area",
  S6: "Interpret drawings & specifications",
  S7: "Estimate materials & cutting lists",
  S8: "Verbal communication",
  S9: "Use hand tools",
  S10: "Use power tools",
  S11: "Maintain & sharpen hand tools",
  S12: "Produce jigs",
  S13: "Identify wellbeing support",
  B1: "Put H&S and wellbeing first",
  B2: "Consider the environment & resources",
  B3: "Support an inclusive/diverse culture",
  B4: "Seek learning & development",
  B5: "Work as part of the wider team",
};

const siteLabels = {
  K21: "Site measuring, marking, fitting, cutting & mitring",
  K22: "Structural fixtures & timber sizing",
  K23: "Timber sizing tables",
  K24: "Splicing & scribing",
  K25: "Straight roofs",
  K26: "Flat roofs",
  K27: "First-fix carpentry",
  K28: "Second-fix carpentry",
  K29: "Laser levels",
  S14: "First-fix carpentry",
  S15: "Structural fixings",
  S16: "Use timber sizing tables",
  S17: "Second-fix carpentry",
  S18: "Rafter roofs",
  S19: "Use laser levels",
  S20: "Form carpentry connections",
  S21: "Measure, mark, cut, mitre, hinge & recess",
  S22: "Splice & scribe timber",
};

const joinerLabels = {
  K30: "Fire-door assembly requirements",
  K31: "Fixed workshop machinery",
  K32: "Setting out & marking out",
  K33: "Timber joints",
  K34: "Timber windows",
  K35: "Joinery connections",
  K36: "First-fix manufacture",
  K37: "Second-fix manufacture",
  K38: "Finishing",
  K39: "Joinery ironmongery",
  S23: "Setting rods & marking out",
  S24: "Make basic timber joints",
  S25: "Form joinery connections",
  S26: "Manufacture timber windows",
  S27: "First-fix manufacture",
  S28: "Second-fix manufacture",
  S29: "Fit joinery ironmongery",
  S30: "Operate fixed machinery",
};

const siteCodes = [
  ...Array.from({ length: 29 }, (_, index) => `K${index + 1}`),
  "K40",
  ...Array.from({ length: 22 }, (_, index) => `S${index + 1}`),
  ...Array.from({ length: 5 }, (_, index) => `B${index + 1}`),
];

const joinerCodes = [
  ...Array.from({ length: 20 }, (_, index) => `K${index + 1}`),
  ...Array.from({ length: 11 }, (_, index) => `K${index + 30}`),
  ...Array.from({ length: 13 }, (_, index) => `S${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `S${index + 23}`),
  ...Array.from({ length: 5 }, (_, index) => `B${index + 1}`),
];

function parseSiteData(source) {
  const match = source.match(/export const SITE_DATA_\d+:SiteCategory\[\]=(.*);\s*$/s);
  if (!match) throw new Error("Could not parse an ST0264 course-map part.");
  return JSON.parse(match[1]);
}

function descriptions(codes, routeLabels) {
  const labels = { ...st0264Common, ...routeLabels };
  return Object.fromEntries(codes.map((code) => [code, labels[code] ?? code]));
}

function auditMap(label, data, codes, expected) {
  const ids = new Set();
  const mapped = new Set();
  let jobs = 0;
  let opportunities = 0;
  for (const category of data) {
    jobs += category.jobs.length;
    for (const job of category.jobs) {
      for (const opportunity of job.opps) {
        opportunities += 1;
        const id = `${category.id}/${job.id}/${opportunity.id}`;
        if (ids.has(id)) throw new Error(`${label} has duplicate evidence point ${id}.`);
        ids.add(id);
        for (const code of opportunity.codes ?? []) mapped.add(String(code));
      }
    }
  }
  const actual = { categories: data.length, jobs, opportunities, codes: mapped.size };
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      throw new Error(`${label} ${key} audit failed: ${actual[key]}/${value}.`);
    }
  }
  const missing = codes.filter((code) => !mapped.has(code));
  if (missing.length) throw new Error(`${label} is missing ${missing.join(", ")}.`);
}

async function buildSt0264() {
  const parts = async (prefix) =>
    Promise.all([1, 2, 3].map(async (part) => parseSiteData(await read(`app/${prefix}-${part}.ts`))));
  const siteData = (await parts("evia-carpentry-site-data")).flat();
  const joinerData = (await parts("evia-carpentry-joiner-data")).flat();
  auditMap("Site Carpenter", siteData, siteCodes, {
    categories: 6,
    jobs: 42,
    opportunities: 135,
    codes: 57,
  });
  auditMap("Architectural Joiner", joinerData, joinerCodes, {
    categories: 6,
    jobs: 47,
    opportunities: 148,
    codes: 57,
  });
  return {
    nisiCoursePack: 1,
    schemaVersion: 1,
    id: "st0264-v1-4",
    familyId: "ST0264",
    version: "1.4",
    title: "Carpentry & Joinery — ST0264 v1.4",
    shortTitle: "Carpentry & Joinery",
    standard: "ST0264 v1.4",
    standardId: "ST0264",
    choiceLabel: "Pathway",
    courseType: "apprenticeship",
    coverageLabel: "KSB",
    learningLabel: "OTJ",
    fourthLabel: "EPA",
    otjMinimumHours: 557,
    gatewayBufferMonths: 3,
    epaConfigured: true,
    pathways: [
      {
        id: "site-carpenter",
        title: "Site Carpenter",
        compatStorageSuffix: "st0264-site",
        codes: siteCodes,
        codeDescriptions: descriptions(siteCodes, siteLabels),
        siteData,
      },
      {
        id: "architectural-joiner",
        title: "Architectural Joiner",
        compatStorageSuffix: "st0264-aj",
        codes: joinerCodes,
        codeDescriptions: descriptions(joinerCodes, joinerLabels),
        siteData: joinerData,
      },
    ],
  };
}

function loadTrowelGlobals(metaSource, textSource) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(metaSource, context, { filename: "assets/evia-trowel-meta.js" });
  vm.runInContext(textSource, context, { filename: "assets/evia-trowel-ac-text.js" });
  return context.window;
}

function parseTrowelDefinition(source) {
  const start = source.indexOf("const D=");
  let end = source.indexOf("\nfunction build", start);
  if (end < 0) end = source.indexOf("function build", start);
  if (start < 0 || end < 0) throw new Error("Could not parse the Trowel course definition.");
  let raw = source.slice(start + 8, end).trim();
  if (raw.endsWith(";")) raw = raw.slice(0, -1);
  return JSON.parse(raw);
}

function buildTrowelMap(definition, meta, route) {
  const allowed = new Set(meta.routeUnits[route]);
  const category = (raw) => ({
    id: raw[0],
    title: raw[1],
    jobs: raw[2].map((job) => ({
      id: job[0],
      title: job[1],
      _units: (job[2] ?? []).filter((unit) => allowed.has(unit)),
      opps: (job[3] ?? []).map((opportunity) => ({
        id: opportunity[0],
        title: opportunity[1],
        instruction: opportunity[2],
        question: opportunity[3],
        themes: opportunity[4] ?? [],
        codes: [],
        bundle: raw[1],
        ...(opportunity[5] === "talk" ? { media: "talk" } : {}),
      })),
    })),
  });
  const optional = definition.optional[route];
  if (!optional) throw new Error(`Missing Trowel route ${route}.`);
  const data = [...definition.common, optional].map(category);
  const opportunities = [];
  for (const categoryItem of data) {
    for (const job of categoryItem.jobs) {
      for (const opportunity of job.opps) opportunities.push({ opportunity, units: job._units });
    }
  }
  const expectedCodes = meta.routeUnits[route].flatMap((unit) => meta.unitCodes[String(unit)] ?? []);
  for (const code of expectedCodes) {
    const theme = meta.codeTheme[code];
    const unit = Number(meta.codeUnit[code]);
    const candidates = opportunities.filter(({ opportunity }) => opportunity.themes.includes(theme));
    const target = candidates.find((candidate) => candidate.units.includes(unit)) ?? candidates[0];
    if (!target) throw new Error(`No Trowel evidence route for ${code} (${theme}).`);
    target.opportunity.codes.push(code);
  }
  for (const categoryItem of data) {
    for (const job of categoryItem.jobs) {
      delete job._units;
      for (const opportunity of job.opps) {
        if (!opportunity.codes.length) opportunity.holistic = true;
      }
    }
  }
  const mapped = data.flatMap((categoryItem) =>
    categoryItem.jobs.flatMap((job) => job.opps.flatMap((opportunity) => opportunity.codes)),
  );
  const unique = new Set(mapped);
  if (
    mapped.length !== expectedCodes.length ||
    unique.size !== expectedCodes.length ||
    expectedCodes.some((code) => !unique.has(code))
  ) {
    throw new Error(`Trowel ${route} mapping audit failed: ${unique.size}/${expectedCodes.length}.`);
  }
  return { data, expectedCodes };
}

async function buildTrowel() {
  const [metaSource, textSource, dataSource] = await Promise.all([
    read("assets/evia-trowel-meta.js"),
    read("assets/evia-trowel-ac-text.js"),
    read("assets/evia-trowel-data.js"),
  ]);
  const globals = loadTrowelGlobals(metaSource, textSource);
  const meta = globals.EviaTrowelMeta;
  const describe = globals.EviaTrowelACText.describe;
  const definition = parseTrowelDefinition(dataSource);
  const routes = ["thin", "repair", "specialist", "drainage"];
  const pathways = routes.map((route) => {
    const { data, expectedCodes } = buildTrowelMap(definition, meta, route);
    return {
      id: route,
      title: String(meta.optionTitles[route]),
      compatStorageSuffix: `6570-05-${route}`,
      codes: expectedCodes,
      codeDescriptions: Object.fromEntries(expectedCodes.map((code) => [code, describe(code)])),
      siteData: data,
      units: meta.routeUnits[route],
      glhTargetHours: Number(meta.glhTargetHours),
      tqtHours: Number(meta.tqtHours),
      epaConfigured: false,
      expectedAcCount: expectedCodes.length,
    };
  });
  const expected = { thin: 238, repair: 239, specialist: 239, drainage: 240 };
  for (const pathway of pathways) {
    if (pathway.codes.length !== expected[pathway.id]) {
      throw new Error(`${pathway.title} AC count audit failed.`);
    }
  }
  return {
    nisiCoursePack: 1,
    schemaVersion: 1,
    id: "6570-05",
    familyId: "6570-05",
    version: "1",
    mappingRevision: 2,
    title: String(meta.title),
    shortTitle: String(meta.shortTitle),
    standard: "6570-05",
    standardId: "6570-05",
    choiceLabel: "Optional unit",
    courseType: "nvq",
    coverageLabel: "AC",
    learningLabel: "GLH",
    fourthLabel: "ARP",
    glhTargetHours: Number(meta.glhTargetHours),
    tqtHours: Number(meta.tqtHours),
    epaConfigured: false,
    nvqMeta: meta,
    pathways,
  };
}

const [st0264, trowel] = await Promise.all([buildSt0264(), buildTrowel()]);
await Promise.all([
  writeJson("course-packs/Carpentry_Joinery_ST0264_v1.4.nisi", st0264),
  writeJson("course-packs/Trowel_Occupations_6570-05_v1.nisi", trowel),
]);

console.log("Built verified ST0264 and 6570-05 static course packs.");
