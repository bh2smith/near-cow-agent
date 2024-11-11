import {
  flatSafeBalances,
  getSafeBalances,
} from "@/src/app/api/tools/safe-util";
import { zeroAddress } from "viem";
describe("getSafeBalances", () => {
  describe("with mocked responses", () => {
    it("should throw error for unsupported chain ID", async () => {
      await expect(getSafeBalances(999, zeroAddress)).resolves.toEqual([]);
    });

    it("should fetch balances for Arbitrum", async () => {
      const result = await getSafeBalances(
        42161,
        "0x2A42b97d2cd622a0e2B5AB8dC5d6106fb7a122c5",
      );
      expect(result).toEqual([
        {
          tokenAddress: null,
          token: null,
          balance: "131757599414115",
        },
        {
          tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
          token: {
            name: "USD Coin",
            symbol: "USDC",
            decimals: 6,
            logoUri:
              "https://assets.coingecko.com/coins/images/6319/thumb/usdc.png?1696506694",
          },
          balance: "89877",
        },
      ]);
    });

    it("should fetch balances for Arbitrum", async () => {
      const result = await flatSafeBalances(
        42161,
        "0x2A42b97d2cd622a0e2B5AB8dC5d6106fb7a122c5",
      );
      console.log(result);
      expect(result).toEqual({
        balances: [
          {
            token: null,
            balance: "131757599414115",
            symbol: null,
            decimals: 18,
            logoUri: null,
          },
          {
            token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            balance: "89877",
            symbol: "USDC",
            decimals: 6,
            logoUri:
              "https://assets.coingecko.com/coins/images/6319/thumb/usdc.png?1696506694",
          },
        ],
      });
    });
  });
});
