import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

const swaggerPlugin = fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Ticker Fastify API",
        description: "API de gerenciamento de portfólio de ativos",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        {
          name: "accounts",
          description: "Autenticação e gerenciamento de conta",
        },
        { name: "portfolio", description: "Visualização de portfolio" },
        { name: "assets", description: "Gerenciamento de ativos (CRUD)" },
        { name: "settings", description: "Configurações de conta" },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
  });
});

export default swaggerPlugin;
