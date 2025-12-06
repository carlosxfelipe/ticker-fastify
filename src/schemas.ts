// Schemas reutilizáveis para documentação OpenAPI

export const userSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    email: { type: "string", format: "email" },
  },
} as const;

export const authResponseSchema = {
  type: "object",
  properties: {
    token: { type: "string", description: "JWT token" },
    user: userSchema,
  },
} as const;

export const registerResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    token: { type: "string", description: "JWT token" },
    user: userSchema,
  },
} as const;

export const messageResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
} as const;

export const errorResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
} as const;

export const assetSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    user_id: { type: "number" },
    ticker: { type: "string", description: "Código do ativo (ex: PETR4)" },
    quantity: { type: "number", description: "Quantidade de ações" },
    average_price: { type: "number", description: "Preço médio de compra" },
    current_price: {
      type: "number",
      nullable: true,
      description: "Preço atual",
    },
    percent_change: { type: "number", description: "Variação percentual" },
    total_invested: { type: "number", description: "Total investido" },
    current_value: { type: "number", description: "Valor atual" },
    result: { type: "number", description: "Lucro/Prejuízo" },
  },
} as const;

export const portfolioResponseSchema = {
  type: "object",
  properties: {
    labels: {
      type: "array",
      items: { type: "string" },
      description: "Tickers dos ativos ordenados por valor",
    },
    values: {
      type: "array",
      items: { type: "number" },
      description: "Valores correspondentes",
    },
  },
} as const;

export const userSettingsSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    username: { type: "string" },
    email: { type: "string", format: "email" },
  },
} as const;

export const deleteAccountResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    deleted: { type: "boolean" },
  },
} as const;

// Tags para agrupamento
export const tags = {
  accounts: ["accounts"],
  portfolio: ["portfolio"],
  assets: ["assets"],
  settings: ["settings"],
} as const;

// Security para rotas protegidas
export const securitySchema = [{ bearerAuth: [] }];
