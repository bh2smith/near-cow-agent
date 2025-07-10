import { sufficientSellTokenBalance } from "@/src/app/api/tools/balance";
import { getAddress } from "viem";
import dotenv from "dotenv";

dotenv.config();

describe("Balances Route", () => {

    // This posts an order to COW Orderbook.
  it("sufficientSellTokenBalance", async () => {
    const chainId = 8453;
    const eth = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    const weth = "0x4200000000000000000000000000000000000006";
    const wallet = "0x7f01D9b227593E033bf8d6FC86e634d27aa85568";
    const balances = await sufficientSellTokenBalance(chainId, wallet, eth, 1);
    console.log(balances);
  });
});
