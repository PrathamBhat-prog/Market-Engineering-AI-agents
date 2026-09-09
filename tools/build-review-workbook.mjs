import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const input = JSON.parse(await fs.readFile('output/signal-report.json', 'utf8'));
const findings = input.findings ?? [];
const wb = Workbook.create();

const navy = '#1F4E78';
const lightBlue = '#EAF3F8';
const gray = '#666666';
const border = '#B7C9D6';

function title(sheet, range, text) {
  sheet.getRange(range).merge();
  sheet.getRange(range.split(':')[0]).values = [[text]];
  sheet.getRange(range).format = {
    font: { name: 'Aptos Display', size: 16, bold: true, color: '#FFFFFF' },
    fill: navy,
    verticalAlignment: 'center',
  };
  sheet.getRange(range).format.rowHeight = 28;
}

function subtitle(sheet, range, text) {
  sheet.getRange(range).merge();
  sheet.getRange(range.split(':')[0]).values = [[text]];
  sheet.getRange(range).format = {
    font: { name: 'Aptos', size: 10, italic: true, color: gray },
    fill: '#F4F7F9',
    verticalAlignment: 'center',
  };
  sheet.getRange(range).format.rowHeight = 22;
}

function tableHeader(sheet, range) {
  sheet.getRange(range).format = {
    fill: navy,
    font: { name: 'Aptos', size: 10, bold: true, color: '#FFFFFF' },
    verticalAlignment: 'center',
    wrapText: true,
  };
  sheet.getRange(range).format.rowHeight = 28;
}

function body(sheet, range) {
  sheet.getRange(range).format = {
    font: { name: 'Aptos', size: 10, color: '#000000' },
    verticalAlignment: 'top',
    wrapText: true,
    borders: { color: border, style: 'continuous' },
  };
}

function addSimpleTable(sheet, range, name) {
  const table = sheet.tables.add(range, true, name);
  table.style = 'TableStyleMedium2';
}

// 1. Overview: a compact opening sheet for a human reviewer.
const overview = wb.worksheets.add('Overview');
overview.showGridLines = false;
title(overview, 'A1:H1', 'Marketing Signal Review | Overview');
subtitle(overview, 'A2:H2', `Source-backed signals generated ${input.generated_at}. This workbook is a review aid, not an approved outreach list.`);

overview.getRange('A4:B8').values = [
  ['Metric', 'Value'],
  ['Accounts checked', input.summary.accounts_checked],
  ['Actionable findings', input.summary.actionable_findings],
  ['High severity', input.summary.high],
  ['Medium severity', input.summary.medium],
];
tableHeader(overview, 'A4:B4');
body(overview, 'A5:B8');
overview.getRange('A:A').format.columnWidth = 24;
overview.getRange('B:B').format.columnWidth = 16;

overview.getRange('D4:H4').merge();
overview.getRange('D4').values = [['How to use this workbook']];
overview.getRange('D4:H4').format = { fill: navy, font: { name: 'Aptos', size: 10, bold: true, color: '#FFFFFF' } };
overview.getRange('D5:H9').merge();
overview.getRange('D5').values = [[
  '1. Start in Review Queue.\n2. Open the matching source URL in Evidence.\n3. Confirm the signal and company context manually.\n4. Only then decide whether to identify a contact or offer a workflow diagnostic.\n\nThe current run is a cold start: every account is marked “new account” because no prior baseline was available.'
]];
overview.getRange('D5:H9').format = { fill: lightBlue, font: { name: 'Aptos', size: 10, color: '#000000' }, wrapText: true, verticalAlignment: 'top' };
overview.getRange('D:D').format.columnWidth = 24;
overview.getRange('E:H').format.columnWidth = 16;
overview.getRange('D5:H9').format.rowHeight = 24;

