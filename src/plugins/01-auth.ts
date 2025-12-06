import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: number };
    user: { id: number };
  }
}

const authPlugin = fp(async (fastify) => {
  const secret = process.env.JWT_SECRET ?? "dev-insecure-secret";

  if (!process.env.JWT_SECRET) {
    fastify.log.warn(
      "JWT_SECRET não definido, usando valor padrão apenas para desenvolvimento."
    );
  }

  fastify.register(fastifyJwt, { secret });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = await request.jwtVerify<{ userId: number }>();
        request.user = { id: payload.userId };
      } catch {
        await reply.code(401).send({ message: "Não autorizado" });
        return;
      }
    }
  );
});

export default authPlugin;
