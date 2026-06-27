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
  SpotifyApiError,
  type CreateSpotifyPlaylistResult,
} from "./services/spotifyService.js";
import {
  loadJpopSeedArtists,
  type JpopSeedArtist,
} from "./services/jpopSeedService.js";

type OpenAIConnectionResponse = {
  text: string;
};

type ErrorResponse = {
  message: string;
};

const server = Fastify({ logger: true });

server.get<{ Reply: { artists: JpopSeedArtist[] } | ErrorResponse }>(
  "/api/spotify/jpop-seed",
  async (request, reply) => {
    try {
      return reply.send({ artists: await loadJpopSeedArtists() });
    } catch {
      request.log.error("Could not load J-Pop seed artists");
      return reply
        .code(500)
        .send({ message: "Could not load J-Pop seed artists." });
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
    ["global", "jpop", "kpop"].includes(String(value.genre)) &&
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
      if (error.retryAfter) reply.header("Retry-After", error.retryAfter);
      if (error.status === 401) {
        return reply.code(401).send({ message: "Spotify session expired." });
      }
      if (error.status === 429) {
        return reply
          .code(429)
          .send({ message: "Spotify rate limit exceeded." });
      }
    }

    return reply
      .code(502)
      .send({ message: "Spotify playlist creation failed." });
  }
});

try {
  await server.listen({
    host: "127.0.0.1",
    port: Number(process.env.PORT ?? 3001),
  });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
