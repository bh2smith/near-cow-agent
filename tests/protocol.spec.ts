import { orderRequestFlow } from "@/src/app/api/tools/cowswap/orderFlow";
import { ParsedQuoteRequest } from "@/src/app/api/tools/cowswap/util/parse";
import { sellTokenApprovalTx } from "@/src/app/api/tools/cowswap/util/protocol";
import { getClient } from "@/src/app/api/tools/util";
import { parseUnits } from "viem";

describe("sellTokenApproval", () => {
  it("check it", async () => {
    const x = await sellTokenApprovalTx({
      client: getClient(8453, false),
      from: "0x800E1A29FaC643b3D19b4561DA573CaF49b9b610",
      sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      sellAmount: parseUnits("0.1", 6).toString(),
    });
    expect(x).toEqual({
      to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      value: "0x0",
      data: "0x095ea7b3000000000000000000000000c92e8bdf79f0507f65a392b0ab4667716bfe0110ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    });
  });

  it("check it", async () => {
    const user = "0x8B2E1A29FaC643b3D19b4561DA573CaF49b9b610";
    const shitCoin = {
      address: "0x575a2bB6F8C31f8e60264531d5e300e6EC505F29",
      decimals: 18,
      symbol: "ETH",
    };
    const usdc = {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      symbol: "USDC",
    };

    const x = {
      chainId: 8453,
      quoteRequest: {
        sellToken: usdc.address,
        buyToken: shitCoin.address,
        sellAmountBeforeFee: "100000",
        kind: "sell",
        receiver: user,
        from: user,
        signingScheme: "presign",
      },
      tokenData: {
        buy: shitCoin,
        sell: usdc,
      },
    };
    await expect(orderRequestFlow(x as ParsedQuoteRequest)).rejects.toThrow(
      "NoLiquidity: no route found",
    );
  });
});
