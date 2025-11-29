import { Hash } from '../crypto/Hash';
import { Signature } from '../crypto/Signature';

/**
 * Represents a transaction input (reference to previous output)
 */
export interface TransactionInput {
  txId: string;           // Transaction ID of the referenced transaction
  outputIndex: number;    // Index of the output in the referenced transaction
  signature: string;      // Digital signature proving ownership
  publicKey: string;      // Public key of the sender
  amount: number;         // Amount being spent
  scriptSig?: string;     // Script signature for advanced features
}

/**
 * Represents a transaction output (destination for funds)
 */
export interface TransactionOutput {
  address: string;        // Recipient's address
  amount: number;         // Amount being sent
  scriptPubKey?: string;  // Script public key for advanced features
}

/**
 * Core transaction class for the blockchain
 */
export class Transaction {
  public id: string;
  public timestamp: number;
  public inputs: TransactionInput[];
  public outputs: TransactionOutput[];
  public fee: number;
  public version: number;
  public lockTime: number;
  public data?: string;    // Optional data payload

  constructor(
    inputs: TransactionInput[] = [],
    outputs: TransactionOutput[] = [],
    data?: string
  ) {
    this.inputs = inputs;
    this.outputs = outputs;
    this.timestamp = Date.now();
    this.fee = 0;
    this.version = 1;
    this.lockTime = 0;
    this.data = data;
    this.id = this.calculateHash();
  }

  /**
   * Calculate the hash of this transaction
   */
  calculateHash(): string {
    const txData = {
      timestamp: this.timestamp,
      inputs: this.inputs.map(input => ({
        txId: input.txId,
        outputIndex: input.outputIndex,
        amount: input.amount,
        publicKey: input.publicKey
      })),
      outputs: this.outputs,
      version: this.version,
      lockTime: this.lockTime,
      data: this.data || ''
    };

    return Hash.sha256(JSON.stringify(txData));
  }

  /**
   * Sign a transaction with the given private key
   */
  signTransaction(privateKey: string, inputIndex: number): void {
    if (inputIndex >= this.inputs.length) {
      throw new Error('Input index out of bounds');
    }

    const input = this.inputs[inputIndex];
    const publicKey = Signature.getPublicKey(privateKey);
    
    if (input.publicKey !== publicKey) {
      throw new Error('Private key does not match input public key');
    }

    // Create signature data (simplified)
    const signatureData = {
      txId: input.txId,
      outputIndex: input.outputIndex,
      amount: input.amount,
      timestamp: this.timestamp
    };

    input.signature = Signature.sign(JSON.stringify(signatureData), privateKey);
  }

  /**
   * Verify all signatures in the transaction
   */
  verifySignatures(): boolean {
    for (let i = 0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      
      if (!input.signature || !input.publicKey) {
        return false;
      }

      const signatureData = {
        txId: input.txId,
        outputIndex: input.outputIndex,
        amount: input.amount,
        timestamp: this.timestamp
      };

      if (!Signature.verify(JSON.stringify(signatureData), input.signature, input.publicKey)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate transaction fee
   */
  calculateFee(): number {
    const inputTotal = this.inputs.reduce((sum, input) => sum + input.amount, 0);
    const outputTotal = this.outputs.reduce((sum, output) => sum + output.amount, 0);
    this.fee = inputTotal - outputTotal;
    return this.fee;
  }

  /**
   * Validate the transaction
   */
  isValid(): boolean {
    // Basic validation
    if (this.inputs.length === 0 && this.outputs.length === 0) {
      return false;
    }

    // Special validation for coinbase transactions
    if (this.isCoinbase()) {
      // Coinbase transactions don't need signature validation
      // Just check that outputs have positive amounts
      for (const output of this.outputs) {
        if (output.amount <= 0) {
          return false;
        }
      }
      return true;
    }

    // Verify signatures for regular transactions
    if (!this.verifySignatures()) {
      return false;
    }

    // Check amounts are positive
    for (const output of this.outputs) {
      if (output.amount <= 0) {
        return false;
      }
    }

    // Calculate and validate fee
    this.calculateFee();
    if (this.fee < 0) {
      return false; // Cannot spend more than inputs
    }

    return true;
  }

  /**
   * Check if this is a coinbase transaction (mining reward)
   */
  isCoinbase(): boolean {
    return this.inputs.length === 1 && 
           this.inputs[0].txId === '0'.repeat(64) && 
           this.inputs[0].outputIndex === -1;
  }

  /**
   * Create a coinbase transaction for mining rewards
   */
  static createCoinbase(minerAddress: string, reward: number, blockHeight: number): Transaction {
    const coinbaseInput: TransactionInput = {
      txId: '0'.repeat(64),
      outputIndex: -1,
      signature: '',
      publicKey: '',
      amount: reward
    };

    const coinbaseOutput: TransactionOutput = {
      address: minerAddress,
      amount: reward
    };

    const tx = new Transaction([coinbaseInput], [coinbaseOutput]);
    tx.data = `Coinbase for block ${blockHeight}`;
    tx.id = tx.calculateHash();
    
    return tx;
  }

  /**
   * Create a regular transaction between addresses
   */
  static createTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    utxos: TransactionInput[],
    privateKey: string
  ): Transaction {
    let totalInput = 0;
    const selectedInputs: TransactionInput[] = [];

    // Select UTXOs to cover the amount + fee
    const estimatedFee = 0.001; // Simple fee calculation
    const requiredAmount = amount + estimatedFee;

    for (const utxo of utxos) {
      selectedInputs.push(utxo);
      totalInput += utxo.amount;
      
      if (totalInput >= requiredAmount) {
        break;
      }
    }

    if (totalInput < requiredAmount) {
      throw new Error('Insufficient funds');
    }

    const outputs: TransactionOutput[] = [
      {
        address: toAddress,
        amount: amount
      }
    ];

    // Add change output if necessary
    const change = totalInput - amount - estimatedFee;
    if (change > 0) {
      outputs.push({
        address: fromAddress,
        amount: change
      });
    }

    const transaction = new Transaction(selectedInputs, outputs);

    // Sign all inputs
    for (let i = 0; i < selectedInputs.length; i++) {
      transaction.signTransaction(privateKey, i);
    }

    transaction.calculateFee();
    transaction.id = transaction.calculateHash();

    return transaction;
  }

  /**
   * Serialize transaction to JSON
   */
  toJSON(): string {
    return JSON.stringify({
      id: this.id,
      timestamp: this.timestamp,
      inputs: this.inputs,
      outputs: this.outputs,
      fee: this.fee,
      version: this.version,
      lockTime: this.lockTime,
      data: this.data
    });
  }

  /**
   * Deserialize transaction from JSON
   */
  static fromJSON(json: string): Transaction {
    const data = JSON.parse(json);
    const tx = new Transaction(data.inputs, data.outputs, data.data);
    
    tx.id = data.id;
    tx.timestamp = data.timestamp;
    tx.fee = data.fee;
    tx.version = data.version;
    tx.lockTime = data.lockTime;
    
    return tx;
  }

  /**
   * Get transaction size in bytes (for fee calculation)
   */
  getSize(): number {
    return Buffer.byteLength(this.toJSON(), 'utf8');
  }

  /**
   * Clone the transaction
   */
  clone(): Transaction {
    return Transaction.fromJSON(this.toJSON());
  }
}
