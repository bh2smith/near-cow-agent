import { NextResponse } from "next/server";
import { ACCOUNT_ID, PLUGIN_URL, COW_SUPPORTED_CHAINS } from "../../config";
import {
  addressOrSymbolParam,
  addressParam,
  AddressSchema,
  amountParam,
  chainIdParam,
  SignRequestSchema,
  MetaTransactionSchema,
} from "@bitte-ai/agent-sdk";

export async function GET() {
  const pluginData = {
    openapi: "3.0.0",
    info: {
      title: "Bitte CoWSwap Agent",
      description: "API for interactions with CoW Protocol",
      version: "1.0.0",
    },
    servers: [{ url: PLUGIN_URL }],
    "x-mb": {
      "account-id": ACCOUNT_ID || "max-normal.near",
      assistant: {
        name: "CoWSwap Assistant",
        description:
          "An assistant that generates EVM transaction data for CoW Protocol Interactions",
        instructions: `
        This assistant facilitates EVM transaction encoding as signature requests, exclusively for EVM-compatible networks. It adheres to the following strict protocol:
NETWORKS:
- ONLY supports Ethereum (chainId: 1), Gnosis (chainId: 100), Polygon (chainId: 137), Arbitrum (chainId: 42161), Base (chainId: 8453), Avalanche (chainId: 43114), and Sepolia (chainId: 11155111)
- NEVER claims to support any other networks
- ALWAYS requires explicit chainId specification from the user
- NEVER infers chainId values
TOKEN HANDLING:
- For native assets (ETH, xDAI, POL, BNB): ALWAYS uses 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE as the sellToken address
- ALWAYS passes token symbols for sellToken and buyToken unless specific addresses are provided
- NEVER infers token decimals under any circumstance
- ALWAYS uses Token Units for sellAmountBeforeFee
TRANSACTION PROCESSING:
- ALWAYS passes the transaction fields to generate-evm-tx tool for signing
- ALWAYS displays meta content to user after signing
- ALWAYS passes evmAddress as the connected evmAddress for any request requiring evmAddress
- ALWAYS uses balance, weth, and erc20 endpoints only on supported networks
AUTHENTICATION:
- REQUIRES if user doesn’t say what network they want require them to provide a chain ID otherwise just assume the network they asked for,
- VALIDATES network compatibility before proceeding
- CONFIRMS token details explicitly before executing transactions
This assistant follows these specifications with zero deviation to ensure secure, predictable transaction handling. `,
        tools: [{ type: "generate-evm-tx" }],
        image: `${PLUGIN_URL}/cowswap.svg`,
        categories: ["defi"],
        chainIds: COW_SUPPORTED_CHAINS,
      },
    },
    paths: {
      "/api/tools/cowswap": {
        post: {
          tags: ["cowswap"],
          operationId: "swap",
          summary:
            "Quote a price and fee for the specified order parameters. Posts unsigned order to CoW and returns Signable payload",
          description:
            "Given a partial order compute the minimum fee and a price estimate for the order. Return a full order that can be used directly for signing, and with an included signature, passed directly to the order creation endpoint.",
          parameters: [
            { $ref: "#/components/parameters/chainId" },
            { $ref: "#/components/parameters/evmAddress" },
            { $ref: "#/components/parameters/sellToken" },
            { $ref: "#/components/parameters/buyToken" },
            { $ref: "#/components/parameters/receiver" },
            {
              name: "sellAmountBeforeFee",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The amount of tokens to sell before fees, represented as a decimal string in token units. Not Atoms.",
            },
          ],
          // requestBody: {
          //   description: "The order parameters to compute a quote for.",
          //   required: true,
          //   content: {
          //     "application/json": {
          //       schema: {
          //         $ref: "#/components/schemas/OrderQuoteRequest",
          //       },
          //     },
          //   },
          // },
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
    },
    components: {
      parameters: {
        chainId: chainIdParam,
        amount: amountParam,
        address: addressParam,
        evmAddress: {
          ...addressParam,
          name: "evmAddress",
          description: "The address of the connected account",
        },
        receiver: {
          ...addressParam,
          name: "receiver",
          required: false,
          description: "Recipient address of the transferred token.",
        },
        buyToken: {
          ...addressOrSymbolParam,
          name: "buyToken",
          description:
            "The ERC-20 token symbol or address to be bought, if provided with the symbol do not try to infer the address.",
        },
        sellToken: {
          ...addressOrSymbolParam,
          name: "sellToken",
          description:
            "The ERC-20 token symbol or address to be sold, if provided with the symbol do not try to infer the address.",
        },
      },
      responses: {
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
                      message: "Order submitted successfully",
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
        Address: AddressSchema,
        SignRequest: SignRequestSchema,
        MetaTransaction: MetaTransactionSchema,
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
