# V1 build prompt (CLAUDE_CODE_PROMPT.md) — what it adds over V2

Read in full (99 lines). V2 carried forward nearly everything; these are the deltas.

## Adopt (V1-only, still wanted)
- **Stub the unbuilt routes so nothing 404s if a judge clicks around.** Everything
  outside the demo spine (Dashboard, Documents, Sources, Verification rules,
  Reviews index, corroborated views, error states) is designed but deferred —
  stub the routes, leave them there.
- **Cut order if behind:** audit ledger -> analyzing animation -> approved state.
  **Never cut the review screen; it is the entire demo.**
- **Trust score is an open question.** V1: "designed but appears in no screen...
  cutting it costs nothing." Our build has TrustScoreBadge + ReviewSummary.trustScore
  + getTrustScore(). Decision for the user: give it a home on a screen, or cut it.
- Scope reality check: six screens, ~2.5 days, two people.

## Superseded (V1 wrong, reality wins)
- `tailwind.config.ts` applied before shadcn -> Tailwind v4 CSS-first, app/theme.css.
- Nutrient Viewer "needs a session token generated server-side per document" ->
  the installed dws-client has no viewer-session API; we ship standalone Web SDK.
  V1 called this "the highest-risk unknown left" — it is now resolved and rendering.
- `src/lib/data/` -> repo has no src/; the data layer lives at `lib/data/`.
- "Reconcile types.ts against whatever Kiran already has ... the thing that will
  cost you a day if you skip it" -> done, twice (audit section 2 + this swarm).

## Identical in both (no action)
Six screens and their routes; screens 2/3 as one route in two states; the whole
architecture block (data layer, fixtures satisfy every interface, no fetch in
components, zero hardcoded values); fixture composition; every layout rule
(188px nav, 392px queue, 1px --line borders, no colored state borders, one
shadow per screen, no icons, 5px dots); all four animation rules; the build
order; and the stop-after-the-review-screen instruction.
