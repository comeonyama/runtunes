import { readFileSync } from "node:fs";
import { parse } from "dotenv";

const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

export type SpotifyToken = {
  accessToken: string;
  expiresIn: number;
};

function getSpotifyOAuthConfig() {
  let clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  let redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    try {
      const env = parse(readFileSync(new URL("../../.env", import.meta.url)));
      clientId ||= env.SPOTIFY_CLIENT_ID?.trim();
      redirectUri ||= env.SPOTIFY_REDIRECT_URI?.trim();
    } catch {
      // Production configuration is supplied through environment variables.
    }
  }

  if (!clientId || !redirectUri) {
    throw new Error("Spotify OAuth configuration is missing.");
  }
  return { clientId, redirectUri };
}

export async function exchangeSpotifyAuthorizationCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<SpotifyToken> {
  const config = getSpotifyOAuthConfig();
  if (redirectUri !== config.redirectUri) {
    throw new Error("Spotify redirect URI does not match the configured URI.");
  }

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Spotify token exchange failed with ${response.status}.`);
  }

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("access_token" in data) ||
    typeof data.access_token !== "string" ||
    !data.access_token ||
    !("expires_in" in data) ||
    typeof data.expires_in !== "number" ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0
  ) {
    throw new Error("Spotify returned an invalid token response.");
  }

  return { accessToken: data.access_token, expiresIn: data.expires_in };
}
