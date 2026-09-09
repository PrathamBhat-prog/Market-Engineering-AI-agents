# Marketing Engineering Signal Monitor

This first tangible agent implements the core Marketing Engineering Concepts pattern:

`retrieve -> compare with memory -> reason -> route -> deliver`

It reads a current signal file and a previous baseline, detects changes, scores severity, and writes a human-reviewable report. The decision step is deliberately isolated so an AI model can be added later without changing the workflow contract.

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

The sample includes a high-severity pricing change, a medium-severity hiring signal, and an unchanged account that should produce no alert.
