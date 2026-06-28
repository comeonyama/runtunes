import { readFile, rename, writeFile } from "node:fs/promises";
import { parse } from "dotenv";
import OpenAI from "openai";

const MODEL = "gpt-5.5";
const KPOP_SEED_URL = new URL("../../data/kpop-seed.json", import.meta.url);
const KPOP_SEED_PROMPT = `
Generate a durable K-Pop seed set for RunTunes, a running-playlist application.

Requirements:
- Return current, recognizable K-Pop artists with strong running-playlist potential.
- Include a balanced mix of groups and solo artists, established acts and newer acts, and varied energetic styles.
- Return Spotify Search keywords that can discover energetic Korean pop and dance tracks beyond exact artist searches.
- Keep keywords concise and directly usable as Spotify Search queries.
- Do not include J-Pop artists, non-Korean pop artists, song names, explanations, or duplicate entries.
`.trim();

type KpopSeedCandidates = {
  artists: string[];
  keywords: string[];
};

type KpopSeedFile = KpopSeedCandidates & {
  name: "K-Pop AI Seed";
  generatedBy: "OpenAI Responses API";
  generatedAt: string;
};

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function parseCandidates(outputText: string): KpopSeedCandidates {
  const value: unknown = JSON.parse(outputText);

  if (
    typeof value !== "object" ||
    value === null ||
    !("artists" in value) ||
    !isNonEmptyStringArray(value.artists) ||
    !("keywords" in value) ||
    !isNonEmptyStringArray(value.keywords)
  ) {
    throw new Error("OpenAI returned invalid K-Pop seeds.");
  }

  return {
    artists: [...new Set(value.artists.map((item) => item.trim()))],
    keywords: [...new Set(value.keywords.map((item) => item.trim()))],
  };
}

async function loadApiKey(): Promise<string> {
  const environmentKey = process.env.OPENAI_API_KEY?.trim();
  if (environmentKey) return environmentKey;

  try {
    const envFile = parse(
      await readFile(new URL("../../.env", import.meta.url), "utf8"),
    );
    const fileKey = envFile.OPENAI_API_KEY?.trim();
    if (fileKey) return fileKey;
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  throw new Error(
    "OPENAI_API_KEY is not set in the environment or backend/.env.",
  );
}

export async function generateKpopSeedFile(): Promise<KpopSeedFile> {
  const client = new OpenAI({ apiKey: await loadApiKey() });
  const response = await client.responses.create({
    model: MODEL,
    input: KPOP_SEED_PROMPT,
    max_output_tokens: 1_500,
    reasoning: { effort: "low" },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "runtunes_kpop_seeds",
        strict: true,
        schema: {
          type: "object",
          properties: {
            artists: {
              type: "array",
              items: { type: "string" },
              minItems: 15,
              maxItems: 30,
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              minItems: 5,
              maxItems: 12,
            },
          },
          required: ["artists", "keywords"],
          additionalProperties: false,
        },
      },
    },
  });
  const candidates = parseCandidates(response.output_text);

  return {
    name: "K-Pop AI Seed",
    generatedBy: "OpenAI Responses API",
    generatedAt: new Date().toISOString(),
    ...candidates,
  };
}

export async function saveKpopSeedFile(seed: KpopSeedFile): Promise<void> {
  const temporaryUrl = new URL(
    `../../data/kpop-seed.${process.pid}.${Date.now()}.tmp`,
    import.meta.url,
  );
  await writeFile(temporaryUrl, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  await rename(temporaryUrl, KPOP_SEED_URL);
}
