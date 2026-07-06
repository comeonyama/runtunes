import Fastify from "fastify";
import { CandidateRepository } from "./repositories/candidateRepository.js";
import {
  selectTracksWithAI,
  type TrackSelectionCandidate,
  type TrackSelectionRequest,
  type TrackSelectionResult,
} from "./services/openaiService.js";
import {
  createSpotifyPlaylist,
  getRetryAfterSeconds,
  getCurrentUserProfile,
  SpotifyApiError,
  type CreateSpotifyPlaylistResult,
  type SpotifyUserProfile,
} from "./services/spotifyService.js";
import { exchangeSpotifyAuthorizationCode } from "./services/spotifyAuthService.js";
import type {
  SpotifySearchGenre,
  SpotifyTrackSearchResult,
} from "./services/spotifySearchTypes.js";

type ErrorResponse = {
  message: string;
  retryAfterSeconds?: number;
};

export const server = Fastify({ logger: true });
const candidateRepository = new CandidateRepository();

const SPOTIFY_RATE_LIMIT_MESSAGE = "Spotify rate limit exceeded.";
const SPOTIFY_ACCESS_TOKEN_COOKIE = "runtunes_spotify_access";

function getCookie(requestCookieHeader: string | undefined, name: string) {
  if (!requestCookieHeader) return null;

  for (const part of requestCookieHeader.split(";")) {
    const [cookieName, ...cookieValue] = part.trim().split("=");
    if (cookieName === name) {
      try {
        return decodeURIComponent(cookieValue.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function getAccessToken(cookieHeader: string | undefined) {
  return getCookie(cookieHeader, SPOTIFY_ACCESS_TOKEN_COOKIE);
}

function serializeAccessTokenCookie(accessToken: string, maxAge: number) {
  const secure = process.env.AWS_LAMBDA_FUNCTION_NAME ? "; Secure" : "";
  return `${SPOTIFY_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; HttpOnly; Path=/; Max-Age=${Math.floor(maxAge)}; SameSite=Lax${secure}`;
}

function clearAccessTokenCookie() {
  return serializeAccessTokenCookie("", 0);
}

function isAllowedRequestOrigin(origin: string | undefined) {
  const configuredOrigin = process.env.FRONTEND_ORIGIN?.trim();
  if (configuredOrigin) return origin === configuredOrigin;
  return origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173";
}

function isSpotifyTokenRequestBody(
  value: unknown,
): value is { code: string; codeVerifier: string; redirectUri: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    isNonEmptyString(value.code) &&
    value.code.length <= 2048 &&
    "codeVerifier" in value &&
    isNonEmptyString(value.codeVerifier) &&
    value.codeVerifier.length >= 43 &&
    value.codeVerifier.length <= 128 &&
    "redirectUri" in value &&
    isNonEmptyString(value.redirectUri) &&
    value.redirectUri.length <= 2048
  );
}

server.post<{
  Body: unknown;
  Reply: { expiresIn: number } | ErrorResponse;
}>(
  "/api/spotify/token",
  async (request, reply) => {
    if (!isAllowedRequestOrigin(request.headers.origin)) {
      return reply.code(403).send({ message: "Request origin is not allowed." });
    }
    if (!isSpotifyTokenRequestBody(request.body)) {
      return reply.code(400).send({ message: "Invalid Spotify token request." });
    }

    try {
      const token = await exchangeSpotifyAuthorizationCode(
        request.body.code,
        request.body.codeVerifier,
        request.body.redirectUri,
      );
      reply.header(
        "Set-Cookie",
        serializeAccessTokenCookie(token.accessToken, token.expiresIn),
      );
      reply.header("Cache-Control", "no-store");
      return reply.send({ expiresIn: token.expiresIn });
    } catch (error) {
      request.log.error(error, "Spotify token exchange failed");
      return reply.code(502).send({ message: "Spotify token exchange failed." });
    }
  },
);

server.post<{ Reply: { ok: true } | ErrorResponse }>(
  "/api/spotify/logout",
  async (request, reply) => {
    if (!isAllowedRequestOrigin(request.headers.origin)) {
      return reply.code(403).send({ message: "Request origin is not allowed." });
    }
    reply.header("Set-Cookie", clearAccessTokenCookie());
    return reply.send({ ok: true });
  },
);

server.get<{
  Querystring: { genre?: string };
  Reply: SpotifyTrackSearchResult | ErrorResponse;
}>("/api/spotify/tracks", async (request, reply) => {
  if (!isSpotifySearchGenre(request.query.genre)) {
    return reply.code(400).send({ message: "Invalid candidate genre." });
  }

  try {
    const candidates = await candidateRepository.search(request.query.genre);
    const result = {
      tracks: candidates.map(({ spotifyTrackId, ...track }) => ({
        id: spotifyTrackId,
        ...track,
      })),
    };
    reply.header("Cache-Control", "no-store");
    return reply.send(result);
  } catch (error) {
    request.log.error(error, "Candidate database read failed");
    return reply.code(500).send({ message: "Candidate database read failed." });
  }
});

function isSpotifySearchGenre(value: unknown): value is SpotifySearchGenre {
  return ["global", "kpop", "jgroove"].includes(String(value));
}

server.get<{ Reply: SpotifyUserProfile | ErrorResponse }>(
  "/api/spotify/profile",
  async (request, reply) => {
    const accessToken = getAccessToken(request.headers.cookie);

    if (!accessToken) {
      return reply
        .code(401)
        .send({ message: "Spotify authorization is required." });
    }

    try {
      return reply.send(await getCurrentUserProfile(accessToken));
    } catch (error) {
      request.log.error(error, "Spotify profile request failed");

      if (error instanceof SpotifyApiError) {
        if (error.status === 429) {
          const retryAfterSeconds = getRetryAfterSeconds(error.retryAfter);
          reply.header("Retry-After", String(retryAfterSeconds));
          return reply.code(429).send({
            message: SPOTIFY_RATE_LIMIT_MESSAGE,
            retryAfterSeconds,
          });
        }

        return reply
          .code(error.status === 401 ? 401 : 502)
          .send({ message: "Spotify profile request failed." });
      }

      return reply
        .code(502)
        .send({ message: "Spotify profile request failed." });
    }
  },
);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTrackSelectionCandidate(
  value: unknown,
): value is TrackSelectionCandidate {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    isNonEmptyString(value.id) &&
    "name" in value &&
    isNonEmptyString(value.name) &&
    "artists" in value &&
    Array.isArray(value.artists) &&
    value.artists.every(isNonEmptyString) &&
    "album" in value &&
    isNonEmptyString(value.album)
  );
}

function isTrackSelectionRequest(
  value: unknown,
): value is TrackSelectionRequest {
  if (typeof value !== "object" || value === null) return false;

  return (
    "durationMinutes" in value &&
    typeof value.durationMinutes === "number" &&
    Number.isFinite(value.durationMinutes) &&
    value.durationMinutes >= 30 &&
    value.durationMinutes <= 120 &&
    "pace" in value &&
    ["easy", "middle", "hard"].includes(String(value.pace)) &&
    "genre" in value &&
    ["global", "J_GROOVE", "kpop"].includes(String(value.genre)) &&
    "tracks" in value &&
    Array.isArray(value.tracks) &&
    value.tracks.length > 0 &&
    value.tracks.length <= 50 &&
    value.tracks.every(isTrackSelectionCandidate)
  );
}

type SpotifyPlaylistRequestBody = {
  selectedTrackIds: string[];
  playlistTitle: string;
  playlistDescription: string;
};

function isSpotifyPlaylistRequestBody(
  value: unknown,
): value is SpotifyPlaylistRequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "selectedTrackIds" in value &&
    Array.isArray(value.selectedTrackIds) &&
    value.selectedTrackIds.length > 0 &&
    value.selectedTrackIds.length <= 100 &&
    value.selectedTrackIds.every(
      (id) => typeof id === "string" && /^[A-Za-z0-9]+$/.test(id),
    ) &&
    "playlistTitle" in value &&
    isNonEmptyString(value.playlistTitle) &&
    value.playlistTitle.length <= 100 &&
    "playlistDescription" in value &&
    isNonEmptyString(value.playlistDescription) &&
    value.playlistDescription.length <= 300
  );
}

server.post<{
  Body: unknown;
  Reply: TrackSelectionResult | ErrorResponse;
}>("/api/openai/select-tracks", async (request, reply) => {
  if (!isAllowedRequestOrigin(request.headers.origin)) {
    return reply.code(403).send({ message: "Request origin is not allowed." });
  }
  const accessToken = getAccessToken(request.headers.cookie);

  if (!accessToken) {
    return reply
      .code(401)
      .send({ message: "Spotify authorization is required." });
  }

  if (!isTrackSelectionRequest(request.body)) {
    return reply
      .code(400)
      .send({ message: "Invalid track selection request." });
  }

  try {
    await getCurrentUserProfile(accessToken);
    const selection = await selectTracksWithAI(request.body);
    return reply.send(selection);
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      request.log.error(error, "Spotify authorization check failed");

      if (error.status === 429) {
        const retryAfterSeconds = getRetryAfterSeconds(error.retryAfter);
        reply.header("Retry-After", String(retryAfterSeconds));
        return reply.code(429).send({
          message: SPOTIFY_RATE_LIMIT_MESSAGE,
          retryAfterSeconds,
        });
      }

      return reply
        .code(error.status === 401 ? 401 : 502)
        .send({ message: "Spotify authorization check failed." });
    }

    request.log.error(error, "OpenAI track selection failed");
    return reply
      .code(502)
      .send({ message: "Could not select tracks with AI." });
  }
});

