import type { Hex } from "viem";
import { getAddress, parseEther } from "viem";
import type { QuoteBridgeRequest } from "@cowprotocol/cow-sdk";
import { OrderKind, SupportedChainId } from "@cowprotocol/cow-sdk";
import { getQuote } from "@/src/app/lib/cow-bridge";
import readline from "readline";

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(question + " (y/n) ", (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    }),
  );
}

const zeroExBoob = getAddress("0xB00b4C1e371DEe4F6F32072641430656D3F7c064");

const bridgeSignerPk = process.env.PRIVATE_KEY! as Hex;

async function run() {
  const sampleSellToken = {
    sellTokenChainId: SupportedChainId.BASE,
    sellTokenAddress: "0x4200000000000000000000000000000000000006",
    sellTokenDecimals: 18,
  };
  const sampleBuyToken = {
    buyTokenChainId: SupportedChainId.ARBITRUM_ONE,
    buyTokenAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    buyTokenDecimals: 6,
  };

  const parameters: QuoteBridgeRequest = {
    account: zeroExBoob,
    kind: OrderKind.SELL, // Only Sell!
    ...sampleSellToken,
    ...sampleBuyToken,
    amount: parseEther("0.001"),
    appCode: "Bitte.AI",
    signer: bridgeSignerPk,
  };
  const quote = await getQuote(parameters, bridgeSignerPk);
  const { swap, bridge, postSwapOrderFromQuote } = quote;

  console.log("Swap info", swap);
  console.log("Bridge info", bridge);

  const { buyAmount } = bridge.amountsAndCosts.afterSlippage;

  if (await confirm(`You will get at least: ${buyAmount}, ok?`)) {
    const orderId = await postSwapOrderFromQuote();

    console.log("Order created, id: ", orderId);
  }
}

run().then().catch();
