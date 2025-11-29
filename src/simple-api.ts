// Simple REST API for Blockchain Settlement System
// Varun C - 2022HS70032

import express from 'express';
import cors from 'cors';
import { SimpleBlockchain } from './simple-blockchain';

const app = express();
const blockchain = new SimpleBlockchain();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Health check
app.get('/health', (_req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        system: 'Blockchain Settlement System',
        student: 'Varun C (2022HS70032)'
    });
});

// Get blockchain stats
app.get('/api/stats', (_req, res) => {
    try {
        const stats = blockchain.getStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Wallet endpoints
app.post('/api/wallet/create', (req, res) => {
    try {
        const { label } = req.body;
        const wallet = blockchain.createWallet(label || 'New Account');
        
        res.json({
            success: true,
            data: wallet,
            message: 'Wallet created successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(400).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/wallet/all', (_req, res) => {
    try {
        const wallets = blockchain.getAllWallets();
        
        res.json({
            success: true,
            data: wallets,
            count: wallets.length,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/wallet/:address/balance', (req, res) => {
    try {
        const { address } = req.params;
        const balance = blockchain.getBalance(address);
        
        res.json({
            success: true,
            data: { address, balance },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Transaction endpoints
app.post('/api/transaction/create', (req, res) => {
    try {
        const { from, to, amount } = req.body;
        
        if (!from || !to || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: from, to, amount',
                timestamp: new Date().toISOString()
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be positive',
                timestamp: new Date().toISOString()
            });
        }

        const transaction = blockchain.createTransaction(from, to, parseFloat(amount));
        
        res.json({
            success: true,
            data: transaction,
            message: 'Transaction created and added to pending pool',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(400).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/transactions/all', (_req, res) => {
    try {
        const transactions = blockchain.getAllTransactions();
        
        res.json({
            success: true,
            data: transactions,
            count: transactions.length,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/transactions/pending', (req, res) => {
    try {
        const pendingTransactions = blockchain.pendingTransactions;
        
        res.json({
            success: true,
            data: pendingTransactions,
            count: pendingTransactions.length,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Mining endpoints
app.post('/api/mine', (req, res) => {
    try {
        const { minerAddress } = req.body;
        
        if (!minerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Miner address is required',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`Mining new block for ${minerAddress}...`);
        const startTime = Date.now();
        
        const newBlock = blockchain.mineBlock(minerAddress);
        const miningTime = Date.now() - startTime;
        
        console.log(`Block mined in ${miningTime}ms`);
        
        res.json({
            success: true,
            data: newBlock,
            message: `Block #${newBlock.index} mined successfully`,
            miningTime: `${miningTime}ms`,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Blockchain endpoints
app.get('/api/blockchain', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                chain: blockchain.chain,
                length: blockchain.chain.length,
                isValid: blockchain.isChainValid()
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/blocks', (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const chain = blockchain.chain;
        const startIndex = Math.max(0, chain.length - parseInt(offset as string) - parseInt(limit as string));
        const endIndex = Math.max(0, chain.length - parseInt(offset as string));
        
        const blocks = chain.slice(startIndex, endIndex).reverse(); // Latest first
        
        res.json({
            success: true,
            data: blocks,
            count: blocks.length,
            total: chain.length,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/block/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        
        if (index < 0 || index >= blockchain.chain.length) {
            return res.status(404).json({
                success: false,
                error: 'Block not found',
                timestamp: new Date().toISOString()
            });
        }
        
        const block = blockchain.chain[index];
        
        res.json({
            success: true,
            data: block,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('\n🚀 Simple Blockchain Settlement System Started!');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log('\n📋 Available Endpoints:');
    console.log('  POST /api/wallet/create - Create new wallet');
    console.log('  GET  /api/wallet/all - Get all wallets');
    console.log('  GET  /api/wallet/:address/balance - Get balance');
    console.log('  POST /api/transaction/create - Create transaction');
    console.log('  GET  /api/transactions/all - Get all transactions');
    console.log('  GET  /api/transactions/pending - Get pending transactions');
    console.log('  POST /api/mine - Mine new block');
    console.log('  GET  /api/blockchain - Get full blockchain');
    console.log('  GET  /api/blocks - Get recent blocks');
    console.log('  GET  /api/block/:index - Get specific block');
    console.log('\n✅ System ready for demonstration!');
});
