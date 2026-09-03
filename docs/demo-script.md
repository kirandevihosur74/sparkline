# Demo video script — record this, 2:40

Target 2:40, hard ceiling 4:00. Screen recording with voiceover. Speak at a
normal pace; every line below is timed at roughly 150 words per minute.

**Before you hit record**

1. `npm run dev`, open `http://localhost:3000` — the landing page.
2. Second tab ready on `http://localhost:3000/reviews/demo-2026-08/review`
   (the completed run) as a fallback if a live call is slow on camera.
3. `documents/doc-a.pdf` and `documents/doc-b.pdf` visible in a Finder window
   you can drag from, or ready in the file picker.
4. Browser at 1440×900, dark or light — pick one and stay there.
5. Close the Next.js dev-tools bubble.

---

## 0:00–0:22 · The problem

**On screen:** the landing page at `/`. Do not scroll yet.

> A firm is about to buy a solar portfolio. The decision rests on a folder of
> documents, and two of them matter here: the investment memo their own team
> wrote, and the engineering report from an outside firm.
>
> Nobody reads every page of both. So two things go wrong. The documents
> disagree with each other and nobody notices. And a document that was true
> when it was written stops being true, and it does not tell you.
>
> Sparkline catches both, and puts a person's signature on every flag.

---

## 0:22–0:45 · Start a real run

**On screen:** click **Launch Sparkline**. On `/reviews/new`, drop or upload
`doc-a.pdf` into the primary slot and `doc-b.pdf` into the cross-reference
slot. Click **Run analysis**.

> The primary document is the one under review. The cross-reference is what we
> check it against. These are the two real PDFs.
>
> Running the analysis calls Nutrient DWS to read both documents, compares the
> claims, and then checks the ones only the public record can settle through
> SerpApi.

---

## 0:45–1:10 · Watch it run

**On screen:** the analyzing screen. Let the pipeline rail advance and the
reasoning stream fill. Do not click Skip.

> Nutrient DWS reads each document three ways at once — the tables, the text
> layer, and key-value pairs that carry a confidence score per field. Sixteen
> claims out of two documents.
>
> Every line here is the run narrating a decision it actually made. Nothing is
> animated on a timer.

---

## 1:10–1:35 · The results

**On screen:** the completed run. Point at the dial, then the formula strip,
then the coverage bar.

> A trust score of 55, and underneath it the arithmetic that produced it —
> cross-document agreement times mean extraction confidence. If the number on
> the dial cannot be reproduced from the numbers beside it, we do not show it.
>
> Eleven findings: one contradiction, one stale claim, one corroborated, four
> consistent, one that needs a human, and two nobody can verify.

Click **Open findings queue**.

---

## 1:35–2:00 · Beat 1 and Beat 2

**On screen:** the review workspace. Select the **conflicting** finding first,
then the **stale** one.

> Here is the contradiction. The memo prices the expansion at 186 million. The
> engineer says 211. Twenty-five million apart, thirteen point four percent,
> and both sentences are quoted from their own pages.

Select the stale finding. Let the evidence face-off and the query trace show.

> And here is the one a second document could never catch. The memo, dated
> March 20th, records the installer as in good standing. SerpApi checked the
> public record: that installer filed for Chapter 11 on April 15th. The source
> is the bankruptcy court's own claims agent.
>
> Every result the search returned is kept, with the reason it was accepted or
> rejected. The forum post was rejected. The claims agent was accepted.

---

## 2:00–2:25 · Beat 3, the signature

**On screen:** click **Approve finding**. Wait for the confirmation strip.
Point at the hash, then click **Open signed record** or go to the audit trail.

> A person decides. Approving renders this decision to a PDF through Nutrient
> DWS and digitally signs it. That is the SHA-256 of the signed bytes, on the
> ledger, next to who signed it and when.
>
> Six months from now, when that bankruptcy hits the portfolio, there is a
> signed record of who saw the flag and what they decided.

---

## 2:25–2:40 · Why it is a company

**On screen:** the audit trail, or back to the landing page.

> Investors, lenders and advisors all have to prove they checked — and new
> disclosure mandates are making that proof mandatory rather than optional.
> Sparkline turns "we reviewed the documents" into an itemized, evidenced,
> signed trail.
>
> Spell-check for facts. It underlines what contradicts another document, and
> what the world has since made false, and it makes you sign before you move
> on.

---

## If a live call fails on camera

Do not stop recording. The run still completes: the live-check stage shows its
failure, the stranded claims come back unverified, and the run reports no trust
score. Say so out loud — "the live check was refused, so the run reports no
score rather than a flattering one" — and carry on. That behaviour is the
product working, not the demo breaking.

Or cut to the second tab: `/reviews/demo-2026-08/review` is the completed run
with everything already on screen.
