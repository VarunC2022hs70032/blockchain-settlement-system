import { Transaction } from './Transaction';
import { Hash } from '../crypto/Hash';

/**
 * Represents a block header with metadata
 */
export interface BlockHeader {
  version: number;
  previousHash: string;
  merkleRoot: string;
  timestamp: number;
  difficulty: number;
  nonce: number;
  height: number;
}

/**
 * Core block class for the blockchain
 */
export class Block {
  public header: BlockHeader;
  public transactions: Transaction[];
  public hash: string;
  public size: number;

  constructor(
    transactions: Transaction[],
    previousHash: string,
    height: number = 0,
    difficulty: number = 4
  ) {
    this.transactions = transactions;
    
    this.header = {
      version: 1,
      previousHash,
      merkleRoot: this.calculateMerkleRoot(),
      timestamp: Date.now(),
      difficulty,
      nonce: 0,
      height
    };

    this.hash = '';
    this.size = 0;
    this.updateHash();
    this.updateSize();
  }

  /**
   * Calculate the Merkle root of all transactions
   */
  calculateMerkleRoot(): string {
    if (this.transactions.length === 0) {
      return Hash.sha256('');
    }

    const txHashes = this.transactions.map(tx => tx.id);
    return Hash.calculateMerkleRoot(txHashes);
  }

  /**
   * Calculate the hash of this block
   */
  calculateHash(): string {
    const blockData = {
      version: this.header.version,
      previousHash: this.header.previousHash,
      merkleRoot: this.header.merkleRoot,
      timestamp: this.header.timestamp,
      difficulty: this.header.difficulty,
      nonce: this.header.nonce,
      height: this.header.height
    };

    return Hash.sha256(JSON.stringify(blockData));
  }

  /**
   * Update the block hash
   */
  updateHash(): void {
    this.header.merkleRoot = this.calculateMerkleRoot();
    this.hash = this.calculateHash();
  }

  /**
   * Update the block size
   */
  updateSize(): void {
    this.size = Buffer.byteLength(this.toJSON(), 'utf8');
  }

  /**
   * Mine the block using Proof of Work
   */
  mineBlock(difficulty?: number): void {
    const targetDifficulty = difficulty || this.header.difficulty;
    const target = '0'.repeat(targetDifficulty);
    
    console.log(`Mining block ${this.header.height} with difficulty ${targetDifficulty}...`);
    const startTime = Date.now();
    
    this.header.nonce = 0;
    this.updateHash();
    
    while (!this.hash.startsWith(target)) {
      this.header.nonce++;
      this.updateHash();
      
      // Log progress every 100,000 attempts
      if (this.header.nonce % 100000 === 0) {
        console.log(`Nonce: ${this.header.nonce}, Hash: ${this.hash}`);
      }
    }
    
    const endTime = Date.now();
    const miningTime = (endTime - startTime) / 1000;
    
    console.log(`Block mined! Hash: ${this.hash}`);
    console.log(`Nonce: ${this.header.nonce}, Time: ${miningTime}s`);
    
    this.updateSize();
  }

  /**
   * Validate the block
   */
  isValid(previousBlock?: Block): boolean {
    // Check if the block hash is valid
    if (this.hash !== this.calculateHash()) {
      console.log('Invalid block hash');
      return false;
    }

    // Check if hash meets difficulty requirement
    if (!Hash.meetsDifficulty(this.hash, this.header.difficulty)) {
      console.log('Hash does not meet difficulty requirement');
      return false;
    }

    // Check previous hash linkage
    if (previousBlock && this.header.previousHash !== previousBlock.hash) {
      console.log('Previous hash mismatch');
      return false;
    }

    // Check if block height is correct
    if (previousBlock && this.header.height !== previousBlock.header.height + 1) {
      console.log('Invalid block height');
      return false;
    }

    // Validate merkle root
    if (this.header.merkleRoot !== this.calculateMerkleRoot()) {
      console.log('Invalid Merkle root');
      return false;
    }

    // Validate all transactions
    for (const transaction of this.transactions) {
      if (!transaction.isValid()) {
        console.log(`Invalid transaction: ${transaction.id}`);
        return false;
      }
    }

    // Check for duplicate transactions
    const txIds = this.transactions.map(tx => tx.id);
    if (new Set(txIds).size !== txIds.length) {
      console.log('Duplicate transactions found');
      return false;
    }

    // Validate coinbase transaction (should be first and only one)
    const coinbaseTransactions = this.transactions.filter(tx => tx.isCoinbase());
    if (coinbaseTransactions.length > 1) {
      console.log('Multiple coinbase transactions');
      return false;
    }

    if (coinbaseTransactions.length === 1 && this.transactions[0] !== coinbaseTransactions[0]) {
      console.log('Coinbase transaction must be first');
      return false;
    }

    return true;
  }

