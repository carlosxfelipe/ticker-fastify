import { FastifyPluginAsync } from "fastify";

type AssetRow = {
  id: number;
  user_id: number;
  ticker: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
};

type AssetWithMetrics = AssetRow & {
  percent_change: number | null;
  total_invested: number;
  current_value: number;
  result: number;
};

type CreateAssetBody = {
  ticker: string;
  quantity: number;
  average_price: number;
  current_price?: number | null;
};

type UpdateAssetBody = CreateAssetBody;

const managerRoutes: FastifyPluginAsync = async (fastify) => {
  const formatTicker = (ticker: string) => ticker.toUpperCase();

  const calculateMetrics = (asset: AssetRow): AssetWithMetrics => {
    const total_invested = asset.quantity * asset.average_price;
    const current_value =
      asset.quantity * (asset.current_price ?? asset.average_price);
    const result = current_value - total_invested;

    const percent_change =
      asset.current_price && asset.average_price !== 0
        ? ((asset.current_price - asset.average_price) / asset.average_price) *
          100
        : null;

    return {
      ...asset,
      percent_change,
      total_invested,
      current_value,
      result,
    };
  };

  // GET /manager/
  fastify.get(
    "/",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: "Não autorizado" });
      }

      const selectAssets = fastify.db.prepare(
        "SELECT id, user_id, ticker, quantity, average_price, current_price FROM assets WHERE user_id = ?"
      );
      const assets = selectAssets.all(request.user.id) as AssetRow[];

      const assetsWithMetrics = assets.map(calculateMetrics);

      return reply.send(assetsWithMetrics);
    }
  );

  // POST /manager/create/
  fastify.post<{ Body: CreateAssetBody }>(
    "/create/",
    {
      preHandler: fastify.authenticate,
      schema: {
        body: {
          type: "object",
          required: ["ticker", "quantity", "average_price"],
          properties: {
            ticker: { type: "string", maxLength: 20 },
            quantity: { type: "integer", minimum: 0 },
            average_price: { type: "number", minimum: 0 },
            current_price: {
              anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: "Não autorizado" });
      }

      const {
        ticker,
        quantity,
        average_price,
        current_price = null,
      } = request.body;

      const insertAsset = fastify.db.prepare(
        "INSERT INTO assets (user_id, ticker, quantity, average_price, current_price) VALUES (?, ?, ?, ?, ?)"
      );

      const result = insertAsset.run(
        request.user.id,
        formatTicker(ticker),
        quantity,
        average_price,
        current_price
      );

      const assetId = result.lastInsertRowid as number;

      const selectAsset = fastify.db.prepare(
        "SELECT id, user_id, ticker, quantity, average_price, current_price FROM assets WHERE id = ?"
      );
      const asset = selectAsset.get(assetId) as AssetRow;

      return reply.code(201).send(calculateMetrics(asset));
    }
  );

  // GET /manager/edit/:id
  fastify.get<{ Params: { id: string } }>(
    "/edit/:id",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: "Não autorizado" });
      }

      const assetId = parseInt(request.params.id, 10);

      const selectAsset = fastify.db.prepare(
        "SELECT id, user_id, ticker, quantity, average_price, current_price FROM assets WHERE id = ?"
      );
      const asset = selectAsset.get(assetId) as AssetRow | undefined;

      if (!asset || asset.user_id !== request.user.id) {
        return reply.code(404).send({ message: "Asset não encontrado" });
      }

      return reply.send(calculateMetrics(asset));
    }
  );

  // POST /manager/edit/:id
  fastify.post<{ Params: { id: string }; Body: UpdateAssetBody }>(
    "/edit/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        body: {
          type: "object",
          required: ["ticker", "quantity", "average_price"],
          properties: {
            ticker: { type: "string", maxLength: 20 },
            quantity: { type: "integer", minimum: 0 },
            average_price: { type: "number", minimum: 0 },
            current_price: {
              anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: "Não autorizado" });
      }

      const assetId = parseInt(request.params.id, 10);

      const selectAsset = fastify.db.prepare(
        "SELECT id, user_id FROM assets WHERE id = ?"
      );
      const asset = selectAsset.get(assetId) as AssetRow | undefined;

      if (!asset || asset.user_id !== request.user.id) {
        return reply.code(404).send({ message: "Asset não encontrado" });
      }

      const {
        ticker,
        quantity,
        average_price,
        current_price = null,
      } = request.body;

      const updateAsset = fastify.db.prepare(
        "UPDATE assets SET ticker = ?, quantity = ?, average_price = ?, current_price = ? WHERE id = ?"
      );

      updateAsset.run(
        formatTicker(ticker),
        quantity,
        average_price,
        current_price,
        assetId
      );

      const selectUpdated = fastify.db.prepare(
        "SELECT id, user_id, ticker, quantity, average_price, current_price FROM assets WHERE id = ?"
      );
      const updatedAsset = selectUpdated.get(assetId) as AssetRow;

      return reply.send(calculateMetrics(updatedAsset));
    }
  );

  // POST /manager/delete/:id
  fastify.post<{ Params: { id: string } }>(
    "/delete/:id",
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: "Não autorizado" });
      }

      const assetId = parseInt(request.params.id, 10);

      const selectAsset = fastify.db.prepare(
        "SELECT id, user_id FROM assets WHERE id = ?"
      );
      const asset = selectAsset.get(assetId) as AssetRow | undefined;

      if (!asset || asset.user_id !== request.user.id) {
        return reply.code(404).send({ message: "Asset não encontrado" });
      }

      const deleteAsset = fastify.db.prepare("DELETE FROM assets WHERE id = ?");
      deleteAsset.run(assetId);

      return reply.send({ message: "Asset deletado com sucesso" });
    }
  );
};

export default managerRoutes;
