import type { Address, Hash, Hex } from "viem";
import { encodeFunctionData, encodePacked, parseAbi } from "viem";

// see weiroll: https://github.com/weiroll/weiroll/blob/main/README.md
export const WEIROLL_ADDRESS = "0x9585c3062Df1C247d5E373Cfca9167F7dC2b5963";

export enum CallType {
  DelegateCall,
  Call,
  StaticCall,
  CallWithValue,
}

export const END_OF_ARGS = 0xff;

// encode command args for weiroll
export const encodeCommand = (
  selector: Hex,
  flags: number,
  input: bigint,
  output: number,
  target: Address,
): Hex => {
  return encodePacked(
    ["bytes4", "uint8", "uint48", "uint8", "address"],
    [selector, flags, Number(input), output, target],
  );
};

// calltype to number encoding
export const callTypeToNumber = (callType: CallType) => {
  switch (callType) {
    case CallType.DelegateCall:
      return 0;
    case CallType.Call:
      return 1;
    case CallType.StaticCall:
      return 2;
    case CallType.CallWithValue:
      return 3;
  }
};

// encode flag part of the weiroll command
export const encodeFlag = (
  isTuple: boolean,
  isExtendedCommand: boolean,
  callType: CallType,
): number => {
  return (
    (isTuple ? 0x80 : 0x00) |
    (isExtendedCommand ? 0x40 : 0x00) |
    callTypeToNumber(callType)
  );
};

// encode the input part of the weiroll command
export const encodeInput = (
  a1: number,
  a2: number,
  a3: number,
  a4: number,
  a5: number,
  a6: number,
): bigint => {
  return BigInt(
    encodePacked(
      ["uint8", "uint8", "uint8", "uint8", "uint8", "uint8"],
      [a1, a2, a3, a4, a5, a6],
    ),
  );
};

// encode individual input arg of the weiroll command inputs
export const encodeInputArg = (isFixed: boolean, idx: number): number => {
  return (isFixed ? 0x00 : 0x80) | idx;
};

// encode the execute call for TestableVM weiroll instance
export const encodeWeirollExecuteCall = (
  commands: Hash[],
  state: Hex[],
): Hex => {
  return encodeFunctionData({
    abi: parseAbi([
      "function execute(bytes32[], bytes[]) public payable returns (bytes[])",
    ]),
    functionName: "execute",
    args: [commands, state],
  });
};
