# RunTunes AWS deployment

This directory deploys the backend to one Lambda function behind an API
Gateway HTTP API. AWS SAM CLI and configured AWS credentials are required.

## Build

From the repository root:

```bash
cd backend
npm run package:lambda
cd ../infrastructure
sam validate --lint
sam build
```

The package command compiles TypeScript, installs production-only dependencies
in `backend/.lambda-package/`, copies `data/candidates/`, and also creates
`backend/runtunes-lambda.zip` for manual inspection or upload.

## Deploy

Run the guided deployment once:

```bash
sam deploy --guided \
  --parameter-overrides \
  FrontendOrigin=https://your-production-origin.example \
  OpenAIApiKey=your-openai-api-key
```

Keep the generated `samconfig.toml` local if it contains environment-specific
values. After deployment, set the `ApiBaseUrl` stack output as
`VITE_API_BASE_URL` when building the frontend for XServer.

API Gateway only exposes the four production API routes. CORS is restricted to
the supplied frontend origin. The Lambda has no S3 or database permissions;
Candidate DB files are read from its deployment package.

SAM warns that the function has no API Gateway authorizer. This is expected:
the candidate GET route is public, while the profile, AI selection, and
playlist routes enforce Spotify bearer-token authentication in Fastify. The AI
selection route validates the token against Spotify before calling OpenAI. You
can answer `Y` to that SAM prompt after building this version.
