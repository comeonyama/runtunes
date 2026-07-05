# RunTunes backend

## AWS Lambda entry point

The backend uses the same Fastify application for local development and AWS
Lambda. Local commands start `src/local.ts`; the Lambda handler is exported by
`src/lambda.ts`.

Build the backend before creating the Lambda deployment package:

```bash
npm ci
npm run build
npm prune --omit=dev
```

Use `dist/lambda.handler` as the Lambda handler. The ZIP root must contain all
of the following paths:

```text
dist/
data/candidates/
node_modules/
package.json
```

`data/candidates/` is read-only at runtime. After the administrator batch
updates a candidate file, build and deploy a new Lambda package. Batch commands
remain local administration tasks and are not invoked by Lambda.

Connect the function to an API Gateway HTTP API using a `$default` route and
payload format version `2.0`. Configure API Gateway CORS for the production
frontend origin, methods `GET`, `POST`, and `OPTIONS`, and headers
`Authorization` and `Content-Type`.

Set `OPENAI_API_KEY` as a Lambda environment variable. Spotify user access
tokens continue to arrive in the request `Authorization` header and are not
stored in Lambda.

## Candidate DB batch

Spotify Search is only executed by the administrator batch. The application
endpoint reads the JSON Candidate DB and never searches Spotify in response to
a user action.

Set a valid Spotify access token in `backend/.env`:

```dotenv
SPOTIFY_BATCH_ACCESS_TOKEN=your_access_token
REQUEST_INTERVAL_MS=1000
```

Run a batch from the repository root:

```bash
npm run batch:global
npm run batch:j-groove
npm run batch:kpop
```

J-Groove uses artist seeds from `backend/data/jgroove-seed.json`. Global and
K-Pop use OpenAI-generated artist and keyword seeds saved in
`backend/data/global-seed.json` and `backend/data/kpop-seed.json`. Regenerate
those files separately when needed:

```bash
npm run seed:global
npm run batch:global
npm run seed:kpop
npm run batch:kpop
```

Seed generation requires `OPENAI_API_KEY`. The Global and K-Pop batches do not
call OpenAI; they only search Spotify using the saved JSON.

Candidate files are stored in `backend/data/candidates/`. Progress and Spotify
`Retry-After` state are stored in `backend/data/batch-state.json`. If a batch is
rate limited, it exits without sleeping for the full retry window; rerunning it
before `nextAllowedAt` performs no Spotify API request, and a later run resumes
from the saved seed index.
