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

Before the first custom-domain deployment, request an ACM public certificate
for `api.discoverroutes.jp` in `ap-northeast-1`. Add the ACM validation CNAME
to Cloudflare as DNS-only, wait for the certificate status to become `Issued`,
and copy its ARN.

Run the guided deployment once:

```bash
sam deploy --guided \
  --parameter-overrides \
  FrontendOrigin=https://your-production-origin.example \
  OpenAIApiKey=your-openai-api-key \
  SpotifyClientId=your-spotify-client-id \
  SpotifyRedirectUri=https://your-production-origin.example/runtunes/callback \
  ApiDomainName=api.discoverroutes.jp \
  ApiCertificateArn=your-acm-certificate-arn \
  BudgetNotificationEmail=your-email@example.com
```

Keep the generated `samconfig.toml` local if it contains environment-specific
values. After deployment, create a DNS-only Cloudflare CNAME named `api` whose
target is the `ApiCustomDomainTarget` stack output. The `ApiBaseUrl` output is
the value to use as frontend `VITE_API_BASE_URL`.

The custom API domain and frontend share the `discoverroutes.jp` site, so the
Spotify HttpOnly Cookie uses `SameSite=Lax` and works without third-party
Cookie access.

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
