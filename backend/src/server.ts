import Fastify from "fastify";
import {
  requestOpenAIConnectionTest,
  selectTracksWithAI,
  type TrackSelectionCandidate,
  type TrackSelectionRequest,
  type TrackSelectionResult,
} from "./services/openaiService.js";
import {
  createSpotifyPlaylist,
  getCurrentUserProfile,
  SpotifyApiError,
  type CreateSpotifyPlaylistResult,
  type SpotifyUserProfile,
} from "./services/spotifyService.js";
import { SpotifyWebSearchApi } from "./services/spotifySearchApi.js";
import { FileSpotifySearchCache } from "./services/spotifySearchCache.js";
import { FileSpotifyRateLimitStore } from "./services/spotifyRateLimitStore.js";
import {
  getRetryAfterSeconds,
  SpotifySearchService,
} from "./services/spotifySearchService.js";
import type {
  SpotifySearchGenre,
  SpotifyTrackSearchResult,
} from "./services/spotifySearchTypes.js";
import {
  loadJGrooveSeedArtists,
  type JGrooveSeedArtist,
} from "./services/jGrooveSeedService.js";

type OpenAIConnectionResponse = {
  text: string;
};

type ErrorResponse = {
  message: string;
  retryAfterSeconds?: number;
};

const server = Fastify({ logger: true });
const spotifySearchService = new SpotifySearchService({
  cache: new FileSpotifySearchCache(
    new URL("../cache/spotify/", import.meta.url),
  ),
  loadJGrooveSeedArtists,
  rateLimitStore: new FileSpotifyRateLimitStore(
    new URL("../cache/spotify-rate-limit.json", import.meta.url),
  ),
  spotifyApi: new SpotifyWebSearchApi(),
  log: (message) => server.log.info(message),
});

const SPOTIFY_RATE_LIMIT_MESSAGE = "Spotify rate limit exceeded.";

server.get<{ Reply: { artists: JGrooveSeedArtist[] } | ErrorResponse }>(
  "/api/spotify/jgroove-seed",
  async (request, reply) => {
    try {
      return reply.send({ artists: await loadJGrooveSeedArtists() });
    } catch {
      request.log.error("Could not load J-Groove seed artists");
      return reply
        .code(500)
        .send({ message: "Could not load J-Groove seed artists." });
    }
  },
);

server.get<{
  Querystring: { genre?: string };
  Reply: SpotifyTrackSearchResult | ErrorResponse;
}>("/api/spotify/tracks", async (request, reply) => {
  request.log.info("spotify tracks requested");
  const accessToken = getBearerToken(request.headers.authorization);

  if (!accessToken) {
    return reply
      .code(401)
      .send({ message: "Spotify authorization is required." });
  }

  if (!isSpotifySearchGenre(request.query.genre)) {
    return reply.code(400).send({ message: "Invalid Spotify genre." });
  }

  try {
    const result = await spotifySearchService.searchTracks(
      accessToken,
      request.query.genre,
    );
    reply.header("Cache-Control", "no-store");
    return reply.send(result);
  } catch (error) {
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

      if (error.status === 503) {
        return reply.code(503).send({ message: error.message });
      }
    }

    request.log.error(error, "Spotify track search failed");
    return reply.code(502).send({ message: "Spotify track search failed." });
  }
});

function isSpotifySearchGenre(value: unknown): value is SpotifySearchGenre {
  return ["global", "kpop", "jgroove"].includes(String(value));
}

server.get<{ Reply: SpotifyUserProfile | ErrorResponse }>(
  "/api/spotify/profile",
  async (request, reply) => {
    const accessToken = getBearerToken(request.headers.authorization);

    if (!accessToken) {
      return reply
        .code(401)
        .send({ message: "Spotify authorization is required." });
    }

    const activeRetryAfterSeconds =
      spotifySearchService.getRemainingRateLimitSeconds();
    if (activeRetryAfterSeconds > 0) {
      reply.header("Retry-After", String(activeRetryAfterSeconds));
      return reply.code(429).send({
        message: SPOTIFY_RATE_LIMIT_MESSAGE,
        retryAfterSeconds: activeRetryAfterSeconds,
      });
    }

    try {
      return reply.send(await getCurrentUserProfile(accessToken));
    } catch (error) {
      request.log.error(error, "Spotify profile request failed");

      if (error instanceof SpotifyApiError) {
        if (error.status === 429) {
          const retryAfterSeconds = await spotifySearchService.recordRateLimit(
            error.retryAfter,
          );
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
    "distance" in value &&
    typeof value.distance === "number" &&
    Number.isFinite(value.distance) &&
    value.distance > 0 &&
    "pace" in value &&
    typeof value.pace === "number" &&
    Number.isFinite(value.pace) &&
    value.pace > 0 &&
    "genre" in value &&
    ["global", "J_GROOVE", "kpop"].includes(String(value.genre)) &&
    "mood" in value &&
    ["motivation", "happy", "relax"].includes(String(value.mood)) &&
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

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

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
    "playlistDescription" in value &&
    isNonEmptyString(value.playlistDescription)
  );
}

server.post<{ Reply: OpenAIConnectionResponse | ErrorResponse }>(
  "/api/openai/test",
  async (request, reply) => {
    try {
      const text = await requestOpenAIConnectionTest();
      return reply.send({ text });
    } catch {
      request.log.error("OpenAI connection test failed");
      return reply.code(502).send({ message: "Could not connect to OpenAI." });
    }
  },
);

server.post<{
  Body: unknown;
  Reply: TrackSelectionResult | ErrorResponse;
}>("/api/openai/select-tracks", async (request, reply) => {
  if (!isTrackSelectionRequest(request.body)) {
    return reply
      .code(400)
      .send({ message: "Invalid track selection request." });
  }

  try {
    const selection = await selectTracksWithAI(request.body);
    return reply.send(selection);
  } catch {
    request.log.error("OpenAI track selection failed");
    return reply
      .code(502)
      .send({ message: "Could not select tracks with AI." });
  }
});

server.post<{
  Body: unknown;
  Reply: CreateSpotifyPlaylistResult | ErrorResponse;
}>("/api/spotify/playlists", async (request, reply) => {
  const accessToken = getBearerToken(request.headers.authorization);

  if (!accessToken) {
    return reply
      .code(401)
      .send({ message: "Spotify authorization is required." });
  }

  if (!isSpotifyPlaylistRequestBody(request.body)) {
    return reply.code(400).send({ message: "Invalid playlist request." });
  }

  const activeRetryAfterSeconds =
    spotifySearchService.getRemainingRateLimitSeconds();
  if (activeRetryAfterSeconds > 0) {
    reply.header("Retry-After", String(activeRetryAfterSeconds));
    return reply.code(429).send({
      message: SPOTIFY_RATE_LIMIT_MESSAGE,
      retryAfterSeconds: activeRetryAfterSeconds,
    });
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
        const retryAfterSeconds = await spotifySearchService.recordRateLimit(
          error.retryAfter,
        );
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

try {
  await spotifySearchService.initialize();
  await server.listen({
    host: "127.0.0.1",
    port: Number(process.env.PORT ?? 3001),
  });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
