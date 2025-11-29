import { Block } from './Block';
import { Transaction } from './Transaction';
import { Hash } from '../crypto/Hash';
import { BlockchainStorage } from '../storage/BlockchainStorage';

/**
 * UTXO (Unspent Transaction Output) structure
 */
export interface UTXO {
  txId: string;
  outputIndex: number;
  address: string;
  amount: number;
  blockHeight: number;
}

/**
 * Blockchain statistics
 */
export interface BlockchainStats {
  blockCount: number;
  totalTransactions: number;
  totalSupply: number;
  difficulty: number;
  hashRate: number;
  averageBlockTime: number;
  memPoolSize: number;
}

/**
 * Core blockchain class managing the entire chain
 */
export class Blockchain {
  public chain: Block[];
  public difficulty: number;
  public miningReward: number;
  public memPool: Transaction[];
  private utxoSet: Map<string, UTXO>;
  private addressBalances: Map<string, number>;
  private blockTimes: number[];
  private readonly targetBlockTime: number = 600000; // 10 minutes in milliseconds
  private readonly difficultyAdjustmentInterval: number = 10; // Adjust every 10 blocks
  private storage: BlockchainStorage;

  constructor() {
    this.chain = [];
    this.difficulty = 4;
    this.miningReward = 50;
    this.memPool = [];
    this.utxoSet = new Map();
    this.addressBalances = new Map();
    this.blockTimes = [];
    this.storage = new BlockchainStorage();
    
    // Load existing blockchain or create genesis block
    this.initializeBlockchain();
  }

  /**
   * Initialize blockchain - load from database or create genesis
   */
  private initializeBlockchain(): void {
    const existingBlocks = this.storage.loadAllBlocks();
    
    if (existingBlocks.length > 0) {
      console.log(`Loading ${existingBlocks.length} blocks from database...`);
      this.chain = existingBlocks;
      
      // Rebuild in-memory structures
      this.rebuildMemoryStructures();
      
      console.log(`Blockchain loaded: ${this.chain.length} blocks, latest height: ${this.getLatestBlock().header.height}`);
    } else {
      console.log('No existing blockchain found, creating genesis block...');
      this.createGenesisBlock();
    }
  }

  /**
   * Rebuild in-memory structures from loaded blocks
   */
  private rebuildMemoryStructures(): void {
    this.utxoSet.clear();
    this.addressBalances.clear();
    this.blockTimes = [];
    
    // Rebuild UTXO set and balances from all blocks
    for (const block of this.chain) {
      this.updateUTXOSet(block);
      
      // Rebuild block times for difficulty calculation
      if (this.chain.length > 1) {
        const blockIndex = this.chain.indexOf(block);
        if (blockIndex > 0) {
          const previousBlock = this.chain[blockIndex - 1];
          const timeDiff = block.header.timestamp - previousBlock.header.timestamp;
          this.blockTimes.push(timeDiff);
        }
      }
    }
    
    // Keep only recent block times
    if (this.blockTimes.length > this.difficultyAdjustmentInterval) {
      this.blockTimes = this.blockTimes.slice(-this.difficultyAdjustmentInterval);
    }
    
    // Load blockchain metadata
    const savedDifficulty = this.storage.getMetadata('difficulty');
    if (savedDifficulty) {
      this.difficulty = parseInt(savedDifficulty);
    }
  }

  /**
   * Create the genesis block
   */
  private createGenesisBlock(): void {
    const genesisBlock = Block.createGenesisBlock();
    this.chain.push(genesisBlock);
    
    // Save genesis block to database
    this.storage.saveBlock(genesisBlock);
    
    this.updateUTXOSet(genesisBlock);
    this.blockTimes.push(this.targetBlockTime);
    
    // Save initial metadata
    this.storage.setMetadata('difficulty', this.difficulty.toString());
    this.storage.setMetadata('latest_height', '0');
  }

  /**
   * Get the latest block in the chain
   */
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Add a new block to the chain
   */
  addBlock(block: Block): boolean {
    const previousBlock = this.getLatestBlock();
    
    // Validate the block
    if (!block.isValid(previousBlock)) {
      console.log('Invalid block rejected');
      return false;
    }

    // Check if block height is correct
    if (block.header.height !== previousBlock.header.height + 1) {
      console.log('Invalid block height');
      return false;
    }

    // Add block to chain
    this.chain.push(block);
    
    // Save block to database
    if (!this.storage.saveBlock(block)) {
      console.log('Failed to save block to database');
      // Remove from chain if database save failed
      this.chain.pop();
      return false;
    }
    
    // Update UTXO set and balances
    this.updateUTXOSet(block);
    
    // Remove mined transactions from mempool
    this.removeTransactionsFromMemPool(block.transactions);
    
    // Update block time tracking
    this.updateBlockTimes(block);
    
    // Save metadata
    this.storage.setMetadata('difficulty', this.difficulty.toString());
    this.storage.setMetadata('latest_height', block.header.height.toString());
    
    console.log(`Block ${block.header.height} added to blockchain and saved to database`);
    return true;
  }

