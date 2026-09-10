import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "D:/market engineering/outputs/step2b-pilot-20260911/step2b-hiring-signal-pilot.xlsx";
const evidencePath = "D:/market engineering/outputs/step2b-pilot-20260911/step3a-agentmuxer-evidence.local.json";
const previewDir = "C:/Users/GHOST PROTOCOL/.codex/visualizations/2026/09/10/01a08ccc-bbc9-7800-8615-7d3cac0f4812";
const evidence = JSON.parse(await fs.readFile(evidencePath, "utf8"));
const observedAt = new Date("2026-09-11T00:00:00Z");

const fillForPriority = { HIGH: "#E2F0D9", MEDIUM: "#DDEBF7", LOW: "#F2F2F2", HOLD: "#FFF2CC" };
const fontForPriority = { HIGH: "#38761D", MEDIUM: "#1F4E78", LOW: "#666666", HOLD: "#9C6500" };

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const review = workbook.worksheets.getItem("Review Queue");
const signals = workbook.worksheets.getItem("Signal Evidence");
const methodology = workbook.worksheets.getItem("Methodology & Sources");

review.getRange("Y2").values = [["Step 3A AgentMuxer re-verification"]];
review.getRange("Y3").values = [["Additive evidence from AgentMuxer. Existing Step 2B facts and human_review remain unchanged. Revised priority may be HIGH, MEDIUM, LOW, or HOLD."]];
review.getRange("Y5:AB5").values = [["Revised HIGH", "Revised MEDIUM", "Revised LOW", "HOLD"]];
review.getRange("Y6:AB6").formulas = [[
  '=COUNTIF(AI8:AI17,"HIGH")',
  '=COUNTIF(AI8:AI17,"MEDIUM")',
  '=COUNTIF(AI8:AI17,"LOW")',
  '=COUNTIF(AI8:AI17,"HOLD")',
]];
review.getRange("Y7:AK7").values = [[
  "Company", "TheirStack job title", "Posted date", "Jobs last 30d", "TheirStack employees", "Deepline employees", "AgentMuxer source URL", "AgentMuxer deterministic facts", "AI judgment", "Disagreement vs Step 2B/public", "Revised priority", "Confidence", "ambiguous/hold",
]];
review.getRange("Y8:AK17").values = evidence.map((e) => [
  e.company,
  e.theirStackJobTitle,
  new Date(`${e.postedDate}T00:00:00Z`),
  e.jobsLast30d,
  e.theirStackEmployees,
  e.deeplineEmployees,
  e.sourceUrl,
  e.facts,
  e.judgment,
  e.disagreement,
  e.priority,
  e.confidence,
  e.hold,
]);
review.getRange("Y2:AK17").format.font = { name: "Arial", size: 10, color: "#1F2937" };
review.getRange("Y2").format.font = { name: "Arial", size: 14, bold: true, color: "#1F2937" };
review.getRange("Y3").format.font = { name: "Arial", size: 10, italic: true, color: "#666666" };
review.getRange("Y5:AB5").format = { fill: "#D9EAF7", font: { name: "Arial", size: 10, bold: true, color: "#1F2937" }, horizontalAlignment: "center", verticalAlignment: "center" };
review.getRange("Y6:AB6").format = { font: { name: "Arial", size: 11, bold: true, color: "#1F2937" }, horizontalAlignment: "center", verticalAlignment: "center" };
review.getRange("Y7:AK7").format = { fill: "#173B67", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9D9D9" } };
review.getRange("Y8:AK17").format = { verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9D9D9" } };
review.getRange("AA8:AA17").setNumberFormat("yyyy-mm-dd");
review.getRange("AB8:AB17").format.horizontalAlignment = "center";
review.getRange("AC8:AD17").format.horizontalAlignment = "center";
review.getRange("AI8:AJ17").format.horizontalAlignment = "center";
review.getRange("Y2:AK3").format.wrapText = true;
review.getRange("Y2:AK3").format.rowHeight = 26;
review.getRange("Y5:AB6").format.rowHeight = 22;
review.getRange("Y7:AK17").format.rowHeight = 64;
for (let i = 0; i < evidence.length; i++) {
  const row = 8 + i;
  const fill = fillForPriority[evidence[i].priority];
  const color = fontForPriority[evidence[i].priority];
  review.getRange(`AI${row}:AK${row}`).format = { fill, font: { name: "Arial", size: 10, bold: true, color }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9D9D9" } };
}
review.getRange("AI8:AI17").dataValidation = { rule: { type: "list", values: ["HIGH", "MEDIUM", "LOW", "HOLD"] } };
review.getRange("Y:Y").format.columnWidth = 18;
review.getRange("Z:Z").format.columnWidth = 28;
review.getRange("AA:AA").format.columnWidth = 13;
review.getRange("AB:AB").format.columnWidth = 12;
review.getRange("AC:AD").format.columnWidth = 13;
review.getRange("AE:AE").format.columnWidth = 44;
review.getRange("AF:AH").format.columnWidth = 52;
review.getRange("AI:AJ").format.columnWidth = 14;
review.getRange("AK:AK").format.columnWidth = 28;
review.tables.add("Y7:AK17", true, "Step3AReview");

signals.getRange("A31").values = [["Step 3A AgentMuxer evidence"]];
signals.getRange("A32").values = [["One row per account. These observations are independent of the Step 2B public-source rows above and are compared explicitly in the disagreement column."]];
signals.getRange("A34:N34").values = [[
  "Company", "ZI Company ID", "AgentMuxer provider", "Evidence class", "Step 2A dimension", "Signal score", "Confidence", "False-positive risk", "Observation date", "Posting date", "Deterministic fact", "AI judgment", "Disagreement / revised priority", "Evidence URL",
]];
const existingCompanyRows = review.getRange("B8:C17").values;
const ziIds = Object.fromEntries(existingCompanyRows.map(([company, id]) => [String(company), String(id)]));
signals.getRange("A35:N44").values = evidence.map((e) => [
  e.company,
  ziIds[e.company],
  e.deeplineEmployees == null ? "TheirStack" : "TheirStack + Deepline",
  "AgentMuxer live job/company re-verification",
  "Current hiring and ICP boundary corroboration",
  e.priority,
  e.confidence,
  e.hold ? (e.priority === "HOLD" ? "HIGH" : "MEDIUM") : "LOW",
  observedAt,
  new Date(`${e.postedDate}T00:00:00Z`),
  e.facts,
  e.judgment,
  `${e.disagreement} Revised priority: ${e.priority}.`,
  e.sourceUrl,
]);
signals.getRange("A31:N44").format.font = { name: "Arial", size: 10, color: "#1F2937" };
signals.getRange("A31").format.font = { name: "Arial", size: 14, bold: true, color: "#1F2937" };
signals.getRange("A32").format.font = { name: "Arial", size: 10, italic: true, color: "#666666" };
signals.getRange("A34:N34").format = { fill: "#173B67", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9D9D9" } };
signals.getRange("A35:N44").format = { verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9D9D9" } };
signals.getRange("I35:J44").setNumberFormat("yyyy-mm-dd");
signals.getRange("F35:H44").format.horizontalAlignment = "center";
signals.getRange("A31:N32").format.rowHeight = 26;
signals.getRange("A34:N44").format.rowHeight = 60;
signals.getRange("A34:N44").format.columnWidth = 18;
signals.getRange("C:C").format.columnWidth = 20;
signals.getRange("D:E").format.columnWidth = 28;
signals.getRange("K:M").format.columnWidth = 48;
signals.getRange("N:N").format.columnWidth = 42;
signals.tables.add("A34:N44", true, "Step3AAgentMuxerEvidence");

methodology.getRange("A43:C43").values = [["Step 3A AgentMuxer run", "Successful provider calls / source", "Use and cost"]];
methodology.getRange("A44:C47").values = [
  ["Capability search", "AgentMuxer search_offerings", "Free capability check; no provider invocation."],
  ["Hiring research", "TheirStack via AgentMuxer; 10 successful company-domain job searches", "10 x $0.40 = $4.00. One result requested per account; date and last-30-day volume captured."],
  ["Critical company re-check", "Deepline GTM API via AgentMuxer; three locally supplied critical accounts", "3 x $0.10 = $0.30. Company-level enrichment only; no contacts."],
  ["Comparison treatment", "TheirStack + Deepline compared with ZoomInfo and public careers evidence", "Disagreements preserved. Current-job evidence was not inferred from business events or stale pages."],
];
methodology.getRange("A43:C47").format = { font: { name: "Arial", size: 10, color: "#1F2937" }, verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9D9D9" } };
methodology.getRange("A43:C43").format = { fill: "#173B67", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#D9D9D9" } };
methodology.getRange("A43:C47").format.rowHeight = 42;
methodology.getRange("A:A").format.columnWidth = 24;
methodology.getRange("B:B").format.columnWidth = 54;
methodology.getRange("C:C").format.columnWidth = 68;

workbook.recalculate();
const reviewCheck = await workbook.inspect({ kind: "table", sheetId: "Review Queue", range: "Y5:AK17", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 20, tableMaxCellChars: 180 });
console.log("REVIEW_CHECK\n" + reviewCheck.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "Step 3A final formula error scan" });
console.log("FORMULA_ERRORS\n" + errors.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, fileName] of [["Review Queue", "step3a-after-review-queue.png"], ["Signal Evidence", "step3a-after-signal-evidence.png"], ["Methodology & Sources", "step3a-after-methodology.png"]]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${fileName}`, new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
console.log(`EXPORTED ${workbookPath}`);
