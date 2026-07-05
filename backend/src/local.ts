import { server } from "./server.js";

try {
  await server.listen({
    host: "127.0.0.1",
    port: Number(process.env.PORT ?? 3001),
  });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
