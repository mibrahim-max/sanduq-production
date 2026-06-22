# Sanduq

Save together, decide together. Peer-to-peer group savings with built-in governance. The app never holds money: members pay the treasurer directly (Venmo, Cash App, Zelle), and Sanduq is the agreed record of every payment, vote, expense, and payout.

## What is in this repo

- `src/App.jsx` — the full product UI (onboarding, groups, two-sided payment confirmation, disputes, expenses with receipts, votes that execute, treasurer succession, pro-rata payouts with per-recipient confirmation, join policies). Runs today on built-in demo data.
- `src/lib/machines.ts` — the money-state machines as pure, tested functions: contribution lifecycle, majority + vote execution, miss-limit removal, penny-exact pro-rata math, late-joiner catch-up.
- `tests/machines.test.ts` — 20 tests covering the unhappy paths (wrong-actor guards, dispute resolution, idempotent execution, rounding exactness).
- `supabase/migrations/0001_schema.sql` — the production database: integer-cents money columns, row-level security, SECURITY DEFINER RPCs as the only write path for money state, and an append-only `audit_events` log enforced by trigger.
- `src/lib/adapter.ts` — the seam between UI and backend. Demo mode now; flip one env var for Supabase.

## Run it now (demo mode)

```bash
npm install
npm run dev        # opens the app on demo data
npm test           # 20 business-logic tests
npm run build      # production bundle
```

## Take it to production

### 1. Create the backend (about 30 minutes)
1. Create a project at supabase.com (free tier is fine for beta).
2. In the SQL editor, run `supabase/migrations/0001_schema.sql` in full.
3. Authentication → Providers → Phone: enable, and connect Twilio Verify (Supabase docs walk through the three Twilio values). Cost ~$0.05 per verification.
4. Copy the project URL and anon key into `.env`:
   ```
   VITE_USE_SUPABASE=1
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

### 2. Wire the UI to live data
The adapter (`src/lib/adapter.ts`) already exposes every money mutation as an RPC call. The remaining work is replacing the demo seed constants in `src/App.jsx` with Supabase queries (`select` on groups/memberships/contributions, realtime subscription for chat and confirmations). The RPCs and the RLS policies are done; the database will reject any move the rules forbid, regardless of client bugs.

### 3. Deploy the web app
Vercel or Netlify: connect the repo, set the three env vars, deploy. The app is mobile-first; add a manifest for installable PWA, or port screens into Expo/React Native later (the design and `src/lib` carry over unchanged).

### 4. The non-code gates (do not skip)
These map to the roadmap document (`sanduq-roadmap.md`):
- Fintech attorney opinion that the no-custody coordination model avoids money-transmitter licensing in your launch states. **Launch waits on this.**
- Terms of Service + Privacy Policy live in-app (the model only protects you if the terms state it).
- A paid security review before real users (RLS policies and RPCs are written defensively, but verify them adversarially).
- App store accounts when you go native (reviewer note: no money moves in-app; the app records peer-to-peer payment attestations only).

## Architecture principles (read before changing code)

1. **Money is integer cents.** No floats anywhere. The pro-rata allocator is penny-exact by construction.
2. **The audit log is the product.** `audit_events` is append-only and trigger-enforced. Every money/governance state change lands there with actor, before, and after. Never add an update path.
3. **Clients never write money state.** All transitions go through RPCs that enforce role and state-machine rules server-side. `src/lib/machines.ts` mirrors the same rules client-side for instant UI feedback; the server remains the authority.
4. **Two keys on every movement.** Contributions: payer attests, treasurer confirms. Payouts: treasurer records, every recipient confirms. Nothing is "done" on one party's word.
