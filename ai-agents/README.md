# Country AI Creative Teams — Agent Runtime Setup

The repository now contains:
- `/team/countries/`: bilingual directory of 108 proposed AI personas (18 supported countries × 6 creative roles), with country/role filters and copyable task briefs.
- `/ai-agents/agent-blueprints.json`: role registry, country codes, bilingual goals, safety rules, and recommended runtime workflow.

## Important status

The personas and prompt blueprints are implemented. The AI agents are **not yet connected to a model provider or external tools**, so this static GitHub Pages site cannot independently generate drafts, access social accounts, edit production pages, or publish content.

## Recommended secure runtime

1. Deploy a small server-side API (for example, a serverless function) outside the public static site.
2. Store the chosen AI provider API key as a server-side secret. Never place API keys in HTML, JavaScript delivered to browsers, or this public repository.
3. Accept a validated country code, role key, language requirements, and task brief.
4. Load the matching role instructions from `agent-blueprints.json` and add verified country context from approved sources.
5. Call the AI model server-side and return a draft with sources/fact-check notes when applicable.
6. Save outputs and audit metadata in a database or protected store.
7. Require a human approval step before publishing posts, contacting partners, deploying website changes, or spending money.
8. Add connectors only after their account permissions and scopes are explicitly approved.

## Initial task types

- Marketing: campaign strategy, audience hypotheses, 30-day calendar, measurement plan.
- Social: bilingual post drafts, platform-specific schedules, Shorts ideas, accessibility text.
- Content: video scripts, shot lists, destination-guide outlines.
- Web/SEO: page briefs, accessibility checks, bilingual metadata, reviewed code proposals.
- Copywriting: English/Spanish copy and editorial quality checks.
- Partnerships: partner criteria, collaboration ideas, outreach drafts, tracking plans.

## Transparency and safeguards

- Label personas as AI; do not present them as human staff.
- Do not invent names of real partners, contact details, reviews, credentials, or personal experiences.
- Treat any country/city “base” as a virtual research focus, not a physical office or residence.
- Verify changing destination details before publication.
- Do not perform external actions without explicit human approval.
