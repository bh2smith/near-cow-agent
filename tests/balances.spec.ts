import { sufficientBalance } from "@/src/lib/balance";
import { getClient } from "@/src/lib/rpc";
import { zeroAddress } from "viem";
import dotenv from "dotenv";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

dotenv.config();

describe("Balances Route", () => {
  const chainId = 8453;
  const client = getClient(chainId);
  const eth = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const weth = "0x4200000000000000000000000000000000000006";
  const ethHolder = zeroAddress;

  const nonHolder = privateKeyToAccount(generatePrivateKey()).address;

  // This posts an order to COW Orderbook.
  it("sufficientSellTokenBalance (Native)", async () => {
    let result = await sufficientBalance(client, ethHolder, BigInt("1"), eth);
    expect(result.sufficient).toBe(true);
    expect(result.balance).toBeGreaterThan(BigInt("0"));

    result = await sufficientBalance(
      client,
      ethHolder,
      BigInt("1"),
      // Nothing here! (i.e. unspecified tokenAddress)
    );
    expect(result.sufficient).toBe(true);
    expect(result.balance).toBeGreaterThan(BigInt("0"));

    // Non Holder
    result = await sufficientBalance(client, nonHolder, BigInt("1"), eth);
    expect(result.sufficient).toBe(false);
    expect(result.balance).toBe(BigInt("0"));
  });

  it("sufficientSellTokenBalance (ERC20)", async () => {
    let result = await sufficientBalance(client, ethHolder, BigInt("1"), weth);
    expect(result.sufficient).toBe(true);
    expect(result.balance).toBeGreaterThan(BigInt("0"));

    // Non Holder
    result = await sufficientBalance(
      client,
      nonHolder,
      BigInt("1"),
      zeroAddress, // NOT A TOKEN ADDRESS!
    );
    expect(result.sufficient).toBe(true);
    expect(result.balance).toBeNull();
  });
});