const sourceCounts = new Map();
for (const item of findings) sourceCounts.set(item.source_type || 'unknown', (sourceCounts.get(item.source_type || 'unknown') ?? 0) + 1);
const sourceRows = [...sourceCounts.entries()].map(([source, count]) => [source, count]);
overview.getRange(`A11:B${11 + sourceRows.length}`).values = [['Source type', 'Count'], ...sourceRows];
tableHeader(overview, 'A11:B11');
body(overview, `A12:B${11 + sourceRows.length}`);
addSimpleTable(overview, `A11:B${11 + sourceRows.length}`, 'SourceMixTable');
overview.freezePanes.freezeRows(4);

// 2. Review Queue: intentionally compact; long narratives live on Evidence.
const queue = wb.worksheets.add('Review Queue');
queue.showGridLines = false;
title(queue, 'A1:I1', 'Marketing Signal Review | Review Queue');
subtitle(queue, 'A2:I2', 'One row per account. Filter the table, then verify every source before outreach.');
const queueHeaders = ['Company', 'Signal date', 'Source', 'Severity', 'ICP status', 'Fit score', 'Confidence', 'Review status', 'Next best action'];
const queueRows = findings.map((item) => [
  item.company_name,
  item.signal_date || '',
  item.source_type || '',
  item.severity || '',
  item.icp_status || '',
  item.fit_score ?? '',
  item.confidence || '',
  'Pending human review',
  item.next_best_action || '',
]);
queue.getRange(`A5:I${5 + queueRows.length}`).values = [queueHeaders, ...queueRows];
tableHeader(queue, 'A5:I5');
body(queue, `A6:I${5 + queueRows.length}`);
addSimpleTable(queue, `A5:I${5 + queueRows.length}`, 'ReviewQueueTable');
queue.freezePanes.freezeRows(5);
queue.getRange('A:A').format.columnWidth = 20;
queue.getRange('B:B').format.columnWidth = 14;
queue.getRange('C:C').format.columnWidth = 24;
queue.getRange('D:G').format.columnWidth = 14;
queue.getRange('H:H').format.columnWidth = 22;
queue.getRange('I:I').format.columnWidth = 48;
queue.getRange(`A6:I${5 + queueRows.length}`).format.rowHeight = 44;
queue.getRange(`F6:F${5 + queueRows.length}`).format.numberFormat = '0';
queue.getRange(`D6:D${5 + queueRows.length}`).conditionalFormats.add('cellIs', { operator: 'equal', formula: '"high"', format: { fill: '#F4CCCC', font: { bold: true, color: '#9C0006' } } });
queue.getRange(`D6:D${5 + queueRows.length}`).conditionalFormats.add('cellIs', { operator: 'equal', formula: '"medium"', format: { fill: '#FCE5CD', font: { bold: true, color: '#7F6000' } } });
queue.getRange(`E6:E${5 + queueRows.length}`).conditionalFormats.add('cellIs', { operator: 'equal', formula: '"qualified"', format: { fill: '#D9EAD3', font: { bold: true, color: '#274E13' } } });

// 3. Evidence: source-backed narratives and the exact URL to verify.
const evidence = wb.worksheets.add('Evidence');
evidence.showGridLines = false;
title(evidence, 'A1:H1', 'Marketing Signal Review | Evidence');
subtitle(evidence, 'A2:H2', 'Evidence is copied from the collected source record. Open the URL and verify it before using the signal commercially.');
const evidenceHeaders = ['Company', 'Account ID', 'Source type', 'Signal date', 'Evidence summary', 'Account brief', 'Approval required', 'Source URL'];
const evidenceRows = findings.map((item) => [
  item.company_name,
  item.account_id,
  item.source_type || '',
  item.signal_date || '',
  item.evidence_summary || '',
  item.account_brief || '',
  item.approval_required ? 'Yes' : 'No',
  (item.evidence_urls ?? []).join('; '),
]);
evidence.getRange(`A5:H${5 + evidenceRows.length}`).values = [evidenceHeaders, ...evidenceRows];
tableHeader(evidence, 'A5:H5');
body(evidence, `A6:H${5 + evidenceRows.length}`);
addSimpleTable(evidence, `A5:H${5 + evidenceRows.length}`, 'EvidenceTable');
evidence.freezePanes.freezeRows(5);
evidence.getRange('A:A').format.columnWidth = 20;
evidence.getRange('B:B').format.columnWidth = 16;
evidence.getRange('C:C').format.columnWidth = 22;
evidence.getRange('D:D').format.columnWidth = 14;
evidence.getRange('E:F').format.columnWidth = 58;
evidence.getRange('G:G').format.columnWidth = 18;
evidence.getRange('H:H').format.columnWidth = 55;
evidence.getRange(`A6:H${5 + evidenceRows.length}`).format.rowHeight = 96;

