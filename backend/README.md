# RunTunes backend

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

Candidate files are stored in `backend/data/candidates/`. Progress and Spotify
`Retry-After` state are stored in `backend/data/batch-state.json`. If a batch is
rate limited, it exits without sleeping for the full retry window; rerunning it
before `nextAllowedAt` performs no Spotify API request, and a later run resumes
from the saved seed index.
