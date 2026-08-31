# Demo Claims Spec — verbatim content for both synthetic documents

Closes plan §6 Day-1 item "define the exact synthetic documents" and §11.15.
Write the PDFs from this spec, change nothing without updating it here first.

**Scenario:** Halcyon Infrastructure Partners (fictional PE firm) is evaluating
the acquisition of the **Wrenfield Residential Solar Portfolio** (fictional) —
250 MW aggregate distributed solar with a planned expansion tranche installed
under a master installation agreement with **Freedom Forever LLC** (real
company; the relationship is fictional). Both documents carry the footer:

> *Synthetic document created for hackathon demonstration purposes.*

Fictional: firms, portfolio, financials, contract. Real: Freedom Forever's
Chapter 11 filing (Apr 15, 2026 — verified via SerpApi, see
`serpapi-query-log.md`).

---

## Doc A — Investment Committee Memo

Author: Halcyon Infrastructure Partners · **Dated March 20, 2026** (pre-filing —
the memo was *accurate when written*; reality changed. That's the demo point.)
Length: 2–3 pages. Sections: Executive Summary · Transaction Overview ·
Key Counterparties · Risks · Recommendation.

| # | Claim (verbatim in doc) | Value | Expected state |
|---|---|---|---|
| A1 | "Expansion program installation cost is estimated at **$186M**." | $186M | **CONFLICTING** vs B1 |
| A2 | "The portfolio comprises **250 MW** of aggregate installed and contracted capacity." | 250 MW | Cross-doc consistent w/ B2 |
| A3 | "Expansion tranche targets commercial operation in **Q4 2027**." | Q4 2027 | Cross-doc consistent w/ B3 |
| A4 | "Master installation agreement with **Freedom Forever LLC**, executed January 2026, remains **in good standing**." | ACTIVE | **STALE** — Ch. 11 filed Apr 15, 2026 |
| A5 | "Freedom Forever is **one of the largest residential solar installers in the United States**." | scale claim | **CORROBORATED** — live snippets carry this phrase verbatim |
| A6 | "Installer-backed **25-year workmanship warranty** covers the installed base." | warranty | **REVIEW REQUIRED** — hinges on A4; subjective/human |

## Doc B — Independent Engineering Report

Author: Ardenfell Engineering Advisors (fictional IE) · **Dated February 10, 2026**
Length: 2–3 pages. Sections: Scope · Technical Review · Cost Assessment ·
Schedule · Assumptions.

| # | Claim (verbatim in doc) | Value | Expected state |
|---|---|---|---|
| B1 | "We estimate total expansion installation cost at **$211M**." | $211M | **CONFLICTING** vs A1 — Δ $25M, **13.4%**, materiality HIGH |
| B2 | "Aggregate portfolio capacity of **250 MW** verified against interconnection documentation." | 250 MW | Cross-doc consistent w/ A2 |
| B3 | "Commercial operation of the expansion tranche is achievable by **Q4 2027**." | Q4 2027 | Cross-doc consistent w/ A3 |
| B4 | "Design assumes Tier-1 **440 W modules**." | equipment | UNVERIFIED — private spec |
| B5 | "O&M cost assumption of **$14.2M per year** is within market range." | $14.2M/yr | UNVERIFIED — private |

11 claims total (plan §12.3 budget: 8–12). Exactly **one** planted
contradiction (A1/B1) and **one** externally corroborated claim (A5).

---

## Verification routing (what the demo shows per §11.9)

| Claims | Strategy | Outcome shown |
|---|---|---|
| A1 ↔ B1 | Cross-document | CONFLICTING · Δ$25M · 13.4% · HIGH |
| A2 ↔ B2, A3 ↔ B3 | Cross-document | Consistent |
| A4 | External (SerpApi) | STALE · CRITICAL · evidence: Kroll/Morris Nichols/trade press |
| A5 | External (SerpApi) | CORROBORATED — same query as A4, different verdict |
| A6 | Human | REVIEW REQUIRED |
| B4, B5 | None available | UNVERIFIED |

A4 + A5 resolve from **one** live query (`Freedom Forever solar Chapter 11
bankruptcy filing` — stability-verified 3×): one claim corroborated, one stale.
Engine visibly distinguishes agreement from conflict (§11.8's requirement).

## Normalization note (Beat 1 logic)

Doc A says "installation cost is estimated"; Doc B says "total expansion
installation cost" — the comparator must normalize both to the same claim type
(`EXPANSION_INSTALL_COST`) before comparing. Deliberate wording difference;
keep it when authoring the PDFs (§11.4's technical point).

## Authoring rules (from §12.3–12.4, §14)

- Markdown/HTML → PDF; 2–3 pages each; no giant tables
- Claims appear in flowing prose AND in one simple summary table per doc —
  gives DWS extraction two shots at each field
- Memo dated pre-Apr-15-2026; staleness is honest, not manufactured
- No real person names; fictional firms only, except Freedom Forever LLC
  (public, real event) — no fabricated financials attributed to it beyond the
  clearly-labeled fictional contract relationship
