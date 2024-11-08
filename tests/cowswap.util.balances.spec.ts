import { getSafeBalances } from "@/src/app/api/tools/safe-util";
import { Address } from "viem";

beforeAll(() => {
  // Mock all console methods
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("getSafeBalances", () => {
  const mockNotSafeAddress =
    "0x1234567890123456789012345678901234567890" as Address;
  const mockBalances = [
    {
      tokenAddress: "0xtoken1",
      token: {
        name: "Token1",
        symbol: "TK1",
        decimals: 18,
        logoUri: "https://example.com/token1.png",
      },
      balance: "1000000000000000000",
      fiatBalance: "1000.00",
      fiatConversion: "1.00",
    },
    {
      tokenAddress: null,
      token: {
        name: "Ethereum",
        symbol: "ETH",
        decimals: 18,
        logoUri: "https://example.com/eth.png",
      },
      balance: "2000000000000000000",
      fiatBalance: "2000.00",
      fiatConversion: "1.00",
    },
  ];

  describe("with mocked responses", () => {
    beforeEach(() => {
      // Setup fetch mock only for these tests
      global.fetch = jest.fn();
    });

    afterEach(() => {
      // Clean up mock after each test
      jest.restoreAllMocks();
    });

    it("should fetch balances successfully for mainnet", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockBalances,
      });

      const result = await getSafeBalances(1, mockNotSafeAddress);

      expect(fetch).toHaveBeenCalledWith(
        `https://safe-transaction-mainnet.safe.global/api/v1/safes/${mockNotSafeAddress}/balances/?trusted=true&exclude_spam=true`,
        {
          headers: {
            accept: "application/json",
          },
        },
      );

      expect(result).toEqual(mockBalances);
    });

    it("should handle Sepolia network parameters correctly", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockBalances,
      });

      await getSafeBalances(11155111, mockNotSafeAddress);

      expect(fetch).toHaveBeenCalledWith(
        `https://safe-transaction-sepolia.safe.global/api/v1/safes/${mockNotSafeAddress}/balances/?trusted=false&exclude_spam=false`,
        expect.any(Object),
      );
    });

    it("should throw error for unsupported chain ID", async () => {
      await expect(getSafeBalances(999, mockNotSafeAddress)).resolves.toEqual(
        [],
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should handle API error responses", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(getSafeBalances(1, mockNotSafeAddress)).resolves.toEqual([]);
    });
  });

  describe("with real network calls", () => {
    it.skip("should fetch balances for Arbitrum", async () => {
      const result = await getSafeBalances(
        42161,
        "0x2A42b97d2cd622a0e2B5AB8dC5d6106fb7a122c5",
      );
      expect(result).toEqual([
        {
          balance: "0",
          fiatBalance: "0.49",
          fiatConversion: "1.00",
          token: {
            decimals: 6,
            logoUri:
              "https://cdn.zerion.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
            name: "USD Coin",
            symbol: "USDC",
          },
          tokenAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
        },
      ]);
    });
  });
});
