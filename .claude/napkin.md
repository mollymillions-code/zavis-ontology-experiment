# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-02-21 | user | Deployed to Vercel 6+ times without committing to git. All work was only on Vercel, not in source control. | ALWAYS commit + push to GitHub BEFORE deploying. No exceptions. |
| 2026-02-21 | self | Used `echo "value" \| vercel env add` — trailing newline corrupted Stripe API key. | Use `printf 'value'` when piping to CLI tools. Never `echo` for secrets. |
| 2026-02-21 | self | `res.json()` on non-JSON response (HTML timeout page) produced cryptic error. | Always check `content-type` header before `res.json()`. Show user-friendly fallback. |
| 2026-02-21 | self | `Math.round(gap/months)` caused chart to go DOWN at the end (overshoot). | Use `Math.floor` + spread remainder. Cap cumulative values at target. |
| 2026-02-21 | self | Comparison table showed flat `billingCycle` only. Phased billing invisible → changedCount=0 → Update button hidden. User couldn't apply changes at all. | Compare nested structures (billing phases), not just top-level fields. |
| 2026-02-21 | self | Catch block returned "Operation failed" instead of actual error. | Always surface `error.message`, never generic strings. |
| 2026-02-21 | self | Explored wrong repo initially (keef-mentor vs zavis-ontology-experiment). | Verify correct repo path before starting work. |
| 2026-02-20 | self | Stripe initialized at module level — crashed Vercel build because env vars unavailable at build time. | Initialize clients/SDKs inside handlers, never at module scope. |
| 2026-02-20 | self | Invoice number incremented on every page load (peek mode missing). | Distinguish read (peek) from write (increment). UI loading shouldn't trigger side effects. |
| 2026-02-20 | self | Cost entries created as zero-amount records when only notes were edited. | Guard DB writes behind required field validation, not just form touch events. |
| 2026-02-20 | self | Client IDs reshuffled but foreign keys in receivables/snapshots not updated. Data pointed to wrong clients. | When changing IDs, update ALL foreign key references atomically. |
| 2026-02-19 | self | `computeMRRAtPrice()` ignored client discounts. MRR calculations were wrong. | Review calculation functions for missing modifiers (discounts, multipliers, exclusions). |
| 2026-02-19 | self | Multiple stores (Partner, Invoice) were in-memory only — not persisted to DB. | Never trust localStorage as source of truth. Always hydrate from DB on mount. |
| 2026-02-19 | self | Env var had trailing whitespace — email domain validation silently failed. | Always `.trim()` env var reads. Newlines from .env files cause subtle failures. |
| 2026-02-18 | self | HTML number inputs defaulted to `step=1` — users couldn't enter decimals for costs. | Set `step=0.01` on currency/percentage inputs. Default step is unusable for financial data. |
| 2026-02-18 | self | Seed data had wrong MRR and seat counts for 3 clients. | Seed data is a snapshot — audit periodically. Document manual vs derived fields. |

## User Preferences
- ALWAYS commit + push to GitHub before deploying to Vercel — non-negotiable
- UI must be composable cards/tables, never text blobs or narratives
- Charts only where they add value — don't force graphs where tables work better
- Financial numbers must be deterministic (server-side), never trust LLM output for money
- Error messages must be specific and actionable
- Reports should be saveable to DB for team sharing
- Beauty matters — UI must look good, not just work

## Patterns That Work
- Deterministic override: LLM proposes, server-side formula recalculates financials
- Content-type guard before `res.json()` — catches HTML errors, timeouts, redirects
- `printf` not `echo` when piping to CLI tools — avoids trailing newline corruption
- Platform context as compressed aggregates (~1500 tokens) not raw data dumps
- Composable typed card components — each report section is standalone
- Multi-turn history passed to Gemini for refinement
- Initialize SDKs/clients inside handlers, not at module scope
- Distinguish peek (read) from increment (write) for sequences
- Floor + remainder for distribution algorithms (never round)
- Hydrate from DB on mount, not just localStorage

## Patterns That Don't Work
- Deploying without git — causes feature loss across machines
- Generic catch blocks ("Operation failed") — impossible to debug
- `Math.round` for distributing values across time — causes overshoot
- Comparing only top-level fields when nested structures carry the real change
- `echo` for piping secrets — trailing newline corrupts keys
- Module-level SDK initialization — crashes builds when env vars unavailable
- Trusting localStorage as source of truth — drifts from DB
- Default HTML step=1 for financial inputs — blocks decimal entry
- Seed data without periodic audits — data drifts silently
