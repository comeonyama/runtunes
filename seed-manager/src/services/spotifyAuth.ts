import type { SpotifyTokenResponse } from "../types/spotify";

const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const STORAGE_KEYS = {
  accessToken: "runtunes_seed_manager_access_token",
  refreshToken: "runtunes_seed_manager_refresh_token",
  expiresAt: "runtunes_seed_manager_expires_at",
  codeVerifier: "runtunes_seed_manager_code_verifier",
  state: "runtunes_seed_manager_auth_state",
} as const;

function getSpotifyConfig() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim();
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    throw new Error("Spotify の設定がありません。.env.local を確認してください。");
  }

  return { clientId, redirectUri };
}

function randomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(values, (value) => characters[value % characters.length]).join(
    "",
  );
}

async function createCodeChallenge(verifier: string) {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function storeToken(token: SpotifyTokenResponse) {
  localStorage.setItem(STORAGE_KEYS.accessToken, token.access_token);
  localStorage.setItem(
    STORAGE_KEYS.expiresAt,
    String(Date.now() + token.expires_in * 1000),
  );

  if (token.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, token.refresh_token);
  }
}

async function requestToken(body: URLSearchParams) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Spotify 認証に失敗しました。もう一度接続してください。");
  }

  const token = (await response.json()) as SpotifyTokenResponse;
  storeToken(token);
  return token.access_token;
}

export async function startSpotifyLogin() {
  const { clientId, redirectUri } = getSpotifyConfig();
  const verifier = randomString(64);
  const state = randomString(32);
  const challenge = await createCodeChallenge(verifier);

  sessionStorage.setItem(STORAGE_KEYS.codeVerifier, verifier);
  sessionStorage.setItem(STORAGE_KEYS.state, state);

  const url = new URL(AUTHORIZE_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "playlist-read-private playlist-read-collaborative",
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString();

  window.location.assign(url.toString());
}

export async function finishSpotifyLogin(code: string, receivedState: string) {
  const { clientId, redirectUri } = getSpotifyConfig();
  const verifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);
  const expectedState = sessionStorage.getItem(STORAGE_KEYS.state);

  if (!verifier || !expectedState || receivedState !== expectedState) {
    throw new Error("Spotify 認証の状態を確認できませんでした。もう一度接続してください。");
  }

  try {
    await requestToken(
      new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    );
  } finally {
    sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
    sessionStorage.removeItem(STORAGE_KEYS.state);
  }
}

export async function getValidAccessToken() {
  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.expiresAt));

  if (accessToken && Number.isFinite(expiresAt) && Date.now() < expiresAt - 30_000) {
    return accessToken;
  }

  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  const { clientId } = getSpotifyConfig();

  try {
    return await requestToken(
      new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    );
  } catch {
    clearSpotifySession();
    return null;
  }
}

export function hasSpotifySession() {
  return Boolean(
    localStorage.getItem(STORAGE_KEYS.accessToken) ||
      localStorage.getItem(STORAGE_KEYS.refreshToken),
  );
}

export function clearSpotifySession() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
