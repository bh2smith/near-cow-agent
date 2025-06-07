import type {
  CowShedCall,
  SignAndEncodeTxArgs,
  SupportedChainId,
} from "@cowprotocol/cow-sdk";
import { CowShedSdk } from "@cowprotocol/cow-sdk";
import { FACTORY_ABI, PROXY_CREATION_CODE, SHED_ABI } from "./abi";
import type { Address, Hash, Hex, TypedDataDomain } from "viem";
import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getAddress,
  getCreate2Address,
  hashStruct,
  hashTypedData,
  isHex,
  keccak256,
  toBytes,
  pad,
  toHex,
} from "viem";

export interface ISdkOptions {
  factoryAddress: Address;
  proxyCreationCode?: Hex;
  implementationAddress: Address;
  chainId: number;
}

export interface ICall {
  target: Address;
  value: bigint;
  callData: Hex;
  allowFailure: boolean;
  isDelegateCall: boolean;
}

export interface IExecuteHooks {
  calls: ICall[];
  nonce: string;
  deadline: bigint;
}

const DOMAIN_TYPE = {
  EIP712Domain: [
    { type: "string", name: "name" },
    { type: "string", name: "version" },
    { type: "uint256", name: "chainId" },
    { type: "address", name: "verifyingContract" },
  ],
};

const COW_SHED_712_TYPES = {
  ExecuteHooks: [
    { type: "Call[]", name: "calls" },
    { type: "bytes32", name: "nonce" },
    { type: "uint256", name: "deadline" },
  ],
  Call: [
    { type: "address", name: "target" },
    { type: "uint256", name: "value" },
    { type: "bytes", name: "callData" },
    { type: "bool", name: "allowFailure" },
    { type: "bool", name: "isDelegateCall" },
  ],
};

export function formatBytes32String(text: string): Hash {
  const bytes = toBytes(text);

  if (bytes.length > 31) {
    throw new Error("bytes32 string must be less than 32 bytes");
  }

  return toHex(pad(bytes, { size: 32 })); // pads with zeros to 32 bytes
}

export class CowShed {
  sdk: CowShedSdk;

  constructor(private options: ISdkOptions) {
    this.sdk = new CowShedSdk({ factoryOptions: { ...options } });
  }

  getCowShedAccount(chainId: SupportedChainId, ownerAddress: Address): Address {
    return getAddress(this.sdk.getCowShedAccount(chainId, ownerAddress));
  }

  public signCalls(args: SignAndEncodeTxArgs): Promise<CowShedCall> {
    // const encodedSignature = CowShed.encodeEOASignature(
    //   BigInt(signature.r),
    //   BigInt(signature.s),
    //   Number(signature.v) ?? signature.yParity + 27
    // );

    // const hooksCalldata = CowShed.encodeExecuteHooksForFactory(
    //   calls,
    //   nonce,
    //   BigInt(validTo),
    //   userAddr,
    //   encodedSignature
    // );

    // const gasLimit =
    //   await estimateGasForExecuteHooks(
    //     provider,
    //     factory,
    //     hooksCalldata
    //   );
    return this.sdk.signCalls(args);
  }

  computeProxyAddress(user: Address) {
    const salt = encodeAbiParameters([{ type: "address" }], [user]);
    const initCodeHash = keccak256(
      encodePacked(
        ["bytes", "bytes"],
        [
          this._proxyCreationCode(),
          encodeAbiParameters(
            [{ type: "address" }, { type: "address" }],
            [this.options.implementationAddress, user],
          ),
        ],
      ),
    );
    return getCreate2Address({
      from: this.options.factoryAddress,
      salt,
      bytecodeHash: initCodeHash,
    });
  }

  computeDomainSeparator(proxy: Address): `0x${string}` {
    return hashStruct({
      primaryType: "EIP712Domain",
      types: DOMAIN_TYPE,
      data: this._getDomain(proxy),
    });
  }

  hashToSignWithProxy(
    calls: ICall[],
    nonce: Hash,
    deadline: bigint,
    proxy: Address,
  ) {
    return this._hashToSign(calls, nonce, deadline, proxy);
  }

  hashToSignWithUser(
    calls: ICall[],
    nonce: Hash,
    deadline: bigint,
    user: Address,
  ) {
    return this._hashToSign(
      calls,
      nonce,
      deadline,
      this.computeProxyAddress(user),
    );
  }

  static encodeExecuteHooksForFactory(
    calls: ICall[],
    nonce: Hash,
    deadline: bigint,
    user: Address,
    signature: Hex,
  ): Hex {
    return encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: "executeHooks",
      args: [calls, nonce, deadline, user, signature],
    });
  }

  static encodeExecuteHooksForProxy(
    calls: ICall[],
    nonce: Hash,
    deadline: bigint,
    signature: Hex,
  ) {
    return encodeFunctionData({
      abi: SHED_ABI,
      functionName: "executeHooks",
      args: [calls, nonce, deadline, signature],
    });
  }

  // TODO: We are passing yParity
  static encodeEOASignature(r: bigint, s: bigint, v: number) {
    return encodePacked(["uint", "uint", "uint8"], [r, s, v]);
  }

  private _hashToSign(
    calls: ICall[],
    nonce: Hash,
    deadline: bigint,
    proxy: Address,
  ) {
    return hashTypedData({
      domain: this._getDomain(proxy),
      types: COW_SHED_712_TYPES,
      primaryType: "ExecuteHooks",
      message: { calls, nonce, deadline }, // // IExecuteHooks
    });
  }

  private _getDomain(proxy: Address): TypedDataDomain {
    const domain: TypedDataDomain = {
      name: "COWShed",
      version: "1.0.0",
      chainId: this.options.chainId,
      verifyingContract: proxy,
    };
    return domain;
  }

  private _proxyCreationCode(): `0x${string}` {
    const byteCode = this.options.proxyCreationCode ?? PROXY_CREATION_CODE;
    if (!isHex(byteCode)) {
      throw new Error("Invalid byte code format");
    }
    return byteCode;
  }
}