  /**
   * Mine a new block with pending transactions
   */
  mineBlock(minerAddress: string): Block | null {
    // Adjust difficulty if needed
    this.adjustDifficulty();

    // Select transactions from mempool
    const selectedTransactions = this.selectTransactionsForMining();
    
    // Create coinbase transaction
    const blockReward = Block.getBlockReward(this.chain.length);
    const totalFees = selectedTransactions.reduce((sum, tx) => sum + tx.fee, 0);
    const coinbaseTransaction = Transaction.createCoinbase(
      minerAddress,
      blockReward + totalFees,
      this.chain.length
    );

    // Create new block
    const transactions = [coinbaseTransaction, ...selectedTransactions];
    const previousBlock = this.getLatestBlock();
    const newBlock = new Block(
      transactions,
      previousBlock.hash,
      previousBlock.header.height + 1,
      this.difficulty
    );

    // Mine the block
    newBlock.mineBlock(this.difficulty);

    // Add block to chain
    if (this.addBlock(newBlock)) {
      return newBlock;
    }

    return null;
  }

  /**
   * Select transactions for mining based on fee priority
   */
  private selectTransactionsForMining(maxTransactions: number = 100): Transaction[] {
    // Sort by fee rate (fee per byte) descending
    const sortedTransactions = this.memPool
      .filter(tx => tx.isValid())
      .sort((a, b) => {
        const feeRateA = a.fee / a.getSize();
        const feeRateB = b.fee / b.getSize();
        return feeRateB - feeRateA;
      });

    return sortedTransactions.slice(0, maxTransactions);
  }

  /**
   * Add transaction to mempool
   */
  addTransaction(transaction: Transaction): boolean {
    // Basic validation
    if (!transaction.isValid()) {
      console.log('Invalid transaction');
      return false;
    }

    // Check if transaction already exists
    if (this.memPool.some(tx => tx.id === transaction.id)) {
      console.log('Transaction already in mempool');
      return false;
    }

    // Check if transaction is already in blockchain
    if (this.isTransactionInBlockchain(transaction.id)) {
      console.log('Transaction already in blockchain');
      return false;
    }

    // Verify UTXOs exist and are unspent
    for (const input of transaction.inputs) {
      if (!input.txId || input.outputIndex < 0) continue; // Skip coinbase inputs
      
      const utxoKey = `${input.txId}:${input.outputIndex}`;
      if (!this.utxoSet.has(utxoKey)) {
        console.log(`UTXO not found: ${utxoKey}`);
        return false;
      }
    }

    this.memPool.push(transaction);
    console.log(`Transaction ${transaction.id} added to mempool`);
    return true;
  }

