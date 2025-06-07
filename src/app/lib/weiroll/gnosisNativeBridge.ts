// weiroll required since swap output amount is not known

import type { Address, Hex } from "viem";
import {
  encodeFunctionData,
  erc20Abi,
  keccak256,
  maxUint256,
  padHex,
  sliceHex,
  toBytes,
} from "viem";
import {
  encodeCommand,
  encodeFlag,
  encodeInput,
  encodeInputArg,
  CallType,
  END_OF_ARGS,
  WEIROLL_ADDRESS,
  encodeWeirollExecuteCall,
} from "./weiroll";
import type { ICoWShedCall } from "@cowprotocol/cow-sdk";

// bridge contract address on ethereum mainnet
// TODO: Get Address for ChainId 100.
export const GNOSIS_CHAIN_BRIDGE = "0x88ad09518695c6c3712AC10a214bE5109a655671";

export const fnSelector = (sig: string) =>
  sliceHex(keccak256(toBytes(sig)), 0, 4);

export function gnosisBridgeCommands(
  token: Address,
  proxyAddress: Address,
): ICoWShedCall[] {
  // TODO: I think this weiroll shouldn't be necessary if we used buy orders!
  // at tx time. need to fetch it at execution time.
  const commands = [
    // balanceOf staticcall
    encodeCommand(
      fnSelector("balanceOf(address)"),
      // it should be a static call
      encodeFlag(false, false, CallType.StaticCall),
      encodeInput(
        // balanceOf takes one arg, the address whose balance is being queried
        // it is fixed length input, and stored at state index 0
        encodeInputArg(true, 0),
        // all remainder args are unused
        END_OF_ARGS,
        END_OF_ARGS,
        END_OF_ARGS,
        END_OF_ARGS,
        END_OF_ARGS,
      ),
      // this tells the VM that the output of balanceOf is also
      // of fixed length and that it should store it in state index 1
      encodeInputArg(true, 1),
      // target address, this is whats called
      token,
    ),
    // bridge relay tokens call
    encodeCommand(
      fnSelector("relayTokens(address,address,uint256)"),
      // it is a Call
      encodeFlag(false, false, CallType.Call),
      encodeInput(
        // token address, fixed length input, read from state index 2
        encodeInputArg(true, 2),
        // user address, fixed length input, read from state index 0
        encodeInputArg(true, 0), // user address
        // balance, fixed length input, read from state index 1, this is where
        // previous command stored it
        encodeInputArg(true, 1), // balance
        // other 3 input args are unused
        END_OF_ARGS,
        END_OF_ARGS,
        END_OF_ARGS,
      ),
      // this commands output is not used/important, hence ignored
      END_OF_ARGS,
      // target address, this is whats called
      GNOSIS_CHAIN_BRIDGE,
    ),
  ];

  const state: Hex[] = [
    padHex(proxyAddress, { size: 32 }), // address to query the balance of
    "0x", // this is where balance output will be written
    padHex(token, { size: 32 }), // USDC token address, used in relayTokens call argument
  ];

  return [
    // approve the bridge to spend the swapped usdc
    {
      target: token,
      callData: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [GNOSIS_CHAIN_BRIDGE, maxUint256],
      }),
      value: BigInt(0),
      isDelegateCall: false,
      allowFailure: false,
    },
    // bridge the full output by using weiroll
    {
      target: WEIROLL_ADDRESS,
      callData: encodeWeirollExecuteCall(commands, state),
      value: BigInt(0),
      isDelegateCall: true,
      allowFailure: false,
    },
  ];
}
