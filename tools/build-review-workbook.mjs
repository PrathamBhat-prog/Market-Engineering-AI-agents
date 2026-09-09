import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const input = JSON.parse(await fs.readFile('output/signal-report.json', 'utf8'));
const wb = Workbook.create();
const sheet = wb.worksheets.add('Signal Review');
sheet.showGridLines = false;
sheet.getRange('A1:M1').merge();
sheet.getRange('A1').values = [['Marketing Signal Review']];
sheet.getRange('A2:M2').merge();
sheet.getRange('A2').values = [[`Generated ${input.generated_at} | Review actionable changes before outreach`]];
sheet.getRange('A4:D5').values = [
  ['Accounts checked', 'Actionable findings', 'High priority', 'Medium priority'],
  [input.summary.accounts_checked, input.summary.actionable_findings, input.summary.high, input.summary.medium],
];
const headers = ['Company', 'Signal date', 'Source', 'Severity', 'ICP status', 'Fit score', 'Confidence', 'Changes', 'Evidence summary', 'Account brief', 'Next best action', 'Evidence URL', 'Account ID'];
const rows = input.findings.map((item) => [
  item.company_name, item.signal_date || '', item.source_type || '', item.severity, item.icp_status,
  item.fit_score, item.confidence, item.changes.join('; '), item.evidence_summary || '', item.account_brief || '',
  item.next_best_action || '', (item.evidence_urls ?? []).join('; '), item.account_id,
]);
sheet.getRange(`A8:M${8 + rows.length}`).values = [headers, ...rows];
const table = sheet.tables.add(`A8:M${8 + rows.length}`, true, 'SignalReviewTable');
table.style = 'TableStyleMedium2';
sheet.freezePanes.freezeRows(8);
sheet.getRange('A1:M1').format = { font: { name: 'Arial', size: 16, bold: true, color: '#000000' } };
sheet.getRange('A2:M2').format = { font: { name: 'Arial', size: 10, italic: true, color: '#666666' } };
sheet.getRange('A4:D4').format = { fill: '#1F4E78', font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center' };
sheet.getRange('A5:D5').format = { fill: '#D9EAF7', font: { name: 'Arial', size: 12, bold: true, color: '#000000' }, horizontalAlignment: 'center', verticalAlignment: 'center' };
sheet.getRange(`A8:M${8 + rows.length}`).format.font = { name: 'Arial', size: 10, color: '#000000' };
sheet.getRange(`A8:M${8 + rows.length}`).format.verticalAlignment = 'center';
sheet.getRange(`A8:M${8 + rows.length}`).format.wrapText = true;
sheet.getRange(`F9:F${8 + rows.length}`).format.horizontalAlignment = 'right';
sheet.getRange(`F9:F${8 + rows.length}`).format.numberFormat = '0';
sheet.getRange('A1:M20').format.autofitColumns();
sheet.getRange('A1:M20').format.autofitRows();
sheet.getRange('A:A').format.columnWidth = 24;
sheet.getRange('H:H').format.columnWidth = 22;
sheet.getRange('I:J').format.columnWidth = 48;
sheet.getRange('K:K').format.columnWidth = 42;
sheet.getRange('L:L').format.columnWidth = 34;
sheet.getRange('M:M').format.columnWidth = 20;
sheet.getRange('A8:M8').format.rowHeight = 30;
sheet.getRange(`A9:M${8 + rows.length}`).format.rowHeight = 112;
sheet.getRange(`D9:D${8 + rows.length}`).conditionalFormats.add('cellIs', { operator: 'equal', formula: '"high"', format: { fill: '#F4CCCC', font: { bold: true, color: '#9C0006' } } });
sheet.getRange(`D9:D${8 + rows.length}`).conditionalFormats.add('cellIs', { operator: 'equal', formula: '"medium"', format: { fill: '#FCE5CD', font: { bold: true, color: '#7F6000' } } });
wb.recalculate();
const check = await wb.inspect({ kind: 'table', range: `Signal Review!A1:M${8 + rows.length}`, include: 'values,formulas', tableMaxRows: 20, tableMaxCols: 13, maxChars: 6000 });
console.log(check.ndjson);
const preview = await wb.render({ sheetName: 'Signal Review', range: `A1:M${8 + rows.length}`, scale: 1, format: 'png' });
await fs.mkdir('output', { recursive: true });
await fs.writeFile('output/signal-review-preview.png', new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save('output/signal-review.xlsx');
