# ArticleFlow

Articles written by Custompedia Tech, shown in the Kadanglabo dashboard to preview and publish, with the search
numbers Tech measures for the website. Tech does the writing and the SEO work; this side only reads, previews,
publishes, or asks for changes with a reason.

Everything lives in this folder. The rest of the CMS knows it through two connector files only:

- `admin/worker/integrations.ts` (Worker: routes, a hook after the article routes, the cron)
- `admin/src/integrations.tsx` (dashboard: the page, the sidebar entry, the quick-search entry)

## What is where

| Path | What |
| --- | --- |
| `types.ts` | Shared shapes: the Partner API contract (`cms-partner/v1`) and what `/api/articleflow` returns |
| `worker/tech-client.ts` | The only code that calls Tech (8 s deadline, never throws); the key never leaves the Worker |
| `worker/api.ts` | `/api/articleflow/*` and the hook after `/api/articles/*` (take down, trash, publish again, delete) |
| `worker/convert.ts` | A Tech article (blocks per language) as a Kadanglabo article (Tiptap per language) |
| `worker/outbox.ts` | Follow-ups that must finish: completing a publish, reporting the live address, reporting a take down |
| `worker/store.ts` | The tables below |
| `ui/` | The page, the sidebar entry, the preview dialog, the locked state |
| `migrations/` | `0001_articleflow.sql` (three tables), `9999_remove_articleflow.sql` (drops them) |
| `dev/fake-tech.mjs` | A stand-in for Tech with sample data, for tests and for looking at the page by hand |
| `tests/test-articleflow.mjs` | The whole flow on the real Worker handlers against the stand-in |

Tables (content database, no column added to any core table): `articleflow_items`, `articleflow_outbox`,
`articleflow_cache`.

## Install

1. Tables (safe to run again):

   ```
   cd admin
   npm run articleflow:migrate:local     # local development
   npm run articleflow:migrate:remote    # production (kadanglabo-content)
   ```

2. Connection. Tech issues a partner key for this website (Pengaturan, tab Langganan).

   | Name | Kind | Value |
   | --- | --- | --- |
   | `TECH_API_URL` | var | `https://content-api.custompedia.id` |
   | `TECH_SITE_ID` | var | the site id Tech shows for Kadanglabo |
   | `TECH_PARTNER_KEY` | secret | `npx wrangler secret put TECH_PARTNER_KEY` |
   | `ARTICLEFLOW_CONTACT_URL` | var, optional | where "Hubungi tim Custompedia" leads (`https://...` or `mailto:...`) |

   Local development: copy `dev.vars.example` into `admin/.dev.vars`. Without these the page says
   "ArticleFlow belum terhubung" and nothing is called.

## How it works

- **Status and numbers** come from Tech on every visit. The last good answer is kept in `articleflow_cache` and shown
  with a notice while Tech cannot be reached; publishing is closed until it answers again.
- **Preview** reads the article from Tech, stores its pictures in Media (resized in the browser like any upload), keeps
  the converted draft in `articleflow_items` and opens the website's own preview. Nothing appears in the Artikel menu yet.
- **Publish** checks the draft with the normal publish rules first, asks Tech to publish (idempotency key kept until
  Tech's answer is known), then creates and publishes the article through the normal article routes, then reports the
  live address. If the website step fails after Tech said yes, the page shows "Sedang diselesaikan" and the follow-up
  job finishes it (on the next visit of the dashboard, the "Coba lagi" button, or the Worker's cron).
- **Minta revisi** needs a reason; it goes to Tech and into the article's history.
- **Subscription**: Tech decides. Without a running subscription only the status is readable: the sidebar entry turns
  grey with a lock and the page is locked. Articles that are already live are ordinary articles and stay.
- **Artikel menu**: taking an ArticleFlow article down (or to Trash) is reported to Tech; publishing it again too.

## Local development

```
node admin/articleflow/dev/fake-tech.mjs --port 8799 --mode active     # from the repo root
```

then in `admin/.dev.vars`: `TECH_API_URL=http://127.0.0.1:8799`, `TECH_SITE_ID=kadanglabo`,
`TECH_PARTNER_KEY=dev-partner-key`, and `npm run dev` in `admin/`. Switch states while it runs:

```
curl -X POST http://127.0.0.1:8799/__control -d '{"mode":"expired"}'    # active | expiring | expired | none
curl -X POST http://127.0.0.1:8799/__control -d '{"down":true}'         # Tech unreachable
curl -X POST http://127.0.0.1:8799/__control -d '{"reset":true}'
```

Against a local Tech (`pnpm dev` in tech-platform, port 3000; it moves to 3001 when 3000 is taken):
`TECH_API_URL=http://localhost:3000/cms-content`, `TECH_SITE_ID=kadanglabo-local`,
`TECH_PARTNER_KEY=local-cms-partner-key-development-only`.

## Tests

```
npm run test:articleflow          # from the repo root
npm run test:admin:responsive     # includes the ArticleFlow page, preview and reason dialogs at every width
```

## Take out (the subscription ended for good)

Published articles are untouched by all of this: they are ordinary rows in `articles`.

1. `admin/worker/integrations.ts`: delete the `articleflow` import and make the list empty (`export const integrations: Integration[] = []`).
2. `admin/src/integrations.tsx`: delete the `articleflowUi` import and make the list empty (`export const integrations: UiIntegration[] = []`).
3. Delete the folder `admin/articleflow/`.
4. Remove the leftovers that only name it: `articleflow/...` in the `include` lists of `admin/tsconfig.app.json` and
   `admin/tsconfig.worker.json`, the `articleflow:*` scripts in `admin/package.json`, `test:articleflow` in the root
   `package.json`. (The test harness and the responsive test already skip ArticleFlow when the folder is gone.)
5. Drop the tables: run `migrations/9999_remove_articleflow.sql` on kadanglabo-content **before** deleting the folder, or
   `npx wrangler d1 execute kadanglabo-content --remote --command "DROP TABLE IF EXISTS articleflow_outbox; DROP TABLE IF EXISTS articleflow_cache; DROP TABLE IF EXISTS articleflow_items;"`.
6. `npx wrangler secret delete TECH_PARTNER_KEY`, remove the `TECH_*` vars, then build and deploy as usual.
