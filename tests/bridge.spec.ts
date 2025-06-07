import { getAddress, Hex, parseEther } from "viem";
import { BridgeInput, bridgeQuote, toCowHook } from "@/src/app/lib/lifi-bridge";
import { ChainId, ChainType, getChains } from "@lifi/sdk";
import {
  OrderKind,
  QuoteBridgeRequest,
  SupportedChainId,
} from "@cowprotocol/cow-sdk";
import { getQuote } from "@/src/app/lib/cow-bridge";

const GNO_WXDAI = {
  chain: ChainId.DAI,
  address: getAddress("0xe91d153e0b41518a2ce8dd3d7944fa863463a97d"),
};
const OP_DAI = {
  chain: ChainId.OPT,
  address: getAddress("0xda10009cbd5d07dd0cecc66161fc93d7c9000da1"),
};

const OP_WETH_ADDRESS = getAddress(
  "0x4200000000000000000000000000000000000006",
);

const zeroExBoob = getAddress("0xB00b4C1e371DEe4F6F32072641430656D3F7c064");

const bridgeSignerPk = process.env.PRIVATE_KEY! as Hex;

describe("Bridge Library", () => {
  it.only("Li.Fi: gnosis to op DAI", async () => {
    const req: BridgeInput = {
      account: zeroExBoob,
      amount: parseEther("10"),
      src: GNO_WXDAI,
      dest: OP_DAI,
    };
    const quote = await bridgeQuote(req);
    const chains = await getChains({ chainTypes: [ChainType.EVM] });
    console.log(
      "CHAIN",
      chains.map((x) => x.id),
    );
    // console.log(quote);
  });

  it("Li.Fi: WETH - Base to OP ", async () => {
    const req: BridgeInput = {
      account: zeroExBoob,
      amount: parseEther("0.005"),
      src: { chain: ChainId.BAS, address: OP_WETH_ADDRESS },
      dest: { chain: ChainId.OPT, address: OP_WETH_ADDRESS },
    };
    const quote = await bridgeQuote(req);

    console.log("Steps", quote.includedSteps.length);

    // console.log("Steps", quote)

    const hook = toCowHook(quote.transactionRequest!);

    // console.log("CoW Hook", hook);
  });

  it.skip("CoW SDK: Docs Example", async () => {
    const sampleSellToken = {
      buyTokenChainId: SupportedChainId.BASE,
      buyTokenAddress: "0x4200000000000000000000000000000000000006",
      buyTokenDecimals: 18,
    };
    const sampleBuyToken = {
      sellTokenChainId: SupportedChainId.ARBITRUM_ONE,
      sellTokenAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      sellTokenDecimals: 6,
    };
    const parameters: QuoteBridgeRequest = {
      account: zeroExBoob,
      kind: OrderKind.SELL, // Only Sell!
      ...sampleSellToken,
      ...sampleBuyToken,
      amount: BigInt(120000000000000000),
      appCode: "Bitte.AI",
      signer: bridgeSignerPk,
    };
    const quote = await getQuote(parameters, bridgeSignerPk);
    const { swap, bridge, postSwapOrderFromQuote } = quote;

    console.log("Swap info", swap);
    console.log("Bridge info", bridge);

    // const { buyAmount } = bridge.amountsAndCosts.afterSlippage;

    // if (confirm(`You will get at least: ${buyAmount}, ok?`)) {
    //   const orderId = await postSwapOrderFromQuote();

    //   console.log("Order created, id: ", orderId);
    // }
  });
});
