import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageDirectory = join(backendDirectory, ".lambda-package");
const zipPath = join(backendDirectory, "runtunes-lambda.zip");

await rm(packageDirectory, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(packageDirectory, { recursive: true });

await Promise.all([
  cp(join(backendDirectory, "dist"), join(packageDirectory, "dist"), {
    recursive: true,
  }),
  cp(
    join(backendDirectory, "data", "candidates"),
    join(packageDirectory, "data", "candidates"),
    { recursive: true },
  ),
  cp(
    join(backendDirectory, "package-lock.json"),
    join(packageDirectory, "package-lock.json"),
  ),
]);

const packageJson = JSON.parse(
  await readFile(join(backendDirectory, "package.json"), "utf8"),
);
await writeFile(
  join(packageDirectory, "package.json"),
  `${JSON.stringify({
    name: packageJson.name,
    version: packageJson.version,
    private: true,
    type: packageJson.type,
    dependencies: packageJson.dependencies,
  }, null, 2)}\n`,
);

run("npm", ["ci", "--omit=dev"], packageDirectory);
run("zip", ["-qr", zipPath, "."], packageDirectory);

console.log(`Lambda package created: ${zipPath}`);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}
