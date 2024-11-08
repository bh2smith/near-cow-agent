import { NextResponse } from "next/server";

const key = JSON.parse(process.env.BITTE_KEY || "{}");
const bitteConfig = JSON.parse(process.env.BITTE_CONFIG || "{}");
if (!key?.accountId) {
  console.error("no account");
}

export async function GET() {
  const pluginData = {
    openapi: "3.0.0",
    info: {
      title: "Bitte CoWSwap Agent",
      description: "API for interactions with CoW Protocol",
      version: "1.0.0",
    },
    servers: [
      {
        url: bitteConfig.url || "https://near-cow-agent.vercel.app/",
      },
    ],
    "x-mb": {
      "account-id": key.accountId,
      assistant: {
        name: "CoWSwap Assistant",
        description:
          "An assistant that generates transaction data for CoW Protocol Interactions",
        instructions:
          "Encodes transactions as signature requests on EVM networks. This assistant is only for EVM networks. Passes the the transaction fields of the response to generate-evm-tx tool for signing and displays the meta content of the response to the user after signing. For selling native assets, such as ETH, xDAI, POL, BNB it uses 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE as the sellToken. It does not infer the chainId. Do not infer the token decimals. Use Token Units for sellAmountBeforeFee. Uses token symbols for sellToken and buyToken unless addresses are provided.",
        tools: [{ type: "generate-evm-tx" }],
      },
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["health"],
          summary: "Confirms server running",
          description: "Test Endpoint to confirm system is running",
          operationId: "check-health",
          parameters: [],
          responses: {
            "200": {
              description: "Ok Message",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        description: "Ok Message",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/tools/balances": {
        get: {
          tags: ["balances"],
          summary: "Get Token Balances",
          description: "Returns token balances for the connected wallet",
          operationId: "get-balances",
          parameters: [
            {
              in: "query",
              name: "chainId",
              required: true,
              schema: {
                type: "number",
              },
              description: "The network ID to check balances on",
            },
          ],
          responses: {
            "200": {
              description: "List of token balances",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        token: {
                          $ref: "#/components/schemas/Address",
                        },
                        balance: {
                          type: "string",
                          description: "Token balance in smallest units (wei)",
                          example: "1000000000000000000",
                        },
                        symbol: {
                          type: "string",
                          description: "Token symbol",
                          example: "USDC",
                        },
                        decimals: {
                          type: "number",
                          description: "Token decimals",
                          example: 18,
                        },
                      },
                      required: ["token", "balance", "symbol", "decimals"],
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest400" },
          },
        },
      },
      "/api/tools/cowswap": {
        post: {
          tags: ["cowswap"],
          operationId: "swap",
          summary:
            "Quote a price and fee for the specified order parameters. Posts unsigned order to CoW and returns Signable payload",
          description:
            "Given a partial order compute the minimum fee and a price estimate for the order. Return a full order that can be used directly for signing, and with an included signature, passed directly to the order creation endpoint.",
          parameters: [
            {
              in: "query",
              name: "chainId",
              required: true,
              schema: {
                type: "number",
              },
              description:
                "The network on which the order is to be placed (see cow supported networks here: https://github.com/cowprotocol/cow-sdk/blob/d30a891353805ac3e19c22e75ab39dcdc035d5f0/src/common/chains.ts#L5-L10).",
            },
            {
              in: "query",
              name: "sellToken",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The ERC-20 token symbol or address to be sold, if provided with the symbol do not try to infer the address.",
            },
            {
              in: "query",
              name: "buyToken",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The ERC-20 token symbol or address to be bought, if provided with the symbol do not try to infer the address..",
            },
            {
              in: "query",
              name: "receiver",
              required: false,
              schema: {
                type: "string",
              },
              description:
                "The address to receive the proceeds of the trade, instead of the sender's address.",
            },
            {
              in: "query",
              name: "sellAmountBeforeFee",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The amount of tokens to sell before fees, represented as a decimal string in token units. Not Atoms.",
            },
          ],
          requestBody: {
            description: "The order parameters to compute a quote for.",
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/OrderQuoteRequest",
                },
              },
            },
          },
          responses: {
            "200": { $ref: "#/components/responses/SignRequestResponse200" },
            "400": {
              description: "Error quoting order.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PriceEstimationError",
                  },
                },
              },
            },
            "404": {
              description: "No route was found for the specified order.",
            },
            "429": {
              description: "Too many order quotes.",
            },
            "500": {
              description: "Unexpected error quoting an order.",
            },
          },
        },
      },
      "/api/tools/erc20": {
        get: {
          tags: ["erc20"],
          summary: "Encodes ERC20 (Fungible) Token Transfer",
          description: "Encodes ERC20 transfer transaction as MetaTransaction",
          operationId: "erc20-transfer",
          parameters: [
            { $ref: "#/components/parameters/chainId" },
            { $ref: "#/components/parameters/amount" },
            { $ref: "#/components/parameters/recipient" },
            { $ref: "#/components/parameters/token" },
          ],
          responses: {
            "200": { $ref: "#/components/responses/MetaTransaction200" },
            "400": { $ref: "#/components/responses/BadRequest400" },
          },
        },
      },
      "/api/tools/weth/wrap": {
        get: {
          tags: ["wrap"],
          summary: "Encode WETH deposit",
          description: "Encodes WETH deposit Transaction as MetaTransaction",
          operationId: "wrap",
          parameters: [
            { $ref: "#/components/parameters/amount" },
            { $ref: "#/components/parameters/chainId" },
          ],
          responses: {
            "200": { $ref: "#/components/responses/MetaTransaction200" },
            "400": { $ref: "#/components/responses/BadRequest400" },
          },
        },
      },
      "/api/tools/weth/unwrap": {
        get: {
          tags: ["unwrap"],
          summary: "Encode WETH withdraw",
          description: "Encodes WETH withdraw Transaction as MetaTransaction",
          operationId: "unwrap",
          parameters: [
            { $ref: "#/components/parameters/amount" },
            { $ref: "#/components/parameters/chainId" },
          ],
          responses: {
            "200": { $ref: "#/components/responses/MetaTransaction200" },
            "400": { $ref: "#/components/responses/BadRequest400" },
          },
        },
      },
    },
    components: {
      parameters: {
        amount: {
          name: "amount",
          in: "query",
          description: "amount in Units",
          required: true,
          schema: {
            type: "number",
          },
          example: 0.123,
        },
        address: {
          name: "address",
          in: "query",
          description:
            "20 byte Ethereum address encoded as a hex with `0x` prefix.",
          required: true,
          schema: {
            type: "string",
          },
          example: "0x6810e776880c02933d47db1b9fc05908e5386b96",
        },
        recipient: {
          name: "recipient",
          in: "query",
          description:
            "20 byte Ethereum address encoded as a hex with `0x` prefix.",
          required: true,
          schema: {
            type: "string",
          },
          example: "0x6810e776880c02933d47db1b9fc05908e5386b96",
        },
        token: {
          name: "token",
          in: "query",
          description:
            "20 byte Ethereum address encoded as a hex with `0x` prefix.",
          required: true,
          schema: {
            type: "string",
          },
          example: "0x6810e776880c02933d47db1b9fc05908e5386b96",
        },
        chainId: {
          name: "chainId",
          in: "query",
          description: "Network on which to wrap the native asset",
          required: true,
          schema: {
            type: "number",
          },
          example: 1,
        },
      },
      responses: {
        MetaTransaction200: {
          description: "MetaTransaction for Wrap or Unwrap Eth",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SignRequest",
              },
            },
          },
        },
        SignRequestResponse200: {
          description:
            "Cowswap order response including transaction and order URL",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  transaction: {
                    $ref: "#/components/schemas/SignRequest",
                  },
                  meta: {
                    type: "object",
                    description:
                      "Additional metadata related to the transaction",
                    additionalProperties: true,
                    example: {
                      orderUrl: "https://explorer.cow.fi/orders/0x123...",
                    },
                  },
                },
                required: ["transaction"],
              },
            },
          },
        },
        BadRequest400: {
          description: "Bad Request - Invalid or missing parameters",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: {
                    type: "boolean",
                    example: false,
                  },
                  message: {
                    type: "string",
                    example: "Missing required parameters: chainId or amount",
                  },
                },
              },
            },
          },
        },
      },
      schemas: {
        Address: {
          description:
            "20 byte Ethereum address encoded as a hex with `0x` prefix.",
          type: "string",
          example: "0x6810e776880c02933d47db1b9fc05908e5386b96",
        },
        SignRequest: {
          type: "object",
          required: ["method", "chainId", "params"],
          properties: {
            method: {
              type: "string",
              enum: [
                "eth_sign",
                "personal_sign",
                "eth_sendTransaction",
                "eth_signTypedData",
                "eth_signTypedData_v4",
              ],
              description: "The signing method to be used.",
              example: "eth_sendTransaction",
            },
            chainId: {
              type: "integer",
              description:
                "The ID of the Ethereum chain where the transaction or signing is taking place.",
              example: 1,
            },
            params: {
              oneOf: [
                {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/MetaTransaction",
                  },
                  description: "An array of Ethereum transaction parameters.",
                },
                {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description: "Parameters for personal_sign request",
                  example: [
                    "0x4578616d706c65206d657373616765",
                    "0x0000000000000000000000000000000000000001",
                  ],
                },
                {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description: "Parameters for eth_sign request",
                  example: [
                    "0x0000000000000000000000000000000000000001",
                    "0x4578616d706c65206d657373616765",
                  ],
                },
                {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description:
                    "Parameters for signing structured data (TypedDataParams)",
                  example: [
                    "0x0000000000000000000000000000000000000001",
                    '{"data": {"types": {"EIP712Domain": [{"name": "name","type": "string"}]}}}',
                  ],
                },
              ],
            },
          },
        },
        MetaTransaction: {
          description: "Sufficient data representing an EVM transaction",
          type: "object",
          properties: {
            to: {
              $ref: "#/components/schemas/Address",
              description: "Recipient address",
            },
            data: {
              type: "string",
              description: "Transaction calldata",
              example: "0xd0e30db0",
            },
            value: {
              type: "string",
              description: "Transaction value",
              example: "0x1b4fbd92b5f8000",
            },
          },
          required: ["to", "data", "value"],
        },
        AppData: {
          description:
            "The string encoding of a JSON object representing some `appData`. The format of the JSON expected in the `appData` field is defined [here](https://github.com/cowprotocol/app-data).",
          type: "string",
          example: '{"version":"0.9.0","metadata":{}}',
        },
        AppDataHash: {
          description:
            "32 bytes encoded as hex with `0x` prefix. It's expected to be the hash of the stringified JSON object representing the `appData`.",
          type: "string",
        },
        SellTokenSource: {
          description: "Where should the `sellToken` be drawn from?",
          type: "string",
          enum: ["erc20", "internal", "external"],
        },
        BuyTokenDestination: {
          description: "Where should the `buyToken` be transferred to?",
          type: "string",
          enum: ["erc20", "internal"],
        },
        PriceQuality: {
          description:
            "How good should the price estimate be?\n\nFast: The price estimate is chosen among the fastest N price estimates.\nOptimal: The price estimate is chosen among all price estimates.\nVerified: The price estimate is chosen among all verified/simulated price estimates.\n\n**NOTE**: Orders are supposed to be created from `verified` or `optimal` price estimates.",
          type: "string",
          enum: ["fast", "optimal", "verified"],
        },
        SigningScheme: {
          description: "How was the order signed?",
          type: "string",
          enum: ["eip712", "ethsign", "presign", "eip1271"],
        },
        EcdsaSigningScheme: {
          description: "How was the order signed?",
          type: "string",
          enum: ["eip712", "ethsign"],
        },
        Signature: {
          description: "A signature.",
          oneOf: [
            { $ref: "#/components/schemas/EcdsaSignature" },
            { $ref: "#/components/schemas/PreSignature" },
          ],
        },
        EcdsaSignature: {
          description:
            "65 bytes encoded as hex with `0x` prefix. `r || s || v` from the spec.",
          type: "string",
          example:
            "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        },
        PreSignature: {
          description: 'Empty signature bytes. Used for "presign" signatures.',
          type: "string",
          example: "0x",
        },
        OrderQuoteRequest: {
          description: "Request fee and price quote.",
          allOf: [
            { $ref: "#/components/schemas/OrderQuoteSide" },
            { $ref: "#/components/schemas/OrderQuoteValidity" },
            {
              type: "object",
              properties: {
                sellToken: {
                  description: "ERC-20 token to be sold",
                  allOf: [{ $ref: "#/components/schemas/Address" }],
                },
                buyToken: {
                  description: "ERC-20 token to be bought",
                  allOf: [{ $ref: "#/components/schemas/Address" }],
                },
                receiver: {
                  description:
                    "An optional address to receive the proceeds of the trade instead of the `owner` (i.e. the order signer).",
                  allOf: [{ $ref: "#/components/schemas/Address" }],
                  nullable: true,
                },
                appData: {
                  description:
                    "AppData which will be assigned to the order. Expects either a string JSON doc as defined on [AppData](https://github.com/cowprotocol/app-data) or a hex encoded string for backwards compatibility. When the first format is used, it's possible to provide the derived appDataHash field.",
                  oneOf: [
                    { $ref: "#/components/schemas/AppData" },
                    { $ref: "#/components/schemas/AppDataHash" },
                  ],
                },
                appDataHash: {
                  description:
                    "The hash of the stringified JSON appData doc. If present, `appData` field must be set with the aforementioned data where this hash is derived from. In case they differ, the call will fail.",
                  anyOf: [{ $ref: "#/components/schemas/AppDataHash" }],
                },
                sellTokenBalance: {
                  allOf: [{ $ref: "#/components/schemas/SellTokenSource" }],
                  default: "erc20",
                },
                buyTokenBalance: {
                  allOf: [{ $ref: "#/components/schemas/BuyTokenDestination" }],
                  default: "erc20",
                },
                from: { $ref: "#/components/schemas/Address" },
                priceQuality: {
                  allOf: [{ $ref: "#/components/schemas/PriceQuality" }],
                  default: "verified",
                },
                signingScheme: {
                  allOf: [{ $ref: "#/components/schemas/SigningScheme" }],
                  default: "eip712",
                },
                onchainOrder: {
                  description:
                    "Flag to signal whether the order is intended for on-chain order placement. Only valid for non ECDSA-signed orders.",
                  default: false,
                },
                network: {
                  description:
                    "The network on which the order is to be placed.",
                  type: "string",
                  enum: ["mainnet", "xdai", "arbitrum_one"],
                },
              },
              required: ["sellToken", "buyToken", "from"],
            },
          ],
        },
        OrderQuoteResponse: {
          description:
            "An order quoted by the backend that can be directly signed and submitted to the order creation backend.",
          type: "object",
          properties: {
            quote: { $ref: "#/components/schemas/OrderParameters" },
            from: { $ref: "#/components/schemas/Address" },
            expiration: {
              description:
                "Expiration date of the offered fee. Order service might not accept the fee after this expiration date. Encoded as ISO 8601 UTC.",
              type: "string",
              example: "1985-03-10T18:35:18.814523Z",
            },
            id: {
              description:
                "Quote ID linked to a quote to enable providing more metadata when analysing order slippage.",
              type: "integer",
            },
            verified: {
              description:
                "Whether it was possible to verify that the quoted amounts are accurate using a simulation.",
              type: "boolean",
            },
          },
          required: ["quote", "expiration", "verified"],
        },
        PriceEstimationError: {
          type: "object",
          properties: {
            errorType: {
              type: "string",
              enum: [
                "QuoteNotVerified",
                "UnsupportedToken",
                "ZeroAmount",
                "UnsupportedOrderType",
              ],
            },
            description: { type: "string" },
          },
          required: ["errorType", "description"],
        },
        OrderKind: {
          description: "Is this order a buy or sell?",
          type: "string",
          enum: ["buy", "sell"],
        },
        OrderParameters: {
          description: "Order parameters.",
          type: "object",
          properties: {
            sellToken: {
              description: "ERC-20 token to be sold.",
              allOf: [{ $ref: "#/components/schemas/Address" }],
            },
            buyToken: {
              description: "ERC-20 token to be bought.",
              allOf: [{ $ref: "#/components/schemas/Address" }],
            },
            receiver: {
              description:
                "An optional Ethereum address to receive the proceeds of the trade instead of the owner (i.e. the order signer).",
              allOf: [{ $ref: "#/components/schemas/Address" }],
              nullable: true,
            },
            sellAmount: {
              description: "Amount of `sellToken` to be sold in atoms.",
              allOf: [{ $ref: "#/components/schemas/TokenAmount" }],
            },
            buyAmount: {
              description: "Amount of `buyToken` to be bought in atoms.",
              allOf: [{ $ref: "#/components/schemas/TokenAmount" }],
            },
            validTo: {
              description:
                "Unix timestamp (`uint32`) until which the order is valid.",
              type: "integer",
            },
            appData: {
              $ref: "#/components/schemas/AppDataHash",
            },
            feeAmount: {
              description: "feeRatio * sellAmount + minimal_fee in atoms.",
              allOf: [{ $ref: "#/components/schemas/TokenAmount" }],
            },
            kind: {
              description: "The kind is either a buy or sell order.",
              allOf: [{ $ref: "#/components/schemas/OrderKind" }],
            },
            partiallyFillable: {
              description: "Is the order fill-or-kill or partially fillable?",
              type: "boolean",
            },
            sellTokenBalance: {
              allOf: [{ $ref: "#/components/schemas/SellTokenSource" }],
              default: "erc20",
            },
            buyTokenBalance: {
              allOf: [{ $ref: "#/components/schemas/BuyTokenDestination" }],
              default: "erc20",
            },
            signingScheme: {
              allOf: [{ $ref: "#/components/schemas/SigningScheme" }],
              default: "eip712",
            },
          },
          required: [
            "sellToken",
            "buyToken",
            "sellAmount",
            "buyAmount",
            "validTo",
            "appData",
            "feeAmount",
            "kind",
            "partiallyFillable",
          ],
        },
        OrderQuoteSide: {
          description: "The buy or sell side when quoting an order.",
          oneOf: [
            {
              type: "object",
              description:
                "Quote a sell order given the final total `sellAmount` including fees.",
              properties: {
                kind: {
                  allOf: [
                    {
                      $ref: "#/components/schemas/OrderQuoteSideKindSell",
                    },
                  ],
                },
                sellAmountBeforeFee: {
                  description:
                    "The total amount that is available for the order. From this value, the fee is deducted and the buy amount is calculated.",
                  allOf: [
                    {
                      $ref: "#/components/schemas/TokenAmount",
                    },
                  ],
                },
              },
              required: ["kind", "sellAmountBeforeFee"],
            },
            {
              type: "object",
              description: "Quote a sell order given the `sellAmount`.",
              properties: {
                kind: {
                  allOf: [
                    {
                      $ref: "#/components/schemas/OrderQuoteSideKindSell",
                    },
                  ],
                },
                sellAmountAfterFee: {
                  description: "The `sellAmount` for the order.",
                  allOf: [
                    {
                      $ref: "#/components/schemas/TokenAmount",
                    },
                  ],
                },
              },
              required: ["kind", "sellAmountAfterFee"],
            },
            {
              type: "object",
              description: "Quote a buy order given an exact `buyAmount`.",
              properties: {
                kind: {
                  allOf: [
                    {
                      $ref: "#/components/schemas/OrderQuoteSideKindBuy",
                    },
                  ],
                },
                buyAmountAfterFee: {
                  description: "The `buyAmount` for the order.",
                  allOf: [
                    {
                      $ref: "#/components/schemas/TokenAmount",
                    },
                  ],
                },
              },
              required: ["kind", "buyAmountAfterFee"],
            },
          ],
        },
        OrderQuoteSideKindSell: {
          type: "string",
          enum: ["sell"],
        },
        OrderQuoteSideKindBuy: {
          type: "string",
          enum: ["buy"],
        },
        TokenAmount: {
          description: "Amount of a token. `uint256` encoded in decimal.",
          type: "string",
          example: "1234567890",
        },
        OrderQuoteValidity: {
          description: "The validity for the order.",
          oneOf: [
            {
              type: "object",
              description: "Absolute validity.",
              properties: {
                validTo: {
                  description:
                    "Unix timestamp (`uint32`) until which the order is valid.",
                  type: "integer",
                },
              },
            },
            {
              type: "object",
              description: "Relative validity",
              properties: {
                validFor: {
                  description:
                    "Number (`uint32`) of seconds that the order should be valid for.",
                  type: "integer",
                },
              },
            },
          ],
        },
      },
    },
    "x-readme": {
      "explorer-enabled": true,
      "proxy-enabled": true,
    },
  };

  return NextResponse.json(pluginData);
}