  /**
   * Check if transaction exists in blockchain
   */
  private isTransactionInBlockchain(txId: string): boolean {
    for (const block of this.chain) {
      if (block.transactions.some(tx => tx.id === txId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Remove transactions from mempool
   */
  private removeTransactionsFromMemPool(transactions: Transaction[]): void {
    const txIds = new Set(transactions.map(tx => tx.id));
    this.memPool = this.memPool.filter(tx => !txIds.has(tx.id));
  }

  /**
   * Update UTXO set when a block is added
   */
  private updateUTXOSet(block: Block): void {
    // Process each transaction in the block
    for (const transaction of block.transactions) {
      // Remove spent UTXOs
      for (const input of transaction.inputs) {
        if (input.txId && input.outputIndex >= 0) { // Skip coinbase inputs
          const utxoKey = `${input.txId}:${input.outputIndex}`;
          const utxo = this.utxoSet.get(utxoKey);
          
          if (utxo) {
            this.utxoSet.delete(utxoKey);
            // Update address balance
            const currentBalance = this.addressBalances.get(utxo.address) || 0;
            this.addressBalances.set(utxo.address, currentBalance - utxo.amount);
          }
        }
      }

      // Add new UTXOs
      transaction.outputs.forEach((output, index) => {
        const utxo: UTXO = {
          txId: transaction.id,
          outputIndex: index,
          address: output.address,
          amount: output.amount,
          blockHeight: block.header.height
        };

        const utxoKey = `${transaction.id}:${index}`;
        this.utxoSet.set(utxoKey, utxo);

        // Update address balance
        const currentBalance = this.addressBalances.get(output.address) || 0;
        this.addressBalances.set(output.address, currentBalance + output.amount);
      });
    }
  }

  /**
   * Get UTXOs for a specific address
   */
  getUTXOsForAddress(address: string): UTXO[] {
    const utxos: UTXO[] = [];
    
    for (const utxo of this.utxoSet.values()) {
      if (utxo.address === address) {
        utxos.push(utxo);
      }
    }
    
    return utxos;
  }

  /**
   * Get balance for an address
   */
  getAddressBalance(address: string): number {
    return this.addressBalances.get(address) || 0;
  }

  /**
   * Get transaction history for an address
   */
  getTransactionHistory(address: string): Transaction[] {
    const transactions: Transaction[] = [];
    
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        // Check if address is in inputs or outputs
        const isInvolved = transaction.inputs.some(input => {
          const utxoKey = `${input.txId}:${input.outputIndex}`;
          const utxo = this.utxoSet.get(utxoKey);
          return utxo?.address === address;
        }) || transaction.outputs.some(output => output.address === address);
        
        if (isInvolved) {
          transactions.push(transaction);
        }
      }
    }
    
    return transactions;
  }

  /**
   * Update block times for difficulty adjustment
   */
  private updateBlockTimes(block: Block): void {
    if (this.chain.length > 1) {
      const previousBlock = this.chain[this.chain.length - 2];
      const timeDiff = block.header.timestamp - previousBlock.header.timestamp;
      this.blockTimes.push(timeDiff);
      
      // Keep only recent block times
      if (this.blockTimes.length > this.difficultyAdjustmentInterval) {
        this.blockTimes.shift();
      }
    }
  }

  /**
   * Adjust mining difficulty
   */
  private adjustDifficulty(): void {
    if (this.chain.length % this.difficultyAdjustmentInterval === 0 && this.chain.length > 0) {
      const averageTime = this.blockTimes.reduce((sum, time) => sum + time, 0) / this.blockTimes.length;
      
      this.difficulty = Hash.adjustDifficulty(
        this.difficulty,
        this.targetBlockTime,
        averageTime
      );
      
      console.log(`Difficulty adjusted to: ${this.difficulty}`);
    }
  }

  /**
   * Validate the entire blockchain
   */
  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      if (!currentBlock.isValid(previousBlock)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get blockchain statistics
   */
  getStats(): BlockchainStats {
    const totalTransactions = this.chain.reduce((sum, block) => sum + block.transactions.length, 0);
    const totalSupply = Array.from(this.addressBalances.values()).reduce((sum, balance) => sum + balance, 0);
    const averageBlockTime = this.blockTimes.reduce((sum, time) => sum + time, 0) / this.blockTimes.length;
    
    // Simple hash rate estimation (hashes per second)
    const hashRate = this.difficulty > 0 ? Math.pow(2, this.difficulty) / (averageBlockTime / 1000) : 0;

    return {
      blockCount: this.chain.length,
      totalTransactions,
      totalSupply,
      difficulty: this.difficulty,
      hashRate,
      averageBlockTime,
      memPoolSize: this.memPool.length
    };
  }

  /**
   * Get block by hash
   */
  getBlockByHash(hash: string): Block | null {
    return this.chain.find(block => block.hash === hash) || null;
  }

  /**
   * Get block by height
   */
  getBlockByHeight(height: number): Block | null {
    return this.chain.find(block => block.header.height === height) || null;
  }

  /**
   * Get transaction by ID
   */
  getTransactionById(txId: string): Transaction | null {
    for (const block of this.chain) {
      const transaction = block.transactions.find(tx => tx.id === txId);
      if (transaction) {
        return transaction;
      }
    }
    
    // Check mempool
    return this.memPool.find(tx => tx.id === txId) || null;
  }

  /**
   * Export blockchain data
   */
  exportChain(): string {
    return JSON.stringify({
      chain: this.chain.map(block => JSON.parse(block.toJSON())),
      difficulty: this.difficulty,
      miningReward: this.miningReward,
      stats: this.getStats()
    }, null, 2);
  }

  /**
   * Import blockchain data
   */
  importChain(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      const newChain: Block[] = [];
      
      for (const blockData of imported.chain) {
        const block = Block.fromJSON(JSON.stringify(blockData));
        newChain.push(block);
      }
      
      // Validate imported chain
      const tempBlockchain = new Blockchain();
      tempBlockchain.chain = newChain;
      
      if (!tempBlockchain.isChainValid()) {
        return false;
      }
      
      // Replace current chain if valid
      this.chain = newChain;
      this.difficulty = imported.difficulty;
      this.miningReward = imported.miningReward;
      
      // Rebuild UTXO set
      this.utxoSet.clear();
      this.addressBalances.clear();
      
      for (const block of this.chain) {
        this.updateUTXOSet(block);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import blockchain:', error);
      return false;
    }
  }

  /**
   * Close blockchain storage connection
   */
  close(): void {
    if (this.storage) {
      this.storage.close();
    }
  }

  /**
   * Get database information
   */
  getDatabaseInfo(): any {
    return this.storage.getDatabaseInfo();
  }
}
