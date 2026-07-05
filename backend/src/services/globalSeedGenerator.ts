import { readFile, rename, writeFile } from "node:fs/promises";
import { parse } from "dotenv";
import OpenAI from "openai";

const MODEL = "gpt-5.5";
const GLOBAL_SEED_URL = new URL("../../data/global-seed.json", import.meta.url);
const GLOBAL_SEED_PROMPT = `
Generate a durable Global seed set for RunTunes, a running-playlist application.

Requirements:
- Return current, internationally recognizable artists with strong running-playlist potential.
- Include a balanced mix of pop, dance, electronic, hip-hop, rock, groups and solo artists, established acts and newer acts.
- Represent artists from multiple countries and regions while prioritizing broad international discoverability.
- Return Spotify Search keywords that can discover energetic global tracks beyond exact artist searches.
- Keep keywords concise and directly usable as Spotify Search queries.
- Do not include K-Pop or J-Pop artists, song names, explanations, or duplicate entries.
`.trim();

type GlobalSeedCandidates = {
  artists: string[];
  keywords: string[];
};

type GlobalSeedFile = GlobalSeedCandidates & {
  name: "Global AI Seed";
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

function parseCandidates(outputText: string): GlobalSeedCandidates {
  const value: unknown = JSON.parse(outputText);

  if (
    typeof value !== "object" ||
    value === null ||
    !("artists" in value) ||
    !isNonEmptyStringArray(value.artists) ||
    !("keywords" in value) ||
    !isNonEmptyStringArray(value.keywords)
  ) {
    throw new Error("OpenAI returned invalid Global seeds.");
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

export async function generateGlobalSeedFile(): Promise<GlobalSeedFile> {
  const client = new OpenAI({ apiKey: await loadApiKey() });
  const response = await client.responses.create({
    model: MODEL,
    input: GLOBAL_SEED_PROMPT,
    max_output_tokens: 1_500,
    reasoning: { effort: "low" },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "runtunes_global_seeds",
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
    name: "Global AI Seed",
    generatedBy: "OpenAI Responses API",
    generatedAt: new Date().toISOString(),
    ...candidates,
  };
}

export async function saveGlobalSeedFile(seed: GlobalSeedFile): Promise<void> {
  const temporaryUrl = new URL(
    `../../data/global-seed.${process.pid}.${Date.now()}.tmp`,
    import.meta.url,
  );
  await writeFile(temporaryUrl, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  await rename(temporaryUrl, GLOBAL_SEED_URL);
}
