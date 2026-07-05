import awsLambdaFastify from "@fastify/aws-lambda";
import { server } from "./server.js";

export const handler = awsLambdaFastify(server, {
  decorateRequest: false,
});

await server.ready();
