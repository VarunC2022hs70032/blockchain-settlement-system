import { Signature } from '../crypto/Signature';
import { Transaction, TransactionInput, TransactionOutput } from '../core/Transaction';
import { Blockchain, UTXO } from '../core/Blockchain';

/**
 * Wallet account information
 */
export interface WalletAccount {
  address: string;
  publicKey: string;
  privateKey: string;
  balance: number;
  label?: string;
}

/**
 * Transaction history entry
 */
export interface TransactionHistory {
  transaction: Transaction;
  blockHeight: number;
  confirmations: number;
  type: 'sent' | 'received' | 'mined';
  amount: number;
  fee?: number;
}

/**
 * Digital wallet for managing cryptocurrency accounts
 */
export class Wallet {
  private accounts: Map<string, WalletAccount>;
  private blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.accounts = new Map();
    this.blockchain = blockchain;
  }

  /**
   * Generate a new wallet account
   */
  generateAccount(label?: string): WalletAccount {
    const { privateKey, publicKey } = Signature.generateKeyPair();
    const address = Signature.publicKeyToAddress(publicKey);
    
    const account: WalletAccount = {
      address,
      publicKey,
      privateKey,
      balance: 0,
      label
    };

    this.accounts.set(address, account);
    this.updateAccountBalance(address);
    
    console.log(`New account created: ${address}`);
    return account;
  }

  /**
   * Import account from private key
   */
  importAccount(privateKey: string, label?: string): WalletAccount | null {
    try {
      const publicKey = Signature.getPublicKey(privateKey);
      const address = Signature.publicKeyToAddress(publicKey);
      
      if (this.accounts.has(address)) {
        console.log('Account already exists in wallet');
        return this.accounts.get(address)!;
      }

      const account: WalletAccount = {
        address,
        publicKey,
        privateKey,
        balance: 0,
        label
      };

      this.accounts.set(address, account);
      this.updateAccountBalance(address);
      
      console.log(`Account imported: ${address}`);
      return account;
    } catch (error) {
      console.error('Failed to import account:', error);
      return null;
    }
  }

  /**
   * Get account by address
   */
  getAccount(address: string): WalletAccount | null {
    return this.accounts.get(address) || null;
  }

  /**
   * Get all accounts in the wallet
   */
  getAllAccounts(): WalletAccount[] {
    this.updateAllAccountBalances();
    return Array.from(this.accounts.values());
  }

  /**
   * Update account balance from blockchain
   */
  private updateAccountBalance(address: string): void {
    const account = this.accounts.get(address);
    if (account) {
      account.balance = this.blockchain.getAddressBalance(address);
    }
  }

  /**
   * Update all account balances
   */
  private updateAllAccountBalances(): void {
    for (const address of this.accounts.keys()) {
      this.updateAccountBalance(address);
    }
  }

  /**
   * Get UTXOs for an account
   */
  getAccountUTXOs(address: string): UTXO[] {
    if (!this.accounts.has(address)) {
      return [];
    }
    return this.blockchain.getUTXOsForAddress(address);
  }

  /**
   * Create and sign a transaction
   */
  createTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    fee: number = 0.001
  ): Transaction | null {
    const account = this.accounts.get(fromAddress);
    if (!account) {
      console.error('Account not found in wallet');
      return null;
    }

    // Validate recipient address
    if (!Signature.isValidAddress(toAddress)) {
      console.error('Invalid recipient address');
      return null;
    }

    // Get available UTXOs
    const utxos = this.getAccountUTXOs(fromAddress);
    if (utxos.length === 0) {
      console.error('No UTXOs available for this account');
      return null;
    }

    // Select UTXOs to cover amount + fee
    const requiredAmount = amount + fee;
    let totalInput = 0;
    const selectedUTXOs: UTXO[] = [];

    // Sort UTXOs by amount (largest first for efficiency)
    const sortedUTXOs = utxos.sort((a, b) => b.amount - a.amount);

    for (const utxo of sortedUTXOs) {
      selectedUTXOs.push(utxo);
      totalInput += utxo.amount;
      
      if (totalInput >= requiredAmount) {
        break;
      }
    }

    if (totalInput < requiredAmount) {
      console.error(`Insufficient funds. Required: ${requiredAmount}, Available: ${totalInput}`);
      return null;
    }

    // Create transaction inputs
    const inputs: TransactionInput[] = selectedUTXOs.map(utxo => ({
      txId: utxo.txId,
      outputIndex: utxo.outputIndex,
      signature: '',
      publicKey: account.publicKey,
      amount: utxo.amount
    }));

    // Create transaction outputs
    const outputs: TransactionOutput[] = [
      {
        address: toAddress,
        amount: amount
      }
    ];

    // Add change output if necessary
    const change = totalInput - amount - fee;
    if (change > 0) {
      outputs.push({
        address: fromAddress,
        amount: change
      });
    }

    // Create transaction
    const transaction = new Transaction(inputs, outputs);

    // Sign all inputs
    try {
      for (let i = 0; i < inputs.length; i++) {
        transaction.signTransaction(account.privateKey, i);
      }
      
      transaction.calculateFee();
      transaction.id = transaction.calculateHash();
      
      console.log(`Transaction created: ${transaction.id}`);
      return transaction;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      return null;
    }
  }

  /**
   * Send a transaction to the network
   */
  sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    fee: number = 0.001
  ): boolean {
    const transaction = this.createTransaction(fromAddress, toAddress, amount, fee);
    if (!transaction) {
      return false;
    }

    // Add transaction to blockchain mempool
    const success = this.blockchain.addTransaction(transaction);
    if (success) {
      console.log(`Transaction ${transaction.id} sent to network`);
    }
    
    return success;
  }

  /**
   * Get transaction history for an account
   */
  getTransactionHistory(address: string): TransactionHistory[] {
    if (!this.accounts.has(address)) {
      return [];
    }

    const transactions = this.blockchain.getTransactionHistory(address);
    const history: TransactionHistory[] = [];
    const currentHeight = this.blockchain.chain.length - 1;

    for (const transaction of transactions) {
      // Find the block containing this transaction
      let blockHeight = -1;
      for (let i = 0; i < this.blockchain.chain.length; i++) {
        const block = this.blockchain.chain[i];
        if (block.transactions.some(tx => tx.id === transaction.id)) {
          blockHeight = block.header.height;
          break;
        }
      }

      if (blockHeight === -1) {
        continue; // Transaction not in blockchain yet
      }

      const confirmations = Math.max(0, currentHeight - blockHeight + 1);
      
      // Determine transaction type and amount
      let type: 'sent' | 'received' | 'mined' = 'received';
      let amount = 0;
      let fee = 0;

      if (transaction.isCoinbase()) {
        type = 'mined';
        amount = transaction.outputs.reduce((sum, output) => 
          output.address === address ? sum + output.amount : sum, 0);
      } else {
        const isFromThisAddress = transaction.inputs.some(input => {
          const utxoKey = `${input.txId}:${input.outputIndex}`;
          const utxo = this.blockchain.getUTXOsForAddress(address).find(u => 
            `${u.txId}:${u.outputIndex}` === utxoKey);
          return utxo !== undefined;
        });

        const receivedAmount = transaction.outputs.reduce((sum, output) => 
          output.address === address ? sum + output.amount : sum, 0);

        const sentAmount = isFromThisAddress ? 
          transaction.inputs.reduce((sum, input) => sum + input.amount, 0) : 0;

        if (isFromThisAddress && receivedAmount > 0) {
          // This is a change transaction
          type = 'sent';
          amount = sentAmount - receivedAmount;
          fee = transaction.fee;
        } else if (isFromThisAddress) {
          type = 'sent';
          amount = sentAmount;
          fee = transaction.fee;
        } else {
          type = 'received';
          amount = receivedAmount;
        }
      }

      history.push({
        transaction,
        blockHeight,
        confirmations,
        type,
        amount,
        fee: type === 'sent' ? fee : undefined
      });
    }

    return history.sort((a, b) => b.blockHeight - a.blockHeight);
  }

  /**
   * Export wallet data (excluding private keys for security)
   */
  exportWalletInfo(): {
    accounts: Array<Omit<WalletAccount, 'privateKey'>>;
    totalBalance: number;
  } {
    this.updateAllAccountBalances();
    
    const accounts = Array.from(this.accounts.values()).map(account => ({
      address: account.address,
      publicKey: account.publicKey,
      balance: account.balance,
      label: account.label
    }));

    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

    return { accounts, totalBalance };
  }

  /**
   * Export private keys (use with caution!)
   */
  exportPrivateKeys(): { [address: string]: string } {
    const keys: { [address: string]: string } = {};
    
    for (const [address, account] of this.accounts.entries()) {
      keys[address] = account.privateKey;
    }
    
    return keys;
  }

  /**
   * Remove account from wallet
   */
  removeAccount(address: string): boolean {
    if (!this.accounts.has(address)) {
      return false;
    }

    this.accounts.delete(address);
    console.log(`Account ${address} removed from wallet`);
    return true;
  }

  /**
   * Get wallet statistics
   */
  getWalletStats(): {
    accountCount: number;
    totalBalance: number;
    totalTransactions: number;
    activeAccounts: number;
  } {
    this.updateAllAccountBalances();
    
    const accounts = Array.from(this.accounts.values());
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const activeAccounts = accounts.filter(account => account.balance > 0).length;
    
    let totalTransactions = 0;
    for (const account of accounts) {
      totalTransactions += this.getTransactionHistory(account.address).length;
    }

    return {
      accountCount: accounts.length,
      totalBalance,
      totalTransactions,
      activeAccounts
    };
  }
}
