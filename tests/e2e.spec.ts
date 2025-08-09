import { handleCancellationRequest } from "@/src/app/api/tools/cancel/logic";
import { handleQuoteRequest } from "@/src/app/api/tools/quote/logic";
import { createOrder } from "@/src/lib/protocol/order";
import { OrderRequestBody, ParsedQuoteRequest } from "@/src/lib/types";
import { OrderQuoteRequest } from "@cowprotocol/cow-sdk";
import {
  createWalletClient,
  http,
  parseEther,
  recoverTypedDataAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const tokenData = {
  sell: {
    address: "0xe485E2f1bab389C08721B291f6b59780feC83Fd7",
    decimals: 18,
    symbol: "SHU",
    name: "Shutter",
  },
  buy: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    symbol: "USDC",
    name: "Circles USD",
  },
};
const chainId = 1;

describe("End To End", () => {
  it.skip("Quote to Order", async () => {
    const slippageBps = 1; // So the order will not get filled before we can cancel
    const wallet = createWalletClient({
      transport: http(),
      chain: mainnet,
      account: privateKeyToAccount(process.env.PRIVATE_KEY! as `0x${string}`),
    });
    console.log("Account", wallet.account.address);
    const quoteRequest = {
      sellToken: tokenData.sell.address,
      buyToken: tokenData.buy.address,
      sellAmountBeforeFee: parseEther("5000").toString(),
      kind: "sell",
      receiver: wallet.account.address,
      from: wallet.account.address,
      signingScheme: "eip712",
    } as OrderQuoteRequest;

    const input = {
      chainId,
      quoteRequest,
      tokenData,
      slippageBps,
    } as ParsedQuoteRequest;
    const {
      transaction,
      meta: { quote },
    } = await handleQuoteRequest(input);
    // const transaction = [
    //   {
    //     method: "eth_signTypedData_v4",
    //     chainId: 1,
    //     params: [
    //       "0xB00b4C1e371DEe4F6F32072641430656D3F7c064",
    //       '{"types":{"Order":[{"name":"sellToken","type":"address"},{"name":"buyToken","type":"address"},{"name":"receiver","type":"address"},{"name":"sellAmount","type":"uint256"},{"name":"buyAmount","type":"uint256"},{"name":"validTo","type":"uint32"},{"name":"appData","type":"bytes32"},{"name":"feeAmount","type":"uint256"},{"name":"kind","type":"string"},{"name":"partiallyFillable","type":"bool"},{"name":"sellTokenBalance","type":"string"},{"name":"buyTokenBalance","type":"string"}]},"domain":{"name":"Gnosis Protocol","version":"v2","chainId":1,"verifyingContract":"0x9008D19f58AAbD9eD0D60971565AA8510560ab41"},"primaryType":"Order","message":{"sellToken":"0xe485e2f1bab389c08721b291f6b59780fec83fd7","buyToken":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","receiver":"0xb00b4c1e371dee4f6f32072641430656d3f7c064","sellAmount":"5000000000000000000000","buyAmount":"20557594","validTo":1754669109,"appData":"0x5a8bb9f6dd0c7f1b4730d9c5a811c2dfe559e67ce9b5ed6965b05e59b8c86b80","feeAmount":"0","kind":"sell","partiallyFillable":false,"sellTokenBalance":"erc20","buyTokenBalance":"erc20","signingScheme":"eip712"}}',
    //     ],
    //   },
    // ];
    console.log("Transaction", transaction);
    const typedDataString = transaction[0].params[1] as string;
    const typedData = JSON.parse(typedDataString);
    const signature = await wallet.signTypedData(typedData);
    console.log(signature);
    const recoveredAddress = await recoverTypedDataAddress({
      ...typedData,
      signature,
    });
    expect(recoveredAddress).toBe(wallet.account.address);
    const orderRequest = {
      ...quote.quote,
      signature,
      chainId,
      // receiver: wallet.account.address,
      // evmAddress: wallet.account.address,
    } as OrderRequestBody;
    const order = await createOrder(orderRequest);
    console.log(order);
  }, 10000);

  it("Quote to Order", async () => {
    const wallet = createWalletClient({
      transport: http(),
      chain: mainnet,
      account: privateKeyToAccount(process.env.PRIVATE_KEY! as `0x${string}`),
    });
    const order = {
      orderUrl:
        "https://explorer.cow.fi/orders/0xeaa2608341c2263962070fbebd56bee368d399960265d4e34e217108c56b2190b00b4c1e371dee4f6f32072641430656d3f7c06468962347",
      orderUid:
        "0xeaa2608341c2263962070fbebd56bee368d399960265d4e34e217108c56b2190b00b4c1e371dee4f6f32072641430656d3f7c06468962347",
    };

    const result = await handleCancellationRequest({
      chainId,
      orderUid: order.orderUid,
    });
    if (result) {
      const cancellationSignature = await wallet.signTypedData(
        JSON.parse(result.params[1] as string),
      );
      await handleCancellationRequest({
        chainId,
        orderUid: order.orderUid,
        signature: cancellationSignature,
      });
    }
  }, 10000);
});
