# Sparkline

Document trust pipeline: an agent extracts claims from documents using
**Nutrient DWS**, catches contradictions between documents, then checks claims
against live public data via **SerpApi** — flagging anything a human needs to
sign off on, with a signed audit trail.

Built for the DevNetwork API + Cloud + AI Hackathon 2026.

## The three beats

| Beat | What happens | Powered by |
|---|---|---|
| **1 — Doc vs. Doc** | Two documents contradict each other | DWS extraction + confidence scores |
| **2 — Doc vs. Reality** | A claim is checked against live data and found stale | SerpApi live search |
| **3 — Human Sign-Off** | Flagged items reviewed in embedded viewer; approval creates a signed record | DWS Viewer + digital signing |

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in API keys
```

Verify both API integrations (Day-1 checklist):

```bash
npm run smoke:nutrient
npm run smoke:serpapi
```

Run the app:

```bash
npm run dev
```

## Layout

```
app/api/
├── extract/          # Beat 1 — DWS extraction + confidence
├── contradictions/   # Beat 1 — doc-vs-doc compare
├── staleness/        # Beat 2 — SerpApi live check
├── viewer-session/   # Beat 3 — Viewer session token
└── sign/             # Beat 3 — DWS digital signing
lib/                  # nutrient, serpapi, contradiction, score, types
components/           # ClaimCard, TrustScoreBadge, ViewerEmbed
documents/            # synthetic demo PDFs (see documents/README.md)
docs/demo-script.md   # video script — draft before building
scripts/              # smoke tests for both APIs
```

Unimplemented functions throw with a `TODO(beat-N)` pointer — grep `TODO(beat`
to see remaining work in build order.
