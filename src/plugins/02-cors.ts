import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";

const corsPlugin = fp(async (fastify) => {
  fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });
});

export default corsPlugin;
