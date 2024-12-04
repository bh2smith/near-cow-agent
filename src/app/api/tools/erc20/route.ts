import { parseUnits, type Address } from "viem";
import {
  erc20Transfer,
  addressField,
  floatField,
  numberField,
  validateInput,
  addressOrSymbolField,
  type FieldParser,
  signRequestFor,
  getTokenDetails,
} from "@bitteprotocol/agent-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getTokenMap } from "../util";

interface Input {
  chainId: number;
  amount: number;
  token: string;
  recipient: Address;
}

const parsers: FieldParser<Input> = {
  chainId: numberField,
  // Note that this is a float (i.e. token units)
  amount: floatField,
  token: addressOrSymbolField,
  recipient: addressField,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const search = url.searchParams;
  console.log("erc20/", search);
  try {
    const { chainId, amount, token, recipient } = validateInput<Input>(
      search,
      parsers,
    );
    const { decimals, address, symbol } = await getTokenDetails(
      chainId,
      token,
      await getTokenMap(),
    );
    console.log("erc20/ tokenDetails", chainId, symbol, decimals, address);
    return NextResponse.json(
      {
        transaction: signRequestFor({
          chainId,
          metaTransactions: [
            erc20Transfer({
              token: address,
              to: recipient,
              amount: parseUnits(amount.toString(), decimals),
            }),
          ],
        }),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error occurred ${String(error)}`;
    console.error("erc20/ error", message);
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
