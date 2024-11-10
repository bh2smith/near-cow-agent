import { MetaTransaction, NearSafe, SignRequestData } from "near-safe";
import { NextRequest } from "next/server";
import { Address, getAddress, Hex, zeroAddress } from "viem";

export function signRequestFor({
  chainId,
  metaTransactions,
}: {
  chainId: number;
  metaTransactions: MetaTransaction[];
}): SignRequestData {
  console.log("metaTransactions", metaTransactions);
  return {
    method: "eth_sendTransaction",
    chainId,
    params: metaTransactions.map((mt) => ({
      from: zeroAddress,
      to: getAddress(mt.to),
      value: mt.value as Hex,
      data: mt.data as Hex,
    })),
  };
}

export async function extractAccountId(
  req: NextRequest,
): Promise<{ nearAccount: string; safeAddress: Address }> {
  const metadataHeader = req.headers.get("mb-metadata");
  console.log("metadataHeader", metadataHeader);
  if (metadataHeader) {
    try {
      const metadata = JSON.parse(metadataHeader);
      const accountId = metadata.accountId;
      const adapter = await NearSafe.create({
        mpc: {
          accountId,
          mpcContractId: accountId.includes(".testnet")
            ? "v1.signer-prod.testnet"
            : "v1.signer",
        },
        pimlicoKey: "", // This is a readonly adapter.
        safeSaltNonce: "130811896738364156958237239906781888512",
      });

      // Use accountId as needed here
      return {
        nearAccount: accountId,
        safeAddress: adapter.address,
      };
    } catch (error) {
      console.error("Failed to parse mb-metadata:", error);
      throw new Error("Invalid mb-metadata format");
    }
  } else {
    throw new Error("mb-metadata header not found");
  }
}
