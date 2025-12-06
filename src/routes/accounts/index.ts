import { FastifyPluginAsync } from "fastify";
import { hash, compare } from "bcryptjs";
import {
  authResponseSchema,
  registerResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
  tags,
  securitySchema,
} from "../../schemas";

type UserRow = {
  id: number;
  username: string;
  email: string;
  password: string;
};

type RegisterBody = {
  email: string;
  password: string;
};

type LoginBody = {
  username: string;
  password: string;
};

type PasswordChangeBody = {
  old_password: string;
  new_password: string;
};

const accountsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /accounts/register/
  fastify.post<{ Body: RegisterBody }>(
    "/register/",
    {
      schema: {
        tags: tags.accounts,
        description: "Registrar novo usuário",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
          },
        },
        response: {
          201: registerResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const username = email; // username = email conforme spec

      // Verificar se usuário já existe
      const checkUser = fastify.db.prepare(
        "SELECT id FROM users WHERE username = ?"
      );
      const existing = checkUser.get(username) as UserRow | undefined;

      if (existing) {
        return reply.code(400).send({ message: "Email já cadastrado" });
      }

      // Criar usuário
      const passwordHash = await hash(password, 10);
      const insertUser = fastify.db.prepare(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
      );
      const result = insertUser.run(username, email, passwordHash);
      const userId = result.lastInsertRowid as number;

      // Login automático - gerar token
      const token = fastify.jwt.sign({ userId });

      return reply.code(201).send({
        message: "Usuário criado com sucesso",
        token,
        user: { id: userId, email },
      });
    }
  );

  // POST /accounts/login/
  fastify.post<{ Body: LoginBody }>(
    "/login/",
    {
      schema: {
        tags: tags.accounts,
        description: "Fazer login e obter token JWT",
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", description: "Email do usuário" },
            password: { type: "string" },
          },
        },
        response: {
          200: authResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body;

      const selectUser = fastify.db.prepare(
        "SELECT id, username, email, password FROM users WHERE username = ?"
      );
      const user = selectUser.get(username) as UserRow | undefined;

      if (!user) {
        return reply.code(401).send({ message: "Credenciais inválidas" });
      }

      const passwordMatches = await compare(password, user.password);

      if (!passwordMatches) {
        return reply.code(401).send({ message: "Credenciais inválidas" });
      }

      const token = fastify.jwt.sign({ userId: user.id });

      return reply.send({
        token,
        user: { id: user.id, email: user.email },
      });
    }
  );

  // POST /accounts/logout/
  fastify.post(
    "/logout/",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: tags.accounts,
        description: "Fazer logout (invalidar token no cliente)",
        security: securitySchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // No JWT, logout é feito no cliente (remover token)
      return reply.send({ message: "Logout realizado com sucesso" });
    }
  );

  // POST /accounts/password_change/
  fastify.post<{ Body: PasswordChangeBody }>(
    "/password_change/",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: tags.accounts,
        description: "Trocar senha do usuário autenticado",
        security: securitySchema,
        body: {
          type: "object",
          required: ["old_password", "new_password"],
          properties: {
            old_password: { type: "string" },
            new_password: { type: "string", minLength: 6 },
          },
        },
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: "Não autorizado" });
      }

      const { old_password, new_password } = request.body;

      const selectUser = fastify.db.prepare(
        "SELECT id, password FROM users WHERE id = ?"
      );
      const user = selectUser.get(request.user.id) as UserRow | undefined;

      if (!user) {
        return reply.code(404).send({ message: "Usuário não encontrado" });
      }

      const passwordMatches = await compare(old_password, user.password);

      if (!passwordMatches) {
        return reply.code(400).send({ message: "Senha atual incorreta" });
      }

      const newPasswordHash = await hash(new_password, 10);
      const updatePassword = fastify.db.prepare(
        "UPDATE users SET password = ? WHERE id = ?"
      );
      updatePassword.run(newPasswordHash, user.id);

      return reply.send({ message: "Senha alterada com sucesso" });
    }
  );
};

export default accountsRoutes;
