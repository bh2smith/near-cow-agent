import type { SignableMessage } from "viem";
import {
  getAddress,
  type WalletClient,
  type PublicClient,
  type Account,
  type TransactionRequest,
  createWalletClient,
  createPublicClient,
  http,
} from "viem";
import { ViemProvider } from "./provider";

export class ViemSigner {
  readonly _isSigner: boolean;
  readonly provider?: ViemProvider;

  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private account: Account;

  constructor({ rpcUrl, account }: { rpcUrl: string; account: Account }) {
    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrl),
    });
    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    this.walletClient = walletClient;
    this.publicClient = publicClient;
    this.account = account;
    this._isSigner = true;
    this.provider = new ViemProvider(rpcUrl);
  }

  async getAddress(): Promise<string> {
    return getAddress(this.account.address);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return await this.walletClient.signMessage({
      account: this.account,
      // TODO: Check this.
      message: message as SignableMessage,
    });
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    return await this.walletClient.signTransaction({
      account: this.account,
      ...tx,
      chain: undefined,
    });
  }

  async sendTransaction(tx: TransactionRequest) {
    return await this.walletClient.sendTransaction({
      account: this.account,
      ...tx,
      chain: undefined,
    });
  }

  async getChainId(): Promise<number> {
    return this.publicClient.getChainId();
  }

  async getGasPrice() {
    return this.publicClient.getGasPrice();
  }

  async estimateGas(tx: TransactionRequest) {
    return this.publicClient.estimateGas({
      account: this.account,
      ...tx,
    });
  }

  async getTransactionCount(): Promise<bigint> {
    const numberCount = await this.publicClient.getTransactionCount({
      address: this.account.address,
    });
    return BigInt(numberCount);
  }
}
