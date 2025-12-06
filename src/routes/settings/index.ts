import { FastifyPluginAsync } from "fastify";
import {
  userSettingsSchema,
  deleteAccountResponseSchema,
  errorResponseSchema,
  tags,
  securitySchema,
} from "../../schemas";

type UserRow = {
  id: number;
  username: string;
  email: string;
};

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /settings/
  fastify.get(
    "/",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: tags.settings,
        description: "Obter informações da conta do usuário",
        security: securitySchema,
        response: {
          200: userSettingsSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: "Não autorizado" });
      }

      const selectUser = fastify.db.prepare(
        "SELECT id, username, email FROM users WHERE id = ?"
      );
      const user = selectUser.get(request.user.id) as UserRow | undefined;

      if (!user) {
        return reply.code(404).send({ message: "Usuário não encontrado" });
      }

      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    }
  );

  // POST /settings/delete/
  fastify.post(
    "/delete/",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: tags.settings,
        description: "Deletar conta do usuário (cascade delete em assets)",
        security: securitySchema,
        response: {
          200: deleteAccountResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: "Não autorizado" });
      }

      const selectUser = fastify.db.prepare(
        "SELECT id FROM users WHERE id = ?"
      );
      const user = selectUser.get(request.user.id) as UserRow | undefined;

      if (!user) {
        return reply.code(404).send({ message: "Usuário não encontrado" });
      }

      // Deletar usuário (cascata deleta assets automaticamente)
      const deleteUser = fastify.db.prepare("DELETE FROM users WHERE id = ?");
      deleteUser.run(user.id);

      return reply.send({
        message: "Conta deletada com sucesso",
        deleted: true,
      });
    }
  );
};

export default settingsRoutes;
