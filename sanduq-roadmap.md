# Sanduq: From Prototype to Product

A complete build roadmap for a solo founder. Working name Sanduq, applies regardless of final name.

**What this document is.** Everything between the prototype you have and a launched product people trust with real money. Organized in phases, each with a gate you must pass before moving on. Cost and time estimates are honest ranges, not promises.

**What you already have.** A full interactive prototype covering the complete lifecycle: onboard, create with creator-set policies (exit, join, category), invite with transparent join terms, peer-to-peer contributions with two-sided confirmation and dispute resolution, expense ledger with receipts and reimbursement, votes that execute (amendments, payouts, treasurer succession), missed-payment enforcement, pro-rata payouts with per-recipient confirmation, and archival. Plus the most important decision already made: **no custody**. Sanduq never holds money. That single choice is why this plan says months, not years.

**Disclaimer.** I am not a lawyer or financial advisor. The legal items below are the contours of what to investigate. The attorney review in Phase 0 is the real gate.

---

## Phase 0: Foundations (Weeks 1 to 4)

Run everything here in parallel. None of it requires code.

### 1. Decide the wedge

You cannot market "group savings for everyone." Two candidate wedges:

- **Diaspora and immigrant communities** digitizing the savings circles they already run (sanduq, susu, tanda, pardna, kameti). The behavior exists; you remove the spreadsheet and the awkward texts. The name Sanduq is an asset here.
- **Mainstream friend groups** saving for trips, gifts, and events. Bigger market, weaker existing habit, catchier name probably required.

Decide with interviews, not instinct. Do 8 to 12: half with people who run or participate in informal savings circles, half with the "treasurer friend" who always organizes the group trip. Ask:

- Walk me through the last time your group pooled money. What broke?
- Who held the money? How did people feel about that?
- Show the prototype. Then ask: "The app never holds the money, your treasurer does. How does that land?"
- Would you pay? Would your group switch from the spreadsheet and group chat?

**Kill signal to watch for:** if most people say they would only use this if the app held the funds, the no-custody v1 needs rethinking before you build.

### 2. Legal foundation

- **Entity.** Delaware C-corp if you intend to raise venture money or join an accelerator (Clerky or Stripe Atlas, roughly $500 plus registered agent fees). A home-state LLC if bootstrapping indefinitely. Converting later is possible but messy. Decide based on funding intent.
- **The regulatory opinion. This is the gate.** Hire a fintech attorney to confirm the peer-to-peer coordination model stays outside money transmission definitions in your launch states. Function matters more than labels to regulators. Budget $2,500 to $7,500. Do not launch without this in writing.
- **Terms of Service and Privacy Policy.** Must state explicitly: Sanduq never holds, touches, or guarantees funds; the treasurer is responsible for collected money; disputes are between members. This is your liability shield. $1,000 to $3,000 with attorney review.
- **Privacy compliance.** You collect phone numbers and social graphs. Plan for CCPA-style obligations: data export, deletion on request, a plain-language privacy policy.
- **Trademark.** Knockout search on the final name (USPTO TESS plus app store search), then file. Roughly $350 per class, attorney optional but helpful.

**Attorney outreach template.** Send this paragraph to two or three fintech attorneys for consult quotes: "I am building a mobile app that coordinates group savings among friends. The app never holds, transmits, or controls funds. Members pay a group treasurer directly through Venmo, Cash App, or Zelle. The app records payment attestations from both sender and receiver, tracks group votes, and logs expenses. I need an opinion on whether this model triggers money transmitter licensing in [states], and review of Terms of Service reflecting the no-custody model."

### 3. Lock the name

Run the text-a-friend test on your shortlist: "download ___ so we can save for the trip." Whichever survives autocorrect and zero explanation wins. Then the knockout trademark search before you get attached.

### 4. Boring infrastructure

Business bank account (Mercury is the default for startups), bookkeeping from day one (Wave or QuickBooks), domain, Google Workspace.

**Phase 0 gate:** wedge chosen, attorney engaged, entity formed, name locked.

---

## Phase 1: Build the MVP (Weeks 4 to 16)

### Choose your build path

Three options for a non-technical founder, with honest tradeoffs:

**Path A: Technical cofounder.** Best long-term, slowest to start. Expect to give 30 to 50 percent equity. Look in your NABA network, MBA cohort, and YC cofounder matching. The risk: months of searching with nothing built.

**Path B: Contract developer or small agency.** $20,000 to $60,000 for this scope. You keep equity and control. The risks: handoff quality, ongoing maintenance dependence, and agencies that disappear after delivery.

