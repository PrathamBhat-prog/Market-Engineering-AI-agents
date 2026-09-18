import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, LevelFormat,
  Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow,
  TextRun, VerticalAlign, WidthType,
} from "../public-console-site/node_modules/docx/dist/index.mjs";

const outDir = "D:/market engineering/deliverables";
const docxPath = path.join(outDir, "ICP_SignalForge_Ops_2026-09-19.docx");
const mdPath = path.join(outDir, "ICP_SignalForge_Ops_2026-09-19.md");
const metaPath = path.join(outDir, "ICP_SignalForge_Ops_2026-09-19.meta.json");
fs.mkdirSync(outDir, { recursive: true });

const WIDTH = 9360;
const navy = "17365D";
const light = "EAF0F6";
const border = { style: BorderStyle.SINGLE, size: 4, color: "B8C4D1" };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
const run = (value, options = {}) => new TextRun({ text: String(value), font: "Arial", size: 22, color: "111827", ...options });
const p = (value, options = {}) => new Paragraph({ children: [run(value)], spacing: { after: 140, line: 276 }, ...options });
const h1 = (value) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(value, { bold: true, size: 32, color: navy })], spacing: { before: 420, after: 180 } });
const h2 = (value) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(value, { bold: true, size: 26, color: navy })], spacing: { before: 280, after: 140 } });
const bullet = (value) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [run(value)], spacing: { after: 80, line: 276 } });
const cell = (value, width, header = false) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
  shading: header ? { fill: navy, type: ShadingType.CLEAR } : undefined,
  margins: { top: 100, bottom: 100, left: 120, right: 120 },
  children: [new Paragraph({ children: [run(value, { bold: header, color: header ? "FFFFFF" : "111827", size: 19 })], spacing: { after: 0, line: 240 } })],
});
const table = (headers, rows, widths) => new Table({ width: { size: WIDTH, type: WidthType.DXA }, columnWidths: widths, rows: [new TableRow({ children: headers.map((x, i) => cell(x, widths[i], true)) }), ...rows.map(row => new TableRow({ children: row.map((x, i) => cell(x, widths[i])) }))] });
const callout = (title, body) => new Table({ width: { size: WIDTH, type: WidthType.DXA }, columnWidths: [WIDTH], rows: [new TableRow({ children: [new TableCell({ width: { size: WIDTH, type: WidthType.DXA }, borders: { top: border, bottom: border, left: { style: BorderStyle.THICK, size: 14, color: "E2A23B" }, right: border }, shading: { fill: "FFF7E6", type: ShadingType.CLEAR }, margins: { top: 140, bottom: 140, left: 180, right: 180 }, children: [new Paragraph({ children: [run(`${title}: `, { bold: true, color: "7A4B00" }), run(body, { color: "4A3A1A" })], spacing: { after: 0, line: 276 } })] })] })] });
const pageBreak = () => new Paragraph({ pageBreakBefore: true, children: [] });

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000, after: 240 }, children: [run("IDEAL CUSTOMER PROFILE", { bold: true, size: 40, color: navy })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [run("SignalForge Ops", { bold: true, size: 32, color: "111827" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run("Prepared using the NexaCore Revenue Partners ICP Definition standard", { size: 22, color: "475569" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [run("19 September 2026", { size: 22, color: "475569" })] }),
  callout("Evidence status", "SignalForge Ops is a fictional test company. This profile uses the supplied client_ICP.docx as its only evidence source. The scorecard and recommendations are working hypotheses, not verified market facts."),
  h1("Executive Decision"),
  p("Build pipeline first around scaling B2B SaaS companies with 100 to 250 employees, frequent product launches, a named Product Marketing owner, and at least three teams involved in launch execution. The visible problem is not product launches by themselves. It is the coordination gap between Product, Product Marketing, Marketing, Sales, and Customer Success."),
  p("The Tier 1 buyer is the VP of Marketing or CMO as economic buyer, with the Director of Product Marketing as champion and Product or IT as technical evaluator. Tier 1 beats the runner-up because the supplied evidence shows a recurring monthly workflow, a named owner, measurable coordination effort, and a clear pilot boundary."),
  table(["Decision", "Answer", "Evidence status"], [
    ["Tier 1 ICP", "Scaling B2B SaaS, 100 to 250 employees, monthly launches, Product Marketing owner", "Working hypothesis from supplied fictional interviews"],
    ["Tier 2 ICP", "B2B workflow SaaS, 50 to 100 employees, quarterly launches, lean Product Marketing team", "Expansion hypothesis"],
    ["Primary offer wedge", "Launch coordination operator combining source reconciliation, readiness control, and human-approved enablement drafts", "Derived judgment"],
    ["Outbound gate", "Do not activate broad outbound until trigger, owner, source access, and measurable pilot outcome are verified", "Operating rule"],
  ], [2000, 4760, 2600]),
  pageBreak(),

  h1("Step 3A: Segment Scorecard"),
  p("The scorecard is required because an ICP is a choice among alternatives. Scores run from 1 to 5. The supplied source contains one fictional company profile and interview set, so every score is a conservative hypothesis to test. It is not a market benchmark."),
  table(["Segment", "Pain", "Urgency", "Budget", "Access", "Decision", "Retention", "Expansion / Referral", "Total", "Flag"], [
    ["Scaling B2B SaaS, 100-250 employees, monthly launches, named Product Marketing owner", "5", "5", "4", "4", "4", "4", "4", "30/35", "Tier 1 winner"],
    ["B2B workflow SaaS, 50-100 employees, quarterly launches, lean Product Marketing", "4", "3", "3", "4", "4", "4", "3", "25/35", "Tier 2"],
    ["Enterprise SaaS, 500-1000 employees, complex release governance", "5", "4", "5", "2", "2", "5", "4", "27/35", "Attractive but hard"],
    ["Digital agency or consultancy, 50-200 employees, many client launches", "3", "4", "3", "3", "3", "2", "3", "21/35", "Variable scope"],
    ["E-commerce technology company, 100-500 employees, seasonal campaigns", "2", "3", "3", "4", "4", "2", "3", "21/35", "Easy but low value"],
  ], [1900, 460, 460, 460, 460, 460, 460, 700, 650, 2350]),
  h2("Scorecard interpretation"),
  bullet("Tier 1: Scaling B2B SaaS with monthly launches. The supplied source shows the highest combination of repeated pain, named ownership, and a measurable pilot path."),
  bullet("Tier 2: Smaller B2B workflow SaaS. The same problem may exist, but lower launch frequency and lower budget authority make the motion narrower."),
  bullet("Attractive but hard: Enterprise SaaS has strong pain, budget, and retention potential, but access and decision speed are weak. Pursue only after a named enterprise access plan exists."),
  bullet("Easy but low value: E-commerce technology may be reachable, but the supplied evidence does not show a severe recurring launch coordination problem or durable retention case."),
  h2("Pipeline commitment"),
  p("Build the next pipeline experiment around Tier 1. Keep Tier 2 as a controlled expansion segment. Do not allow enterprise or agency accounts to redefine the offer until the Tier 1 pilot produces measured value."),

  h1("Section 1: Demographic Profile"),
  h2("Economic Buyer"),
  p("VP of Marketing or CMO. This role owns launch consistency, campaign execution, and the business consequence of delayed or inconsistent go-to-market activity."),
  h2("Champion"),
  p("Director of Product Marketing. This role feels the coordination burden directly and can demonstrate improvement during a live launch."),
  h2("Technical Evaluator"),
  p("IT, Security, Product Operations, or a technically capable Product leader. This evaluator confirms system access, integration requirements, permissions, and data handling."),
  table(["Dimension", "Tier 1 definition", "Tier 2 definition"], [
    ["Employee size", "100 to 250", "50 to 100"],
    ["Revenue", "15M to 30M ARR as an unverified working range", "Not established"],
    ["Vertical", "B2B SaaS and workflow software", "B2B software with recurring releases"],
    ["Operating situation", "Monthly product or campaign launches with three or more teams", "Quarterly launches with a lean Product Marketing function"],
    ["Geography", "North America and United Kingdom", "Not established"],
    ["Adjacent stack", "Salesforce, HubSpot, Jira, Slack, Google Workspace, Notion, Gong", "Comparable CRM, project, and communication stack"],
  ], [1900, 3730, 3730]),
  h2("Industry tiers"),
  table(["Tier", "Vertical", "Why"], [
    ["Tier 1", "B2B SaaS and workflow software", "Frequent launches, cross-functional handoffs, and named Product Marketing ownership match the supplied pain."],
    ["Tier 2", "Adjacent B2B software categories", "Likely workflow complexity, but trigger and retention evidence must be established."],
    ["Tier 3", "Agencies, e-commerce technology, and low-launch businesses", "Possible operational fit, but the supplied evidence does not establish recurring severity or durable value."],
  ], [1400, 3000, 4960]),
  pageBreak(),

  h1("Section 2: Psychographic Profile"),
  h2("Goals and aspirations"),
  bullet("Make product launches predictable without adding another manual reporting burden."),
  bullet("Give leadership a reliable launch-readiness view before launch week."),
  bullet("Reduce coordination and rework while preserving human approval of claims and positioning."),
  bullet("Create a repeatable operating rhythm that survives overlapping launches and champion changes."),
  h2("Daily challenges and frustrations"),
  bullet("Information is distributed across Slack, Jira, spreadsheets, Google Drive, CRM records, and individual memory."),
  bullet("Teams work from different versions of launch facts and messaging."),
  bullet("Product Marketing manually chases owners and consolidates status before leadership reviews."),
  bullet("A feature name or message change can remain stale in Sales and Customer Success material."),
  h2("Decision criteria"),
  table(["Priority", "Criterion", "Dealbreaker or proof needed"], [
    ["1", "No duplicate manual data entry", "The workflow must use existing source systems."],
    ["2", "Accuracy and human approval", "Claims, positioning, pricing, and timing must remain reviewable."],
    ["3", "Integration feasibility", "Jira, Slack, CRM, and permissions must be mapped."],
    ["4", "Measurable time reduction", "Pilot must compare baseline and post-pilot coordination effort."],
    ["5", "Clear ownership", "The Product Marketing champion and executive sponsor must be named."],
  ], [1200, 3500, 4660]),
  h2("Information sources they trust"),
  p("The supplied source identifies peer referrals, LinkedIn, Product Marketing communities, RevOps communities, search, vendor comparisons, and practical case studies. This is interview evidence from the fictional source, not independently verified channel data."),

  h1("Section 3: Behavioral Profile"),
  h2("Practical buying triggers"),
  bullet("A new Product Marketing leader inherits an inconsistent launch process."),
  bullet("Release frequency increases and the current spreadsheet-plus-Slack process breaks down."),
  bullet("A launch slips or customer-facing teams use inconsistent wording."),
  bullet("Leadership asks for predictable launch readiness and measurable operating control."),
  bullet("A product reorganization changes ownership across Product, Marketing, Sales, and Customer Success."),
  h2("Emotional triggers"),
  bullet("The VP of Marketing fears being held responsible for a launch that other teams did not execute consistently."),
  bullet("The Product Marketing champion fears introducing another system that the team will ignore."),
  bullet("The champion fears being blamed if an automated draft contains an inaccurate product claim."),
  h2("Cost of delay"),
  p("The supplied source estimates 15 to 20 Product Marketing coordination hours per launch and one to two week launch slips. These are interview estimates, not audited financial metrics. A first sales conversation should calculate the actual hours, delayed launch value, rework volume, and downstream enablement delay for the prospect."),
  p("Working cost-of-delay frame: every additional launch cycle without a shared source of truth consumes manual coordination time, increases stale-message risk, and delays the moment Sales and Customer Success can use approved launch information. The number must be replaced by the prospect's baseline during discovery."),
  h2("Purchase cycle and authority"),
  p("Working estimate: a scoped pilot can be approved by Marketing leadership after Product, IT, and Security review. The supplied source proposes discovery in Q1, pilot in Q2, and an annual decision after two launches. Treat this as a testable buying hypothesis, not a verified cycle length."),
  table(["Role", "Influence", "How they can stop the deal"], [
    ["VP Marketing / CMO", "Economic buyer and outcome owner", "No budget, no executive priority, or no measurable business case"],
    ["Director Product Marketing", "Champion and daily process owner", "No time, no trust, or no willingness to change workflow"],
    ["Product / IT / Security", "Technical evaluator", "No data access, unacceptable permissions, or integration risk"],
    ["Sales / Customer Success", "Downstream users and validators", "No adoption or no agreement on approved messaging"],
  ], [2200, 3600, 3560]),
  pageBreak(),

  h1("Section 4: Ranked Pain Points"),
  p("Severity is ranked using frequency multiplied by consequence. The ranking is based on the supplied fictional interview set and should be re-ranked after a live pilot."),
  table(["Rank", "Pain", "Current situation", "Desired situation", "Gap analysis"], [
    ["1", "Fragmented launch truth", "Facts and statuses are split across Slack, Jira, spreadsheets, Google Drive, CRM, and memory.", "One source of truth connected to existing systems.", "The distance is a manual reconciliation layer. Validate the number of systems, update frequency, and rework hours."],
    ["2", "Unclear ownership and readiness", "Product Marketing manually chases owners and assembles readiness status before leadership review.", "Every task has an owner, dependency, approval state, and visible readiness status.", "The gap is operational visibility. Measure overdue tasks and time spent preparing status."],
    ["3", "Stale or inconsistent messaging", "A feature name changed after drafts circulated, and Sales used an old name.", "Approved messaging propagates to the right teams with human review.", "The gap is version control and approval discipline. Track message changes and correction incidents."],
    ["4", "Launch delay and rework", "Launches can slip one to two weeks and coordination consumes 15 to 20 hours per launch.", "Launches follow a predictable process with lower coordination effort.", "The gap is measurable but currently estimated. Establish an audited baseline during the pilot."],
    ["5", "Adoption fear", "The team rejects another dashboard if it requires duplicate manual updates.", "The workflow uses existing systems and produces useful outputs without duplicate entry.", "The gap is trust and workflow fit. Test usage, source freshness, and number of manual updates required."],
  ], [700, 1800, 2500, 2200, 2160]),
  h2("Pilot boundary"),
  p("Pilot one recurring product launch. Connect the minimum viable source systems. Compare baseline coordination hours, task assignment before launch week, message correction incidents, and time to produce approved enablement material. Keep final claims, positioning, pricing, audience, timing, and legal language human-approved."),

  h1("Section 4b: Objections, False Beliefs, and Required Proof"),
  table(["Resistance", "Type", "What it means", "Required proof"], [
    ["This will become another system we have to update", "Stated objection and workflow constraint", "The buyer has experienced dashboard fatigue and duplicate entry.", "Live integration map, source-of-truth demo, and pilot showing fewer manual updates."],
    ["Our project-management tool already does this", "Category comparison", "The buyer may believe task tracking equals launch coordination.", "Side-by-side workflow showing reconciliation, readiness, approvals, and message version control."],
    ["AI will make an inaccurate product claim", "Trust objection", "The buyer fears reputational exposure and personal blame.", "Human approval controls, audit trail, source links, and a controlled draft review."],
    ["We can build this internally", "Alternative / budget objection", "The buyer compares the service with internal maintenance effort.", "Pilot scope, implementation timeline, ownership model, and maintenance comparison."],
    ["We do not have time to implement it", "Bandwidth objection", "The problem is real but the change itself competes with launch work.", "Low-involvement pilot plan, named responsibilities, and weekly review cadence."],
  ], [2000, 1900, 2700, 2760]),
  h2("False beliefs to test"),
  bullet("Launch coordination is simply a project-management problem."),
  bullet("All launch information can be kept accurate through meetings and spreadsheets."),
  bullet("The team must choose between automation and human judgment."),
  p("These are working hypotheses, not direct customer quotes. They must be confirmed or rejected in future interviews."),

  h1("Section 5: Customer Language"),
  p("The following phrases are verbatim from the supplied client_ICP.docx. They are fictional source language and must not be presented as external market language."),
  table(["Phrase", "Source tier", "Use"], [
    ["We do not have a launch problem; we have a launch coordination problem.", "Supplied interview answer", "Problem framing and first discovery question"],
    ["If this becomes another place we have to update manually, nobody will use it.", "Supplied interview answer", "Objection opener and workflow-fit test"],
  ], [4300, 2200, 2860]),
  h2("Language to avoid"),
  bullet("Do not lead with generic AI transformation language."),
  bullet("Do not promise autonomous launch decisions or fully automated positioning."),
  bullet("Do not call the product a dashboard if the buyer fears another dashboard."),
  bullet("Do not claim revenue impact until launch delay, rework, and downstream adoption are measured."),
  bullet("Do not use a broad phrase such as go-to-market orchestration without connecting it to the launch coordination problem."),
  pageBreak(),

  h1("Section 6: Operationalization Plan"),
  h2("Marketing"),
  bullet("Target scaling B2B SaaS companies with 100 to 250 employees, monthly launches, and Product Marketing ownership. Exclude low-launch businesses until evidence changes. Derived from Step 3A and Section 1."),
  bullet("Build three content pillars: fragmented launch truth, readiness and ownership, and human-approved enablement. Derived from Section 4 and Section 4b."),
  bullet("Use the two supplied phrases as discovery-led copy only in the fictional test environment. Replace them with verified customer language before public use. Derived from Section 5."),
  h2("Sales"),
  bullet("Add an ICP tier field to the CRM. Tier 1 receives full-cycle pursuit and multithreading. Tier 2 receives a controlled motion. Tier 3 receives minimal effort until evidence improves. Derived from Step 3A."),
  bullet("Qualify for monthly launch frequency, named Product Marketing owner, three or more participating teams, recent coordination failure, source-system access, and measurable pilot outcome. Derived from Sections 1, 3, and 4."),
  bullet("Open discovery with the last real launch, current process, desired state, frequency, consequence, and human approval boundary. Derived from Section 4."),
  bullet("Build proof in this order: integration and no-duplicate-entry proof, accuracy and approval proof, measurable time-saved proof, then internal-build comparison. Derived from Section 4b."),
  h2("Product and delivery"),
  bullet("Prioritize source reconciliation, launch readiness, ownership visibility, approval states, and version changes over generic content generation. Derived from the ranked pain points."),
  bullet("Preserve human approval for claims, positioning, timing, pricing, audience, and legal language. Derived from the operating boundary."),
  bullet("Capture baseline and post-pilot time, task ownership, correction incidents, and enablement turnaround. Derived from the pilot boundary."),
  h2("90-day rollout"),
  table(["Action", "Owner", "Due", "ICP section", "Adoption signal"], [
    ["Create ICP tier field and qualification checklist", "Revenue leader", "Day 30", "Step 3A, Section 1", "Every new opportunity has a tier and trigger status"],
    ["Map one launch workflow and source systems", "Product Marketing + IT", "Day 30", "Sections 3 and 4", "Named systems, owners, approvals, and permissions"],
    ["Create first integration and approval proof asset", "Marketing + Delivery", "Day 30", "Section 4b", "Proof used in two discovery conversations"],
    ["Run one Tier 1 pilot launch", "Product Marketing champion", "Day 60", "Section 4", "Baseline captured and pilot workflow used"],
    ["Launch trigger-led outbound experiment", "Sales + Marketing", "Day 60", "Section 3", "Qualified conversations from verified triggers"],
    ["Review pilot results and re-score segments", "CEO + Revenue team", "Day 90", "Step 3A and Section 4", "Decision to keep, narrow, or falsify Tier 1"],
  ], [2300, 1700, 1100, 1800, 2460]),
  h2("Adoption scorecard"),
  table(["Metric", "Baseline", "Day 90 direction"], [
    ["Share of new pipeline from Tier 1", "Not established", "Increase"],
    ["Win rate by ICP tier", "Not established", "Tier 1 above Tier 2"],
    ["Coordination hours per launch", "Estimated 15 to 20", "Decrease by at least 30 percent"],
    ["Tasks assigned before launch week", "Not established", "Reach 90 percent"],
    ["Message correction incidents", "At least one fictional example", "Decrease"],
    ["Approved enablement turnaround", "Not established", "Target two business days"],
  ], [3200, 2800, 3360]),
  h2("CEO enforcement mechanisms"),
  bullet("Open pipeline reviews with Tier 1 mix, not total opportunity count."),
  bullet("Require an explicit exception for accounts outside Tier 1 or Tier 2."),
  bullet("Review marketing performance by ICP tier so low-value reach cannot hide inside blended reporting."),
  bullet("After ten or more usable closed-won deals exist, graduate this research-based ICP to the NexaCore sharpening-matrix workflow."),

  h1("Evidence Register and Validation Plan"),
  table(["Claim or decision", "Evidence available", "Confidence", "Next validation"], [
    ["Monthly launch coordination pain exists", "Supplied fictional interview answers", "Medium", "Interview five additional companies and reconstruct last launch"],
    ["15 to 20 hours are spent per launch", "Respondent estimate", "Low to medium", "Time study during live pilot"],
    ["100 to 250 employees is the best size band", "One fictional company profile", "Low", "Compare win, retention, and cycle data across size bands"],
    ["Product Marketing is the champion", "Role and workflow description", "Medium", "Confirm with two additional Product Marketing leaders"],
    ["Human approval is required", "Operating boundary answer", "Medium", "Document security, legal, and approval requirements"],
    ["The offer should combine operator and automation", "Derived judgment", "Low", "Test software-only, managed-service, and hybrid pilot options"],
  ], [2500, 2800, 1100, 2960]),
  callout("Status", "This is a research-based ICP because the supplied source is fictional and contains no verified customer cohort, closed-won deal data, external research, or independent customer transcripts. It is ready for customer discovery and a controlled pilot, not broad outbound."),
  h1("Version and Owner"),
  table(["Field", "Value"], [
    ["Version", "v1.0 NexaCore-style research ICP"],
    ["Prepared for", "SignalForge Ops fictional test company"],
    ["Prepared by", "NexaCore Revenue Partners methodology, executed in the current workspace"],
    ["Date", "19 September 2026"],
    ["Next review", "After five additional interviews or the first measured pilot"],
    ["Downstream handoff", "Problem Matrix Map or Value Wedge Builder after Tier 1 is confirmed"],
  ], [2600, 6760]),
];

const doc = new Document({
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  styles: { default: { document: { run: { font: "Arial", size: 22, color: "111827" }, paragraph: { spacing: { line: 276 } } } }, paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", run: { font: "Arial", size: 32, bold: true, color: navy }, paragraph: { spacing: { before: 420, after: 180 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", run: { font: "Arial", size: 26, bold: true, color: navy }, paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
  ] },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("NexaCore Revenue Partners | SignalForge Ops | ", { size: 18, color: "64748B" }), PageNumber.CURRENT], spacing: { after: 0 } })] }) }, children }],
});

const markdown = `# SignalForge Ops Ideal Customer Profile\n\nThis is a fictional test-company ICP built from the supplied client_ICP.docx using the NexaCore ICP Definition standard. It includes a scored segment comparison, Tier 1 and Tier 2 commitments, six profile sections, ranked pain gaps, objections and proof, customer language, and a CEO operationalization plan.\n\nThe evidence base is fictional and should not be used for outbound targeting.\n`;
fs.writeFileSync(mdPath, markdown, "utf8");
fs.writeFileSync(metaPath, JSON.stringify({ title: "SignalForge Ops Ideal Customer Profile", author: "NexaCore Revenue Partners methodology", created: "2026-09-19", status: "research-based working hypothesis", source: "C:/Users/GHOST PROTOCOL/Downloads/client_ICP.docx", related_files: [path.basename(docxPath), path.basename(mdPath)], tags: ["ICP", "NexaCore", "SignalForge Ops", "fictional test data"], summary: "Scored, operational ICP with evidence register and validation plan." }, null, 2));
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(docxPath, buffer);
console.log(JSON.stringify({ docxPath, mdPath, metaPath, bytes: buffer.length }));
