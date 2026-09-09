# Marketing Engineering Signal Monitor

This first tangible agent implements the core Marketing Engineering Concepts pattern:

`retrieve -> compare with memory -> reason -> route -> deliver`

It reads a current signal file and a previous baseline, detects changes, maps each signal to a marketing-engineering problem, scores service fit, and writes a human-reviewable report. The decision step is deliberately isolated so an AI model can be added later without changing the workflow contract.

The current practice data uses real public-source records. It is intentionally conservative: a funding announcement, expansion announcement, media article, or job posting is a trigger hypothesis, not proof of a buying problem. Only direct operational evidence can reach `qualified`, and even that requires human validation.

## Run

```powershell
node .\src\signal-monitor.mjs .\examples\signals-current.json .\examples\signals-previous.json
```

Ingest a Google News RSS feed or the included local fixture:

```powershell
node .\src\google-news-rss.mjs .\examples\google-news-sample.xml .\examples\news-signals.json
```

Outputs are written to `output/`:

- `signal-report.json` — structured findings
- `signal-report.md` — review-ready report
- `signals-baseline.json` — rotated memory for the next run
- `signal-review.csv` — Excel-compatible review export

The service-fit step currently routes signals to problem hypotheses such as:

- marketing-operations handoff
- agentic-marketing governance
- post-acquisition marketing integration
- international GTM operations
- launch-to-scale operations

Each finding includes the service to investigate, the AI-engineering role inside that service, and the validation step required before outreach.
