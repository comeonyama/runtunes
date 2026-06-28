import {
  generateKpopSeedFile,
  saveKpopSeedFile,
} from "../services/kpopSeedGenerator.js";

try {
  console.log("[seed:kpop] OpenAIでseed候補を生成します");
  const seed = await generateKpopSeedFile();
  await saveKpopSeedFile(seed);
  console.log(
    `[seed:kpop] 保存完了 artists=${seed.artists.length} generatedAt=${seed.generatedAt}`,
  );
} catch (error) {
  console.error(
    `[seed:kpop] 失敗: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
