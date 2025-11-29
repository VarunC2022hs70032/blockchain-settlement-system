import { EventEmitter } from 'events';
import { Block } from '../core/Block';
import { Transaction } from '../core/Transaction';

/**
 * Event types for real-time blockchain updates
 */
export enum BlockchainEventType {
  BLOCK_MINED = 'blockMined',
  TRANSACTION_ADDED = 'transactionAdded',
  MINING_STARTED = 'miningStarted',
  MINING_PROGRESS = 'miningProgress',
  MEMPOOL_UPDATED = 'mempoolUpdated',
  BALANCE_UPDATED = 'balanceUpdated',
  CHAIN_VALIDATED = 'chainValidated'
}

/**
 * Event data structures
 */
export interface BlockMinedEvent {
  block: {
    height: number;
    hash: string;
    timestamp: number;
    transactions: number;
    difficulty: number;
    nonce: number;
    previousHash: string;
  };
  miningTime: number;
  hashRate: number;
}

export interface TransactionAddedEvent {
  transaction: {
    id: string;
    from: string[];
    to: string[];
    amount: number;
    fee: number;
    timestamp: number;
  };
  memPoolSize: number;
}

export interface MiningProgressEvent {
  currentNonce: number;
  difficulty: number;
  hashesPerSecond: number;
  estimatedTimeRemaining: number;
}

export interface BalanceUpdatedEvent {
  address: string;
  oldBalance: number;
  newBalance: number;
  change: number;
}

export interface MempoolUpdatedEvent {
  size: number;
  totalFees: number;
  highestFee: number;
  transactions: Array<{
    id: string;
    fee: number;
    priority: number;
  }>;
}

/**
 * Centralized event emitter for blockchain events
 */
export class BlockchainEvents extends EventEmitter {
  private static instance: BlockchainEvents;

  public static getInstance(): BlockchainEvents {
    if (!BlockchainEvents.instance) {
      BlockchainEvents.instance = new BlockchainEvents();
    }
    return BlockchainEvents.instance;
  }

  /**
   * Emit block mined event
   */
  public emitBlockMined(block: Block, miningTime: number, hashRate: number): void {
    const event: BlockMinedEvent = {
      block: {
        height: block.header.height,
        hash: block.hash,
        timestamp: block.header.timestamp,
        transactions: block.transactions.length,
        difficulty: block.header.difficulty,
        nonce: block.header.nonce,
        previousHash: block.header.previousHash
      },
      miningTime,
      hashRate
    };

    this.emit(BlockchainEventType.BLOCK_MINED, event);
  }

  /**
   * Emit transaction added event
   */
  public emitTransactionAdded(transaction: Transaction, memPoolSize: number): void {
    const event: TransactionAddedEvent = {
      transaction: {
        id: transaction.id,
        from: transaction.inputs.map(input => input.txId ? `${input.txId}:${input.outputIndex}` : 'coinbase'),
        to: transaction.outputs.map(output => output.address),
        amount: transaction.outputs.reduce((sum, output) => sum + output.amount, 0),
        fee: transaction.fee,
        timestamp: transaction.timestamp
      },
      memPoolSize
    };

    this.emit(BlockchainEventType.TRANSACTION_ADDED, event);
  }

  /**
   * Emit mining started event
   */
  public emitMiningStarted(difficulty: number, transactions: number): void {
    this.emit(BlockchainEventType.MINING_STARTED, {
      difficulty,
      transactions,
      timestamp: Date.now()
    });
  }

  /**
   * Emit mining progress event
   */
  public emitMiningProgress(progress: MiningProgressEvent): void {
    this.emit(BlockchainEventType.MINING_PROGRESS, progress);
  }

  /**
   * Emit mempool updated event
   */
  public emitMempoolUpdated(event: MempoolUpdatedEvent): void {
    this.emit(BlockchainEventType.MEMPOOL_UPDATED, event);
  }

  /**
   * Emit balance updated event
   */
  public emitBalanceUpdated(event: BalanceUpdatedEvent): void {
    this.emit(BlockchainEventType.BALANCE_UPDATED, event);
  }

  /**
   * Emit chain validated event
   */
  public emitChainValidated(isValid: boolean, blockCount: number): void {
    this.emit(BlockchainEventType.CHAIN_VALIDATED, {
      isValid,
      blockCount,
      timestamp: Date.now()
    });
  }
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: BlockchainEventType;
  data: any;
  timestamp: number;
}
