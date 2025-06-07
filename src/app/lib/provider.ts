/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PublicClient } from "viem";
import { createPublicClient, http, toHex, getAddress, isHex } from "viem";
import { mainnet } from "viem/chains";

export class ViemProvider {
  private client: PublicClient;

  constructor(rpcUrl: string) {
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl),
    });
  }

  async getNetwork() {
    const chain = await this.client.getChainId();
    return {
      name: "mainnet", // Customize as needed
      chainId: chain,
    };
  }

  async getBlockNumber(): Promise<number> {
    const blockNum = await this.client.getBlockNumber();
    return parseFloat(blockNum.toString());
  }

  async getGasPrice(): Promise<bigint> {
    return this.client.getGasPrice();
  }

  async getBalance(address: string, blockTag: any = "latest"): Promise<bigint> {
    return this.client.getBalance({ address: getAddress(address), blockTag });
  }

  async getTransactionCount(
    address: string,
    blockTag: any = "latest",
  ): Promise<number> {
    return this.client.getTransactionCount({
      address: getAddress(address),
      blockTag,
    });
  }

  async getCode(address: string, blockTag: any = "latest"): Promise<string> {
    const code = await this.client.getCode({
      address: getAddress(address),
      blockTag,
    });
    return code ?? "0x";
  }

  async getStorageAt(
    address: string,
    position: bigint | number,
    blockTag: any = "latest",
  ): Promise<string> {
    const storage = await this.client.getStorageAt({
      address: getAddress(address),
      slot: toHex(position),
      blockTag,
    });
    return storage ?? "0x";
  }

  async sendTransaction(signedTx: string): Promise<{ hash: string }> {
    if (!isHex(signedTx)) {
      throw new Error("Invalid Tx");
    }
    const hash = await this.client.sendRawTransaction({
      serializedTransaction: signedTx,
    });
    return { hash };
  }

  async call(tx: any, blockTag: any = "latest"): Promise<string> {
    const { data } = await this.client.call({ ...tx, blockTag });
    return data ?? "0x";
  }

  async estimateGas(tx: any): Promise<bigint> {
    return this.client.estimateGas(tx);
  }

  async getBlock(blockTag: any = "latest") {
    return this.client.getBlock({ blockTag });
  }

  async getBlockWithTransactions(blockTag: any = "latest") {
    return this.client.getBlock({ blockTag, includeTransactions: true });
  }

  async getTransaction(txHash: string) {
    if (!isHex(txHash)) {
      throw new Error("Invalid txHash");
    }
    return this.client.getTransaction({ hash: txHash });
  }

  async getTransactionReceipt(txHash: string) {
    if (!isHex(txHash)) {
      throw new Error("Invalid txHash");
    }
    return this.client.getTransactionReceipt({ hash: txHash });
  }

  async getLogs(filter: any) {
    return this.client.getLogs(filter);
  }

  // ENS not supported natively in Viem yet, stub these or implement manually
  async resolveName(_: string): Promise<string | null> {
    return null;
  }

  async lookupAddress(_: string): Promise<string | null> {
    return null;
  }

  // Event subscription APIs can be implemented later (e.g., via WebSocket or polling)
  on() {
    throw new Error("Not implemented");
  }
  once() {
    throw new Error("Not implemented");
  }
  emit() {
    return false;
  }
  listenerCount() {
    return 0;
  }
  listeners() {
    return [];
  }
  off() {
    return this;
  }
  removeAllListeners() {
    return this;
  }
  waitForTransaction() {
    throw new Error("Not implemented");
  }
}