  /**
   * Add a transaction to the block
   */
  addTransaction(transaction: Transaction): boolean {
    if (!transaction.isValid()) {
      return false;
    }

    // Don't allow adding coinbase transactions manually
    if (transaction.isCoinbase()) {
      return false;
    }

    this.transactions.push(transaction);
    this.updateHash();
    this.updateSize();
    
    return true;
  }

  /**
   * Get block reward based on height (halving mechanism)
   */
  static getBlockReward(height: number): number {
    const initialReward = 50;
    const halvingInterval = 210000;
    const halvings = Math.floor(height / halvingInterval);
    
    return initialReward / Math.pow(2, halvings);
  }

  /**
   * Create genesis block
   */
  static createGenesisBlock(): Block {
    const genesisTransaction = Transaction.createCoinbase(
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Genesis address
      50,
      0
    );

    const block = new Block([genesisTransaction], '0'.repeat(64), 0, 4);
    block.header.timestamp = 1231006505; // Bitcoin genesis timestamp
    block.mineBlock();
    
    return block;
  }

  /**
   * Calculate total fees in the block
   */
  getTotalFees(): number {
    return this.transactions
      .filter(tx => !tx.isCoinbase())
      .reduce((total, tx) => total + tx.fee, 0);
  }

  /**
   * Get block statistics
   */
  getStats(): {
    transactionCount: number;
    totalFees: number;
    totalValue: number;
    averageFee: number;
    blockReward: number;
  } {
    const transactionCount = this.transactions.length;
    const totalFees = this.getTotalFees();
    const blockReward = Block.getBlockReward(this.header.height);
    
    const totalValue = this.transactions.reduce((total, tx) => {
      return total + tx.outputs.reduce((sum, output) => sum + output.amount, 0);
    }, 0);

    const averageFee = transactionCount > 1 ? totalFees / (transactionCount - 1) : 0;

    return {
      transactionCount,
      totalFees,
      totalValue,
      averageFee,
      blockReward
    };
  }

  /**
   * Serialize block to JSON
   */
  toJSON(): string {
    return JSON.stringify({
      header: this.header,
      transactions: this.transactions.map(tx => JSON.parse(tx.toJSON())),
      hash: this.hash,
      size: this.size
    }, null, 2);
  }

  /**
   * Deserialize block from JSON
   */
  static fromJSON(json: string): Block {
    const data = JSON.parse(json);
    
    const transactions = data.transactions.map((txData: any) => 
      Transaction.fromJSON(JSON.stringify(txData))
    );
    
    const block = new Block(
      transactions,
      data.header.previousHash,
      data.header.height,
      data.header.difficulty
    );
    
    block.header = data.header;
    block.hash = data.hash;
    block.size = data.size;
    
    return block;
  }

  /**
   * Clone the block
   */
  clone(): Block {
    return Block.fromJSON(this.toJSON());
  }

  /**
   * Get compact block representation (header + transaction count)
   */
  getCompactBlock(): {
    header: BlockHeader;
    hash: string;
    transactionCount: number;
    size: number;
  } {
    return {
      header: this.header,
      hash: this.hash,
      transactionCount: this.transactions.length,
      size: this.size
    };
  }
}
