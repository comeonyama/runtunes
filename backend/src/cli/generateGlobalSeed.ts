import {
  generateGlobalSeedFile,
  saveGlobalSeedFile,
} from "../services/globalSeedGenerator.js";

try {
  console.log("[seed:global] OpenAIでseed候補を生成します");
  const seed = await generateGlobalSeedFile();
  await saveGlobalSeedFile(seed);
  console.log(
    `[seed:global] 保存完了 artists=${seed.artists.length} keywords=${seed.keywords.length} generatedAt=${seed.generatedAt}`,
  );
} catch (error) {
  console.error(
    `[seed:global] 失敗: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
