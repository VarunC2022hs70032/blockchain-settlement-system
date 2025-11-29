import Database from 'better-sqlite3';
import path from 'path';
import { Block } from '../core/Block';
import { UTXO } from '../core/Blockchain';

/**
 * Database storage for blockchain persistence
 */
export class BlockchainStorage {
  private db: Database.Database;

  constructor(dbPath: string = 'blockchain.db') {
    // Create database in project root
    const fullPath = path.resolve(process.cwd(), dbPath);
    this.db = new Database(fullPath);
    
    // Enable foreign keys and WAL mode for better performance
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    
    this.initializeTables();
    console.log(`Blockchain database initialized at: ${fullPath}`);
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    // Blocks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blocks (
        height INTEGER PRIMARY KEY,
        hash TEXT UNIQUE NOT NULL,
        previous_hash TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        nonce INTEGER NOT NULL,
        difficulty INTEGER NOT NULL,
        merkle_root TEXT NOT NULL,
        transaction_count INTEGER NOT NULL,
        block_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transactions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        block_height INTEGER NOT NULL,
        block_hash TEXT NOT NULL,
        transaction_index INTEGER NOT NULL,
        from_address TEXT,
        to_address TEXT,
        amount REAL NOT NULL,
        fee REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        transaction_data TEXT NOT NULL,
        FOREIGN KEY (block_height) REFERENCES blocks(height),
        FOREIGN KEY (block_hash) REFERENCES blocks(hash)
      )
    `);

    // UTXOs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS utxos (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        output_index INTEGER NOT NULL,
        address TEXT NOT NULL,
        amount REAL NOT NULL,
        block_height INTEGER NOT NULL,
        is_spent BOOLEAN DEFAULT FALSE,
        spent_in_tx TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(transaction_id, output_index)
      )
    `);

    // Address balances table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS address_balances (
        address TEXT PRIMARY KEY,
        balance REAL NOT NULL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blockchain metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blockchain_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_blocks_height ON blocks(height);
      CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(hash);
      CREATE INDEX IF NOT EXISTS idx_transactions_block ON transactions(block_height);
      CREATE INDEX IF NOT EXISTS idx_transactions_address ON transactions(from_address, to_address);
      CREATE INDEX IF NOT EXISTS idx_utxos_address ON utxos(address);
      CREATE INDEX IF NOT EXISTS idx_utxos_spent ON utxos(is_spent);
    `);
  }

  /**
   * Save a block to the database
   */
  saveBlock(block: Block): boolean {
    const transaction = this.db.transaction(() => {
      // Insert block
      const insertBlock = this.db.prepare(`
        INSERT OR REPLACE INTO blocks 
        (height, hash, previous_hash, timestamp, nonce, difficulty, merkle_root, transaction_count, block_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertBlock.run(
        block.header.height,
        block.hash,
        block.header.previousHash,
        block.header.timestamp,
        block.header.nonce,
        block.header.difficulty,
        block.header.merkleRoot,
        block.transactions.length,
        block.toJSON()
      );

      // Insert transactions
      const insertTransaction = this.db.prepare(`
        INSERT OR REPLACE INTO transactions 
        (id, block_height, block_hash, transaction_index, from_address, to_address, amount, fee, timestamp, transaction_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      block.transactions.forEach((tx, index) => {
        const fromAddress = tx.inputs.length > 0 && tx.inputs[0].txId ? 'multiple' : 'coinbase';
        const toAddress = tx.outputs.length > 0 ? tx.outputs[0].address : '';
        const totalAmount = tx.outputs.reduce((sum, output) => sum + output.amount, 0);

        insertTransaction.run(
          tx.id,
          block.header.height,
          block.hash,
          index,
          fromAddress,
          toAddress,
          totalAmount,
          tx.fee,
          tx.timestamp,
          tx.toJSON()
        );
      });

      // Update UTXOs
      this.updateUTXOsForBlock(block);
    });

    try {
      transaction();
      console.log(`Block ${block.header.height} saved to database`);
      return true;
    } catch (error) {
      console.error('Failed to save block:', error);
      return false;
    }
  }

  /**
   * Update UTXOs for a block
   */
  private updateUTXOsForBlock(block: Block): void {
    const insertUTXO = this.db.prepare(`
      INSERT OR REPLACE INTO utxos (id, transaction_id, output_index, address, amount, block_height, is_spent)
      VALUES (?, ?, ?, ?, ?, ?, FALSE)
    `);

    const spendUTXO = this.db.prepare(`
      UPDATE utxos SET is_spent = TRUE, spent_in_tx = ? WHERE transaction_id = ? AND output_index = ?
    `);

    const updateBalance = this.db.prepare(`
      INSERT OR REPLACE INTO address_balances (address, balance, last_updated)
      VALUES (?, COALESCE((SELECT balance FROM address_balances WHERE address = ?), 0) + ?, CURRENT_TIMESTAMP)
    `);

    for (const transaction of block.transactions) {
      // Mark spent UTXOs
      for (const input of transaction.inputs) {
        if (input.txId && input.outputIndex >= 0) {
          spendUTXO.run(transaction.id, input.txId, input.outputIndex);
          
          // Get the spent UTXO to update balance
          const spentUTXO = this.db.prepare(`
            SELECT address, amount FROM utxos WHERE transaction_id = ? AND output_index = ?
          `).get(input.txId, input.outputIndex) as any;

          if (spentUTXO) {
            updateBalance.run(spentUTXO.address, spentUTXO.address, -spentUTXO.amount);
          }
        }
      }

      // Add new UTXOs
      transaction.outputs.forEach((output, index) => {
        const utxoId = `${transaction.id}:${index}`;
        insertUTXO.run(
          utxoId,
          transaction.id,
          index,
          output.address,
          output.amount,
          block.header.height
        );

        // Update address balance
        updateBalance.run(output.address, output.address, output.amount);
      });
    }
  }

  /**
   * Load all blocks from the database
   */
  loadAllBlocks(): Block[] {
    try {
      const rows = this.db.prepare(`
        SELECT block_data FROM blocks ORDER BY height ASC
      `).all() as any[];

      return rows.map(row => Block.fromJSON(row.block_data));
    } catch (error) {
      console.error('Failed to load blocks:', error);
      return [];
    }
  }

  /**
   * Get block by height
   */
  getBlockByHeight(height: number): Block | null {
    try {
      const row = this.db.prepare(`
        SELECT block_data FROM blocks WHERE height = ?
      `).get(height) as any;

      return row ? Block.fromJSON(row.block_data) : null;
    } catch (error) {
      console.error('Failed to get block by height:', error);
      return null;
    }
  }

  /**
   * Get block by hash
   */
  getBlockByHash(hash: string): Block | null {
    try {
      const row = this.db.prepare(`
        SELECT block_data FROM blocks WHERE hash = ?
      `).get(hash) as any;

      return row ? Block.fromJSON(row.block_data) : null;
    } catch (error) {
      console.error('Failed to get block by hash:', error);
      return null;
    }
  }

  /**
   * Get latest block height
   */
  getLatestBlockHeight(): number {
    try {
      const row = this.db.prepare(`
        SELECT MAX(height) as max_height FROM blocks
      `).get() as any;

      return row?.max_height || -1;
    } catch (error) {
      console.error('Failed to get latest block height:', error);
      return -1;
    }
  }

  /**
   * Get UTXOs for address
   */
  getUTXOsForAddress(address: string): UTXO[] {
    try {
      const rows = this.db.prepare(`
        SELECT transaction_id, output_index, address, amount, block_height
        FROM utxos 
        WHERE address = ? AND is_spent = FALSE
      `).all(address) as any[];

      return rows.map(row => ({
        txId: row.transaction_id,
        outputIndex: row.output_index,
        address: row.address,
        amount: row.amount,
        blockHeight: row.block_height
      }));
    } catch (error) {
      console.error('Failed to get UTXOs for address:', error);
      return [];
    }
  }

  /**
   * Get address balance
   */
  getAddressBalance(address: string): number {
    try {
      const row = this.db.prepare(`
        SELECT balance FROM address_balances WHERE address = ?
      `).get(address) as any;

      return row?.balance || 0;
    } catch (error) {
      console.error('Failed to get address balance:', error);
      return 0;
    }
  }

  /**
   * Get all address balances
   */
  getAllBalances(): Map<string, number> {
    try {
      const rows = this.db.prepare(`
        SELECT address, balance FROM address_balances WHERE balance > 0
      `).all() as any[];

      const balances = new Map<string, number>();
      rows.forEach(row => {
        balances.set(row.address, row.balance);
      });

      return balances;
    } catch (error) {
      console.error('Failed to get all balances:', error);
      return new Map();
    }
  }

  /**
   * Get blockchain statistics from database
   */
  getBlockchainStats(): any {
    try {
      const blockCount = this.db.prepare(`SELECT COUNT(*) as count FROM blocks`).get() as any;
      const txCount = this.db.prepare(`SELECT COUNT(*) as count FROM transactions`).get() as any;
      const totalSupply = this.db.prepare(`SELECT SUM(balance) as total FROM address_balances`).get() as any;
      const latestBlock = this.db.prepare(`SELECT difficulty, timestamp FROM blocks ORDER BY height DESC LIMIT 1`).get() as any;

      return {
        blockCount: blockCount.count,
        totalTransactions: txCount.count,
        totalSupply: totalSupply.total || 0,
        difficulty: latestBlock?.difficulty || 4,
        lastBlockTime: latestBlock?.timestamp || Date.now()
      };
    } catch (error) {
      console.error('Failed to get blockchain stats:', error);
      return {
        blockCount: 0,
        totalTransactions: 0,
        totalSupply: 0,
        difficulty: 4,
        lastBlockTime: Date.now()
      };
    }
  }

  /**
   * Store blockchain metadata
   */
  setMetadata(key: string, value: string): void {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO blockchain_metadata (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(key, value);
    } catch (error) {
      console.error('Failed to set metadata:', error);
    }
  }

  /**
   * Get blockchain metadata
   */
  getMetadata(key: string): string | null {
    try {
      const row = this.db.prepare(`
        SELECT value FROM blockchain_metadata WHERE key = ?
      `).get(key) as any;

      return row?.value || null;
    } catch (error) {
      console.error('Failed to get metadata:', error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Check database integrity
   */
  checkIntegrity(): boolean {
    try {
      const result = this.db.prepare('PRAGMA integrity_check').get() as any;
      return result.integrity_check === 'ok';
    } catch (error) {
      console.error('Database integrity check failed:', error);
      return false;
    }
  }

  /**
   * Get database size info
   */
  getDatabaseInfo(): any {
    try {
      const pageCount = this.db.prepare('PRAGMA page_count').get() as any;
      const pageSize = this.db.prepare('PRAGMA page_size').get() as any;
      const size = (pageCount.page_count * pageSize.page_size) / 1024 / 1024; // MB

      return {
        sizeInMB: Math.round(size * 100) / 100,
        pageCount: pageCount.page_count,
        pageSize: pageSize.page_size
      };
    } catch (error) {
      console.error('Failed to get database info:', error);
      return { sizeInMB: 0, pageCount: 0, pageSize: 0 };
    }
  }
}
