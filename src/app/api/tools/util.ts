import { MetaTransaction, NearSafe, SignRequestData } from "near-safe";
import { NextRequest, NextResponse } from "next/server";
import { getAddress, Hex, zeroAddress, Address } from "viem";

const safeSaltNonce = process.env.SAFE_SALT_NONCE;
if (!safeSaltNonce) {
  throw new Error("SAFE_SALT_NONCE is not set");
}

export function signRequestFor({
  from,
  chainId,
  metaTransactions,
}: {
  from?: Address;
  chainId: number;
  metaTransactions: MetaTransaction[];
}): SignRequestData {
  console.log("metaTransactions", metaTransactions);
  return {
    method: "eth_sendTransaction",
    chainId,
    params: metaTransactions.map((mt) => ({
      from: from ?? zeroAddress,
      to: getAddress(mt.to),
      value: mt.value as Hex,
      data: mt.data as Hex,
    })),
  };
}

// TODO: Figure out how to use middleware to validate requests!
export async function validateRequest(
  req: NextRequest,
): Promise<NextResponse | null> {
  const metadataHeader = req.headers.get("mb-metadata");
  console.log("Request Metadata:", JSON.stringify(metadataHeader, null, 2));
  const metadata = JSON.parse(metadataHeader ?? "{}");
  const { accountId, evmAddress } = metadata;
  if (!accountId || !evmAddress) {
    return NextResponse.json(
      { error: "Missing accountId or evmAddress in metadata" },
      { status: 415 },
    );
  }

  const derivedSafeAddress = await getAdapterAddress(accountId);
  if (derivedSafeAddress !== getAddress(evmAddress)) {
    return NextResponse.json(
      {
        error: `Invalid safeAddress in metadata: ${derivedSafeAddress} !== ${evmAddress}`,
      },
      { status: 401 },
    );
  }
  console.log(`Valid request for ${accountId} <-> ${evmAddress}`);
  return null;
}

async function getAdapterAddress(accountId: string): Promise<Address> {
  const adapter = await NearSafe.create({
    mpc: {
      accountId,
      mpcContractId: accountId.includes(".testnet")
        ? "v1.signer-prod.testnet"
        : "v1.signer",
    },
    pimlicoKey: "", // This is a readonly adapter.
    safeSaltNonce,
  });
  return getAddress(adapter.address);
}
