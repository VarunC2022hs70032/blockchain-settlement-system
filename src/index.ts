import { SimpleAPI } from './api/SimpleAPI';

/**
 * Main application entry point
 */
async function main() {
  console.log('🚀 Starting Blockchain-based Transaction & Settlement System...');
  
  // Create and start the API server
  const api = new SimpleAPI(3000);
  
  // Log system information
  console.log('📊 System initialized with:');
  console.log('  - Genesis block created');
  console.log('  - UTXO tracking enabled');
  console.log('  - Proof-of-Work consensus');
  console.log('  - Digital wallet system');
  console.log('  - RESTful API endpoints');
  
  // Start the server
  api.start();
  
  // Log available endpoints
  console.log('\n📡 Available API endpoints:');
  console.log('  Blockchain: GET /api/blockchain');
  console.log('  Blocks: GET /api/blocks, POST /api/blocks/mine');
  console.log('  Transactions: GET /api/transactions, POST /api/transactions');
  console.log('  Wallet: GET /api/wallet/accounts, POST /api/wallet/accounts');
  console.log('  Address: GET /api/address/{address}');
  console.log('  Utils: POST /api/utils/generate-keypair');
  console.log('  Health: GET /health');
  
  console.log('\n✅ Blockchain system is ready for transactions!');
  console.log('💡 Try creating a wallet account and mining some blocks to get started.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down blockchain system...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down blockchain system...');
  process.exit(0);
});

// Start the application
main().catch((error) => {
  console.error('❌ Failed to start blockchain system:', error);
  process.exit(1);
});
