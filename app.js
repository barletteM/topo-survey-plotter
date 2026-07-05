const STORAGE_KEY = "topo-survey-plotter-codes-v1";
const INSTRUCTIONS_KEY = "topo-survey-plotter-instructions-v1";
const CLUSTER_DISTANCE = 2.2;
const CLUSTER_CODES = new Set(["TMH", "EB"]);

const builtInCodes = [
  { pattern: "SS", type: "label", layer: "TOPO-SPOTLEVELS", desc: "Spot shot / surface point" },
  { pattern: "BM", type: "point", layer: "TOPO-BM", desc: "Benchmark" },
  { pattern: "REF", type: "point", layer: "TOPO-BM", desc: "Reference mark" },
  { pattern: "BH", type: "point", layer: "TOPO-BOREHOLE", desc: "Borehole" },
  { pattern: "EBH", type: "point", layer: "TOPO-BOREHOLE", desc: "Existing borehole" },
  { pattern: "TMH", type: "point", layer: "TOPO-TMH", desc: "Telecom manhole" },
  { pattern: "EB", type: "point", layer: "TOPO-EB", desc: "Electrical box" },
  { pattern: "SL", type: "point", layer: "TOPO-STREETLIGHT", desc: "Street light" },
  { pattern: "PALMTREE", type: "point", layer: "TOPO-TREES", desc: "Palm tree / vegetation" },
  { pattern: "RE*", type: "line", layer: "TOPO-ROAD-EDGE", desc: "Road edge line" },
  { pattern: "BC*", type: "closed", layer: "TOPO-BUILDING", desc: "Building corner polygon" },
  { pattern: "STAIR*", type: "closed", layer: "TOPO-STAIRS", desc: "Stair outline polygon" },
  { pattern: "FL*", type: "label", layer: "TOPO-FLOORLEVEL", desc: "Floor level label" },
  { pattern: "TOPENT", type: "label", layer: "TOPO-ENTRANCE", desc: "Top of entrance level" },
  { pattern: "EF*", type: "line", layer: "TOPO-FENCE-EXISTING", desc: "Existing fence" },
  { pattern: "PF*", type: "line", layer: "TOPO-FENCE-PROPOSED", desc: "Proposed fence" },
  { pattern: "CF*", type: "line", layer: "TOPO-FENCE-CORRECTED", desc: "Corrected fence" },
  { pattern: "FNC*", type: "line", layer: "TOPO-FENCE", desc: "Fence line" },
  { pattern: "RC*", type: "line", layer: "TOPO-ROAD-CENTRE", desc: "Road centre line" },
  { pattern: "WL*", type: "line", layer: "TOPO-WATER", desc: "Water line" },
  { pattern: "WM", type: "point", layer: "TOPO-WATER", desc: "Water meter" },
  { pattern: "SV", type: "point", layer: "TOPO-WATER", desc: "Stop valve" },
  { pattern: "MH", type: "point", layer: "TOPO-SEWER", desc: "Sewer manhole" },
  { pattern: "SLN*", type: "line", layer: "TOPO-SEWER", desc: "Sewer line" },
  { pattern: "PP", type: "point", layer: "TOPO-POWER", desc: "Power pole" },
  { pattern: "PLN*", type: "line", layer: "TOPO-POWER", desc: "Power line" }
];

const sampleCsv = `1,-50193.898,-107638.032,3.919,BM
2,-50190.798,-107641.757,3.925,RE1
3,-50192.446,-107645.348,3.977,RE1
4,-50194.037,-107648.777,4.081,RE1
5,-50189.264,-107651.038,4.041,RE1
6,-50187.412,-107646.945,3.942,RE1
7,-50185.833,-107643.45,3.902,RE1
8,-50188.761,-107652.605,4.107,RE1
9,-50189.669,-107655.703,4.113,RE1
10,-50190.468,-107658.017,4.15,RE1
11,-50190.063,-107662.091,4.209,RE1
12,-50189.893,-107664.429,4.185,RE1
13,-50188.665,-107668.489,4.246,RE1
14,-50186.326,-107673.286,4.248,RE1
15,-50183.602,-107675.278,4.204,RE1
16,-50181.284,-107670.504,4.116,RE1
17,-50180.82,-107669.003,4.208,PALM TREE
18,-50187.771,-107665.602,4.313,PALM TREE
19,-50186.655,-107663.27,4.489,TMH
20,-50185.771,-107663.614,4.485,TMH
21,-50185.395,-107662.715,4.46,TMH
22,-50186.314,-107662.392,4.48,TMH
23,-50188.422,-107658.93,4.233,PALM TREE
24,-50186.339,-107652.864,4.214,PALM TREE
25,-50183.567,-107646.305,4.202,PALM TREE
26,-50193.382,-107642.085,3.936,PALM TREE
27,-50199.918,-107653.226,4.268,PALM TREE
28,-50203.444,-107657.072,4.195,PALM TREE
29,-50221.182,-107656.823,4.349,PALM TREE
30,-50214.094,-107650.623,4.371,TMH
31,-50213.214,-107651.075,4.36,TMH
32,-50212.829,-107650.183,4.347,TMH
33,-50213.743,-107649.814,4.361,TMH
34,-50213.139,-107649.432,4.155,SL
35,-50255.208,-107630.439,3.913,SL
36,-50255.548,-107631.026,4.147,TMH
37,-50254.715,-107631.358,4.134,TMH
38,-50255.092,-107632.262,4.145,TMH
39,-50255.832,-107631.858,4.155,TMH
40,-50289.221,-107615.22,3.763,SL`;

const el = {
  fileInput: document.querySelector("#fileInput"),
  sampleBtn: document.querySelector("#sampleBtn"),
  exportSvgBtn: document.querySelector("#exportSvgBtn"),
  exportDxfBtn: document.querySelector("#exportDxfBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  resetCodesBtn: document.querySelector("#resetCodesBtn"),
  codeForm: document.querySelector("#codeForm"),
  codeInput: document.querySelector("#codeInput"),
  typeInput: document.querySelector("#typeInput"),
  layerInput: document.querySelector("#layerInput"),
  descInput: document.querySelector("#descInput"),
  codeList: document.querySelector("#codeList"),
  matchMode: document.querySelector("#matchMode"),
  lineLabelMode: document.querySelector("#lineLabelMode"),
  showPointNumbers: document.querySelector("#showPointNumbers"),
  showElevations: document.querySelector("#showElevations"),
  closePolygons: document.querySelector("#closePolygons"),
  invertDxfCoords: document.querySelector("#invertDxfCoords"),
  applyInstructionsBtn: document.querySelector("#applyInstructionsBtn"),
  instructionInput: document.querySelector("#instructionInput"),
  instructionStatus: document.querySelector("#instructionStatus"),
  totalPoints: document.querySelector("#totalPoints"),
  pointCount: document.querySelector("#pointCount"),
  lineCount: document.querySelector("#lineCount"),
  unknownCount: document.querySelector("#unknownCount"),
  plotSubtitle: document.querySelector("#plotSubtitle"),
  plotSvg: document.querySelector("#plotSvg"),
  plotLog: document.querySelector("#plotLog"),
  pointTable: document.querySelector("#pointTable"),
  zoomFitBtn: document.querySelector("#zoomFitBtn"),
  toggleGridBtn: document.querySelector("#toggleGridBtn")
};

let codes = loadCodes();
let points = [];
let classified = [];
let showGrid = true;
let currentProjection = null;
let instructionRules = parseInstructions(loadInstructions());
let pointFeatures = [];
let clusteredPointIds = new Set();

el.instructionInput.value = loadInstructions();

function loadCodes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return mergeBuiltInCodes(saved);
    return structuredClone(builtInCodes);
  } catch {
    return structuredClone(builtInCodes);
  }
}

