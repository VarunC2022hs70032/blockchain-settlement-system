import { Blockchain } from '../core/Blockchain';
import { Wallet } from '../wallet/Wallet';
import { Signature } from '../crypto/Signature';

/**
 * Demonstration script showing blockchain functionality
 */
async function runDemo() {
  console.log('🎯 Blockchain Demo - Transaction & Settlement System\n');

  // Initialize blockchain and wallet
  const blockchain = new Blockchain();
  const wallet = new Wallet(blockchain);

  console.log('1️⃣ Creating wallet accounts...');
  
  // Create some accounts
  const alice = wallet.generateAccount('Alice');
  const bob = wallet.generateAccount('Bob');
  const charlie = wallet.generateAccount('Charlie');

  console.log(`   Alice:   ${alice.address}`);
  console.log(`   Bob:     ${bob.address}`);
  console.log(`   Charlie: ${charlie.address}`);

  console.log('\n2️⃣ Mining initial blocks to get funds...');
  
  // Mine some blocks to generate initial funds
  console.log('   Mining block 1 for Alice...');
  blockchain.mineBlock(alice.address);
  
  console.log('   Mining block 2 for Bob...');
  blockchain.mineBlock(bob.address);

  // Update balances
  wallet.getAllAccounts();
  console.log(`   Alice balance: ${alice.balance} BTC`);
  console.log(`   Bob balance: ${bob.balance} BTC`);
  console.log(`   Charlie balance: ${charlie.balance} BTC`);

  console.log('\n3️⃣ Creating transactions...');
  
  // Alice sends 10 BTC to Bob
  console.log('   Alice → Bob: 10 BTC');
  const success1 = wallet.sendTransaction(alice.address, bob.address, 10, 0.1);
  console.log(`   Transaction status: ${success1 ? '✅ Success' : '❌ Failed'}`);

  // Bob sends 5 BTC to Charlie
  console.log('   Bob → Charlie: 5 BTC');
  const success2 = wallet.sendTransaction(bob.address, charlie.address, 5, 0.1);
  console.log(`   Transaction status: ${success2 ? '✅ Success' : '❌ Failed'}`);

  console.log('\n4️⃣ Mining block with transactions...');
  const minedBlock = blockchain.mineBlock(charlie.address);
  if (minedBlock) {
    console.log(`   Block ${minedBlock.header.height} mined successfully!`);
    console.log(`   Transactions in block: ${minedBlock.transactions.length}`);
  }

  console.log('\n5️⃣ Final account balances:');
  wallet.getAllAccounts();
  console.log(`   Alice: ${alice.balance} BTC`);
  console.log(`   Bob: ${bob.balance} BTC`);
  console.log(`   Charlie: ${charlie.balance} BTC`);

  console.log('\n6️⃣ Blockchain statistics:');
  const stats = blockchain.getStats();
  console.log(`   Total blocks: ${stats.blockCount}`);
  console.log(`   Total transactions: ${stats.totalTransactions}`);
  console.log(`   Total supply: ${stats.totalSupply} BTC`);
  console.log(`   Current difficulty: ${stats.difficulty}`);
  console.log(`   Mempool size: ${stats.memPoolSize}`);

  console.log('\n7️⃣ Transaction history for Alice:');
  const aliceHistory = wallet.getTransactionHistory(alice.address);
  aliceHistory.slice(0, 3).forEach((entry, index) => {
    console.log(`   ${index + 1}. ${entry.type.toUpperCase()}: ${entry.amount} BTC (${entry.confirmations} confirmations)`);
  });

  console.log('\n8️⃣ UTXO analysis for Bob:');
  const bobUTXOs = wallet.getAccountUTXOs(bob.address);
  console.log(`   UTXOs count: ${bobUTXOs.length}`);
  bobUTXOs.slice(0, 3).forEach((utxo, index) => {
    console.log(`   ${index + 1}. ${utxo.amount} BTC from block ${utxo.blockHeight}`);
  });

  console.log('\n9️⃣ Blockchain validation:');
  const isValid = blockchain.isChainValid();
  console.log(`   Chain validity: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

  console.log('\n🔟 Digital signatures demo:');
  const message = 'Hello Blockchain!';
  const signature = Signature.sign(message, alice.privateKey);
  const isValidSignature = Signature.verify(message, signature, alice.publicKey);
  console.log(`   Message: "${message}"`);
  console.log(`   Signature valid: ${isValidSignature ? '✅ Valid' : '❌ Invalid'}`);

  console.log('\n✨ Demo completed successfully!');
  console.log('💡 This demonstrates a fully functional blockchain with:');
  console.log('   - Proof-of-Work consensus');
  console.log('   - UTXO transaction model');
  console.log('   - Digital signatures');
  console.log('   - Wallet management');
  console.log('   - Mining rewards');
  console.log('   - Transaction fees');
  console.log('   - Chain validation');
  
  return { blockchain, wallet, accounts: { alice, bob, charlie } };
}

/**
 * Performance benchmark
 */
async function runBenchmark() {
  console.log('\n🏃‍♂️ Performance Benchmark\n');

  const blockchain = new Blockchain();
  const wallet = new Wallet(blockchain);
  
  // Create test accounts
  const accounts = [];
  for (let i = 0; i < 5; i++) {
    accounts.push(wallet.generateAccount(`Account-${i}`));
  }

  console.log('📊 Mining benchmark (difficulty 4):');
  const startTime = Date.now();
  
  // Mine 3 blocks
  for (let i = 0; i < 3; i++) {
    const minerAddress = accounts[i % accounts.length].address;
    console.log(`   Mining block ${i + 1}...`);
    blockchain.mineBlock(minerAddress);
  }
  
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  
  console.log(`   Total mining time: ${totalTime.toFixed(2)}s`);
  console.log(`   Average time per block: ${(totalTime / 3).toFixed(2)}s`);
  
  // Transaction throughput test
  console.log('\n📈 Transaction throughput test:');
  const txStartTime = Date.now();
  
  // Create 10 transactions
  let successfulTx = 0;
  for (let i = 0; i < 10; i++) {
    const from = accounts[i % accounts.length];
    const to = accounts[(i + 1) % accounts.length];
    
    if (from.balance > 1) {
      const success = wallet.sendTransaction(from.address, to.address, 0.5, 0.01);
      if (success) successfulTx++;
    }
  }
  
  const txEndTime = Date.now();
  const txTime = (txEndTime - txStartTime) / 1000;
  
  console.log(`   Created ${successfulTx} transactions in ${txTime.toFixed(3)}s`);
  console.log(`   Transaction rate: ${(successfulTx / txTime).toFixed(2)} tx/s`);
  
  // Mine block with transactions
  console.log('\n⛏️ Mining block with transactions...');
  const miningStart = Date.now();
  const block = blockchain.mineBlock(accounts[0].address);
  const miningEnd = Date.now();
  
  if (block) {
    console.log(`   Block mined in ${((miningEnd - miningStart) / 1000).toFixed(2)}s`);
    console.log(`   Transactions included: ${block.transactions.length}`);
    console.log(`   Block size: ${(block.size / 1024).toFixed(2)} KB`);
  }

  console.log('\n✅ Benchmark completed!');
}

// Run demo if called directly
if (require.main === module) {
  console.log('Choose demo mode:');
  console.log('1. Full Demo (node dist/scripts/demo.js)');
  console.log('2. Benchmark (node dist/scripts/demo.js benchmark)');
  
  const mode = process.argv[2];
  
  if (mode === 'benchmark') {
    runBenchmark().catch(console.error);
  } else {
    runDemo().catch(console.error);
  }
}

export { runDemo, runBenchmark };