server.post<{
  Body: unknown;
  Reply: CreateSpotifyPlaylistResult | ErrorResponse;
}>("/api/spotify/playlists", async (request, reply) => {
  if (!isAllowedRequestOrigin(request.headers.origin)) {
    return reply.code(403).send({ message: "Request origin is not allowed." });
  }
  const accessToken = getAccessToken(request.headers.cookie);

  if (!accessToken) {
    return reply
      .code(401)
      .send({ message: "Spotify authorization is required." });
  }

  if (!isSpotifyPlaylistRequestBody(request.body)) {
    return reply.code(400).send({ message: "Invalid playlist request." });
  }

  try {
    const playlist = await createSpotifyPlaylist({
      accessToken,
      ...request.body,
      selectedTrackIds: [...new Set(request.body.selectedTrackIds)],
    });
    return reply.code(201).send(playlist);
  } catch (error) {
    request.log.error("Spotify playlist creation failed");

    if (error instanceof SpotifyApiError) {
      if (error.status === 401) {
        return reply.code(401).send({ message: "Spotify session expired." });
      }
      if (error.status === 429) {
        const retryAfterSeconds = getRetryAfterSeconds(error.retryAfter);
        reply.header("Retry-After", String(retryAfterSeconds));
        return reply.code(429).send({
          message: SPOTIFY_RATE_LIMIT_MESSAGE,
          retryAfterSeconds,
        });
      }
    }

    return reply
      .code(502)
      .send({ message: "Spotify playlist creation failed." });
  }
});
