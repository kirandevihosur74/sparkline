# DevNetwork [API + Cloud + AI] Hackathon 2026 — Build Plan (v3)

**Today:** Sunday, Aug 30 · **Deadline:** Thursday, Sept 3 @ 10:00 AM PT — **~3 days of real runway**
**Target tracks — locked, no more debating:** Overall Winner ($12,500) + Nutrient DWS ($1,500) + SerpApi ($3,000)
**Dropped:** name.com (weak fit, adds a third integration paradigm under time pressure — not worth the risk)
**Team:** 2 people

> **Ground rule:** every hour spent still deciding scope is an hour not spent building. Section 8 (Open Decisions) must be closed out **today**.

---

## 1. Strategy Summary

- **Vertical:** RAI's existing problem space (document trust / cross-referencing for high-stakes decisions). **New repo, new code, new project name** — not a copy of the RAI codebase, not RAI branding anywhere in the submission.
- **Why this vertical, not a new one:** 3 days doesn't support inventing a new problem from zero. Reusing validated workflow shape and design instincts is legitimate and fast; reusing actual RAI code/branding is not, and isn't necessary.
- **Why Nutrient + SerpApi, and only these two:** both map onto pipeline stages you already understand deeply (extraction, live data). Two deep integrations beats three shallow ones. Nutrient's judge (their own engineer) will recognize a well-built pipeline; a third API adds real integration risk for a smaller, worse-fit prize.
- **Core mechanic (memorize this sentence — it's your entire pitch):**
  > *An agent extracts a claim from a document using Nutrient DWS, catches it contradicting another document, then checks it against live public data via SerpApi to see if it's still true — flagging anything a human needs to sign off on, with a full audit trail.*

---

## 2. The Two-Beat Demo (this IS the product)

| Beat | What happens | Powered by |
|---|---|---|
| **Beat 1 — Doc vs. Doc** | Two documents make claims that contradict each other (e.g., mismatched dates, figures, or terms) | Nutrient DWS extraction + confidence scores |
| **Beat 2 — Doc vs. Reality** | A claim in a document is checked against live public data and found to be stale/outdated | SerpApi live search |
| **Beat 3 — Human Sign-Off** | Flagged items route to a human reviewer via an embedded viewer; approval creates a signed, auditable record | DWS Viewer + DWS digital signing |

This is the whole build. Resist adding anything that doesn't serve one of these three beats.

---

## 3. RAI → Sponsor Component Mapping

| RAI component | Sponsor equivalent | What changes |
|---|---|---|
| Doc extractors | **Nutrient DWS Data Extraction API** | Real extraction + native per-field confidence, replaces whatever RAI uses today |
| Cross-examiner's citation logic | DWS source-location metadata | Citations come free from DWS output — no extra build needed |
| Scorer (confidence/risk) | Blended score: DWS confidence + cross-reference confidence | One unified number shown to the user, not three |
| Trust ledger / review dashboard | **DWS Viewer**, embedded | Human sees the actual source doc, highlighted — this is your best visual demo moment |
| Liaison agent output | **DWS digital signing** | Human-approved flag becomes a signed, dated, tamper-evident record → satisfies Nutrient's "audit trail" bonus criterion explicitly |
| Data Scouts (NREL, county code, ISO queues) | **SerpApi** | Live search replaces static scraping — same job |
| *(new — doesn't exist in RAI today)* | **SerpApi staleness check** | Doc claim vs. current public reality — your most original beat |

**Explicitly NOT porting over:** full 9-agent pipeline, portfolio dashboard, Port control plane, telemetry/tracing, multi-document-type support, RAI branding/name.

---

## 4. Judging Criteria — What Each Beat Needs to Prove

### Overall Winner (Round 1)
| Criterion | Proven by |
|---|---|
| **Progress** | Beats 1–3 actually running, live, on real API calls — not mocked |
| **Concept** | The problem stated plainly, with real stakes, in the first 20 seconds of the video |
| **Feasibility** | One line on market/buyer/timing — borrow Nutrient's own "wave of new mandates" framing |

### Nutrient DWS Challenge
- DWS must be used **meaningfully** for a core operation — Beat 1 + Beat 3 satisfy this directly
- Bonus credit: deterministic + auditable output, human-in-the-loop — Beat 3 (Viewer + signing) is built specifically to hit this
- **Required submission line:** *"DWS handles extraction and confidence scoring for every document; the Viewer is where a human makes the final call on ambiguous flags."*

### SerpApi — Best AI Use Case
- Scored on: **originality, technical execution, integration depth, usability, potential impact**
- Beat 2 (staleness check) is your originality angle — lean on it hard in the video
- **Required submission line:** *"SerpApi checks whether a claim extracted from a document is still true against current public records — catching drift between what a document says and what's actually happening now."*

---

## 5. Demo Video Structure (2–4 min, script this TODAY, not after building)

| Segment | Time | Content |
|---|---|---|
| Problem | 0:00–0:20 | Plain-language stakes. No jargon. "A missed contradiction here costs [X]." |
| Beat 1 | 0:20–1:00 | Show extraction + doc-vs-doc contradiction caught, confidence scores visible |
| Beat 2 | 1:00–1:40 | Show the SerpApi live check catching a stale claim — this is your standout moment |
| Beat 3 | 1:40–2:10 | Human review in DWS Viewer, sign-off, audit trail created |
| Why it's a company | 2:10–2:30 | Market/buyer/timing, one sentence |
| Sponsor lines | woven in during Beat 1 (Nutrient) and Beat 2 (SerpApi), not tacked on at the end |

---

## 6. Build Sequence — 3 Days

### Day 1 (Today, Aug 30) — Decide + De-risk
**Morning**
- [ ] Close every item in Section 8 — document type, exact contradiction, exact staleness scenario, project name
- [ ] Create new repo, initialize project structure
- [ ] Create Nutrient DWS account, make one real API call, confirm response
- [ ] Create SerpApi account, make one real API call, confirm response

**Afternoon/Evening**
- [ ] Draft demo video script in full (Section 5 template)
- [ ] Define the exact two synthetic documents (Beat 1) and the exact live data source to check (Beat 2) — write the actual content/numbers down

> **If either API auth/setup is fighting you by end of Day 1 — flag it immediately, don't lose Day 2 to it.**

### Day 2 (Aug 31) — Core Pipeline
- [ ] Wire DWS extraction → structured fields + confidence scores
- [ ] Build doc-vs-doc contradiction detection (Beat 1) — real logic, real output
- [ ] Wire SerpApi → live staleness check (Beat 2) — real logic, real output
- [ ] Rough UI connecting all three beats — ugly is fine, *connected* is not optional

**End of Day 2 checkpoint:** if Beats 1 and 2 aren't both producing real output by tonight, cut scope now — don't wait until Day 3 to discover you're behind.

### Day 3 (Sept 1–2, plus early Sept 3) — Trust Layer, Polish, Submit
- [ ] Embed DWS Viewer for Beat 3 human review
- [ ] Add DWS digital signing for approved flags
- [ ] Blend confidence scores into one visible trust score
- [ ] Record demo video using Day 1 script
- [ ] Write Devpost "Whole Story" — honest framing: *"inspired by prior work on document trust workflows"*
- [ ] Submit a bare-minimum version EARLY (well before Sept 3, 10:00 AM PT) — iterate after, don't risk a last-minute platform issue

---

## 7. Risk Management

- **#1 real risk: API integration friction, not logic design.** Both APIs get tested for real on Day 1, not assumed to "just work" on Day 2.
- **If forced to cut, cut in this order:** (1) visual polish, (2) Nutrient signing feature, (3) never cut Beat 2 (staleness) — it's your differentiator — and never cut the video script quality.
- **Two people, thin margin:** if one integration is clearly harder than expected by Day 2 midday, don't split further — both people converge on whichever beat is behind.
- **Video is the highest-leverage lever for Top 5.** Judges skim fast; a sharp, well-structured video beats a more "complete" but confusingly presented project.

---

## 8. Open Decisions — Close These Today

- [ ] **Project name** (not "RAI")
- [ ] **Document type** for the demo (e.g., permitting doc, land title, contract, environmental study excerpt)
- [ ] **Exact doc-vs-doc contradiction** — specific numbers/dates that mismatch, written down verbatim
- [ ] **Exact doc-vs-reality staleness scenario** — what specific public record SerpApi checks against
- [ ] **Who owns which integration** — Nutrient vs. SerpApi, assigned by end of today

---

## 9. Sponsor Documentation & Getting-Started Steps

### 9.1 Nutrient DWS

Nutrient's platform has **two separate products** you'll likely use together — don't confuse them when reading docs:

| Product | What it's for | Relevant to |
|---|---|---|
| **DWS Processor API** | Document-in/document-out processing: extraction, conversion, redaction, digital signing, OCR | Beat 1 (extraction) + Beat 3 (signing) |
| **DWS Viewer API** | Embeddable PDF viewer with annotation, form-filling, and a backend HTTP API for uploading/managing documents | Beat 3 (human review UI) |

**⚠️ Note:** DWS Viewer API's public docs currently describe it as **beta / trial mode**, which renders documents with a watermark and is explicitly flagged as "not fit for production use." For a hackathon demo this is almost certainly fine — a watermark won't hurt your video — but confirm with your Nutrient hackathon credentials (the campaign login the challenge page provided) whether hackathon accounts get watermark-free access.

**Getting started — DWS Processor API (extraction, signing):**
1. Sign up for a free account at the Nutrient DWS dashboard to get your **Processor API key**.
2. Authenticate every request via an HTTP header — either your raw API token, or a generated **JWT** (JWT lets you scope/time-limit/revoke access, useful if multiple teammates are calling the API).
3. Install a client library to skip raw HTTP handling:
   - TypeScript: `npm install @nutrient-sdk/dws-client-typescript`
   - Python: `pip install nutrient-dws`
   - (Java, C#, PHP also officially supported)
4. Nutrient also ships an **MCP server** for the Processor API — worth considering if your team is building with an AI coding agent (Claude Code, Cursor), since it lets the agent call DWS tools directly during development.
5. Use the **Postman collection** (linked from their docs) to test extraction/redaction/signing calls before wiring them into your app — this is the fastest way to confirm auth works on Day 1.
6. Credit system: **1 credit = 1 API operation** (rates vary per tool) — keep an eye on usage across a team of 2 hitting the API repeatedly while testing.

**Getting started — DWS Viewer API (human review embed):**
1. Sign up separately for the DWS Viewer dashboard (same Nutrient account, different product surface).
2. Create a new **application** in the Viewer API dashboard.
3. Upload a test document (Nutrient provides a sample PDF) and confirm it renders in the dashboard's built-in viewer first — before embedding it in your own app.
4. Client-side integration uses **Nutrient Web SDK** — quickest path is the CDN `<script>` tag in your `index.html`, giving you `window.NutrientViewer` in your frontend code. A React + Vite walkthrough is available in their docs if that's your stack.
5. Backend integration: generate a **session token** per document/user to authenticate the viewer securely — don't expose your raw API key client-side.
6. The Viewer API's backend HTTP endpoints let you upload documents, list/delete them, download as PDF, and pull metadata/text/rendered pages — useful if you want Beat 3's review UI to pull live status rather than just displaying a static embed.

**Nutrient hackathon-specific access:** the challenge page provided a direct campaign login —
`api.nutrient.io/campaigns/api-world-cloudx-ai-hackathon-2026/`
(credentials on the challenge page — not committed to this public repo)
Confirm on Day 1 whether this grants elevated/watermark-free credits versus a standard free signup.

---

### 9.2 SerpApi — Complete Technical Reference

#### Step 1 — Account & API key
1. Sign up at **serpapi.com** (free tier is enough for today's testing).
2. Your API key lives on your dashboard: `serpapi.com/dashboard`.
3. Copy it somewhere safe. You need it for code — **not** for the playground.

#### Step 2 — Playground (use this TODAY, no code required)
1. Go to `serpapi.com/playground` (also linked from site nav).
2. Form-based UI: choose an engine (Google Search is default), type your query in `q`, optionally set `location`.
3. Hit search → see the **exact JSON response** the API would return, plus a rendered preview.
4. No API key setup, no code — you're logged in, so it uses your account automatically.

> **This is where today's Option A test happens.** You're reading the JSON to answer one question: is the status text present in `organic_results[].snippet`, or only behind a link?

#### Step 3 — API structure (for the build)
There is **no endpoint for you to host or set up** — SerpApi hosts it. You send GET requests to theirs.

**Base endpoint:**
```
https://serpapi.com/search
```

**Required parameters:**

| Param | Purpose |
|---|---|
| `api_key` | Your key from the dashboard |
| `engine` | `google` (default), or `google_news`, `google_maps`, `bing`, etc. |
| `q` | The search query string |

**Optional but useful:**

| Param | Purpose |
|---|---|
| `location` | Geographic origin of the search, e.g. `"California, United States"` |
| `hl` | Interface language, e.g. `en` |
| `gl` | Country, e.g. `us` |
| `num` | Number of results |

**Raw HTTP — simplest possible version:**
```bash
curl "https://serpapi.com/search?engine=google&q=CAISO+interconnection+queue+withdrawn&api_key=YOUR_KEY"
```

**Python (recommended for backend):**
```python
import serpapi

client = serpapi.Client(api_key="YOUR_KEY")
results = client.search(
    q="CAISO interconnection queue withdrawn",
    engine="google",
    location="California, United States",
    hl="en",
    gl="us"
)

for r in results["organic_results"]:
    print(r["title"], r["link"], r.get("snippet"))
```
Install with `pip install serpapi`

**Node / JS:**
```javascript
const response = await fetch(
  `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}`
);
const data = await response.json();
```

#### Step 4 — Response shape (what you'll parse)
```json
{
  "organic_results": [
    {
      "position": 1,
      "title": "...",
      "link": "https://...",
      "snippet": "...",
      "source": "..."
    }
  ],
  "knowledge_graph": { },
  "answer_box": { }
}
```

**`snippet` is the critical field.** If your status word appears there, you can parse it without a second fetch of the destination page. `knowledge_graph` and `answer_box` are sometimes present and contain more structured facts — check for them during playground testing.

#### Step 5 — Key handling
- Store as an environment variable: `SERPAPI_API_KEY=...`
- **Never commit it** — the hackathon repo will be public
- Add `.env` to `.gitignore` **before** the first commit

#### What SerpApi is and isn't
- **Is:** a hosted search-results API. One GET request, structured JSON back. No scraping, no browser automation, no crawling infrastructure to build.
- **Isn't:** the hard part of your build. The complexity lives in the layers *around* the call — query construction from extracted claims, authoritative-source filtering, and claim comparison. That's your logic, not SerpApi setup.
- Each request runs against a **real, current search** with no caching delay — exactly what Beat 2 depends on.

---

## 10. Honest Odds Check

Top 5 out of a field regularly drawing 300+ teams (1,248 registered for this event) is genuinely competitive — this is not a safe bet. What's in your favor: the problem/workflow thinking is already done, and both sponsor fits are strong and specific rather than generic. What's working against you: 2 people, 3 days, two unfamiliar APIs, from a new repo. The single biggest lever left in your control is **closing Section 8 today** — ambiguity, not sponsor choice, is what kills hackathon teams.

---

## 11. Demo Data Strategy — Synthetic Diligence Room + Real Public Evidence

### 11.1 Core Principle

Use a **hybrid dataset with a deliberate boundary**:

> **Synthetic data represents the private diligence room. Real public data represents the outside world. SerpApi is the bridge between them.**

This is both realistic and technically defensible. Real investment memos, engineering reports, financial models, and transaction diligence rooms are generally confidential, so the demo should not pretend to have access to authentic private deal documents. Instead, create realistic synthetic documents and clearly label them as demonstration materials. The external facts used to validate time-sensitive claims should be real and retrieved live.

### 11.2 Recommended Demo Scenario

**Decision:** Should an infrastructure investor acquire a utility-scale California solar project?

The product is not simply summarizing the diligence room. It is testing whether the facts supporting a high-stakes investment decision can still be trusted.

The demo should show three distinct evidence states:

1. **CONFLICTING** — two private documents disagree about the same underlying fact.
2. **STALE** — a private document contains a claim that no longer matches current public information.
3. **CORROBORATED** — private documents and current external evidence agree.

This gives the workflow more depth than a single contradiction and demonstrates that different claims require different verification strategies.

### 11.3 Synthetic Data — The Private Diligence Room

Create 2–3 polished synthetic PDFs for the same acquisition target. These documents should be processed live by Nutrient DWS.

| Synthetic document | Example claims |
|---|---|
| **Investment Committee Memo** | EPC estimate = **$186M**; COD = Q3 2027; interconnection status = Active; references a real public queue/project identifier |
| **Independent Engineering Report** | EPC estimate = **$211M**; COD = Q4 2027; capacity = 250 MW |
| **Project Status Report** | Interconnection status = Active; capacity = 250 MW; relevant public project/queue identifier |

Each PDF should include a small disclosure such as:

> **Synthetic document created for hackathon demonstration purposes.**

The documents are synthetic because the purpose of Beat 1 is to demonstrate the application's extraction, normalization, comparison, and reasoning workflow — not to imply access to confidential investment documents.

### 11.4 Beat 1 — Private Document vs. Private Document

Plant one highly legible material contradiction in the synthetic diligence room.

**Investment Committee Memo**

- EPC estimate: **$186M**

**Independent Engineering Report**

- Current EPC estimate: **$211M**

Nutrient extracts both claims, including their source location and confidence. The application normalizes terms such as “EPC budget,” “EPC estimate,” or “construction estimate” into the same underlying claim type and compares them.

Expected output:

- Difference: **$25M**
- Variance: **13.4%**
- Claim state: **CONFLICTING**
- Materiality: **HIGH**
- Verification strategy: **Cross-document comparison**

The important technical point is that the system is not merely finding different numbers. It recognizes that two differently worded passages refer to the same underlying project fact, calculates the variance, and determines that the discrepancy is material to the investment decision.

### 11.5 Real Public Data — The External Ground Truth

The SerpApi portion should **not** validate against fabricated public information.

Select a **real California ISO (CAISO) interconnection project/queue record** first, then construct the synthetic diligence documents around the minimum identifiers necessary to reference that public record.

Useful public fields may include:

- Queue/project identifier
- Project/facility name where available
- Application or queue status
- Active / complete / withdrawn state
- Generating facility type
- Capacity (MW)
- County / location
- Point of interconnection
- Utility / transmission owner
- Study milestones or status
- Suspension or withdrawal information where applicable

**Important:** CAISO (or another selected authoritative public source) is the source of truth. **SerpApi is the live research/discovery layer, not the authority itself.**

### 11.6 Work Backwards From the Public Record

Do not invent a fictional project and then hope SerpApi can find evidence for it.

Use this sequence:

1. Find several real public CAISO records with clear, interesting, and searchable status information.
2. Test each candidate through SerpApi.
3. Choose the record that produces the most reliable and understandable live search result.
4. Record the stable public identifiers the agent can use for verification.
5. Only then write the synthetic investment memo and engineering/status documents around that identifier.

Ideal candidate characteristics:

- Solar or solar + storage project
- Easy-to-understand capacity/location
- Strong public identifier
- Clear current status
- Preferably an interesting state such as **withdrawn, suspended, delayed, or otherwise materially changed**
- SerpApi reliably surfaces an authoritative source for it

### 11.7 Beat 2 — Private Document vs. Current Reality

The synthetic internal memo could contain a claim such as:

> **Interconnection status: ACTIVE**

and reference the real public project/queue identifier selected above.

Nutrient extracts something conceptually equivalent to:

```text
CLAIM
Type: INTERCONNECTION_STATUS
Value: ACTIVE
Public Identifier: [selected real identifier]
Source: Investment Committee Memo
Page: [X]
Document Date: [date]
Extraction Confidence: [DWS output]
```

The agent then decides whether the claim is externally verifiable.

**Interconnection status** is a strong external-verification candidate because it is:

- material to the investment decision;
- time-sensitive;
- capable of changing after a document is written; and
- represented in public records.

The verification router sends this claim to the external-research workflow.

**Flow:**

Nutrient extraction
→ claim classification
→ verification strategy = **External**
→ query construction using project/queue identifiers
→ SerpApi live search
→ authoritative-source filtering
→ current public evidence
→ comparison against document claim
→ trust state

If the internal memo says **ACTIVE** while current authoritative evidence says **WITHDRAWN** (or another materially different state), the system returns:

- Claim state: **STALE**
- Materiality: **CRITICAL**
- Source document and page
- Current external evidence
- Timestamp of verification
- Human review required

This is the core SerpApi demo moment: the document may have been accurate when it was written, but **reality changed**.

### 11.8 Beat 2B — Corroborated Claim

Include at least one claim where internal and external evidence agree so the product does not appear designed only to manufacture warnings.

Example:

**Internal documents:** Capacity = 250 MW

**Current public record:** Capacity = 250 MW

Expected state:

> **CORROBORATED**

This demonstrates that the engine can distinguish agreement from conflict rather than treating every search result as a risk signal.

### 11.9 Verification Router

A sophisticated part of the workflow should be the agent deciding **how each claim can be verified** rather than sending every extracted sentence to a web search.

| Example claim | Verification strategy | Reason |
|---|---|---|
| EPC cost | **Cross-document** | Primarily private transaction information |
| Interconnection status | **External** | Current status is publicly verifiable |
| Project capacity | **Cross-document + External** | Appears in both private and public sources |
| Commercial operation date | **Cross-document + External where available** | May have both internal forecasts and public milestones |
| Management commentary | **Human / Unverified** | Subjective and not necessarily independently verifiable |

Possible high-level UI summary:

> **347 claims extracted**
>
> 241 Cross-document verification  
> 73 External verification  
> 21 Human review  
> 12 Insufficient evidence

These numbers do not need to be used unless they are genuinely produced or deliberately represented as demo fixture data. Do not present fabricated counts as live analysis output.

### 11.10 Claim States

Every material claim can resolve into a small set of understandable trust states:

- **CORROBORATED** — independent evidence agrees with the claim
- **CONFLICTING** — another relevant source disagrees
- **STALE** — newer/current evidence supersedes the document
- **UNVERIFIED** — insufficient evidence exists to make a determination
- **REVIEW REQUIRED** — ambiguity, low confidence, or high materiality requires human judgment
- **VERIFIED / APPROVED** — human reviewer has resolved the exception

This gives the product a stronger conceptual model than a generic document analyzer. The application is building a **living truth model of the project** from private documents and current external evidence.

### 11.11 Beat 3 — Human Review + Auditability

Material exceptions should not be automatically resolved by the AI.

For a stale interconnection-status claim, the reviewer should see an evidence chain such as:

```text
Investment Committee Memo
ACTIVE
June 2026
98% extraction confidence
        ↓
Current public evidence
WITHDRAWN
Current verification
        ↓
Comparison
MATERIAL CONFLICT
        ↓
Human review required
```

The reviewer opens the relevant source document in the Nutrient Viewer, sees the exact source passage, reviews the external evidence, and makes the final decision.

If signing is implemented, the resulting review record should include the reviewer decision, timestamp, evidence references, and signed/auditable approval record.

The complete provenance chain becomes:

> **Source document → extracted claim → normalized concept → verification strategy → comparison evidence → current public evidence → machine assessment → human decision → audit record**

### 11.12 What SerpApi Is Actually Doing

Avoid the weak implementation:

> PDF → generic Google query → show search results.

The desired implementation is:

> **Nutrient** extracts a material claim  
> → **Claim classifier** understands what kind of fact it represents  
> → **Verification router** determines whether external evidence should exist  
> → **Query builder** uses project identifiers and claim context  
> → **SerpApi** discovers current evidence  
> → **Source evaluator** prioritizes authoritative public sources  
> → **Claim comparator** compares current evidence with the document claim  
> → **Trust state** becomes CORROBORATED / STALE / CONFLICTING / UNVERIFIED  
> → **Human reviewer** resolves material exceptions

This makes SerpApi part of the reasoning architecture rather than a decorative search integration.

### 11.13 Data Boundary — Lock This In

**Synthetic / controlled by us:**

- Investment Committee Memo
- Independent Engineering Report
- Internal Project Status Report
- Financial assumptions
- Private EPC estimates
- Internal forecasts
- Deliberately planted doc-vs-doc contradiction

**Real / live:**

- Selected public CAISO project/queue record
- Current status and other relevant public fields
- Authoritative public evidence surfaced through SerpApi
- Actual SerpApi response used in the demo

**Do not synthesize:**

- The SerpApi result
- The authoritative public record used to establish current reality
- The evidence supporting the demo's stale-claim conclusion

### 11.14 Judge Explanation

If a judge asks where the data comes from, use this framing:

> **“The diligence documents in this demonstration are synthetic because real investment diligence rooms are confidential. Nutrient DWS processes those PDFs live. When the agent identifies a material claim that can change over time, it uses SerpApi to discover current public evidence. For this demonstration, the public project record is real, and the external verification is happening live.”**

If useful, follow with:

> **“We deliberately separate private enterprise evidence from public external evidence. The system chooses a verification strategy based on the type of claim instead of treating every fact the same way.”**

### 11.15 Immediate Data Tasks

Before writing the synthetic PDFs:

- [ ] Find **3–5 candidate real CAISO projects/queue records**
- [ ] Prefer candidates with an unambiguous and interesting current status
- [ ] Run test SerpApi queries for each candidate
- [ ] Confirm an authoritative public result is reliably surfaced
- [ ] Select the strongest candidate
- [ ] Record the exact identifiers/fields needed by the verification agent
- [ ] Define the synthetic memo's intentionally stale claim around that real identifier
- [ ] Define one externally corroborated claim using the same record
- [ ] Create the synthetic Investment Committee Memo
- [ ] Create the synthetic Independent Engineering Report
- [ ] Create the synthetic Project Status Report only if it materially improves the demo
- [ ] Label all synthetic documents clearly as hackathon demonstration materials

**Do not finalize the synthetic documents until the SerpApi candidate has been tested successfully.** The public-data path should determine the demo fixture, not the other way around.

---

## 12. Data Acquisition Strategy

### 12.1 What must be real vs. what you author

| Data type | Source | Realistic effort |
|---|---|---|
| Public/live evidence (SerpApi side) | **Must be real** — per the §11.13 boundary | 60–90 min of playground query testing |
| Synthetic diligence documents (Beat 1) | **You author these** | ~45–60 min total |
| Real-project scaffolding (identifiers, county, utility) | Real public skeleton | ~15 min once SerpApi test passes |

### 12.2 Acquiring the public/live data

- **Don't hunt for a source manually first.** Run SerpApi queries and see what actually comes back. Whatever SerpApi can reliably surface *is* your data source — working backwards from the API's real capability is faster than picking a source and hoping it's indexed.
- **Prefer HTML pages over PDFs or spreadsheets.** If the authoritative source requires downloading and parsing a file, you've added a step you don't have time for.

### 12.3 Authoring the synthetic documents

- Write them as **markdown/HTML, then convert to PDF** — don't fight Word layout or hunt for real template files.
- **Two documents, 2–3 pages each, 8–12 extractable claims total.** A third only if it materially improves the demo.
- **Write them last**, after the SerpApi test passes, so the stale claim references a confirmed-working real identifier (this is §11.6's rule — keep it).
- An LLM can draft a realistic investment memo and engineering report in minutes given the structure and specific claims to embed. ~30 min task, not a half-day.
- Plant **exactly one** doc-vs-doc contradiction and **one** corroborated claim. Every extra planted claim is another thing that has to work on camera.

### 12.4 Real-project scaffolding — safety note

Use a **real public project as the reference point** (real county, real utility, real queue identifier if CAISO passes) but wrap **synthetic** financials and internal commentary around it.

> ⚠️ **Do not attribute fabricated financial claims to a real, named company in a public repo.** Safer pattern: real *location and identifiers*, **fictional** developer/sponsor name in the memo.

### 12.5 What NOT to try to acquire

- Real diligence documents — confidential, unobtainable, and unnecessary
- A large corpus — you need 2 documents, not 20
- Historical/time-series data — none of the three beats require it

### 12.6 Today's sequence (half-day, front-loads every data dependency)

1. **SerpApi query testing** (60–90 min) → determines everything downstream
2. **Lock the real public identifier** you'll build around (15 min)
3. **Write the two synthetic PDFs** with specific claims embedded (45–60 min)
4. **Test Nutrient extraction against those PDFs** (30 min) — confirm DWS actually pulls the fields you planted, *before* Kiran builds logic on top

> **The thing that could blow this up:** if step 4 shows DWS extraction doesn't cleanly pull your planted claims (formatting, layout, table structure), you'll need to rewrite the synthetic docs. That's why extraction testing happens **today**, not Day 2.

---

## 13. Option A Test Protocol — CAISO Feasibility (RUN TODAY)

**Decision made:** Option A — test CAISO first, with a hard cutoff.

### 13.1 What Option A does and doesn't solve

- ✅ **Solves the discovery risk.** You find out today, not Day 2, whether CAISO works — moving failure from "too late to recover" to "time to pivot."
- ❌ **Doesn't solve the outcome risk.** Option A is a test, not a fallback. If it fails at 4pm and you haven't pre-decided Plan B, you burn Day 2 morning scrambling.

**Therefore: test Path A and Path B in the same session.** Marginal cost ~20 min; removes the scramble entirely.

### 13.2 Define "pass" BEFORE running queries

Set the bar now, or you'll rationalize a marginal result at 4pm.

A candidate **passes** only if all four are true:

1. SerpApi returns an **authoritative source** (CAISO, the utility, a regulator — not a blog or aggregator) in the top handful of results
2. That source contains the **current status as parseable text** — not buried in a downloadable spreadsheet or a PDF requiring fetch + OCR
3. Results are **stable across 2–3 repeated runs** — if top results shuffle meaningfully, the live demo could return something different on camera
4. You can **distinguish the status value programmatically**, not just by eye

> If a candidate requires "well, if we parse this news article's third paragraph…" — that's a **fail**, not a marginal pass. That fragility is exactly what breaks on camera.

### 13.3 Path A — CAISO Interconnection Status

Broad discovery queries:
```
CAISO interconnection queue withdrawn projects 2026
```
```
CAISO generator interconnection queue status report
```
```
CAISO queue cluster 15 withdrawn solar
```
```
California ISO interconnection queue position status solar project
```

Then drill down on any specific project surfaced above:
```
"[project name]" CAISO interconnection status
```
```
"[project name]" solar project interconnection withdrawn
```
```
"[queue position number]" CAISO queue status
```

- **Pass looks like:** authoritative domain (caiso.com, a utility, a state regulator) in top 3–5, with a current status word (active / withdrawn / suspended / operational) readable **in the snippet**.
- **Fail looks like:** you get the CAISO queue landing page plus a spreadsheet download link, with no project-specific status text in any snippet.

### 13.4 Path B — Counterparty / Corporate Status (primary fallback)

Tests whether "is this company still what the document assumes" is reliably searchable — it usually is.

```
solar EPC contractor bankruptcy 2026
```
```
renewable energy contractor Chapter 11 filing 2026
```
```
solar developer acquired 2026
```

Drill into any specific company surfaced:
```
"[company name]" bankruptcy
```
```
"[company name]" acquisition announcement
```
```
"[company name]" ceased operations
```

- **Pass looks like:** news results with clear, dated, parseable status in the snippet ("filed for Chapter 11 in July 2026").
- **Why this usually passes:** news coverage is exactly what search engines index well.
- **Why it may be the better scenario anyway:** "Memo assumes Contractor X builds this; Contractor X filed Chapter 11 in July" is a devastating, instantly-legible demo moment — and it keeps the entire architecture identical (same extraction, same router, same claim states).

### 13.5 Path C — Regulatory / Policy Change (second fallback)

```
California solar interconnection rule change 2026
```
```
federal solar tax credit change 2026
```
```
CPUC solar program modification 2026
```

- **Pass looks like:** a regulator or major trade publication with a dated change described in the snippet.

### 13.6 How to record results

For every query, log:

| Field | Value |
|---|---|
| Query text | |
| Top authoritative domain returned (if any) | |
| Status/fact visible in snippet? | yes / no |
| Stable across 2–3 runs? | yes / no |

### 13.7 Decision rule

- If **Path A** produces at least one candidate scoring **yes / yes / yes** → build the CAISO scenario.
- If not → **switch to Path B.**
- **Hard cutoff: end of day today.** Do not spend more than 90 minutes deciding.

> Interconnection status is conceptually the most elegant option, and that elegance is exactly what will tempt you to keep trying past the point where you should have moved on. **Reliability on camera beats elegance.**

### 13.8 Known risk with Path A (why the fallback exists)

CAISO publishes its interconnection queue primarily as **downloadable spreadsheets and PDF reports**, not as individually-indexed web pages per project. SerpApi returns what Google returns. The likely failure mode: your agent constructs a good query, SerpApi returns real results, and none contain a machine-readable status to compare against — leaving you either parsing prose from a news article (fragile) or hardcoding the result (violates §11.13 and is the one thing that could actually sink you if a judge probes).

---

## 14. Additional Scope Warnings

- **The 347-claims figure in §11.9.** Even as fixture data, showing "347 claims extracted / 241 cross-document / 73 external" invites a judge to ask "can I see those?" You have 3 days. **Show 8–12 real claims.** A small number that's all real beats a big number you have to caveat.
- **Synthetic document size.** Small and well-crafted beats large. A 40-page investment memo is slower to extract, harder to show on camera, and adds nothing. 2–3 pages each.