function mergeBuiltInCodes(saved) {
  const merged = structuredClone(saved);
  builtInCodes.forEach(item => {
    if (!merged.some(code => code.pattern === item.pattern)) merged.push(structuredClone(item));
  });
  return merged;
}

function saveCodes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

function loadInstructions() {
  return localStorage.getItem(INSTRUCTIONS_KEY) || "AREA EP LAYER TOPO-BOUNDARY\nSYMBOL BH BOREHOLE LAYER TOPO-BOREHOLE";
}

function saveInstructions() {
  localStorage.setItem(INSTRUCTIONS_KEY, el.instructionInput.value);
}

function cleanCode(value) {
  const raw = String(value ?? "").trim();
  const code = raw.toUpperCase().replace(/\s+/g, "");
  const corrections = {
    "PALM_TREE": "PALMTREE",
    "PALM-TREE": "PALMTREE",
    "PALMTREE": "PALMTREE",
    "TOPENTR": "TOPENT",
    "TOPENTRANCE": "TOPENT",
    "SPOTSHOT": "SS",
    "SPOTSHOTS": "SS",
    "BENCHMARK": "BM",
    "ELECTRICALBOX": "EB",
    "STREETLIGHT": "SL",
    "TELECOMMANHOLE": "TMH"
  };
  return corrections[code] || code;
}

