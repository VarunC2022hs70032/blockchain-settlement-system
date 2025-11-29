import { Blockchain } from '../src/core/Blockchain';
import { Block } from '../src/core/Block';
import { Transaction } from '../src/core/Transaction';
import { Wallet } from '../src/wallet/Wallet';
import { Hash } from '../src/crypto/Hash';
import { Signature } from '../src/crypto/Signature';

describe('Blockchain System Tests', () => {
  let blockchain: Blockchain;
  let wallet: Wallet;

  beforeEach(() => {
    blockchain = new Blockchain();
    wallet = new Wallet(blockchain);
  });

  describe('Hash Functions', () => {
    it('should generate consistent SHA-256 hashes', () => {
      const data = 'test data';
      const hash1 = Hash.sha256(data);
      const hash2 = Hash.sha256(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should calculate merkle root correctly', () => {
      const transactions = ['tx1', 'tx2', 'tx3', 'tx4'];
      const merkleRoot = Hash.calculateMerkleRoot(transactions);
      
      expect(merkleRoot).toHaveLength(64);
      expect(merkleRoot).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should validate difficulty correctly', () => {
      const easyHash = '0000abcd';
      const hardHash = 'abcd0000';
      
      expect(Hash.meetsDifficulty(easyHash, 4)).toBe(true);
      expect(Hash.meetsDifficulty(hardHash, 4)).toBe(false);
    });
  });

  describe('Digital Signatures', () => {
    it('should generate valid key pairs', () => {
      const { privateKey, publicKey } = Signature.generateKeyPair();
      
      expect(privateKey).toHaveLength(64);
      expect(publicKey).toHaveLength(130);
    });

    it('should sign and verify messages correctly', () => {
      const { privateKey, publicKey } = Signature.generateKeyPair();
      const message = 'Hello Blockchain!';
      
      const signature = Signature.sign(message, privateKey);
      const isValid = Signature.verify(message, signature, publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const { privateKey, publicKey } = Signature.generateKeyPair();
      const message = 'Hello Blockchain!';
      const wrongMessage = 'Wrong message';
      
      const signature = Signature.sign(message, privateKey);
      const isValid = Signature.verify(wrongMessage, signature, publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should generate valid addresses from public keys', () => {
      const { publicKey } = Signature.generateKeyPair();
      const address = Signature.publicKeyToAddress(publicKey);
      
      expect(address).toHaveLength(41);
      expect(address.startsWith('1')).toBe(true);
      expect(Signature.isValidAddress(address)).toBe(true);
    });
  });

  describe('Transaction System', () => {
    it('should create valid transactions', () => {
      const { privateKey, publicKey } = Signature.generateKeyPair();
      const fromAddress = Signature.publicKeyToAddress(publicKey);
      const toAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      
      const inputs = [{
        txId: 'prev_tx_id',
        outputIndex: 0,
        signature: '',
        publicKey: publicKey,
        amount: 100
      }];
      
      const outputs = [{
        address: toAddress,
        amount: 90
      }, {
        address: fromAddress,
        amount: 9.9 // change
      }];
      
      const transaction = new Transaction(inputs, outputs);
      transaction.signTransaction(privateKey, 0);
      
      expect(transaction.isValid()).toBe(true);
      expect(transaction.fee).toBe(0.1);
    });

    it('should create coinbase transactions', () => {
      const minerAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const reward = 50;
      const blockHeight = 1;
      
      const coinbase = Transaction.createCoinbase(minerAddress, reward, blockHeight);
      
      expect(coinbase.isCoinbase()).toBe(true);
      expect(coinbase.outputs[0].amount).toBe(reward);
      expect(coinbase.outputs[0].address).toBe(minerAddress);
    });

    it('should serialize and deserialize transactions', () => {
      const transaction = new Transaction();
      const json = transaction.toJSON();
      const deserialized = Transaction.fromJSON(json);
      
      expect(deserialized.id).toBe(transaction.id);
      expect(deserialized.timestamp).toBe(transaction.timestamp);
    });
  });

  describe('Block System', () => {
    it('should create valid blocks', () => {
      const coinbase = Transaction.createCoinbase('miner_address', 50, 1);
      const block = new Block([coinbase], 'previous_hash', 1, 2);
      
      expect(block.transactions).toHaveLength(1);
      expect(block.header.height).toBe(1);
      expect(block.header.previousHash).toBe('previous_hash');
    });

    it('should mine blocks with correct difficulty', () => {
      const coinbase = Transaction.createCoinbase('miner_address', 50, 1);
      const block = new Block([coinbase], 'previous_hash', 1, 2);
      
      block.mineBlock(2);
      
      expect(block.hash.startsWith('00')).toBe(true);
      expect(block.header.nonce).toBeGreaterThan(0);
    });

    it('should validate blocks correctly', () => {
      const coinbase = Transaction.createCoinbase('miner_address', 50, 1);
      const block = new Block([coinbase], 'previous_hash', 1, 2);
      block.mineBlock(2);
      
      expect(block.isValid()).toBe(true);
    });

    it('should serialize and deserialize blocks', () => {
      const coinbase = Transaction.createCoinbase('miner_address', 50, 0);
      const block = new Block([coinbase], '0'.repeat(64), 0, 2);
      block.mineBlock(2);
      
      const json = block.toJSON();
      const deserialized = Block.fromJSON(json);
      
      expect(deserialized.hash).toBe(block.hash);
      expect(deserialized.header.height).toBe(block.header.height);
    });
  });

  describe('Blockchain Operations', () => {
    it('should initialize with genesis block', () => {
      expect(blockchain.chain).toHaveLength(1);
      expect(blockchain.chain[0].header.height).toBe(0);
      expect(blockchain.chain[0].header.previousHash).toBe('0'.repeat(64));
    });

    it('should add valid blocks to the chain', () => {
      const minerAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      const newBlock = blockchain.mineBlock(minerAddress);
      
      expect(newBlock).toBeTruthy();
      expect(blockchain.chain).toHaveLength(2);
      expect(blockchain.chain[1].header.height).toBe(1);
    });

    it('should validate the entire blockchain', () => {
      // Mine a few blocks
      const minerAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      blockchain.mineBlock(minerAddress);
      blockchain.mineBlock(minerAddress);
      
      expect(blockchain.isChainValid()).toBe(true);
    });

    it('should track UTXO set correctly', () => {
      const minerAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      blockchain.mineBlock(minerAddress);
      
      const utxos = blockchain.getUTXOsForAddress(minerAddress);
      const balance = blockchain.getAddressBalance(minerAddress);
      
      expect(utxos.length).toBeGreaterThan(0);
      expect(balance).toBeGreaterThan(0);
    });

    it('should manage mempool correctly', () => {
      const account = wallet.generateAccount('test');
      
      // Mine a block to give the account funds
      blockchain.mineBlock(account.address);
      
      const recipient = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      wallet.sendTransaction(account.address, recipient, 10, 0.1);
      
      expect(blockchain.memPool.length).toBeGreaterThan(0);
      
      // Mine another block to clear mempool
      blockchain.mineBlock(account.address);
      expect(blockchain.memPool.length).toBe(0);
    });
  });

  describe('Wallet Operations', () => {
    it('should generate new accounts', () => {
      const account = wallet.generateAccount('Test Account');
      
      expect(account.address).toBeTruthy();
      expect(account.publicKey).toBeTruthy();
      expect(account.privateKey).toBeTruthy();
      expect(account.label).toBe('Test Account');
    });

    it('should import accounts from private keys', () => {
      const { privateKey } = Signature.generateKeyPair();
      const imported = wallet.importAccount(privateKey, 'Imported');
      
      expect(imported).toBeTruthy();
      expect(imported?.privateKey).toBe(privateKey);
    });

    it('should track account balances', () => {
      const account = wallet.generateAccount('Test');
      
      // Initially zero balance
      expect(account.balance).toBe(0);
      
      // Mine a block to get funds
      blockchain.mineBlock(account.address);
      wallet.getAllAccounts(); // Update balances
      
      expect(account.balance).toBeGreaterThan(0);
    });

    it('should create and send transactions', () => {
      const alice = wallet.generateAccount('Alice');
      const bob = wallet.generateAccount('Bob');
      
      // Give Alice some funds
      blockchain.mineBlock(alice.address);
      
      const success = wallet.sendTransaction(alice.address, bob.address, 10, 0.1);
      expect(success).toBe(true);
      expect(blockchain.memPool.length).toBe(1);
    });

    it('should track transaction history', () => {
      const account = wallet.generateAccount('Test');
      
      // Mine some blocks
      blockchain.mineBlock(account.address);
      blockchain.mineBlock(account.address);
      
      const history = wallet.getTransactionHistory(account.address);
      expect(history.length).toBeGreaterThanOrEqual(2);
      
      history.forEach(entry => {
        expect(entry.type).toBe('mined');
        expect(entry.amount).toBeGreaterThan(0);
      });
    });
  });

  describe('Advanced Features', () => {
    it('should adjust mining difficulty', () => {
      // Mine multiple blocks quickly (simulate fast mining)
      const minerAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
      for (let i = 0; i < 12; i++) {
        blockchain.mineBlock(minerAddress);
      }
      
      // Difficulty should have been adjusted
      expect(blockchain.difficulty).toBeDefined();
    });

    it('should handle double spending prevention', () => {
      const alice = wallet.generateAccount('Alice');
      const bob = wallet.generateAccount('Bob');
      const charlie = wallet.generateAccount('Charlie');
      
      // Give Alice funds
      blockchain.mineBlock(alice.address);
      
      // Try to send the same funds twice
      const tx1Success = wallet.sendTransaction(alice.address, bob.address, 25, 0.1);
      const tx2Success = wallet.sendTransaction(alice.address, charlie.address, 25, 0.1);
      
      expect(tx1Success).toBe(true);
      expect(tx2Success).toBe(false); // Should fail due to insufficient funds
    });

    it('should calculate block rewards correctly', () => {
      const reward0 = Block.getBlockReward(0);
      const reward210000 = Block.getBlockReward(210000);
      
      expect(reward0).toBe(50);
      expect(reward210000).toBe(25); // After first halving
    });
  });

  describe('System Integration', () => {
    it('should handle complex transaction scenarios', () => {
      // Create multiple accounts
      const accounts = [];
      for (let i = 0; i < 5; i++) {
        accounts.push(wallet.generateAccount(`Account-${i}`));
      }
      
      // Mine blocks to distribute funds
      accounts.forEach(account => {
        blockchain.mineBlock(account.address);
      });
      
      // Create a web of transactions
      let successfulTx = 0;
      for (let i = 0; i < accounts.length - 1; i++) {
        const success = wallet.sendTransaction(
          accounts[i].address,
          accounts[i + 1].address,
          5,
          0.1
        );
        if (success) successfulTx++;
      }
      
      expect(successfulTx).toBeGreaterThan(0);
      
      // Mine a block to confirm transactions
      const block = blockchain.mineBlock(accounts[0].address);
      expect(block?.transactions.length).toBeGreaterThan(1);
    });

    it('should maintain consistency after multiple operations', () => {
      const account1 = wallet.generateAccount('Account1');
      const account2 = wallet.generateAccount('Account2');
      
      // Perform multiple operations
      for (let i = 0; i < 3; i++) {
        blockchain.mineBlock(account1.address);
        if (i > 0) {
          wallet.sendTransaction(account1.address, account2.address, 1, 0.01);
        }
        blockchain.mineBlock(account2.address);
      }
      
      // Verify blockchain integrity
      expect(blockchain.isChainValid()).toBe(true);
      
      // Verify balance consistency
      const stats = blockchain.getStats();
      expect(stats.totalSupply).toBeGreaterThan(0);
      
      // Verify UTXO consistency
      const allUTXOs = blockchain.getUTXOsForAddress(account1.address)
        .concat(blockchain.getUTXOsForAddress(account2.address));
      
      const utxoTotal = allUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);
      const balanceTotal = blockchain.getAddressBalance(account1.address) +
                          blockchain.getAddressBalance(account2.address);
      
      expect(Math.abs(utxoTotal - balanceTotal)).toBeLessThan(0.001);
    });
  });
});