**Path C: Build it yourself with AI assistance.** You have already shipped HTML apps to GitHub and built an AI agent at CAPTRUST. This stack is learnable. Claude or Cursor as your pair programmer, plus the stack below, gets this app to beta. Cost under $2,000 in tools and services plus your nights and weekends for 3 to 5 months. The hard requirement: a paid security review ($2,000 to $5,000) before any real user touches it, because AI-assisted code by a new developer will have holes you cannot see.

**Recommendation: Path C to beta, then decide.** With a working beta and real metrics, you can recruit a cofounder or hire from strength instead of hope.

### The stack (boring on purpose)

- **Mobile app:** React Native with Expo. One codebase for iOS and Android, and your prototype's React patterns transfer directly.
- **Backend:** Supabase. Postgres database, authentication, row-level security for permissions, realtime subscriptions for chat and live confirmations.
- **SMS verification:** Twilio Verify (roughly $0.05 per verification).
- **Push notifications:** Expo Notifications.
- **Analytics:** PostHog free tier. **Error tracking:** Sentry free tier.
- **Payments infrastructure: none.** That is the point of your model.

### The data model that matters

This is where your finance background is an advantage. Build the schema like an accountant:

- `users`, `groups` (with policies: monthly, goal, exit policy, join policy), `memberships` (role, join date, catch-up owed)
- `contributions` with an explicit state machine: unpaid → marked_sent → confirmed, with a disputed branch and resolution transitions. Both attestations timestamped.
- `distributions` and `distribution_receipts`: one receipt row per recipient, each individually confirmed. The group closes only when all receipts confirm.
- `expenses` with receipt image URL and reimbursement state.
- `votes` and `ballots`, typed (amendment, payout, succession) with execution effects recorded.
- `audit_events`: append-only. Every state change writes who, what, when, before and after. No updates, no deletes. **This table is the product.** It is the tamper-evident record that makes "did you actually pay?" impossible to weaponize against a friendship.

Rule: screens render from these tables. Never store a derived money total you can compute from the ledger, or the numbers will drift and trust dies with them.

### v1 feature cut

Keep: onboarding, create flow with policies, invites with join terms, contributions with two-sided confirmation and disputes, expense ledger with receipts, votes that execute, payout with per-recipient confirmation, group chat, activity feed, a visible audit log.

Cut for v1 (all exist in the mockup, all return later): 1:1 DMs (group chat suffices), the calendar month grid (a simple upcoming list is enough), the friends graph (contact-based invites suffice).

### Definition of done for beta

- A stranger can complete the full lifecycle, create through payout, without you on the phone.
- Every state change appears in the audit log.
- Security review passed; secrets managed properly; rate limiting on auth.
- ToS and Privacy Policy live in the app; attorney opinion in hand.
- Push notifications fire for: payment marked sent (to treasurer), confirmation and disputes (to member), votes opened and passed, payout recorded, receipt confirmations outstanding more than 48 hours.

**Phase 1 gate:** definition of done met. Not before.

---

## Phase 2: Private Beta (Weeks 16 to 24)

### Recruit 5 to 10 real groups

From your own communities: NABA chapter contacts, MBA cohort, mosque and cultural association networks, the friend group already planning a trip. Onboard every treasurer personally, concierge style. You are not scaling yet; you are watching where trust breaks.

### Instrument these metrics from day one

| Metric | Definition | Healthy signal |
|---|---|---|
| Activation | Group reaches 3+ members and first confirmed contribution within 14 days | Above 60% of created groups |
| Confirmation latency | Time from "marked sent" to treasurer confirmation | Under 24 hours median |
| Dispute rate | Disputed contributions as share of all contributions | Under 2% |
| Cycle completion | Groups that reach payout | Above 70% of activated groups |
| **Second-Sanduq rate** | Groups that finish one and start another | **This is the metric.** Any meaningful number here is product-market fit in miniature |

Weekly calls with treasurers. Fix the single biggest friction every week. Expect the treasurer confirmation burden to be the recurring complaint; deep links that pre-fill Venmo and Cash App amounts are your highest-leverage fix.

**Phase 2 gate:** at least 3 groups complete a full cycle, dispute rate under control, and you can articulate who the product is for in one sentence backed by data.

---

## Phase 3: Launch (Months 6 to 9)

### App store submission

Finance-adjacent apps draw extra review scrutiny. Your no-custody model helps. Write reviewer notes stating plainly: no money moves inside the app; it records peer-to-peer payment attestations only. Have your ToS and privacy links ready. Apple developer account $99/year, Google Play $25 one-time.

### Distribution, in order of leverage

