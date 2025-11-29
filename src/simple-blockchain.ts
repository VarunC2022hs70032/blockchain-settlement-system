// Simple Blockchain Implementation for Academic Demonstration
// Varun C - 2022HS70032

import crypto from 'crypto';
import { EventEmitter } from 'events';

// Simple Transaction Interface
export interface SimpleTransaction {
    id: string;
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    signature?: string;
}

// Simple Block Interface  
export interface SimpleBlock {
    index: number;
    timestamp: number;
    transactions: SimpleTransaction[];
    previousHash: string;
    hash: string;
    nonce: number;
}

// Simple Wallet Account
export interface WalletAccount {
    address: string;
    publicKey: string;
    privateKey: string;
    balance: number;
}

export class SimpleBlockchain extends EventEmitter {
    public chain: SimpleBlock[];
    public pendingTransactions: SimpleTransaction[];
    public wallets: Map<string, WalletAccount>;
    public difficulty: number;
    public miningReward: number;

    constructor() {
        super();
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = [];
        this.wallets = new Map();
        this.difficulty = 2;  // Simple difficulty for fast demo
        this.miningReward = 100;
    }

    createGenesisBlock(): SimpleBlock {
        const genesis: SimpleBlock = {
            index: 0,
            timestamp: Date.now(),
            transactions: [],
            previousHash: '0',
            hash: '',
            nonce: 0
        };
        genesis.hash = this.calculateHash(genesis);
        return genesis;
    }

    calculateHash(block: SimpleBlock): string {
        return crypto
            .createHash('sha256')
            .update(
                block.index +
                block.previousHash +
                block.timestamp +
                JSON.stringify(block.transactions) +
                block.nonce
            )
            .digest('hex');
    }

    createWallet(label: string = 'Account'): WalletAccount {
        // Generate simple key pair (for demo purposes)
        const privateKey = crypto.randomBytes(32).toString('hex');
        const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
        const address = '1' + crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 33);

        const wallet: WalletAccount = {
            address,
            publicKey,
            privateKey,
            balance: 0
        };

        this.wallets.set(address, wallet);
        this.updateBalance(address);
        return wallet;
    }

    getBalance(address: string): number {
        let balance = 0;

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.from === address) {
                    balance -= trans.amount;
                }
                if (trans.to === address) {
                    balance += trans.amount;
                }
            }
        }

        return balance;
    }

    updateBalance(address: string): void {
        const wallet = this.wallets.get(address);
        if (wallet) {
            wallet.balance = this.getBalance(address);
        }
    }

    createTransaction(from: string, to: string, amount: number): SimpleTransaction | null {
        // Validate transaction
        if (from !== 'system' && this.getBalance(from) < amount) {
            throw new Error('Insufficient balance');
        }

        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        const transaction: SimpleTransaction = {
            id: crypto.randomBytes(16).toString('hex'),
            from,
            to,
            amount,
            timestamp: Date.now()
        };

        // Simple signing (for demo)
        const wallet = this.wallets.get(from);
        if (wallet && from !== 'system') {
            transaction.signature = crypto
                .createHash('sha256')
                .update(transaction.id + wallet.privateKey)
                .digest('hex');
        }

        this.pendingTransactions.push(transaction);
        this.emit('transactionCreated', transaction);
        return transaction;
    }

    mineBlock(miningRewardAddress: string): SimpleBlock {
        // Add mining reward transaction
        const rewardTransaction: SimpleTransaction = {
            id: crypto.randomBytes(16).toString('hex'),
            from: 'system',
            to: miningRewardAddress,
            amount: this.miningReward,
            timestamp: Date.now()
        };

        const transactions = [rewardTransaction, ...this.pendingTransactions];

        const block: SimpleBlock = {
            index: this.chain.length,
            timestamp: Date.now(),
            transactions: transactions,
            previousHash: this.getLatestBlock().hash,
            hash: '',
            nonce: 0
        };

        // Simple proof of work
        while (block.hash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join('0')) {
            block.nonce++;
            block.hash = this.calculateHash(block);
        }

        console.log(`Block mined: ${block.hash}`);
        this.chain.push(block);
        this.pendingTransactions = [];

        // Update all wallet balances
        this.wallets.forEach((wallet, address) => {
            this.updateBalance(address);
        });

        this.emit('blockMined', block);
        return block;
    }

    getLatestBlock(): SimpleBlock {
        return this.chain[this.chain.length - 1];
    }

    isChainValid(): boolean {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== this.calculateHash(currentBlock)) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    getStats() {
        return {
            totalBlocks: this.chain.length,
            totalTransactions: this.chain.reduce((sum, block) => sum + block.transactions.length, 0),
            pendingTransactions: this.pendingTransactions.length,
            totalWallets: this.wallets.size,
            isValid: this.isChainValid(),
            latestBlockHash: this.getLatestBlock().hash,
            difficulty: this.difficulty
        };
    }

    getAllWallets(): WalletAccount[] {
        return Array.from(this.wallets.values());
    }

    getAllTransactions(): SimpleTransaction[] {
        const allTransactions: SimpleTransaction[] = [];
        for (const block of this.chain) {
            allTransactions.push(...block.transactions);
        }
        return allTransactions;
    }
}
