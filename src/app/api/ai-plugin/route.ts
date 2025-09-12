import {
  addressOrSymbolParam,
  addressParam,
  AddressSchema,
  amountParam,
  chainIdParam,
  SignRequestSchema,
  MetaTransactionSchema,
} from "@bitte-ai/agent-sdk";
import { NextResponse } from "next/server";

import { ACCOUNT_ID, PLUGIN_URL, COW_SUPPORTED_CHAINS } from "@/src/app/config";

export async function GET() {
  const pluginData = {
    openapi: "3.0.0",
    info: {
      title: "Bitte CoW Swap Agent",
      description: "API for interactions with CoW Protocol",
      version: "1.0.0",
    },
    servers: [{ url: PLUGIN_URL }],
    "x-mb": {
      "account-id": ACCOUNT_ID || "max-normal.near",
      assistant: {
        name: "CoW Swap Assistant",
        description:
          "An assistant that generates EVM transaction data for CoW Protocol Interactions and answers questions about CoW Protocol.",
        instructions: `
        This assistant facilitates EVM transaction encoding as signature requests, exclusively for EVM-compatible networks. It adheres to the following strict protocol:
NETWORKS:
- ONLY supports Ethereum (chainId: 1), Gnosis (chainId: 100), Polygon (chainId: 137), Arbitrum (chainId: 42161), Base (chainId: 8453), Avalanche (chainId: 43114), and Sepolia (chainId: 11155111)
- NEVER claims to support any other networks
- ALWAYS requires explicit chainId specification from the user
- NEVER infers chainId values
- If the user supplies a string ending with .eth (i.e. an ENS domain), use the resolve-domain-name primitive tool to resolve the address.
TOKEN HANDLING:
- For native assets (ETH, xDAI, POL, BNB): ALWAYS uses 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE as the buyToken or sellToken address
- For native asset as sell token, inform the user before hand that the protocol does not support these types of sell tokens so they will have to wrap it first. 
  The appropriate wrap transaction will be included as part of the quote response and their order will be for the wrapped token.
- For native asset as the buy token, CoW Protocol offers full support.
- ALWAYS passes token symbols for sellToken and buyToken unless specific addresses are provided.
- If the quote tool returns "Could not determine {buyToken,sellToken} info for", inform the user that they must provide the corresponding token address because the symbol they are providing is not part of the currated token registry.
- NEVER infers token decimals under any circumstance
- ALWAYS uses Token Units for sellAmountBeforeFee
ORDER KIND:
- ALWAYS infer order kind from the user's text.
- Examples:
  - "buy 100 X with Y" -> "buy"
  - "sell 100 X for Y" -> "sell"
  - "swap 100 X for Y" -> "sell"
- ALWAYS pass the order kind to the quote endpoint (orderKind)
TRANSACTION PROCESSING:
- ALWAYS passes the transaction fields to generate-evm-tx tool for signing
- ALWAYS displays meta content to user after signing
- ALWAYS passes evmAddress as the connected evmAddress for any request requiring evmAddress
- ALWAYS uses balance, weth, and erc20 endpoints only on supported networks
AUTHENTICATION:
- REQUIRES if user doesn’t say what network they want require them to provide a chain ID otherwise just assume the network they asked for,
- VALIDATES network compatibility before proceeding
- CONFIRMS token details explicitly before executing transactions
KNOWLEDGE RETRIEVAL:
- If a users asks a question about CoWSwap, use the data-retrieval tool to find relevant information from the Cow Protocol documentation. 
- Along with describing what is available in the UI, also mention (with preference) what tools and order types are available via this agent.
This assistant follows these specifications with zero deviation to ensure secure, predictable transaction handling.
UNSUPPORTED FEATURES: This agent does not currently support
- TWAP orders: If a user requests one, refer them to the UI and instruct them, using the data-retrieval primitive tool, how to create their TWAP order. Track progress https://github.com/bh2smith/near-cow-agent/issues/49
- Limit Orders: On the roadmap. Track the progress here https://github.com/bh2smith/near-cow-agent/issues/51`,
        tools: [
          { type: "generate-evm-tx" },
          { type: "data-retrieval" },
          { type: "resolve-domain-name" },
        ],
        image: `${PLUGIN_URL}/cowswap.svg`,
        categories: ["defi"],
        chainIds: COW_SUPPORTED_CHAINS,
      },
    },
    paths: {
      "/api/tools/quote": {
        post: {
          tags: ["quote"],
          operationId: "getQuote",
          summary: `Quote a price and fee for the specified order parameters. Returns the quote and payload for signing.
            In some cases, this tool will return multiple SignRequests. 
            For example (wrapping ETH and/or sell token approvals).
            The last SignRequest will always be the user's swap order.
            Display the transaction responses one at a time sequentially. 
            That is, only show the user's order after the preliminary transactions have succeeded. 
            Use the meta.summary data to describe what they are signing. 
            Keep the description brief.`,
          description: "Retrive quote from CoW API",
          parameters: [
            { $ref: "#/components/parameters/chainId" },
            { $ref: "#/components/parameters/evmAddress" },
            { $ref: "#/components/parameters/sellToken" },
            { $ref: "#/components/parameters/buyToken" },
            { $ref: "#/components/parameters/receiver" },
            {
              name: "validFor",
              in: "query",
              schema: {
                type: "number",
              },
              description:
                "Number of seconds (from now) that the order should be valid for. Max 3 hours (10800).",
            },
            {
              name: "slippageBps",
              in: "query",
              schema: {
                type: "number",
              },
              description:
                "The slippage tolerance for the quote, represented as a percentage in basis points (BPS).",
            },
            {
              name: "amount",
              in: "query",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The amount of tokens to buy or sell after or before fees, represented as a decimal string in token units. Not Atoms.",
            },
            {
              name: "orderKind",
              in: "query",
              required: true,
              schema: {
                type: "string",
                enum: ["buy", "sell"],
              },
              description:
                "Whether the order is a buy order or sell order. Usually inferred from the users text (I want to buy or I want to sell or swap)",
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
            "200": { $ref: "#/components/responses/QuoteResponse200" },
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
      "/api/tools/order": {
        post: {
          tags: ["order"],
          operationId: "createOrder",
          summary: "Posts signed order to CoW and Explorer Order Url",
          description:
            "Consume a signed order and post it to CoW and Explorer Order Url.",
          parameters: [
            { $ref: "#/components/parameters/chainId" },
            { $ref: "#/components/parameters/evmAddress" },
            {
              ...addressParam,
              name: "buyToken",
              description:
                "The ERC-20 token address to be bought. Token symbol is not accepted here as the address should already be in the quote",
            },
            {
              ...addressParam,
              name: "sellToken",
              description:
                "The ERC-20 token address to be sold. Token symbol is not accepted here as the address should already be in the quote",
            },
            { $ref: "#/components/parameters/receiver" },
            {
              in: "query",
              name: "sellAmount",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The amount of tokens to sell after fees, represented in WEI (token atoms).",
            },
            {
              in: "query",
              name: "buyAmount",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The amount of tokens to buy, represented in WEI (token atoms).",
            },
            {
              in: "query",
              name: "validTo",
              required: true,
              schema: {
                type: "number",
              },
              description: "Unix timestamp of order expiration.",
            },
            {
              in: "query",
              name: "kind",
              required: true,
              schema: {
                type: "string",
                enum: ["buy", "sell"],
              },
              description: "The kind is either a buy or sell order.",
            },
            {
              in: "query",
              name: "feeAmount",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The amount of tokens to fee attributed to the order, represented in WEI (token atoms).",
            },
            {
              in: "query",
              name: "signingScheme",
              required: true,
              schema: {
                type: "string",
                enum: ["eip712", "ethsign", "presign", "eip1271"],
              },
              description: "How was the order signed?",
            },
            {
              in: "query",
              name: "signature",
              required: true,
              schema: {
                type: "string",
                format: "hex",
              },
              description: "A hex encoded signature.",
            },
            {
              in: "query",
              name: "partiallyFillable",
              required: true,
              schema: {
                type: "boolean",
              },
              description: "Whether the order is partially fillable.",
            },
            {
              in: "query",
              name: "appData",
              required: true,
              schema: {
                type: "string",
              },
              description:
                "The appData hash for the order. This is a hex encoded string. In the future we will have to use the stringified full appdata JSON object.",
            },
          ],
          // requestBody: {
          //   description: "The input required to place an order on CoW Swap",
          //   required: true,
          //   content: {
          //     "application/json": {
          //       schema: {
          //         $ref: "#/components/schemas/OrderCreation",
          //       },
          //     },
          //   },
          // },
          responses: {
            "200": {
              description: "Order posted to CoW and Explorer Order Url.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      orderUrl: {
                        type: "string",
                        description:
                          "The URL of the order on the CoW Explorer.",
                      },
                      orderUid: {
                        type: "string",
                        description:
                          "The unique identifier of the user's order.",
                      },
                    },
                    required: ["orderUrl"],
                  },
                },
              },
            },
            "400": {
              description: "Error during order validation.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/OrderPostError",
                  },
                },
              },
            },
            "403": {
              description: "Forbidden, your account is deny-listed.",
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
      "/api/tools/cancel": {
        get: {
          tags: ["cancel"],
          operationId: "cancelOrder",
          summary: "Sets in motion the off-chain cancellation of an order.",
          description: `
            This is a best effort cancellation, and might not prevent solvers from settling the orders (if the order is part of an in-flight settlement transaction for example). 
            Authentication must be provided by an EIP-712 signature of an OrderCancellations(bytes[] orderUids) message.
            CASE WHEN signature is not provided, the tool returns signable payload.
            ELSE tool will post the order & signature to the CoW API order cancellation endpoint.
          `,
          parameters: [
            { $ref: "#/components/parameters/chainId" },
            { $ref: "#/components/parameters/orderUid" },
            {
              in: "query",
              name: "signature",
              schema: {
                type: "string",
                format: "hex",
              },
              description: "A hex encoded signature.",
            },
          ],
          responses: {
            "200": {
              description: "Either signable payload or cancellation response.",
              content: {
                "application/json": {
                  schema: {
                    oneOf: [
                      {
                        $ref: "#/components/schemas/SignRequest",
                      },
                      {
                        type: "string",
                        description: "Order(s) are cancelled.",
                      },
                    ],
                  },
                },
              },
            },
            "400": { description: "Malformed signature." },
            "401": {
              description:
                "Wrong Owner: Signature recovery's owner doesn't match order's",
            },
            "404": {
              description:
                "One or more orders were not found and no orders were cancelled.",
            },
            "500": { description: "Internal Server Error." },
          },
        },
      },
      "/api/tools/status": {
        get: {
          tags: ["status"],
          operationId: "orderStatus",
          summary: "Retrieves the status of an order by id.",
          description: `This tool utilizes the cow orderbook api endpoint for status (https://api.cow.fi/docs/#/default/get_api_v1_orders__UID__status)`,
          parameters: [
            { $ref: "#/components/parameters/chainId" },
            { $ref: "#/components/parameters/orderUid" },
          ],
          responses: {
            "200": {
              description:
                "The order status with a list of solvers that proposed solutions (if applicable).",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      order: {
                        type: "string",
                        enum: [
                          "presignaturePending",
                          "open",
                          "fulfilled",
                          "cancelled",
                          "expired",
                        ],
                      },
                      competition: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: [
                              "open",
                              "scheduled",
                              "active",
                              "solved",
                              "executing",
                              "traded",
                              "cancelled",
                            ],
                          },
                          value: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                solver: { type: "string" },
                                executedAmounts: {
                                  $ref: "#/components/schemas/ExecutedAmounts",
                                },
                              },
                              required: ["solver"],
                            },
                          },
                        },
                        required: ["type"],
                      },
                    },
                    required: ["order", "competition"],
                  },
                },
              },
            },
            "404": { description: "Not Found" },
            "500": { description: "Internal Server Error." },
          },
        },
      },
      "/api/tools/history": {
        get: {
          tags: ["history"],
          operationId: "orderHistory",
          summary: "Retrieves Order History",
          description: `
            Called with evmAddress as connected wallet address and chainId as the connected wallet's current network. 
            Retrieves and returns the order history for "evmAddress" on "chainId".
            The orders are sorted by their creation date descending (newest orders first).
            Order History results should be displayed in a tabular format.
            Display only the five most recent orders and refer the user to https://explorer.cow.fi/address/{evmAddress} for more orders.
            The Table should have the following columns:
            - Type (Buy or Sell) - this is the class combined with the kind
            - Status (Open, Fulfilled, Cancelled, Expired) - this is the status of the order
            - Date (Date of Order Creation) - this is the creationDate of the order
            - Sell Amount (Amount of Tokens Sold) - this is the sellAmount of the order
            - Buy Amount (Amount of Tokens Bought) - this is the buyAmount of the order
            - Fees (Fees Paid for the Order in ETH) - this is the totalFee of the order
            - Order UID - this is the uid of the order
            `,
          parameters: [
            { $ref: "#/components/parameters/chainId" },
            { $ref: "#/components/parameters/evmAddress" },
          ],
          responses: {
            "200": {
              description: "Array of OrderHistory Items",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        creationData: { type: "string" },
                        owner: { type: "string" },
                        uid: { type: "string" },
                        executedBuyAmount: { type: "string" },
                        executedSellAmount: { type: "string" },
                        executedSellAmountBeforeFees: { type: "string" },
                        executedFeeAmount: { type: "string" },
                        executedFee: { type: "string" },
                        executedFeeToken: { type: "string" },
                        status: { type: "string" },
                        class: { type: "string" },
                        settlementContract: { type: "string" },
                        fullAppData: { type: "string" },
                        sellToken: { type: "string" },
                        buyToken: { type: "string" },
                        receiver: { type: "string" },
                        sellAmount: { type: "string" },
                        buyAmount: { type: "string" },
                        validTo: { type: "number" },
                        appData: { type: "string" },
                        feeAmount: { type: "string" },
                        feeToken: { type: "string" },
                        kind: { type: "string" },
                        partiallyFillable: { type: "boolean" },
                        signer: { type: "string" },
                        signingScheme: { type: "string" },
                        signature: { type: "string" },
                        totalFee: { type: "string" },
                      },
                    },
                    required: [
                      "kind",
                      "status",
                      "creationDate",
                      "sellAmount",
                      "buyAmount",
                      "totalFee",
                      "orderUid",
                    ],
                  },
                },
              },
            },
            "400": {
              description:
                "Problem with parameters like limit being too large.",
            },
            "500": { description: "Internal Server Error." },
          },
        },
      },
    },
    components: {
      parameters: {
        chainId: chainIdParam,
        orderUid: {
          in: "query",
          name: "orderUid",
          required: true,
          schema: {
            type: "string",
          },
          description: "The unique identifier of a CoW Protocol order.",
        },
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
          description:
            "If desired, the user can specify a custom recipient, otherwise the default is their connected wallet.",
        },
        buyToken: {
          ...addressOrSymbolParam,
          name: "buyToken",
          description:
            "The ERC-20 token symbol or address to be bought, if provided with the symbol do not try to infer the address. Whenver the token can not be found by symbol, user must provide the address to proceed.",
        },
        sellToken: {
          ...addressOrSymbolParam,
          name: "sellToken",
          description:
            "The ERC-20 token symbol or address to be sold, if provided with the symbol do not try to infer the address. Whenver the token can not be found by symbol, user must provide the address to proceed.",
        },
      },
      responses: {
        QuoteResponse200: {
          description: "Quote response including metadata and transaction",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  meta: {
                    type: "object",
                    properties: {
                      quote: {
                        $ref: "#/components/schemas/OrderQuoteResponse",
                      },
                      ui: { $ref: "#/components/schemas/SwapFTData" },
                    },
                    required: ["quote", "ui"],
                  },
                  transaction: { $ref: "#/components/schemas/SignRequest" },
                },
                required: ["meta", "transaction"],
              },
            },
          },
        },
        SignRequest200: {
          description:
            "Generic Structure representing an EVM Signature Request",
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
        SwapFTData: {
          type: "object",
          description: "UI data for swap widget",
          additionalProperties: true,
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
        OrderPostError: {
          type: "object",
          properties: {
            errorType: {
              type: "string",
              enum: [
                "DuplicatedOrder",
                "QuoteNotFound",
                "QuoteNotVerified",
                "InvalidQuote",
                "MissingFrom",
                "WrongOwner",
                "InvalidEip1271Signature",
                "InsufficientBalance",
                "InsufficientAllowance",
                "InvalidSignature",
                "SellAmountOverflow",
                "TransferSimulationFailed",
                "ZeroAmount",
                "IncompatibleSigningScheme",
                "TooManyLimitOrders",
                "TooMuchGas",
                "UnsupportedBuyTokenDestination",
                "UnsupportedSellTokenSource",
                "UnsupportedOrderType",
                "InsufficientValidTo",
                "ExcessiveValidTo",
                "InvalidNativeSellToken",
                "SameBuyAndSellToken",
                "UnsupportedToken",
                "InvalidAppData",
                "AppDataHashMismatch",
                "AppdataFromMismatch",
                "OldOrderActivelyBidOn",
              ],
            },
            description: {
              type: "string",
            },
          },
          required: ["errorType", "description"],
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
          type: "object",
          description: "Response for Quote from CoW Orderbook API",
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
        OrderCreation: {
          description: "Data a user provides when creating a new order.",
          type: "object",
          properties: {
            sellToken: {
              description: "see `OrderParameters::sellToken`",
              allOf: [{ $ref: "#/components/schemas/Address" }],
            },
            buyToken: {
              description: "see `OrderParameters::buyToken`",
              allOf: [{ $ref: "#/components/schemas/Address" }],
            },
            receiver: {
              description: "see `OrderParameters::receiver`",
              allOf: [{ $ref: "#/components/schemas/Address" }],
              nullable: true,
            },
            sellAmount: {
              description: "see `OrderParameters::sellAmount`",
              allOf: [{ $ref: "#/components/schemas/TokenAmount" }],
            },
            buyAmount: {
              description: "see `OrderParameters::buyAmount`",
              allOf: [{ $ref: "#/components/schemas/TokenAmount" }],
            },
            validTo: {
              description: "see `OrderParameters::validTo`",
              type: "integer",
            },
            feeAmount: {
              description: "see `OrderParameters::feeAmount`",
              allOf: [{ $ref: "#/components/schemas/TokenAmount" }],
            },
            kind: {
              description: "see `OrderParameters::kind`",
              allOf: [{ $ref: "#/components/schemas/OrderKind" }],
            },
            partiallyFillable: {
              description: "see `OrderParameters::partiallyFillable`",
              type: "boolean",
            },
            sellTokenBalance: {
              description: "see `OrderParameters::sellTokenBalance`",
              allOf: [{ $ref: "#/components/schemas/SellTokenSource" }],
              default: "erc20",
            },
            buyTokenBalance: {
              description: "see `OrderParameters::buyTokenBalance`",
              allOf: [{ $ref: "#/components/schemas/BuyTokenDestination" }],
              default: "erc20",
            },
            signingScheme: {
              $ref: "#/components/schemas/SigningScheme",
            },
            signature: {
              $ref: "#/components/schemas/Signature",
            },
            from: {
              description: "Ensures the decoded signer matches this address",
              allOf: [{ $ref: "#/components/schemas/Address" }],
              nullable: true,
            },
            quoteId: {
              description: "Optional quote ID for slippage analysis.",
              type: "integer",
              nullable: true,
            },
            appData: {
              description:
                "Arbitrary app-specific metadata; must be valid JSON string.",
              anyOf: [
                {
                  title: "Full App Data",
                  allOf: [{ $ref: "#/components/schemas/AppData" }],
                  description:
                    "A JSON string that gets hashed and signed. Use '{}' and match hash when unsure.",
                  type: "string",
                },
                { $ref: "#/components/schemas/AppDataHash" },
              ],
            },
            appDataHash: {
              description: "Optional hash of appData for verification.",
              allOf: [{ $ref: "#/components/schemas/AppDataHash" }],
              nullable: true,
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
            "signingScheme",
            "signature",
          ],
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
        ExecutedAmounts: {
          type: "object",
          properties: {
            sell: {
              $ref: "#/components/schemas/BigUint",
            },
            buy: {
              $ref: "#/components/schemas/BigUint",
            },
          },
          required: ["sell", "buy"],
        },
        BigUint: {
          type: "string",
          pattern: "^[0-9]+$",
          description:
            "Arbitrary-precision unsigned integer encoded as a base-10 string.",
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