1. **The invite loop.** Every group drags in 3 to 8 people. Obsess over invite-to-join conversion: the link preview, the join terms clarity, time-to-joined. This is your growth engine; everything else is fuel.
2. **Community partnerships.** Cultural associations, student organizations, mosque and church groups, NABA chapters. One trusted community organizer endorsing the app is worth a thousand ad impressions for this category.
3. **Content and your own network.** Your LinkedIn audience and the Scott Bond newsletter. Stories, not features: "How six friends saved $12,000 for Morocco without one awkward money text."
4. **App store optimization** on terms people actually search: group savings, money pool, trip fund, susu, tanda.

### Pricing at launch

Free. You are buying trust and behavioral data. Monetization comes after retention is proven.

---

## Phase 4: Revenue and the Custody Fork (Months 9+)

### Revenue without custody

A premium tier at $3 to $5 per group per month, or a one-time group fee: multiple concurrent goals, larger groups, exportable statements (treasurers will want these), custom poster art. Modest, but it proves willingness to pay.

### The custody fork

When enough groups demand "just hold the money," you face the deliberate decision you deferred: Model 2 (group-controlled accounts through a BaaS partner) or Model 3 (credit union or CDFI partnership where they hold funds and you are the interface). Either is a 12-month compliance project and a fundraise trigger. Do not start it on instinct; start it when the demand data forces you.

### The Kith bridge

Contribution reliability is creditworthiness signal, and that is the long-term moat connecting to your Kith concept. Handle with care: explicit user consent, proper legal review, and never before the core product has earned trust. This is year-two material, not v1.

---

## Funding Path

- **Bootstrap through beta.** Path C makes this roughly $8,000 to $15,000 all-in including legal. Compatible with a day job.
- **Accelerators after beta metrics.** Visible Hands (built for underrepresented founders), Y Combinator, Techstars, and fintech-specific programs like Financial Venture Studio. Your demo is the prototype plus live beta numbers, which is more than most applicants have.
- **Angel or pre-seed only after the second-Sanduq rate proves retention.** The one-line story: "Venmo coordinates payments between two friends. We coordinate money among groups, with governance built in, and we never touch the funds."

---

## Budget Summary

| Item | DIY path (Path C) | Contracted path (Path B) |
|---|---|---|
| Entity formation | $500 | $500 |
| Fintech attorney opinion | $2,500 to $7,500 | $2,500 to $7,500 |
| ToS / Privacy Policy | $1,000 to $3,000 | $1,000 to $3,000 |
| Trademark filing | $350 to $1,000 | $350 to $1,000 |
| Build | $500 to $2,000 (tools/services) | $20,000 to $60,000 |
| Security review | $2,000 to $5,000 | included or $2,000 to $5,000 |
| Infra, year one | $500 to $1,500 | $500 to $1,500 |
| App store accounts | $125 | $125 |
| Beta incentives, misc | $500 to $1,000 | $500 to $1,000 |
| **Total to launch** | **roughly $8,000 to $21,000** | **roughly $45,000 to $80,000** |

## Timeline Summary

| Phase | Weeks | Gate |
|---|---|---|
| 0: Foundations | 1 to 4 | Wedge chosen, attorney engaged, entity formed, name locked |
| 1: Build | 4 to 16 | Definition of done met, security review passed |
| 2: Private beta | 16 to 24 | 3+ full cycles completed, dispute rate under 2% |
| 3: Launch | Months 6 to 9 | Live in both stores, invite loop instrumented |
| 4: Revenue / custody fork | Months 9+ | Driven by retention data, not instinct |

Realistic total for a solo founder building nights and weekends: **6 to 9 months to public launch.**

---

## Risks and Kill Criteria (read this section twice)

- **Attorney says the model is transmission in key states.** Pivot to a partnership-first model (Model 3) or stop. Do not launch anyway.
- **Beta groups finish one cycle but the second-Sanduq rate is near zero.** The utility is one-shot. Either solve retention (recurring goal types, annual traditions) or reposition as an event tool with different economics.
- **Treasurer burden complaints dominate beta feedback.** Invest in payment deep links and reminder automation before any scaling. The treasurer is your real user; if they burn out, the group churns.
- **A trust incident during beta** (a treasurer takes the money). Have the response ready in advance: the audit log export for the group, communication templates, and clear ToS language about where responsibility sits. How you handle the first incident defines the brand.

---

## Your Next 7 Actions (this week)

1. Book three user interviews from your network.
2. Run the text-a-friend test on your name shortlist, then the trademark knockout search on the winner.
3. Email two fintech attorneys with the template paragraph above and get consult quotes.
4. Write yourself a one-page memo: raising venture money or bootstrapping. It decides your entity.
5. Stand up a Supabase project and an Expo app skeleton, or post the contractor brief if you chose Path B.
6. Write the one-sentence positioning statement for your chosen wedge.
7. Put up a one-page landing site with a waitlist email capture.

The prototype proved the concept. The interviews and the attorney letter decide whether to build. The second-Sanduq rate decides whether it becomes a company.