// 4. Raw Signals: flat, one-field-per-column record for auditability.
const raw = wb.worksheets.add('Raw Signals');
raw.showGridLines = false;
title(raw, 'A1:N1', 'Marketing Signal Review | Raw Signals');
subtitle(raw, 'A2:N2', 'Flat output record used by the monitor. Do not edit this tab; change the source inputs and rerun the monitor instead.');
const rawHeaders = ['Account ID', 'Company', 'Changes', 'Severity', 'Confidence', 'Signal date', 'Source type', 'Evidence summary', 'Evidence URL', 'Recommended action', 'ICP status', 'Fit score', 'Detected problem', 'Qualification note'];
const rawRows = findings.map((item) => [
  item.account_id,
  item.company_name,
  (item.changes ?? []).join('; '),
  item.severity || '',
  item.confidence || '',
  item.signal_date || '',
  item.source_type || '',
  item.evidence_summary || '',
  (item.evidence_urls ?? []).join('; '),
  item.recommended_action || '',
  item.icp_status || '',
  item.fit_score ?? '',
  item.detected_problem || '',
  item.qualification_note || '',
]);
raw.getRange(`A5:N${5 + rawRows.length}`).values = [rawHeaders, ...rawRows];
tableHeader(raw, 'A5:N5');
body(raw, `A6:N${5 + rawRows.length}`);
addSimpleTable(raw, `A5:N${5 + rawRows.length}`, 'RawSignalsTable');
raw.freezePanes.freezeRows(5);
raw.getRange('A:A').format.columnWidth = 16;
raw.getRange('B:B').format.columnWidth = 20;
raw.getRange('C:G').format.columnWidth = 18;
raw.getRange('H:H').format.columnWidth = 58;
raw.getRange('I:I').format.columnWidth = 55;
raw.getRange('J:J').format.columnWidth = 44;
raw.getRange('K:L').format.columnWidth = 16;
raw.getRange('M:N').format.columnWidth = 44;
raw.getRange(`A6:N${5 + rawRows.length}`).format.rowHeight = 78;

wb.recalculate();
await fs.mkdir('output', { recursive: true });

const renderTargets = [
  ['Overview', `A1:H${12 + sourceRows.length}`, 'output/marketing-signal-overview.png'],
  ['Review Queue', `A1:I${5 + queueRows.length}`, 'output/marketing-signal-review-queue.png'],
  ['Evidence', `A1:H${5 + evidenceRows.length}`, 'output/marketing-signal-evidence.png'],
  ['Raw Signals', `A1:N${5 + rawRows.length}`, 'output/marketing-signal-raw.png'],
];
for (const [sheetName, range, file] of renderTargets) {
  const preview = await wb.render({ sheetName, range, scale: 1, format: 'png' });
  await fs.writeFile(file, new Uint8Array(await preview.arrayBuffer()));
}

const check = await wb.inspect({ kind: 'table', range: `Review Queue!A1:I${5 + queueRows.length}`, include: 'values,formulas', tableMaxRows: 20, tableMaxCols: 9, maxChars: 6000 });
console.log(check.ndjson);
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save('output/marketing-signal-review.xlsx');
