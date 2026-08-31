# SerpApi Query Log — §13.6 protocol

Pass bar (§13.2): authoritative source top-5 · status parseable in snippet · stable across runs · programmatically distinguishable.

| When | Mode | Query | Top authoritative domain | Status in snippet? | Stable? |
|---|---|---|---|---|---|
| 2026-08-31T04:45:09.293Z | discover | CAISO interconnection queue withdrawn projects 2026 | caiso.com | yes (active, withdrawn, queue) | n/a |
| 2026-08-31T04:45:10.391Z | discover | CAISO generator interconnection queue status report | caiso.com | yes (queue) | n/a |
| 2026-08-31T04:45:14.916Z | discover | CAISO queue cluster 15 withdrawn solar | caiso.com | yes (active, withdrawn, queue) | n/a |
| 2026-08-31T04:45:17.834Z | discover | California ISO interconnection queue position status solar project | caiso.com | yes (queue) | n/a |
| 2026-08-31T04:45:18.905Z | discover | solar EPC contractor bankruptcy 2026 | — | yes (bankruptcy) | n/a |
| 2026-08-31T04:45:20.426Z | discover | renewable energy contractor Chapter 11 filing 2026 | — | yes (bankruptcy, chapter 11) | n/a |
| 2026-08-31T04:45:23.054Z | discover | solar developer acquired 2026 | — | yes (acquired) | n/a |
| 2026-08-31T04:45:25.485Z | discover | California solar interconnection rule change 2026 | cpuc.ca.gov | no | n/a |
| 2026-08-31T04:45:27.842Z | discover | federal solar tax credit change 2026 | irs.gov | yes (in service) | n/a |
| 2026-08-31T04:45:29.525Z | discover | CPUC solar program modification 2026 | cpuc.ca.gov | yes (modified) | n/a |
| 2026-08-31T04:46:37.846Z | verify | named solar project withdrawn from CAISO interconnection queue | caiso.com | yes (withdrawn, queue) | yes |
| 2026-08-31T04:47:19.665Z | verify | Oro Verde Solar Project CAISO interconnection queue status | caiso.com | yes (queue) | yes |
| 2026-08-31T04:47:51.937Z | verify | Freedom Forever solar Chapter 11 bankruptcy filing | solarpowerworldonline.com | yes (bankruptcy) | yes |

---

## §13.7 DECISION — CLOSED 2026-08-31: Path B (Counterparty Status)

**Path A (CAISO) verdict: marginal fail.** caiso.com dominates results, but
project-level status lives in `publicqueuereport.xlsx`. Google indexes the
spreadsheet's *content* and sometimes shows a project row in the snippet
("ORO VERDE SOLAR PROJECT … 494 … WITHDRAWN"), but the status column truncates
unpredictably across runs — status not consistently machine-parseable (§13.2
criterion 2/4 fail, exactly the §13.8 predicted failure mode). Too fragile on
camera. Third-party HTML mirrors (interconnection.fyi, askthegrid.com) exist
but their per-project pages don't reliably reach top-5.

**Path B verdict: clean pass** — top-5 identical across 3 runs, status dated
and parseable in multiple snippets.

### Locked identifiers (§11.6)

| Field | Value |
|---|---|
| Counterparty | **Freedom Forever LLC** — large US residential solar installer |
| Real public event | Voluntary Chapter 11 petition, **April 15, 2026**, US Bankruptcy Court, Delaware |
| Court-grade source | `restructuring.ra.kroll.com/FreedomForever/` (official claims agent) — snippet: "On April 15, 2026, Freedom Forever LLC filed a voluntary petition for relief under Chapter 11" |
| Legal source | `morrisnichols.com` (debtor's Delaware counsel) — same filing date in snippet |
| Trade press | `solarpowerworldonline.com` (April + June 2026 coverage) |
| Reliable query | `Freedom Forever solar Chapter 11 bankruptcy filing` |
| Parse targets | "Chapter 11", "bankruptcy", "April 15, 2026" in snippets |

### Demo scenario implication (Beat 2)

Synthetic Investment Committee Memo (dated pre-April 2026) claims:
> "Installation partner: Freedom Forever LLC — contract in good standing."

Live SerpApi check surfaces the Chapter 11 filing → claim state **STALE**,
materiality **CRITICAL**. Per §12.4: the bankruptcy is real public fact; the
*contract relationship* is fictional and the memo is labeled synthetic —
fictional project + fictional sponsor around a real, verifiable counterparty
event.

### Corroborated-claim candidate (Beat 2B, §11.8)

`federal solar tax credit change 2026` returned irs.gov top-1 with an answer
box — a memo claim about the ITC rate/deadline ("projects must be placed in
service by Dec 31…") is a strong externally-corroborated candidate. Confirm
exact wording from `data/serpapi-raw/` before planting it in the memo.

### Search budget used

~19 of 100 free-tier searches (10 discover + 9 verify).
