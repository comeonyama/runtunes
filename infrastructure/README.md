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
  OpenAIApiKey=your-openai-api-key \
  SpotifyClientId=your-spotify-client-id \
  SpotifyRedirectUri=https://your-production-origin.example/runtunes/callback \
  BudgetNotificationEmail=your-email@example.com
```

Keep the generated `samconfig.toml` local if it contains environment-specific
values. After deployment, set the `ApiBaseUrl` stack output as
`VITE_API_BASE_URL` when building the frontend for XServer.

The default API Gateway hostname is cross-site from the production frontend,
so its `SameSite=None; Secure` Cookie can be subject to browser third-party
Cookie restrictions. Prefer an API custom domain under the same registrable
domain as the frontend for reliable production authentication.

API Gateway only exposes the required production API routes. Credentialed CORS
is restricted to the supplied frontend origin. The Lambda has no S3 or database permissions;
Candidate DB files are read from its deployment package.

## Cost safeguards

The stack limits Lambda reserved concurrency to two. The OpenAI selection route
allows a burst of one request and an average of one request every five seconds.
An account-wide monthly AWS cost budget of USD 5 sends email notifications at
80 percent actual spend, 100 percent actual spend, and 100 percent forecasted
spend. AWS Budgets sends alerts; it does not automatically stop resources.

SAM warns that the function has no API Gateway authorizer. This is expected:
the candidate GET route is public, while the profile, AI selection, and
playlist routes enforce Spotify HttpOnly Cookie authentication in Fastify. The AI
selection route validates the token against Spotify before calling OpenAI. You
can answer `Y` to that SAM prompt after building this version.
