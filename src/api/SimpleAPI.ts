import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer, Server } from 'http';
import { Blockchain } from '../core/Blockchain';
import { Wallet } from '../wallet/Wallet';
import { Signature } from '../crypto/Signature';
import { WebSocketServer } from './WebSocketServer';
import { BlockchainEvents, BlockchainEventType } from '../events/BlockchainEvents';
import { PersistentProfileManager } from '../storage/ProfileStorage';
import { LiveBlockchainOptimizer } from './LiveBlockchainOptimizer';
import { BlockchainStorage } from '../storage/BlockchainStorage';
import crypto from 'crypto';

/**
 * Simplified REST API for blockchain operations
 */
export class SimpleAPI {
  private app: express.Application;
  private server: Server;
  private blockchain: Blockchain;
  private wallet: Wallet;
  private port: number;
  private wsServer: WebSocketServer;
  private events: BlockchainEvents;
  private profileManager: PersistentProfileManager;
  private optimizer: LiveBlockchainOptimizer;

  constructor(port: number = 3000) {
    this.app = express();
    this.server = createServer(this.app);
    this.blockchain = new Blockchain();
    this.wallet = new Wallet(this.blockchain);
    this.port = port;
    this.events = BlockchainEvents.getInstance();
    this.profileManager = new PersistentProfileManager();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.wsServer = new WebSocketServer(this.server);
    
    // Initialize LiveBlockchainOptimizer after all dependencies are ready
    const blockchainStorage = new BlockchainStorage();
    this.optimizer = new LiveBlockchainOptimizer(
      this.blockchain, 
      this.wsServer, 
      blockchainStorage
    );
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Serve static frontend files
    this.app.use('/frontend', express.static(path.join(__dirname, '../../frontend')));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Serve frontend dashboard
    this.app.get('/', (_req: Request, res: Response) => {
      res.redirect('/frontend');
    });

    this.app.get('/dashboard', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../../frontend/index.html'));
    });

    // Get blockchain stats
    this.app.get('/api/stats', (_req: Request, res: Response) => {
      try {
        const stats = this.blockchain.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
      }
    });

