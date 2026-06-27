import axios from "axios";
import type { SpotifyTokenResponse } from "../../types/spotify";

const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  expiresAt: "expires_at",
  codeVerifier: "code_verifier",
  state: "spotify_auth_state",
} as const;

export const SPOTIFY_SCOPES = [
  "playlist-modify-public",
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
  const { clientId, redirectUri } = getSpotifyConfig();
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);

  if (!codeVerifier) {
    throw new Error("Spotify login session expired. Please connect again.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const { data } = await axios.post<SpotifyTokenResponse>(
    TOKEN_ENDPOINT,
    body,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
  localStorage.setItem(
    STORAGE_KEYS.expiresAt,
    String(Date.now() + data.expires_in * 1000),
  );

  localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);

  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
  sessionStorage.removeItem(STORAGE_KEYS.state);

  return data;
}

export function getStoredAccessToken() {
  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.expiresAt));

  if (!accessToken || !Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.expiresAt);
    return null;
  }

  return accessToken;
}

export function isAuthenticated() {
  return getStoredAccessToken() !== null;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.expiresAt);
  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
  sessionStorage.removeItem(STORAGE_KEYS.state);
}

export const clearSpotifyAuth = logout;
