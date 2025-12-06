import { FastifyPluginAsync } from "fastify";
import {
  portfolioResponseSchema,
  errorResponseSchema,
  tags,
  securitySchema,
} from "../schemas";

type AssetRow = {
  id: number;
  user_id: number;
  ticker: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
};

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // GET / - Portfolio home
  fastify.get(
    "/",
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: tags.portfolio,
        description: "Obter visão geral do portfolio (dados para gráfico)",
        security: securitySchema,
        response: {
          200: portfolioResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async function (request, reply) {
      if (!request.user) {
        return reply.code(401).send({
          message: "Autenticação necessária. Faça login em /accounts/login/",
        });
      }

      const selectAssets = fastify.db.prepare(
        "SELECT id, user_id, ticker, quantity, average_price, current_price FROM assets WHERE user_id = ?"
      );
      const assets = selectAssets.all(request.user.id) as AssetRow[];

      // Calcular valores e ordenar por valor decrescente
      const assetsWithValue = assets.map((asset) => {
        const currentPrice = asset.current_price ?? asset.average_price;
        const value = asset.quantity * currentPrice;
        return { ...asset, value };
      });

      assetsWithValue.sort((a, b) => b.value - a.value);

      const labels = assetsWithValue.map((asset) => asset.ticker);
      const values = assetsWithValue.map((asset) => asset.value);

      return reply.send({ labels, values });
    }
  );
};

export default root;
