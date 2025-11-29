# Blockchain-based Transaction & Settlement System

**Academic Project for SESAP ZG569 - Blockchain Technologies & Systems**

## 📋 Project Overview

This repository contains a complete implementation of a blockchain-based transaction and settlement system developed as part of the BITS Pilani coursework. The system demonstrates fundamental blockchain concepts including distributed ledger technology, cryptographic hashing, digital signatures, consensus mechanisms, and automated transaction settlement.

## 👨‍🎓 Student Information

- **Student Name:** Varun C
- **Campus ID:** 2022HS70032  
- **Course:** SESAP ZG569 - Blockchain Technologies & Systems

## 🏗️ System Architecture

The system follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────┐
│                 Web Dashboard (Frontend)                 │
│                 HTML/CSS/JavaScript                      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/REST API
┌─────────────────────▼───────────────────────────────────┐
│                Express.js API Server                     │
│              TypeScript/Node.js                         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              SimpleBlockchain Core                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐    │
│  │ Blocks  │ │ Trans-  │ │ Mining  │ │ Wallet      │    │
│  │         │ │ actions │ │ System  │ │ Management  │    │
│  │ - Chain │ │ - UTXO  │ │ - PoW   │ │ - Keys      │    │
│  │ - Hash  │ │ - Pool  │ │ - Diff  │ │ - Balance   │    │
│  │ - Valid │ │ - Valid │ │ - Nonce │ │ - Address   │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Features

### Core Blockchain Features
- ✅ **Complete Blockchain Implementation** - Built from scratch using TypeScript
- ✅ **Proof-of-Work Mining** - SHA-256 based consensus mechanism
- ✅ **Digital Wallets** - Cryptographically secure key generation and management
- ✅ **Transaction Processing** - UTXO model with signature verification
- ✅ **Real-time Settlement** - Automated transaction confirmation and balance updates

### User Interface Features
- ✅ **Modern Web Dashboard** - Responsive HTML/CSS/JavaScript interface
- ✅ **Real-time Statistics** - Live blockchain metrics and performance monitoring
- ✅ **Wallet Management** - Create and manage multiple digital wallets
- ✅ **Transaction History** - Complete audit trail of all blockchain transactions
- ✅ **Mining Dashboard** - Interactive mining controls and reward tracking

### Technical Features
- ✅ **RESTful API** - Complete API layer for blockchain operations
- ✅ **Type Safety** - Full TypeScript implementation with strict typing
- ✅ **Error Handling** - Comprehensive error management and user feedback
- ✅ **Security** - ECDSA signatures, input validation, and CORS configuration

## 🛠️ Technology Stack

- **Backend:** Node.js, TypeScript, Express.js
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Cryptography:** SHA-256, ECDSA Digital Signatures
- **Database:** SQLite (for persistence)
- **Testing:** Jest
- **Development:** npm, TSC (TypeScript Compiler)

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/VarunC2022hs70032/blockchain-settlement-system.git
   cd blockchain-settlement-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open your web browser
   - Navigate to: `http://localhost:3000`
   - The blockchain dashboard will load automatically

## 🎯 Usage Guide

### 1. System Initialization
- Start the server with `npm run dev`
- Access the web dashboard at `http://localhost:3000`
- Verify system health using the `/health` endpoint

### 2. Wallet Management
- Click "Create New Wallet" to generate a new wallet
- Each wallet gets a unique cryptographic address
- View wallet balances and transaction history

### 3. Mining Operations
- Select a wallet to receive mining rewards
- Click "Mine New Block" to start proof-of-work mining
- Monitor mining progress and block creation times

### 4. Transaction Processing
- Create transactions between wallets
- Observe digital signature generation
- Track transactions from pending to confirmed status

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/health` | GET | System health check |
| `/api/stats` | GET | Blockchain statistics |
| `/api/wallet/create` | POST | Create new wallet |
| `/api/wallet/all` | GET | List all wallets |
| `/api/transaction/create` | POST | Create new transaction |
| `/api/mine` | POST | Mine new block |
| `/api/blocks` | GET | Get recent blocks |
| `/api/transactions/all` | GET | Get all transactions |

## 🔒 Security Features

- **SHA-256 Hashing** - Industry-standard cryptographic hashing
- **ECDSA Digital Signatures** - Transaction authentication and integrity
- **Input Validation** - Comprehensive API input sanitization
- **CORS Configuration** - Secure cross-origin request handling
- **Balance Validation** - Prevents insufficient balance transactions
- **Double-Spend Protection** - UTXO model prevents duplicate spending

## 📈 Performance Metrics

| Operation | Performance | Notes |
|-----------|-------------|--------|
| Block Mining | 1-3 seconds | Difficulty level 2 |
| Transaction Creation | <100ms | Instant response |
| API Response Time | <50ms | Average response |
| Memory Usage | ~30MB | For 100 blocks |

## 🧪 Testing

Run the test suite:
```bash
npm test
```

The project includes comprehensive tests for:
- Blockchain core functionality
- Transaction processing
- Wallet operations
- API endpoints

## 📚 Documentation

- **Assignment Report:** `ASSIGNMENT_REPORT.html` - Complete academic documentation
- **Demo Guide:** `DEMONSTRATION_GUIDE.md` - Step-by-step demonstration instructions
- **System Documentation:** `BLOCKCHAIN_SETTLEMENT_SYSTEM_DOCUMENTATION.md`

## 🎓 Academic Learning Outcomes

This project demonstrates mastery of:

### Blockchain Concepts
- Distributed ledger technology implementation
- Consensus mechanisms (Proof-of-Work)
- Cryptographic security principles
- Transaction processing and validation

### Technical Skills
- TypeScript/JavaScript development
- RESTful API design and implementation
- Modern web development practices
- System architecture and design patterns

## 🚧 Future Enhancements

- **Peer-to-Peer Networking** - Multi-node blockchain network
- **Smart Contracts** - Programmable transaction logic
- **Advanced Consensus** - Proof-of-stake implementation
- **Mobile Application** - Native mobile wallet interface
- **Enhanced Analytics** - Advanced blockchain metrics and visualization

## 📄 License

This project is developed for academic purposes as part of BITS Pilani coursework.


**Varun C**  
Campus ID: 2022HS70032  
Course: SESAP ZG569 - Blockchain Technologies & Systems  

---