function parseCsv(text) {
  const rows = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(parseCsvLine);
  if (!rows.length) return [];
  const hasHeader = rows[0].some(cell => /point|east|north|elev|code|desc/i.test(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const header = hasHeader ? rows[0].map(cell => cell.toLowerCase().trim()) : [];

  function pick(row, names, fallbackIndex) {
    if (!hasHeader) return row[fallbackIndex];
    const index = header.findIndex(h => names.some(name => h.includes(name)));
    return row[index >= 0 ? index : fallbackIndex];
  }

  return dataRows.map(row => {
    const pointNo = pick(row, ["point", "pt", "no"], 0);
    const easting = Number(pick(row, ["east", "easting"], 1));
    const northing = Number(pick(row, ["north", "northing"], 2));
    const elevation = Number(pick(row, ["elev", "height", "rl", "z"], 3));
    const rawCode = pick(row, ["code", "desc", "description"], 4);
    if (!pointNo || !Number.isFinite(easting) || !Number.isFinite(northing)) return null;
    return { pointNo: String(pointNo), easting, northing, elevation, rawCode: String(rawCode || ""), code: cleanCode(rawCode) };
  }).filter(Boolean);
}

function parseCsvLine(line) {
  const out = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      out.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  out.push(value.trim());
  return out;
}

function matchCode(code) {
  const exact = codes.find(item => item.pattern.toUpperCase() === code);
  if (exact || el.matchMode.value === "exact") return exact || unknownRule(code);
  const prefixRules = codes
    .filter(item => item.pattern.endsWith("*"))
    .sort((a, b) => b.pattern.length - a.pattern.length);
  const matched = prefixRules.find(item => code.startsWith(item.pattern.slice(0, -1).toUpperCase()));
  return matched || unknownRule(code);
}

function unknownRule(code) {
  return { pattern: code || "UNKNOWN", type: "unknown", layer: "TOPO-UNKNOWN", desc: "Unknown / add this code to the library" };
}

function classifyPoints() {
  classified = points.map(point => {
    const symbolRule = findInstructionSymbol(point.code);
    return {
      ...point,
      rule: symbolRule
        ? { pattern: symbolRule.code, type: "point", layer: symbolRule.layer, desc: `${symbolRule.symbol} symbol` }
        : matchCode(point.code),
      instructionSymbol: symbolRule
    };
  });
  buildPointFeatures();
}

function buildPointFeatures() {
  const clusterable = classified.filter(point => CLUSTER_CODES.has(point.code) && !point.instructionSymbol);
  const rest = classified.filter(point => !CLUSTER_CODES.has(point.code) || point.instructionSymbol);
  const clusters = [];
  const used = new Set();
  clusterable.forEach(point => {
    if (used.has(point.pointNo)) return;
    const cluster = [point];
    used.add(point.pointNo);
    clusterable.forEach(candidate => {
      if (used.has(candidate.pointNo) || candidate.code !== point.code) return;
      if (distance(point, candidate) <= CLUSTER_DISTANCE) {
        cluster.push(candidate);
        used.add(candidate.pointNo);
      }
    });
    clusters.push(cluster);
  });

  pointFeatures = [
    ...rest.map(point => ({ kind: "single", code: point.code, layer: point.rule.layer, points: [point], x: point.easting, y: point.northing, z: point.elevation, rule: point.rule, instructionSymbol: point.instructionSymbol })),
    ...clusters.map(cluster => {
      const first = cluster[0];
      return {
        kind: "cluster",
        code: first.code,
        layer: first.rule.layer,
        points: cluster,
        x: average(cluster, "easting"),
        y: average(cluster, "northing"),
        z: average(cluster, "elevation"),
        rule: first.rule
      };
    })
  ];
  clusteredPointIds = new Set(clusters.flatMap(cluster => cluster.length > 1 ? cluster.map(point => point.pointNo) : []));
}

function distance(a, b) {
  return Math.hypot(a.easting - b.easting, a.northing - b.northing);
}

function average(items, key) {
  const values = items.map(item => Number(item[key])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function parseInstructions(text) {
  const rules = { areas: [], symbols: [], messages: [] };
  String(text || "").split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split(/\s+/);
    const action = parts[0].toUpperCase();
    if (["AREA", "BOUNDARY", "POLYGON"].includes(action)) {
      const code = cleanCode(parts[1] || "");
      if (!code) {
        rules.messages.push({ ok: false, text: `Line ${index + 1}: AREA needs a code, for example AREA EP.` });
        return;
      }
      rules.areas.push({ code, layer: readInstructionValue(parts, "LAYER", `TOPO-${code}-AREA`) });
      rules.messages.push({ ok: true, text: `AREA ${code}: will create closed area from ${code} points.` });
      return;
    }
    if (["SYMBOL", "POINTSYMBOL", "BLOCK"].includes(action)) {
      const code = cleanCode(parts[1] || "");
      const symbol = String(parts[2] || "CUSTOM").toUpperCase();
      if (!code) {
        rules.messages.push({ ok: false, text: `Line ${index + 1}: SYMBOL needs a code, for example SYMBOL BH BOREHOLE.` });
        return;
      }
      rules.symbols.push({ code, symbol, layer: readInstructionValue(parts, "LAYER", `TOPO-${code}`) });
      rules.messages.push({ ok: true, text: `SYMBOL ${code}: will plot ${code} as ${symbol}.` });
      return;
    }
    rules.messages.push({ ok: false, text: `Line ${index + 1}: instruction not understood.` });
  });
  return rules;
}

function readInstructionValue(parts, key, fallback) {
  const index = parts.findIndex(part => part.toUpperCase() === key);
  return index >= 0 && parts[index + 1] ? parts[index + 1].toUpperCase() : fallback;
}

function findInstructionSymbol(code) {
  return instructionRules.symbols.find(rule => rule.code === code || (rule.code.endsWith("*") && code.startsWith(rule.code.slice(0, -1))));
}

function getInstructionAreas() {
  return instructionRules.areas.map(rule => ({
    ...rule,
    group: classified.filter(point => point.code === rule.code || (rule.code.endsWith("*") && point.code.startsWith(rule.code.slice(0, -1)))).sort(pointSort)
  }));
}

function renderCodeList() {
  el.codeList.innerHTML = "";
  codes
    .slice()
    .sort((a, b) => a.pattern.localeCompare(b.pattern))
    .forEach(item => {
      const row = document.createElement("div");
      row.className = "code-row";
      row.innerHTML = `
        <span class="code-chip">${escapeHtml(item.pattern)}</span>
        <span class="type-pill type-${item.type}">${labelType(item.type)}</span>
        <span title="${escapeHtml(item.layer)}">${escapeHtml(item.desc || item.layer)}</span>
        <button class="delete-code" type="button" title="Delete code">x</button>
      `;
      row.querySelector(".delete-code").addEventListener("click", () => {
        codes = codes.filter(code => code.pattern !== item.pattern);
        saveCodes();
        refresh();
      });
      row.addEventListener("dblclick", () => {
        el.codeInput.value = item.pattern;
        el.typeInput.value = item.type;
        el.layerInput.value = item.layer;
        el.descInput.value = item.desc;
      });
      el.codeList.appendChild(row);
    });
}

function refresh() {
  instructionRules = parseInstructions(el.instructionInput.value);
  classifyPoints();
  renderCodeList();
  renderInstructionStatus();
  renderStats();
  renderTable();
  renderPlot();
  renderLog();
}

function renderInstructionStatus() {
  el.instructionStatus.innerHTML = instructionRules.messages.length
    ? instructionRules.messages.map(message => `<div class="${message.ok ? "instruction-ok" : "instruction-warn"}">${escapeHtml(message.text)}</div>`).join("")
    : `<div class="hint">No plot instructions entered.</div>`;
}

function renderStats() {
  const pointPlots = pointFeatures.filter(feature => ["point", "label", "unknown"].includes(feature.rule.type)).length;
  const lineGroups = groupLinePoints().length + getInstructionAreas().filter(area => area.group.length >= 2).length + getFenceAreas().length;
  const unknowns = classified.filter(p => p.rule.type === "unknown").length;
  el.totalPoints.textContent = classified.length;
  el.pointCount.textContent = pointPlots;
  el.lineCount.textContent = lineGroups;
  el.unknownCount.textContent = unknowns;
  el.plotSubtitle.textContent = classified.length
    ? `${classified.length} points loaded. ${pointPlots} plot as points/labels and ${lineGroups} code groups plot as lines.`
    : "Load a CSV or sample to begin.";
}

function renderTable() {
  el.pointTable.innerHTML = "";
  classified.forEach(point => {
    const tr = document.createElement("tr");
    if (point.rule.type === "unknown") tr.className = "unknown-row";
    tr.innerHTML = `
      <td>${escapeHtml(point.pointNo)}</td>
      <td>${format(point.easting, 3)}</td>
      <td>${format(point.northing, 3)}</td>
      <td>${Number.isFinite(point.elevation) ? format(point.elevation, 3) : ""}</td>
      <td>${escapeHtml(point.code)}</td>
      <td><span class="type-pill type-${point.rule.type}">${labelType(point.rule.type)}</span>${clusteredPointIds.has(point.pointNo) ? " cluster" : ""}</td>
    `;
    el.pointTable.appendChild(tr);
  });
}

function groupLinePoints() {
  const groups = new Map();
  classified
    .filter(p => ["line", "closed"].includes(p.rule.type))
    .forEach(point => {
      const key = `${point.code}|${point.rule.type}|${point.rule.layer}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(point);
    });
  return Array.from(groups.entries()).map(([key, group]) => ({ key, group: group.sort(pointSort) }));
}

function getFenceAreas() {
  return groupLinePoints()
    .filter(({ group }) => group.length >= 3 && ["EF", "PF"].includes(baseCode(group[0].code)))
    .map(({ group }) => {
      const areaSqm = polygonArea(group);
      return {
        code: group[0].code,
        layer: group[0].rule.layer,
        group,
        areaSqm,
        hectares: areaSqm / 10000
      };
    })
    .sort((a, b) => b.areaSqm - a.areaSqm)
    .slice(0, 2);
}

function polygonArea(group) {
  let sum = 0;
  for (let i = 0; i < group.length; i++) {
    const a = group[i];
    const b = group[(i + 1) % group.length];
    sum += a.easting * b.northing - b.easting * a.northing;
  }
  return Math.abs(sum) / 2;
}

function baseCode(code) {
  const match = String(code || "").match(/^[A-Z]+/);
  return match ? match[0] : String(code || "");
}

function pointSort(a, b) {
  const an = pointOrderNumber(a.pointNo);
  const bn = pointOrderNumber(b.pointNo);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a.pointNo).localeCompare(String(b.pointNo));
}

function pointOrderNumber(value) {
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const match = String(value || "").match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : Number.NaN;
}

function renderPlot() {
  const svg = el.plotSvg;
  svg.innerHTML = "";
  currentProjection = null;
  if (!classified.length) {
    svg.setAttribute("viewBox", "0 0 1000 600");
    svg.innerHTML = `<text x="500" y="300" text-anchor="middle" fill="#60716b">Load survey data to plot points and linework</text>`;
    return;
  }

  const xs = classified.map(p => p.easting);
  const ys = classified.map(p => p.northing);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const canvasW = 1200;
  const canvasH = 760;
  const pad = 58;
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const scale = Math.min((canvasW - pad * 2) / width, (canvasH - pad * 2) / height);
  currentProjection = {
    minX,
    maxX,
    minY,
    maxY,
    canvasW,
    canvasH,
    pad,
    scale,
    x: easting => pad + (easting - minX) * scale,
    y: northing => canvasH - pad - (northing - minY) * scale
  };
  svg.setAttribute("viewBox", `0 0 ${canvasW} ${canvasH}`);

  if (showGrid) drawGrid(svg, currentProjection);

  for (const area of getFenceAreas()) {
    const pointsAttr = area.group.map(p => `${currentProjection.x(p.easting)},${currentProjection.y(p.northing)}`).join(" ");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", pointsAttr);
    poly.setAttribute("class", `fence-area area-${baseCode(area.code).toLowerCase()}`);
    svg.appendChild(poly);
    const center = polygonCentroid(area.group);
    const text = svgNode("text", { x: currentProjection.x(center.x), y: currentProjection.y(center.y), class: "area-label", "text-anchor": "middle" });
    text.textContent = `${area.code} ${format(area.hectares, 4)} ha`;
    svg.appendChild(text);
  }

  for (const area of getInstructionAreas()) {
    if (area.group.length < 2) continue;
    const pointsAttr = area.group.map(p => `${currentProjection.x(p.easting)},${currentProjection.y(p.northing)}`).join(" ");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", pointsAttr);
    poly.setAttribute("class", "instruction-area");
    svg.appendChild(poly);
    const first = area.group[0];
    const text = svgNode("text", { x: currentProjection.x(first.easting) + 8, y: currentProjection.y(first.northing) + 18, class: "line-label" });
    text.textContent = `${area.code} AREA`;
    svg.appendChild(text);
  }

  for (const { group } of groupLinePoints()) {
    if (group.length < 2) continue;
    const isClosed = group[0].rule.type === "closed";
    const pointsAttr = group.map(p => `${currentProjection.x(p.easting)},${currentProjection.y(p.northing)}`).join(" ");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", isClosed && el.closePolygons.checked ? "polygon" : "polyline");
    poly.setAttribute("points", pointsAttr);
    poly.setAttribute("class", lineClass(group[0], isClosed));
    svg.appendChild(poly);
    drawLineLabels(svg, group);
  }

  pointFeatures
    .filter(feature => !["line", "closed"].includes(feature.rule.type))
    .forEach(feature => drawPointFeature(svg, feature));

  drawNorthArrow(svg);
  drawLegend(svg);
}

function polygonCentroid(group) {
  const x = group.reduce((sum, point) => sum + point.easting, 0) / group.length;
  const y = group.reduce((sum, point) => sum + point.northing, 0) / group.length;
  return { x, y };
}

function lineClass(point, isClosed) {
  const base = baseCode(point.code).toLowerCase();
  const prefixClass = ["ef", "pf", "cf", "rc"].includes(base) ? ` line-${base}` : "";
  return `${isClosed ? "closed-feature" : "line-feature"}${prefixClass}`;
}

function drawGrid(svg, projection) {
  const { minX, maxX, minY, maxY } = projection;
  const span = Math.max(maxX - minX, maxY - minY);
  const step = niceStep(span / 8);
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const startX = Math.floor(minX / step) * step;
  const endX = Math.ceil(maxX / step) * step;
  const startY = Math.floor(minY / step) * step;
  const endY = Math.ceil(maxY / step) * step;
  for (let x = startX; x <= endX; x += step) {
    const line = svgNode("line", { x1: projection.x(x), y1: projection.y(minY), x2: projection.x(x), y2: projection.y(maxY), class: "grid-line" });
    g.appendChild(line);
    const label = svgNode("text", { x: projection.x(x) + 4, y: projection.canvasH - 18, class: "axis-label" });
    label.textContent = format(x, 0);
    g.appendChild(label);
  }
  for (let y = startY; y <= endY; y += step) {
    const line = svgNode("line", { x1: projection.x(minX), y1: projection.y(y), x2: projection.x(maxX), y2: projection.y(y), class: "grid-line" });
    g.appendChild(line);
    const label = svgNode("text", { x: 12, y: projection.y(y) - 4, class: "axis-label" });
    label.textContent = format(y, 0);
    g.appendChild(label);
  }
  drawGridCrosses(svg, projection);
  svg.appendChild(g);
}

function drawGridCrosses(svg, projection) {
  const points = [
    [projection.pad, projection.pad],
    [projection.canvasW / 2, projection.pad],
    [projection.canvasW - projection.pad, projection.pad],
    [projection.pad, projection.canvasH / 2],
    [projection.canvasW - projection.pad, projection.canvasH / 2],
    [projection.pad, projection.canvasH - projection.pad],
    [projection.canvasW / 2, projection.canvasH - projection.pad],
    [projection.canvasW - projection.pad, projection.canvasH - projection.pad]
  ];
  points.forEach(([x, y]) => {
    svg.appendChild(svgNode("line", { x1: x - 11, y1: y, x2: x + 11, y2: y, class: "grid-cross" }));
    svg.appendChild(svgNode("line", { x1: x, y1: y - 11, x2: x, y2: y + 11, class: "grid-cross" }));
  });
}

function niceStep(value) {
  const exponent = Math.floor(Math.log10(value || 1));
  const fraction = value / Math.pow(10, exponent);
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * Math.pow(10, exponent);
}

function drawPointFeature(svg, feature) {
  const g = svgNode("g", {});
  const point = feature.points[0];
  const x = currentProjection.x(feature.x);
  const y = currentProjection.y(feature.y);
  if (feature.instructionSymbol?.symbol === "BOREHOLE" || feature.instructionSymbol?.symbol === "BH" || ["BH", "EBH"].includes(feature.code)) {
    g.appendChild(svgNode("circle", { cx: x, cy: y, r: 7, class: "borehole-symbol" }));
    g.appendChild(svgNode("circle", { cx: x, cy: y, r: 2.2, fill: "#b6422b" }));
    g.appendChild(svgNode("line", { x1: x - 10, y1: y, x2: x + 10, y2: y, class: "borehole-symbol" }));
    g.appendChild(svgNode("line", { x1: x, y1: y - 10, x2: x, y2: y + 10, class: "borehole-symbol" }));
  } else if (feature.instructionSymbol) {
    g.appendChild(svgNode("rect", { x: x - 6, y: y - 6, width: 12, height: 12, transform: `rotate(45 ${x} ${y})`, class: "borehole-symbol" }));
  } else if (feature.code === "PALMTREE") {
    drawPalmTreeSymbol(g, x, y);
  } else if (feature.code === "SL") {
    drawStreetLightSymbol(g, x, y);
  } else if (feature.code === "TMH") {
    drawTelecomManholeSymbol(g, x, y);
  } else if (feature.code === "EB") {
    drawElectricalBoxSymbol(g, x, y);
  } else if (["BM", "REF"].includes(feature.code)) {
    drawBenchmarkSymbol(g, x, y);
  } else if (point.rule.type === "unknown") {
    g.appendChild(svgNode("rect", { x: x - 4, y: y - 4, width: 8, height: 8, fill: "#777" }));
  } else if (point.code === "BM") {
    g.appendChild(svgNode("path", { d: `M ${x - 7} ${y} L ${x + 7} ${y} M ${x} ${y - 7} L ${x} ${y + 7}`, class: "point-symbol" }));
  } else {
    g.appendChild(svgNode("circle", { cx: x, cy: y, r: 4, class: "point-dot" }));
  }
  const labelParts = [feature.code];
  if (feature.kind === "cluster") labelParts.push(`x${feature.points.length}`);
  if (el.showPointNumbers.checked) labelParts.push(feature.kind === "cluster" ? feature.points.map(item => item.pointNo).join("/") : `#${point.pointNo}`);
  if (el.showElevations.checked && Number.isFinite(feature.z)) labelParts.push(`RL ${format(feature.z, 2)}`);
  const text = svgNode("text", { x: x + 8, y: y - 8, class: "pt-label" });
  text.textContent = labelParts.join(" ");
  g.appendChild(text);
  svg.appendChild(g);
}

function drawBenchmarkSymbol(g, x, y) {
  g.appendChild(svgNode("circle", { cx: x, cy: y, r: 7, class: "benchmark-symbol" }));
  g.appendChild(svgNode("line", { x1: x - 11, y1: y, x2: x + 11, y2: y, class: "benchmark-symbol" }));
  g.appendChild(svgNode("line", { x1: x, y1: y - 11, x2: x, y2: y + 11, class: "benchmark-symbol" }));
  const text = svgNode("text", { x, y: y + 4, class: "benchmark-text", "text-anchor": "middle" });
  text.textContent = "BM";
  g.appendChild(text);
}

function drawPalmTreeSymbol(g, x, y) {
  g.appendChild(svgNode("circle", { cx: x, cy: y, r: 4, class: "tree-symbol" }));
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    g.appendChild(svgNode("line", {
      x1: x,
      y1: y,
      x2: x + Math.cos(angle) * 13,
      y2: y + Math.sin(angle) * 13,
      class: "tree-symbol"
    }));
  }
}

function drawStreetLightSymbol(g, x, y) {
  g.appendChild(svgNode("circle", { cx: x, cy: y, r: 4, class: "streetlight-symbol" }));
  g.appendChild(svgNode("line", { x1: x, y1: y + 4, x2: x, y2: y - 17, class: "streetlight-symbol" }));
  g.appendChild(svgNode("path", { d: `M ${x} ${y - 17} Q ${x + 12} ${y - 20} ${x + 16} ${y - 10}`, class: "streetlight-symbol" }));
  g.appendChild(svgNode("circle", { cx: x + 16, cy: y - 9, r: 3, class: "streetlight-lamp" }));
}

function drawTelecomManholeSymbol(g, x, y) {
  g.appendChild(svgNode("rect", { x: x - 11, y: y - 8, width: 22, height: 16, rx: 3, class: "tmh-symbol" }));
  g.appendChild(svgNode("line", { x1: x - 8, y1: y, x2: x + 8, y2: y, class: "tmh-symbol" }));
  const text = svgNode("text", { x, y: y + 4, class: "symbol-text", "text-anchor": "middle" });
  text.textContent = "T";
  g.appendChild(text);
}

function drawElectricalBoxSymbol(g, x, y) {
  g.appendChild(svgNode("rect", { x: x - 10, y: y - 10, width: 20, height: 20, class: "eb-symbol" }));
  g.appendChild(svgNode("path", { d: `M ${x - 1} ${y - 8} L ${x - 7} ${y + 1} L ${x + 1} ${y + 1} L ${x - 2} ${y + 9} L ${x + 8} ${y - 3} L ${x + 1} ${y - 3} Z`, class: "eb-bolt" }));
}

function drawLineLabels(svg, group) {
  if (el.lineLabelMode.value === "none") return;
  const targets = el.lineLabelMode.value === "all" ? group : [group[0]];
  targets.forEach(point => {
    const text = svgNode("text", { x: currentProjection.x(point.easting) + 8, y: currentProjection.y(point.northing) - 8, class: "line-label" });
    const label = el.lineLabelMode.value === "all" ? `${point.code} #${point.pointNo}` : `${point.code} LINE`;
    text.textContent = label;
    svg.appendChild(text);
  });
}

function drawNorthArrow(svg) {
  const x = currentProjection.canvasW - 86;
  const y = 96;
  const g = svgNode("g", {});
  g.appendChild(svgNode("line", { x1: x, y1: y + 48, x2: x, y2: y - 22, class: "north-arrow" }));
  g.appendChild(svgNode("path", { d: `M ${x} ${y - 36} L ${x - 14} ${y - 8} L ${x} ${y - 18} L ${x + 14} ${y - 8} Z`, class: "north-arrow-head" }));
  const text = svgNode("text", { x, y: y - 45, class: "north-label", "text-anchor": "middle" });
  text.textContent = "N";
  g.appendChild(text);
  svg.appendChild(g);
}

function drawLegend(svg) {
  const items = [
    ["Existing Fence", "legend-ef"],
    ["Proposed Fence", "legend-pf"],
    ["Corrected Fence", "legend-cf"],
    ["Road Centre", "legend-rc"],
    ["Borehole", "legend-bh"],
    ["Palm Tree", "legend-tree"],
    ["Street Light", "legend-sl"],
    ["Telecom MH", "legend-tmh"],
    ["Electrical Box", "legend-eb"],
    ["Benchmark", "legend-bm"]
  ];
  const x = 24;
  const y = 26;
  const rowH = 22;
  const width = 190;
  const height = 34 + items.length * rowH;
  const g = svgNode("g", {});
  g.appendChild(svgNode("rect", { x, y, width, height, class: "legend-box" }));
  const title = svgNode("text", { x: x + 10, y: y + 20, class: "legend-title" });
  title.textContent = "Legend";
  g.appendChild(title);
  items.forEach((item, index) => {
    const yy = y + 42 + index * rowH;
    drawLegendSwatch(g, x + 18, yy - 5, item[1]);
    const text = svgNode("text", { x: x + 42, y: yy, class: "legend-text" });
    text.textContent = item[0];
    g.appendChild(text);
  });
  svg.appendChild(g);
}

function drawLegendSwatch(g, x, y, type) {
  if (["legend-ef", "legend-pf", "legend-cf", "legend-rc"].includes(type)) {
    const className = {
      "legend-ef": "line-feature line-ef",
      "legend-pf": "line-feature line-pf",
      "legend-cf": "line-feature line-cf",
      "legend-rc": "line-feature line-rc"
    }[type];
    g.appendChild(svgNode("line", { x1: x - 8, y1: y, x2: x + 12, y2: y, class: className }));
  } else if (type === "legend-bh") {
    g.appendChild(svgNode("circle", { cx: x, cy: y, r: 6, class: "borehole-symbol" }));
  } else if (type === "legend-tree") {
    drawPalmTreeSymbol(g, x, y);
  } else if (type === "legend-sl") {
    drawStreetLightSymbol(g, x, y + 8);
  } else if (type === "legend-tmh") {
    drawTelecomManholeSymbol(g, x, y);
  } else if (type === "legend-eb") {
    drawElectricalBoxSymbol(g, x, y);
  } else if (type === "legend-bm") {
    drawBenchmarkSymbol(g, x, y);
  }
}

function renderLog() {
  const entries = [];
  const pointGroups = new Map();
  pointFeatures
    .filter(feature => ["point", "label", "unknown"].includes(feature.rule.type))
    .forEach(feature => {
      const key = `${feature.code}|${feature.rule.type}|${feature.layer}`;
      if (!pointGroups.has(key)) pointGroups.set(key, []);
      pointGroups.get(key).push(feature);
    });
  for (const group of pointGroups.values()) {
    const first = group[0];
    const rawPointCount = group.reduce((sum, feature) => sum + feature.points.length, 0);
    const clusterText = rawPointCount === group.length ? "" : ` from ${rawPointCount} raw shot(s)`;
    entries.push({
      type: labelType(first.rule.type),
      text: `${first.code}: ${group.length} symbol(s) plotted${clusterText} on ${first.layer}`
    });
  }
  for (const { group } of groupLinePoints()) {
    const first = group[0];
    entries.push({
      type: labelType(first.rule.type),
      text: `${first.code}: ${group.length} vertex line plotted on ${first.rule.layer}`
    });
  }
  for (const area of getFenceAreas()) {
    entries.push({
      type: "Closed",
      text: `${area.code}: one of the 2 biggest EF/PF areas, ${format(area.hectares, 4)} ha on ${area.layer}`
    });
  }
  for (const area of getInstructionAreas()) {
    entries.push({
      type: "Closed",
      text: area.group.length >= 2
        ? `${area.code}: instruction created area boundary with ${area.group.length} point(s) on ${area.layer}`
        : `${area.code}: instruction needs at least 2 points to create an area`
    });
  }
  for (const symbol of instructionRules.symbols) {
    const count = classified.filter(point => point.instructionSymbol === symbol).length;
    entries.push({
      type: "Point",
      text: `${symbol.code}: instruction plots ${count} point(s) as ${symbol.symbol} on ${symbol.layer}`
    });
  }
  el.plotLog.innerHTML = entries.length
    ? entries.map(entry => `<div class="log-entry"><span class="type-pill type-${entry.type.toLowerCase().replace(" ", "")}">${entry.type}</span><span>${escapeHtml(entry.text)}</span></div>`).join("")
    : `<div class="hint">No plotted features yet.</div>`;
}

function exportSvg() {
  const clone = el.plotSvg.cloneNode(true);
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    .point-dot{fill:#285f9f;stroke:#fff;stroke-width:2}
    .point-symbol{fill:none;stroke:#285f9f;stroke-width:2}
    .line-feature{fill:none;stroke:#146b59;stroke-width:2.6}
    .line-ef{stroke:#1f7a35}
    .line-pf{stroke:#d22f27;stroke-dasharray:10 5}
    .line-cf{stroke:#7b3fb2;stroke-dasharray:4 4}
    .line-rc{stroke:#f0a000;stroke-dasharray:14 5 4 5}
    .closed-feature{fill:rgba(182,66,43,.08);stroke:#b6422b;stroke-width:2.6}
    .fence-area{stroke-width:2}
    .area-ef{fill:rgba(31,122,53,.13);stroke:#1f7a35}
    .area-pf{fill:rgba(210,47,39,.11);stroke:#d22f27}
    .instruction-area{fill:rgba(40,95,159,.1);stroke:#285f9f;stroke-width:2.8;stroke-dasharray:8 5}
    .borehole-symbol{fill:#fff;stroke:#b6422b;stroke-width:2.4}
    .benchmark-symbol{fill:#fff;stroke:#111;stroke-width:2.2}
    .benchmark-text{fill:#111;stroke:none;font-size:7px;font-weight:700;font-family:Arial,Helvetica,sans-serif}
    .tree-symbol{fill:#e8f5e9;stroke:#237a3b;stroke-width:2.4;stroke-linecap:round}
    .streetlight-symbol{fill:none;stroke:#6c5a00;stroke-width:2.4;stroke-linecap:round}
    .streetlight-lamp{fill:#ffd45c;stroke:#6c5a00;stroke-width:2}
    .tmh-symbol{fill:#eef1ff;stroke:#3949ab;stroke-width:2.4}
    .eb-symbol{fill:#fff7d6;stroke:#8a5a00;stroke-width:2.4}
    .eb-bolt{fill:#e0a000;stroke:#8a5a00;stroke-width:1.4}
    .symbol-text{fill:#3949ab;stroke:none;font-size:12px;font-weight:700;font-family:Arial,Helvetica,sans-serif}
    .grid-line{stroke:#e7ece9;stroke-width:1}
    .grid-cross{stroke:#17211d;stroke-width:1.4}
    .pt-label,.line-label,.area-label{fill:#1d2a25;font-size:11px;font-family:Arial,Helvetica,sans-serif;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}
    .line-label{font-weight:700}
    .area-label{font-size:13px;font-weight:700}
    .north-arrow{stroke:#111;stroke-width:3}
    .north-arrow-head{fill:#111}
    .north-label{fill:#111;font-size:22px;font-weight:700;font-family:Arial,Helvetica,sans-serif}
    .legend-box{fill:rgba(255,255,255,.92);stroke:#cbd5d0;stroke-width:1.2}
    .legend-title{fill:#17211d;font-size:13px;font-weight:700;font-family:Arial,Helvetica,sans-serif}
    .legend-text{fill:#17211d;font-size:11px;font-family:Arial,Helvetica,sans-serif}
  `;
  clone.insertBefore(style, clone.firstChild);
  const svgText = `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
  download("topo-survey-plot.svg", "image/svg+xml", svgText);
}

function exportCleanCsv() {
  const header = "PointNo,Easting,Northing,Elevation,RawCode,CleanCode,PlotType,Layer,InstructionSymbol";
  const rows = classified.map(p => [
    p.pointNo,
    p.easting,
    p.northing,
    Number.isFinite(p.elevation) ? p.elevation : "",
    p.rawCode,
    p.code,
    p.rule.type,
    p.rule.layer,
    p.instructionSymbol?.symbol || ""
  ].map(csvEscape).join(","));
  download("topo-survey-cleaned.csv", "text/csv", [header, ...rows].join("\n"));
}

function exportDxf() {
  const lines = buildDxfHeader();
  lines.push("0", "SECTION", "2", "ENTITIES");
  addDxfGridCrosses(lines);
  for (const area of getFenceAreas()) {
    if (area.group.length < 3) continue;
    addDxfPolyline(lines, area.layer, area.group, true);
    const center = polygonCentroid(area.group);
    addDxfText(lines, area.layer, center.x, center.y, 0, `${area.code} ${format(area.hectares, 4)} ha`, dxfTextSize() * 1.5);
  }
  for (const area of getInstructionAreas()) {
    if (area.group.length < 2) continue;
    addDxfPolyline(lines, area.layer, area.group, true);
  }
  for (const { group } of groupLinePoints()) {
    if (group.length < 2) continue;
    addDxfPolyline(lines, group[0].rule.layer, group, group[0].rule.type === "closed" && el.closePolygons.checked);
  }
  pointFeatures.filter(feature => !["line", "closed"].includes(feature.rule.type)).forEach(feature => {
    lines.push("0", "POINT", "8", feature.layer, "62", String(layerColor(feature.layer)), "10", String(dxfX(feature.x)), "20", String(dxfY(feature.y)), "30", String(feature.z || 0));
    addDxfSymbol(lines, feature);
    addDxfText(lines, feature.layer, feature.x + dxfSymbolSize() * 0.8, feature.y + dxfSymbolSize() * 0.8, feature.z || 0, `${feature.code} ${feature.kind === "cluster" ? feature.points.map(p => p.pointNo).join("/") : feature.points[0].pointNo} RL ${format(feature.z, 2)}`, dxfTextSize());
  });
  addDxfNorthArrow(lines);
  addDxfLegend(lines);
  lines.push("0", "ENDSEC", "0", "EOF");
  download("topo-survey-plot.dxf", "application/dxf", lines.join("\n"));
}

function buildDxfHeader() {
  const layers = collectDxfLayers();
  const lines = [
    "0", "SECTION", "2", "HEADER",
    "9", "$ACADVER", "1", "AC1009",
    "0", "ENDSEC",
    "0", "SECTION", "2", "TABLES",
    "0", "TABLE", "2", "LAYER", "70", String(layers.length)
  ];
  layers.forEach(layer => {
    lines.push("0", "LAYER", "2", layer, "70", "0", "62", String(layerColor(layer)), "6", "CONTINUOUS");
  });
  lines.push("0", "ENDTAB", "0", "ENDSEC");
  return lines;
}

function collectDxfLayers() {
  const layerSet = new Set(["0", "TOPO-LEGEND", "TOPO-NORTH-ARROW", "TOPO-GRID"]);
  codes.forEach(code => layerSet.add(code.layer));
  instructionRules.areas.forEach(rule => layerSet.add(rule.layer));
  instructionRules.symbols.forEach(rule => layerSet.add(rule.layer));
  pointFeatures.forEach(feature => layerSet.add(feature.layer));
  getFenceAreas().forEach(area => layerSet.add(area.layer));
  return Array.from(layerSet).filter(Boolean).sort();
}

function layerColor(layer) {
  if (/EXISTING|TOPO-FENCE$/.test(layer)) return 3;
  if (/PROPOSED/.test(layer)) return 1;
  if (/CORRECTED/.test(layer)) return 6;
  if (/ROAD-CENTRE|ROAD-EDGE/.test(layer)) return 2;
  if (/BOREHOLE/.test(layer)) return 30;
  if (/TREES/.test(layer)) return 94;
  if (/STREETLIGHT/.test(layer)) return 51;
  if (/TMH/.test(layer)) return 5;
  if (/TOPO-EB|ELECTR/.test(layer)) return 34;
  if (/BM|CONTROL/.test(layer)) return 7;
  if (/GRID/.test(layer)) return 8;
  if (/LEGEND|NORTH/.test(layer)) return 7;
  if (/UNKNOWN/.test(layer)) return 8;
  return 7;
}

function addDxfPolyline(lines, layer, group, closed) {
  lines.push("0", "POLYLINE", "8", layer, "62", String(layerColor(layer)), "66", "1", "70", closed ? "1" : "0");
  group.forEach(p => lines.push("0", "VERTEX", "8", layer, "62", String(layerColor(layer)), "10", String(dxfX(p.easting)), "20", String(dxfY(p.northing)), "30", String(p.elevation || 0)));
  lines.push("0", "SEQEND", "8", layer);
}

function dxfX(value) {
  return el.invertDxfCoords.checked ? -Number(value) : Number(value);
}

function dxfY(value) {
  return el.invertDxfCoords.checked ? -Number(value) : Number(value);
}

function dxfBounds() {
  const source = classified.length ? classified : points;
  if (!source.length) return { minX: 0, maxX: 100, minY: 0, maxY: 100, span: 100 };
  const xs = source.map(point => dxfX(point.easting));
  const ys = source.map(point => dxfY(point.northing));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, span: Math.max(maxX - minX, maxY - minY, 1) };
}

function dxfSymbolSize() {
  return Math.max(2.5, Math.min(18, dxfBounds().span / 160));
}

function dxfTextSize() {
  return Math.max(1.3, dxfSymbolSize() * 0.55);
}

function addDxfLine(lines, layer, x1, y1, x2, y2, z = 0) {
  lines.push("0", "LINE", "8", layer, "62", String(layerColor(layer)), "10", String(x1), "20", String(y1), "30", String(z), "11", String(x2), "21", String(y2), "31", String(z));
}

function addDxfCircle(lines, layer, x, y, z, radius) {
  lines.push("0", "CIRCLE", "8", layer, "62", String(layerColor(layer)), "10", String(x), "20", String(y), "30", String(z), "40", String(radius));
}

function addDxfText(lines, layer, x, y, z, value, height = dxfTextSize()) {
  lines.push("0", "TEXT", "8", layer, "62", String(layerColor(layer)), "10", String(dxfX(x)), "20", String(dxfY(y)), "30", String(z || 0), "40", String(height), "1", String(value));
}

function addDxfSymbol(lines, feature) {
  const x = dxfX(feature.x);
  const y = dxfY(feature.y);
  const z = feature.z || 0;
  const layer = feature.layer;
  const s = dxfSymbolSize();
  if (feature.instructionSymbol?.symbol === "BOREHOLE" || feature.instructionSymbol?.symbol === "BH" || ["BH", "EBH"].includes(feature.code)) {
    addDxfCircle(lines, layer, x, y, z, s * 0.55);
    addDxfCircle(lines, layer, x, y, z, s * 0.15);
    addDxfLine(lines, layer, x - s * 0.85, y, x + s * 0.85, y, z);
    addDxfLine(lines, layer, x, y - s * 0.85, x, y + s * 0.85, z);
  } else if (feature.code === "PALMTREE") {
    addDxfCircle(lines, layer, x, y, z, s * 0.35);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      addDxfLine(lines, layer, x, y, x + Math.cos(angle) * s, y + Math.sin(angle) * s, z);
    }
  } else if (feature.code === "SL") {
    addDxfCircle(lines, layer, x, y, z, s * 0.25);
    addDxfLine(lines, layer, x, y, x, y + s * 1.25, z);
    addDxfLine(lines, layer, x, y + s * 1.25, x + s * 0.85, y + s, z);
    addDxfCircle(lines, layer, x + s * 0.95, y + s * 0.9, z, s * 0.2);
  } else if (feature.code === "TMH") {
    addDxfRectangle(lines, layer, x, y, z, s * 1.5, s);
    addDxfLine(lines, layer, x - s * 0.55, y, x + s * 0.55, y, z);
    lines.push("0", "TEXT", "8", layer, "62", String(layerColor(layer)), "10", String(x - s * 0.15), "20", String(y - s * 0.18), "30", String(z), "40", String(s * 0.45), "1", "T");
  } else if (feature.code === "EB") {
    addDxfRectangle(lines, layer, x, y, z, s * 1.2, s * 1.2);
    addDxfLine(lines, layer, x - s * 0.25, y + s * 0.45, x - s * 0.55, y, z);
    addDxfLine(lines, layer, x - s * 0.55, y, x, y, z);
    addDxfLine(lines, layer, x, y, x - s * 0.15, y - s * 0.5, z);
    addDxfLine(lines, layer, x - s * 0.15, y - s * 0.5, x + s * 0.55, y + s * 0.15, z);
  } else if (["BM", "REF"].includes(feature.code)) {
    addDxfCircle(lines, layer, x, y, z, s * 0.55);
    addDxfLine(lines, layer, x - s * 0.8, y, x + s * 0.8, y, z);
    addDxfLine(lines, layer, x, y - s * 0.8, x, y + s * 0.8, z);
  }
}

function addDxfRectangle(lines, layer, x, y, z, w, h) {
  const left = x - w / 2;
  const right = x + w / 2;
  const bottom = y - h / 2;
  const top = y + h / 2;
  [[left, bottom, right, bottom], [right, bottom, right, top], [right, top, left, top], [left, top, left, bottom]].forEach(([x1, y1, x2, y2]) => {
    addDxfLine(lines, layer, x1, y1, x2, y2, z);
  });
}

function addDxfNorthArrow(lines) {
  const b = dxfBounds();
  const layer = "TOPO-NORTH-ARROW";
  const s = dxfSymbolSize() * 3;
  const x = b.maxX - b.span * 0.08;
  const y = b.maxY - b.span * 0.08;
  addDxfLine(lines, layer, x, y - s * 0.8, x, y + s * 0.8);
  addDxfLine(lines, layer, x, y + s * 0.8, x - s * 0.32, y + s * 0.25);
  addDxfLine(lines, layer, x, y + s * 0.8, x + s * 0.32, y + s * 0.25);
  addDxfTextRaw(lines, layer, x - s * 0.15, y + s * 1.05, 0, "N", dxfTextSize() * 2);
}

function addDxfLegend(lines) {
  const b = dxfBounds();
  const layer = "TOPO-LEGEND";
  const s = dxfSymbolSize();
  const x = b.minX + b.span * 0.04;
  const y = b.maxY - b.span * 0.05;
  const row = s * 1.45;
  const items = [
    ["Existing Fence", "TOPO-FENCE-EXISTING", "line"],
    ["Proposed Fence", "TOPO-FENCE-PROPOSED", "line"],
    ["Corrected Fence", "TOPO-FENCE-CORRECTED", "line"],
    ["Road Centre", "TOPO-ROAD-CENTRE", "line"],
    ["Borehole", "TOPO-BOREHOLE", "borehole"],
    ["Palm Tree", "TOPO-TREES", "tree"],
    ["Street Light", "TOPO-STREETLIGHT", "streetlight"],
    ["Telecom MH", "TOPO-TMH", "tmh"],
    ["Electrical Box", "TOPO-EB", "eb"],
    ["Benchmark", "TOPO-BM", "bm"]
  ];
  addDxfTextRaw(lines, layer, x, y, 0, "LEGEND", dxfTextSize() * 1.25);
  items.forEach((item, index) => {
    const yy = y - row * (index + 1);
    const swatchLayer = item[1];
    if (item[2] === "line") {
      addDxfLine(lines, swatchLayer, x, yy, x + s * 2.4, yy);
    } else {
      addDxfLegendSymbol(lines, swatchLayer, item[2], x + s, yy, s * 0.7);
    }
    addDxfTextRaw(lines, layer, x + s * 3.1, yy - s * 0.2, 0, item[0], dxfTextSize());
  });
}

function addDxfLegendSymbol(lines, layer, type, x, y, s) {
  const feature = { code: "", layer, x: 0, y: 0, z: 0, points: [], rule: { type: "point" } };
  if (type === "borehole") feature.code = "BH";
  if (type === "tree") feature.code = "PALMTREE";
  if (type === "streetlight") feature.code = "SL";
  if (type === "tmh") feature.code = "TMH";
  if (type === "eb") feature.code = "EB";
  if (type === "bm") feature.code = "BM";
  addDxfSymbolAt(lines, feature, x, y, s);
}

function addDxfSymbolAt(lines, feature, x, y, s) {
  const originalX = feature.x;
  const originalY = feature.y;
  feature.x = el.invertDxfCoords.checked ? -x : x;
  feature.y = el.invertDxfCoords.checked ? -y : y;
  const oldSize = dxfSymbolSize;
  addDxfSymbol(lines, feature);
  feature.x = originalX;
  feature.y = originalY;
}

function addDxfGridCrosses(lines) {
  const b = dxfBounds();
  const layer = "TOPO-GRID";
  const s = dxfSymbolSize() * 0.8;
  const points = [
    [b.minX, b.minY], [(b.minX + b.maxX) / 2, b.minY], [b.maxX, b.minY],
    [b.minX, (b.minY + b.maxY) / 2], [b.maxX, (b.minY + b.maxY) / 2],
    [b.minX, b.maxY], [(b.minX + b.maxX) / 2, b.maxY], [b.maxX, b.maxY]
  ];
  points.forEach(([x, y]) => {
    addDxfLine(lines, layer, x - s, y, x + s, y);
    addDxfLine(lines, layer, x, y - s, x, y + s);
  });
}

function addDxfTextRaw(lines, layer, x, y, z, value, height = dxfTextSize()) {
  lines.push("0", "TEXT", "8", layer, "62", String(layerColor(layer)), "10", String(x), "20", String(y), "30", String(z || 0), "40", String(height), "1", String(value));
}

function download(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function svgNode(name, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function labelType(type) {
  return { point: "Point", line: "Line", closed: "Closed", label: "Label", unknown: "Unknown" }[type] || type;
}

function format(value, decimals) {
  return Number(value).toFixed(decimals);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

el.fileInput.addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  points = parseCsv(await file.text());
  refresh();
});

el.sampleBtn.addEventListener("click", () => {
  points = parseCsv(sampleCsv);
  refresh();
});

el.codeForm.addEventListener("submit", event => {
  event.preventDefault();
  const item = {
    pattern: cleanCode(el.codeInput.value).replace(/\*$/, "") + (el.codeInput.value.trim().endsWith("*") ? "*" : ""),
    type: el.typeInput.value,
    layer: el.layerInput.value.trim().toUpperCase() || "TOPO-CUSTOM",
    desc: el.descInput.value.trim() || "Custom code"
  };
  codes = codes.filter(code => code.pattern !== item.pattern);
  codes.push(item);
  saveCodes();
  el.codeForm.reset();
  refresh();
});

el.resetCodesBtn.addEventListener("click", () => {
  codes = structuredClone(builtInCodes);
  saveCodes();
  refresh();
});

el.applyInstructionsBtn.addEventListener("click", () => {
  saveInstructions();
  refresh();
});

el.instructionInput.addEventListener("change", () => {
  saveInstructions();
  refresh();
});

[el.matchMode, el.lineLabelMode, el.showPointNumbers, el.showElevations, el.closePolygons, el.invertDxfCoords].forEach(input => {
  input.addEventListener("change", refresh);
});

el.zoomFitBtn.addEventListener("click", renderPlot);
el.toggleGridBtn.addEventListener("click", () => {
  showGrid = !showGrid;
  renderPlot();
});
el.exportSvgBtn.addEventListener("click", exportSvg);
el.exportDxfBtn.addEventListener("click", exportDxf);
el.exportCsvBtn.addEventListener("click", exportCleanCsv);

refresh();
