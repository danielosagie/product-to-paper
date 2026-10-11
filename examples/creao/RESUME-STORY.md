# Shared story + rules for "While you were away + one-tap resume" (all three design agents read this)

## Story (use these exact facts everywhere so the flow is one journey)
- User: Daniel, team "Daniel's team", Free plan -> was on Pro ($20/mo, 600 plan credits).
- Last active: Sep 18. Today: Oct 11. Away 23 days.
- Why agents stopped (two causes, both must be visible):
  1. Gmail access expired Sep 18 (Google token revoked after password change) -> Quote responder + Invoice chaser could not send.
  2. Credits ran out Sep 24 (0 of 600 plan credits) -> Lead enricher + Weekly KPI digest stopped.
- What was missed (the "while you were away" numbers):
  - Quote responder (Gmail): 31 quote requests unanswered, oldest Sep 18 (Acme Supply), about 4 h of work. 8 are older than 14 days.
  - Invoice chaser (Gmail + Sheets): 12 overdue invoices not chased, $18,400 outstanding.
  - Lead enricher (Sheets + web): 214 new leads not enriched.
  - Weekly KPI digest (Sheets + Slack): 3 digests not sent (Sep 22, Sep 29, Oct 6).
  - Total: about 9 h of work.
- Fixes needed to resume: Reconnect Gmail (1 tap, Google OAuth), Add credits (top up 300 for $10, or resume Pro $20/mo = 600), Dry run (each agent runs once on 1 real item, nothing is sent, ~4 credits).
- Resume choice (key product decision): "Resume from today" is the DEFAULT. Catching up is opt-in PER AGENT with a preview:
  - Quote responder: "Reply to the 23 quotes from the last 14 days" (skip 8 older ones, list them for manual handling).
  - Invoice chaser: "Chase all 12" (they are still overdue).
  - Lead enricher: "Enrich all 214" (costs ~86 credits, shown).
  - Weekly KPI digest: no catch-up (old digests are stale); offer "Send one catch-up digest covering Sep 18 to Oct 11".
- After resume: "4 agents running. Next: Quote responder checks Gmail at 9:00. Catch-up: 23 replies drafting, you'll review before send."

## Style rules (Creao canon; Paper file from $PAPER_FILE_ID)
- Read get_tokens; use only var(--token) values. Page bg var(--color-background) #F8F6F3, sidebar var(--color-chrome) 256 wide, surfaces var(--color-surface) + 1px var(--color-grey-200) border, radius var(--radius-md) controls / var(--radius-lg) cards / var(--radius-xl) dialogs / var(--radius-3xl) mobile sheet top, ink primary var(--color-primary) + cream var(--color-primary-foreground), muted var(--color-muted-foreground), success var(--color-success) #4A6552, warning var(--color-warning), destructive var(--color-destructive) oxblood.
- Type: Instrument Sans UI (12 floor / 14 dense / 16 body / 24 page title 600), DM Sans 600 for big titles, DM Mono for numbers, money, timestamps, counts. EB Garamond: at most ONE editorial line per screen (Chat home already uses it for the greeting).
- One ink primary per view. Mobile tap targets 44px, mobile inputs 16px. No text under 12px.
- Reference the real product: page "02 Live screens" has editable pulls (Chat desktop/mobile, Agents, etc.); page "00 System · tokens, components, layouts, states" has live components (Button, Input, Select, Tabs, Navigation, Card, Notice, Empty state) and layout patterns (P1 Chat, P2 Index, P3 Detail, P6 Overlay dialog/sheet). Match them. You may clone SMALL nodes (one button, one nav item, the sidebar) with <x-paper-clone node-id="..."/>; do not clone whole pages.
- Copy: plain, short, no em dashes, no emojis. Say what happened and what it costs in the user's terms.