    // Get complete blockchain data
    this.app.get('/api/blockchain', (_req: Request, res: Response) => {
      try {
        const blocks = this.blockchain.chain.map(block => ({
          height: block.header.height,
          hash: block.hash,
          previousHash: block.header.previousHash,
          timestamp: block.header.timestamp,
          transactions: block.transactions.length,
          difficulty: block.header.difficulty,
          nonce: block.header.nonce,
          merkleRoot: block.header.merkleRoot
        }));
        
        res.json({ 
          blocks, 
          blockCount: this.blockchain.chain.length,
          latestHeight: blocks.length > 0 ? blocks[blocks.length - 1].height : -1,
          totalTransactions: blocks.reduce((sum, block) => sum + block.transactions, 0)
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get blockchain data' });
      }
    });

    // Get blocks (with pagination)
    this.app.get('/api/blocks', (req: Request, res: Response) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
        const blocks = this.blockchain.chain.slice(-limit).map(block => ({
          height: block.header.height,
          hash: block.hash,
          timestamp: block.header.timestamp,
          transactions: block.transactions.length,
          difficulty: block.header.difficulty,
          nonce: block.header.nonce
        }));
        
        res.json({ blocks, total: this.blockchain.chain.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get blocks' });
      }
    });

    // Get specific block by height
    this.app.get('/api/blocks/:height', (req: Request, res: Response) => {
      try {
        const height = parseInt(req.params.height);
        const block = this.blockchain.getBlockByHeight(height);
        
        if (!block) {
          res.status(404).json({ error: 'Block not found' });
          return;
        }

        res.json({
          height: block.header.height,
          hash: block.hash,
          previousHash: block.header.previousHash,
          timestamp: block.header.timestamp,
          nonce: block.header.nonce,
          difficulty: block.header.difficulty,
          merkleRoot: block.header.merkleRoot,
          transactions: block.transactions.map(tx => ({
            id: tx.id,
            timestamp: tx.timestamp,
            inputs: tx.inputs.length,
            outputs: tx.outputs.length,
            amount: tx.outputs.reduce((sum, output) => sum + output.amount, 0),
            fee: tx.fee
          }))
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get block' });
      }
    });

    // Mine a block
    this.app.post('/api/mine', (req: Request, res: Response) => {
      try {
        const { minerAddress } = req.body;
        
        if (!minerAddress) {
          res.status(400).json({ error: 'Miner address required' });
          return;
        }

        // Emit mining started event
        this.events.emitMiningStarted(this.blockchain.difficulty, this.blockchain.memPool.length);

        const startTime = Date.now();
        const block = this.blockchain.mineBlock(minerAddress);
        
        if (block) {
          const miningTime = Date.now() - startTime;
          const hashRate = block.header.nonce / (miningTime / 1000); // Hashes per second
          
          // Emit block mined event
          this.events.emitBlockMined(block, miningTime, hashRate);
          
          res.json({
            message: 'Block mined successfully',
            height: block.header.height,
            hash: block.hash,
            transactions: block.transactions.length,
            miningTime,
            hashRate
          });
        } else {
          res.status(500).json({ error: 'Mining failed' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Mining error' });
      }
    });

    // Create account
    this.app.post('/api/accounts', (req: Request, res: Response) => {
      try {
        const { label } = req.body;
        const account = this.wallet.generateAccount(label);
        
        // Emit balance updated event
        this.events.emitBalanceUpdated({
          address: account.address,
          oldBalance: 0,
          newBalance: account.balance,
          change: account.balance
        });
        
        res.json({
          address: account.address,
          publicKey: account.publicKey,
          balance: account.balance,
          label: account.label
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to create account' });
      }
    });

    // Get account balance
    this.app.get('/api/balance/:address', (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        const balance = this.blockchain.getAddressBalance(address);
        res.json({ address, balance });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get balance' });
      }
    });

    // Send transaction
    this.app.post('/api/send', (req: Request, res: Response) => {
      try {
        const { fromAddress, toAddress, amount, privateKey } = req.body;
        
        if (!fromAddress || !toAddress || !amount || !privateKey) {
          res.status(400).json({ error: 'Missing required fields' });
          return;
        }

        // Import account temporarily
        const account = this.wallet.importAccount(privateKey);
        if (!account || account.address !== fromAddress) {
          res.status(400).json({ error: 'Invalid private key' });
          return;
        }

        const success = this.wallet.sendTransaction(fromAddress, toAddress, amount, 0.001);
        if (success) {
          res.json({ message: 'Transaction sent successfully' });
        } else {
          res.status(400).json({ error: 'Transaction failed' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Transaction error' });
      }
    });

    // Get mempool
    this.app.get('/api/mempool', (_req: Request, res: Response) => {
      try {
        const transactions = this.blockchain.memPool.map(tx => ({
          id: tx.id,
          timestamp: tx.timestamp,
          inputs: tx.inputs.length,
          outputs: tx.outputs.length,
          fee: tx.fee
        }));
        
        res.json({ transactions, count: transactions.length });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get mempool' });
      }
    });

    // Generate key pair
    this.app.post('/api/keypair', (_req: Request, res: Response) => {
      try {
        const { privateKey, publicKey } = Signature.generateKeyPair();
        const address = Signature.publicKeyToAddress(publicKey);
        
        res.json({ privateKey, publicKey, address });
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate keypair' });
      }
    });

    // Validate blockchain
    this.app.get('/api/validate', (_req: Request, res: Response) => {
      try {
        const isValid = this.blockchain.isChainValid();
        
        // Emit chain validated event
        this.events.emitChainValidated(isValid, this.blockchain.chain.length);
        
        res.json({ valid: isValid });
      } catch (error) {
        res.status(500).json({ error: 'Validation failed' });
      }
    });

    // WebSocket connection info
    this.app.get('/api/ws-info', (_req: Request, res: Response) => {
      res.json({
        connected_clients: this.wsServer.getClientCount(),
        websocket_url: `ws://localhost:${this.port}/ws`,
        events_available: Object.values(BlockchainEventType)
      });
    });

    // Demo transaction flow trigger
    this.app.post('/api/demo-transaction', (_req: Request, res: Response) => {
      try {
        // Create a demo transaction event to trigger flow animation
        const demoTransaction = {
          id: 'demo_' + Date.now(),
          from: ['demo_address_1'],
          to: ['demo_address_2'],
          amount: 5.0,
          fee: 0.001,
          timestamp: Date.now()
        };

        // Emit transaction added event
        this.events.emit(BlockchainEventType.TRANSACTION_ADDED, {
          transaction: demoTransaction,
          memPoolSize: 1
        });

        res.json({ 
          message: 'Demo transaction flow triggered',
          transaction: demoTransaction
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to trigger demo transaction' });
      }
    });

    // === PROFILE MANAGEMENT ENDPOINTS ===

    // Register new user
    this.app.post('/api/profiles/register', (req: Request, res: Response) => {
      try {
        const { username, email, password, displayName } = req.body;

        if (!username || !email || !password) {
          res.status(400).json({ error: 'Username, email, and password are required' });
          return;
        }

        const profile = this.profileManager.createProfile({
          username,
          email,
          password,
          displayName
        });

        res.status(201).json({
          message: 'Profile created successfully',
          profile: {
            id: profile.getId(),
            username: profile.getUsername(),
            email: profile.getEmail(),
            displayName: profile.getDisplayName(),
            createdAt: profile.getCreatedAt()
          }
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create profile' });
      }
    });

    // Login user
    this.app.post('/api/profiles/login', (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          res.status(400).json({ error: 'Username and password are required' });
          return;
        }

        const profile = this.profileManager.authenticateUser(username, password);
        if (!profile) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        // Generate session
        const sessionId = crypto.randomBytes(32).toString('hex');
        const session = {
          sessionId,
          userId: profile.getId(),
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent') || '',
          isActive: true
        };

        this.profileManager.getStorage().createSession(session);

        res.json({
          message: 'Login successful',
          sessionId,
          profile: {
            id: profile.getId(),
            username: profile.getUsername(),
            displayName: profile.getDisplayName(),
            email: profile.getEmail(),
            totalBalance: profile.getTotalBalance(),
            walletAddresses: profile.getWalletAddresses(),
            preferences: profile.getPreferences()
          }
        });

        console.log(`✅ Session created for user ${profile.getUsername()}: ${sessionId}`);
      } catch (error) {
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Get current user profile
    this.app.get('/api/profiles/me', (req: Request, res: Response) => {
      try {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        if (!sessionId) {
          res.status(401).json({ error: 'Session token required' });
          return;
        }

        const session = this.profileManager.getStorage().getSession(sessionId);
        if (!session) {
          res.status(401).json({ error: 'Invalid session' });
          return;
        }

        const profile = this.profileManager.getProfile(session.userId);
        if (!profile) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }

        // Update session activity
        this.profileManager.getStorage().updateSessionActivity(sessionId);

        res.json({
          id: profile.getId(),
          username: profile.getUsername(),
          email: profile.getEmail(),
          displayName: profile.getDisplayName(),
          avatarUrl: profile.getAvatarUrl(),
          createdAt: profile.getCreatedAt(),
          lastLoginAt: profile.getLastLoginAt(),
          isActive: profile.isActiveUser(),
          preferences: profile.getPreferences(),
          walletAddresses: profile.getWalletAddresses(),
          totalBalance: profile.getTotalBalance(),
          transactionCount: profile.getTransactionCount()
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
      }
    });

    // Update user profile
    this.app.put('/api/profiles/me', (req: Request, res: Response) => {
      try {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        if (!sessionId) {
          res.status(401).json({ error: 'Session token required' });
          return;
        }

        const session = this.profileManager.getStorage().getSession(sessionId);
        if (!session) {
          res.status(401).json({ error: 'Invalid session' });
          return;
        }

        const { displayName, avatarUrl, email } = req.body;
        const success = this.profileManager.updateProfile(session.userId, {
          displayName,
          avatarUrl,
          email
        });

        if (!success) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }

        res.json({ message: 'Profile updated successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
      }
    });

    // Update user preferences
    this.app.put('/api/profiles/me/preferences', (req: Request, res: Response) => {
      try {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        if (!sessionId) {
          res.status(401).json({ error: 'Session token required' });
          return;
        }

        const session = this.profileManager.getStorage().getSession(sessionId);
        if (!session) {
          res.status(401).json({ error: 'Invalid session' });
          return;
        }

        const profile = this.profileManager.getProfile(session.userId);
        if (!profile) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }

        profile.updatePreferences(req.body);
        this.profileManager.getStorage().saveProfile(profile);

        res.json({ message: 'Preferences updated successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to update preferences' });
      }
    });

    // Add wallet address to profile
    this.app.post('/api/profiles/me/wallets', (req: Request, res: Response) => {
      try {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        if (!sessionId) {
          res.status(401).json({ error: 'Session token required' });
          return;
        }

        const session = this.profileManager.getStorage().getSession(sessionId);
        if (!session) {
          res.status(401).json({ error: 'Invalid session' });
          return;
        }

        const { address } = req.body;
        if (!address) {
          res.status(400).json({ error: 'Wallet address required' });
          return;
        }

        const profile = this.profileManager.getProfile(session.userId);
        if (!profile) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }

        profile.addWalletAddress(address);
        
        // Update balance
        const balance = this.blockchain.getAddressBalance(address);
        const totalBalance = profile.getWalletAddresses().reduce((sum, addr) => 
          sum + this.blockchain.getAddressBalance(addr), 0);
        profile.updateBalance(totalBalance);

        this.profileManager.getStorage().saveProfile(profile);

        res.json({ 
          message: 'Wallet address added successfully',
          address,
          balance,
          totalBalance
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to add wallet address' });
      }
    });

    // Get user sessions
    this.app.get('/api/profiles/me/sessions', (req: Request, res: Response) => {
      try {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        if (!sessionId) {
          res.status(401).json({ error: 'Session token required' });
          return;
        }

        const session = this.profileManager.getStorage().getSession(sessionId);
        if (!session) {
          res.status(401).json({ error: 'Invalid session' });
          return;
        }

        const sessions = this.profileManager.getStorage().getUserSessions(session.userId);
        res.json({ sessions });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get sessions' });
      }
    });

    // Logout (invalidate session)
    this.app.post('/api/profiles/logout', (req: Request, res: Response) => {
      try {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        if (!sessionId) {
          res.status(401).json({ error: 'Session token required' });
          return;
        }

        this.profileManager.getStorage().invalidateSession(sessionId);
        res.json({ message: 'Logged out successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to logout' });
      }
    });

    // Get all profiles (admin endpoint)
    this.app.get('/api/profiles', (req: Request, res: Response) => {
      try {
        const { search, limit = 20 } = req.query;
        let profiles;

        if (search) {
          profiles = this.profileManager.getStorage().searchProfiles(
            search as string, 
            parseInt(limit as string)
          );
        } else {
          profiles = this.profileManager.getAllProfiles().slice(0, parseInt(limit as string));
        }

        const profilesData = profiles.map(profile => ({
          id: profile.getId(),
          username: profile.getUsername(),
          displayName: profile.getDisplayName(),
          email: profile.getEmail(),
          createdAt: profile.getCreatedAt(),
          lastLoginAt: profile.getLastLoginAt(),
          isActive: profile.isActiveUser(),
          totalBalance: profile.getTotalBalance(),
          transactionCount: profile.getTransactionCount(),
          walletCount: profile.getWalletAddresses().length
        }));

        res.json({ profiles: profilesData });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get profiles' });
      }
    });

    // Get profile statistics
    this.app.get('/api/profiles/stats', (_req: Request, res: Response) => {
      try {
        const userStats = this.profileManager.getUserStats();
        const profileStats = this.profileManager.getStorage().getProfileStats();

        res.json({
          ...userStats,
          ...profileStats
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get profile stats' });
      }
    });

    // === LIVE BLOCKCHAIN OPTIMIZER ENDPOINTS ===

    // Get system status and metrics
    this.app.get('/api/optimizer/status', (_req: Request, res: Response) => {
      try {
        const status = this.optimizer.getSystemStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get optimizer status' });
      }
    });

    // Resolve alert
    this.app.post('/api/optimizer/alerts/:alertId/resolve', (req: Request, res: Response) => {
      try {
        const { alertId } = req.params;
        const resolved = this.optimizer.resolveAlert(alertId);
        
        if (resolved) {
          res.json({ message: 'Alert resolved successfully' });
        } else {
          res.status(404).json({ error: 'Alert not found' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to resolve alert' });
      }
    });

    // Stop monitoring
    this.app.post('/api/optimizer/stop', (_req: Request, res: Response) => {
      try {
        this.optimizer.stopMonitoring();
        res.json({ message: 'Monitoring stopped successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to stop monitoring' });
      }
    });
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`🚀 Blockchain API running on http://localhost:${this.port}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`📈 Stats: http://localhost:${this.port}/api/stats`);
      console.log(`🔗 WebSocket: ws://localhost:${this.port}/ws`);
    });
  }

  public getBlockchain(): Blockchain {
    return this.blockchain;
  }

  public getWallet(): Wallet {
    return this.wallet;
  }
}
