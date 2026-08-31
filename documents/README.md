# Demo documents

The two synthetic PDFs for the demo live here. Per plan §8, write down the
exact content **before** generating them:

- **Doc A vs. Doc B contradiction (Beat 1):** the same field with mismatched
  values (e.g., a date or dollar figure that differs between the two docs).
  Decide the verbatim numbers first, then author the PDFs around them.
- **Staleness claim (Beat 2):** one claim in Doc A that a live SerpApi query
  can show is out of date. Confirm the query returns a parseable answer in
  serpapi.com/playground before locking the claim.

Naming convention:

```
documents/
├── doc-a.pdf   # primary document (contains the stale claim)
└── doc-b.pdf   # cross-reference document (contains the contradicting value)
```
