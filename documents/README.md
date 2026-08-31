# Demo documents

The synthetic diligence room. Claim content is specified verbatim in
`docs/demo-claims.md` — change nothing here without updating that spec first.

```
documents/
├── doc-a-investment-memo.md      # source: Halcyon IC memo (Mar 20, 2026)
├── doc-b-engineering-report.md   # source: Ardenfell IE report (Feb 10, 2026)
├── doc-a.pdf                     # generated — do not edit by hand
└── doc-b.pdf                     # generated — do not edit by hand
```

- **Regenerate PDFs** after editing a markdown source: `npm run docs:build`
  (converts via DWS — same API the pipeline demos)
- **Verify extraction still works** after any rewrite: `npm run test:extraction`
  (must recover 12/12 planted claims; exits nonzero otherwise)

Planted structure: one doc-vs-doc contradiction ($186M vs $211M expansion
cost), one stale claim (Freedom Forever contract "in good standing" — real
Ch. 11 filed Apr 15, 2026), one externally corroborated claim (installer
scale). Both docs are labeled synthetic; fictional names are
collision-checked against real companies (see `docs/serpapi-query-log.md`
for the evidence trail).
