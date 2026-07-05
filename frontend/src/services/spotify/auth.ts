import { getApiUrl } from "../api";

const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const STORAGE_KEYS = {
  authenticatedUntil: "spotify_authenticated_until",
  codeVerifier: "code_verifier",
  state: "spotify_auth_state",
} as const;

export const SPOTIFY_SCOPES = [
  "playlist-modify-private",
  "user-read-private",
] as const;

function getSpotifyConfig() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "Spotify configuration is missing. Set VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_REDIRECT_URI.",
    );
  }

  return { clientId, redirectUri };
}

function generateRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(
    randomValues,
    (value) => characters[value % characters.length],
  ).join("");
}

export function generateCodeVerifier(length = 64) {
  if (length < 43 || length > 128) {
    throw new RangeError("PKCE code verifier must be 43 to 128 characters.");
  }

  return generateRandomString(length);
}

export async function generateCodeChallenge(codeVerifier: string) {
  const encodedVerifier = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", encodedVerifier);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export async function loginWithSpotify() {
  const { clientId, redirectUri } = getSpotifyConfig();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  sessionStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);
  sessionStorage.setItem(STORAGE_KEYS.state, state);

  const authorizationUrl = new URL(AUTHORIZE_ENDPOINT);
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SPOTIFY_SCOPES.join(" "),
    state,
  }).toString();

  window.location.assign(authorizationUrl.toString());
}

export function validateSpotifyAuthState(receivedState: string | null) {
  const storedState = sessionStorage.getItem(STORAGE_KEYS.state);

  return Boolean(receivedState && storedState && receivedState === storedState);
}

export async function exchangeCodeForToken(code: string) {
  const { redirectUri } = getSpotifyConfig();
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);

  if (!codeVerifier) {
    throw new Error("Spotify login session expired. Please connect again.");
  }

  const response = await fetch(getApiUrl("/api/spotify/token"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, codeVerifier, redirectUri }),
  });
  if (!response.ok) {
    throw new Error("Spotify token exchange failed. Please connect again.");
  }
  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("expiresIn" in data) ||
    typeof data.expiresIn !== "number" ||
    !Number.isFinite(data.expiresIn) ||
    data.expiresIn <= 0
  ) {
    throw new Error("Spotify token exchange returned an invalid response.");
  }

  localStorage.setItem(
    STORAGE_KEYS.authenticatedUntil,
    String(Date.now() + data.expiresIn * 1000),
  );

  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
  sessionStorage.removeItem(STORAGE_KEYS.state);

}

function clearLegacyLocalStorageAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("expires_at");
}

export function isAuthenticated() {
  clearLegacyLocalStorageAuth();
  const authenticatedUntil = Number(
    localStorage.getItem(STORAGE_KEYS.authenticatedUntil),
  );
  if (!Number.isFinite(authenticatedUntil) || Date.now() >= authenticatedUntil) {
    localStorage.removeItem(STORAGE_KEYS.authenticatedUntil);
    return false;
  }
  return true;
}

export async function logout() {
  try {
    await fetch(getApiUrl("/api/spotify/logout"), {
      method: "POST",
      credentials: "include",
    });
  } finally {
    localStorage.removeItem(STORAGE_KEYS.authenticatedUntil);
    sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
    sessionStorage.removeItem(STORAGE_KEYS.state);
    clearLegacyLocalStorageAuth();
  }
}

export const clearSpotifyAuth = logout;
