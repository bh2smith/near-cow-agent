import { getBalances } from "@/src/app/api/tools/balance";
import { getZerionKey } from "@/src/app/api/tools/util";
import { getAddress } from "viem";
import dotenv from "dotenv";

dotenv.config();

// Safe Associated with neareth-dev.testnet on Bitte Wallet.
const DEPLOYED_SAFE = getAddress("0x7f01D9b227593E033bf8d6FC86e634d27aa85568");

describe("Balances Route", () => {
  // This posts an order to COW Orderbook.
  it.skip("getBalances", async () => {
    const balances = await getBalances(DEPLOYED_SAFE, getZerionKey());
    console.log(balances);
  });
});
