import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "D:/market engineering/outputs/step2b-pilot-20260911/step2b-hiring-signal-pilot.xlsx";
const previewDir = "C:/Users/GHOST PROTOCOL/.codex/visualizations/2026/09/10/01a08ccc-bbc9-7800-8615-7d3cac0f4812";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const review = workbook.worksheets.getItem("Review Queue");
const signals = workbook.worksheets.getItem("Signal Evidence");
const methodology = workbook.worksheets.getItem("Methodology & Sources");
const enrichment = workbook.worksheets.getItem("ZoomInfo Enrichment");

const visibleHeaderFont = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
const headerRanges = [
  [review, "A7:X7"],
  [review, "Y7:AK7"],
  [signals, "A6:M6"],
  [signals, "A34:N34"],
  [methodology, "A10:D10"],
  [methodology, "A21:C21"],
  [methodology, "A36:C36"],
  [methodology, "A43:C43"],
  [enrichment, "A6:N6"],
];

for (const [sheet, address] of headerRanges) {
  sheet.getRange(address).format.font = visibleHeaderFont;
}

// Keep the compact KPI row readable without changing the review-table schema.
review.getRange("A5").format.wrapText = true;
review.getRange("A5").format.horizontalAlignment = "left";
review.getRange("A5:H5").format.verticalAlignment = "center";
review.getRange("B5:H5").format.horizontalAlignment = "center";
review.getRange("A5:H5").format.rowHeight = 30;
review.getRange("A:A").format.columnWidth = 12;

// Give wrapped header labels enough vertical room after the contrast repair.
review.getRange("A7:AK7").format.rowHeight = 42;
signals.getRange("A6:N6").format.rowHeight = 42;
methodology.getRange("A10:D10").format.rowHeight = 34;
methodology.getRange("A21:C21").format.rowHeight = 34;
methodology.getRange("A36:C36").format.rowHeight = 34;
enrichment.getRange("A6:N6").format.rowHeight = 42;

workbook.recalculate();

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 300 },
  summary: "Repaired workbook formula error scan",
});
console.log("FORMULA_ERRORS\n" + errors.ndjson);

const structure = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  summary: "Repaired workbook sheet structure",
});
console.log("STRUCTURE\n" + structure.ndjson);

const headerCheck = await workbook.inspect({
  kind: "computedStyle",
  range: "A7:X7",
  sheetId: "Review Queue",
  include: "font,fill",
  summary: "Repaired Review Queue header style",
});
console.log("HEADER_CHECK\n" + headerCheck.ndjson);

const reviewCheck = await workbook.inspect({
  kind: "table",
  sheetId: "Review Queue",
  range: "A5:AK17",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 40,
  tableMaxCellChars: 180,
  summary: "Repaired workbook review queue",
});
console.log("REVIEW_CHECK\n" + reviewCheck.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, fileName] of [
  ["Review Queue", "step3a-repaired-review-queue.png"],
  ["Signal Evidence", "step3a-repaired-signal-evidence.png"],
  ["Methodology & Sources", "step3a-repaired-methodology.png"],
  ["ZoomInfo Enrichment", "step3a-repaired-zoominfo-enrichment.png"],
]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${fileName}`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
console.log(`EXPORTED ${workbookPath}`);
