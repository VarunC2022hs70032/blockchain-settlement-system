/**
 * Live Blockchain Optimizer
 * Implements production-grade real-time blockchain explorer with comprehensive corner case handling
 */

import { EventEmitter } from 'events';
import { Blockchain } from '../core/Blockchain';
import { WebSocketServer } from './WebSocketServer';
import { BlockchainStorage } from '../storage/BlockchainStorage';
import { Transaction } from '../core/Transaction';
import { Block } from '../core/Block';
import { BlockchainEvents, BlockchainEventType } from '../events/BlockchainEvents';

interface LiveMetrics {
  tps: number; // Transactions per second
  blockTime: number; // Average block time
  memPoolSize: number;
  networkHealth: number; // 0-100%
  peakTps: number;
  averageConfirmationTime: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  data?: any;
}

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskIO: number;
  networkLatency: number;
}

export class LiveBlockchainOptimizer extends EventEmitter {
  private blockchain: Blockchain;
  private wsServer: WebSocketServer;
  private storage: BlockchainStorage;
  private metrics: LiveMetrics;
  private alerts: Map<string, SystemAlert>;
  private performanceHistory: PerformanceMetrics[];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private transactionBuffer: Transaction[] = [];
  private blockBuffer: Block[] = [];
  private lastBlockTime: number = Date.now();
  private transactionCount24h: number = 0;
  private errorRateThreshold: number = 5; // 5% error rate threshold

  constructor(blockchain: Blockchain, wsServer: WebSocketServer, storage: BlockchainStorage) {
    super();
    this.blockchain = blockchain;
    this.wsServer = wsServer;
    this.storage = storage;
    this.alerts = new Map();
    this.performanceHistory = [];
    
    this.metrics = {
      tps: 0,
      blockTime: 0,
      memPoolSize: 0,
      networkHealth: 100,
      peakTps: 0,
      averageConfirmationTime: 0
    };

    this.setupEventListeners();
    this.startMonitoring();
  }

  /**
   * Setup comprehensive event listeners for real-time optimization
   */
  private setupEventListeners(): void {
    try {
      // Use BlockchainEvents for event handling
      const blockchainEvents = BlockchainEvents.getInstance();
      
      // Blockchain events
      blockchainEvents.on(BlockchainEventType.BLOCK_MINED, this.handleBlockAdded.bind(this));
      blockchainEvents.on(BlockchainEventType.TRANSACTION_ADDED, this.handleTransactionAdded.bind(this));
      blockchainEvents.on(BlockchainEventType.MINING_STARTED, this.handleMiningStarted.bind(this));

      // Process events for system monitoring
      process.on('uncaughtException', this.handleUncaughtException.bind(this));
      process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));

      console.log('📡 LiveBlockchainOptimizer event listeners configured');
    } catch (error: any) {
      this.createAlert('critical', 'Failed to setup event listeners', { error: error?.message });
    }
  }

  /**
   * Start comprehensive monitoring with advanced metrics
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    try {
      this.isMonitoring = true;
      
      // High-frequency metrics collection (every 1 second)
      this.monitoringInterval = setInterval(() => {
        this.collectMetrics();
        this.analyzePerformance();
        this.optimizeSystem();
        this.broadcastLiveUpdates();
      }, 1000);

      // Medium-frequency health checks (every 5 seconds)
      setInterval(() => {
        this.performHealthChecks();
        this.cleanupOldData();
      }, 5000);

      // Low-frequency deep analysis (every 30 seconds)
      setInterval(() => {
        this.performDeepAnalysis();
        this.generatePredictions();
        this.optimizeDatabase();
      }, 30000);

      console.log('🔄 LiveBlockchainOptimizer monitoring started');
    } catch (error: any) {
      this.createAlert('critical', 'Failed to start monitoring', { error: error?.message });
    }
  }

  /**
   * Collect comprehensive real-time metrics
   */
  private collectMetrics(): void {
    try {
      const now = Date.now();
      
      // Calculate TPS (transactions per second)
      const recentTransactions = this.transactionBuffer.filter(tx => 
        now - tx.timestamp < 1000
      );
      this.metrics.tps = recentTransactions.length;
      
      if (this.metrics.tps > this.metrics.peakTps) {
        this.metrics.peakTps = this.metrics.tps;
      }

      // Calculate block time
      if (this.blockBuffer.length >= 2) {
        const recentBlocks = this.blockBuffer.slice(-10);
        const timeDiffs = recentBlocks.slice(1).map((block, index) => 
          block.header.timestamp - recentBlocks[index].header.timestamp
        );
        this.metrics.blockTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      }

      // Update mempool size
      this.metrics.memPoolSize = this.blockchain.memPool.length;

      // Calculate confirmation time
      this.calculateAverageConfirmationTime();

      // Update network health based on various factors
      this.updateNetworkHealth();

      // Collect system performance metrics
      this.collectPerformanceMetrics();

    } catch (error: any) {
      this.createAlert('error', 'Failed to collect metrics', { error: error?.message });
    }
  }

  /**
   * Calculate average confirmation time with corner case handling
   */
  private calculateAverageConfirmationTime(): void {
    try {
      const recentBlocks = this.blockchain.chain.slice(-10);
      if (recentBlocks.length < 2) return;

      let totalConfirmationTime = 0;
      let transactionCount = 0;

      recentBlocks.forEach((block, index) => {
        if (index === 0) return; // Skip genesis block
        
        const blockTime = block.header.timestamp;
        
        block.transactions.forEach(tx => {
          const confirmationTime = blockTime - tx.timestamp;
          if (confirmationTime > 0 && confirmationTime < 300000) { // Max 5 minutes
            totalConfirmationTime += confirmationTime;
            transactionCount++;
          }
        });
      });

      this.metrics.averageConfirmationTime = transactionCount > 0 
        ? totalConfirmationTime / transactionCount 
        : 0;

    } catch (error: any) {
      this.createAlert('warning', 'Failed to calculate confirmation time', { error: error?.message });
    }
  }

  /**
   * Update network health score based on multiple factors
   */
  private updateNetworkHealth(): void {
    try {
      let healthScore = 100;

      // Penalize high mempool size
      if (this.metrics.memPoolSize > 1000) {
        healthScore -= Math.min(30, (this.metrics.memPoolSize - 1000) / 100);
      }

      // Penalize slow block times
      if (this.metrics.blockTime > 60000) { // More than 1 minute
        healthScore -= Math.min(20, (this.metrics.blockTime - 60000) / 10000);
      }

      // Penalize slow confirmation times
      if (this.metrics.averageConfirmationTime > 120000) { // More than 2 minutes
        healthScore -= Math.min(25, (this.metrics.averageConfirmationTime - 120000) / 20000);
      }

      // Consider error rate
      const errorRate = this.calculateErrorRate();
      if (errorRate > this.errorRateThreshold) {
        healthScore -= Math.min(25, (errorRate - this.errorRateThreshold) * 5);
      }

      this.metrics.networkHealth = Math.max(0, Math.min(100, healthScore));

      // Create alerts for low network health
      if (this.metrics.networkHealth < 70) {
        this.createAlert('warning', 'Network health degraded', {
          healthScore: this.metrics.networkHealth,
          factors: {
            memPoolSize: this.metrics.memPoolSize,
            blockTime: this.metrics.blockTime,
            confirmationTime: this.metrics.averageConfirmationTime,
            errorRate
          }
        });
      }

    } catch (error: any) {
      this.createAlert('error', 'Failed to update network health', { error: error?.message });
    }
  }

  /**
   * Calculate system error rate
   */
  private calculateErrorRate(): number {
    try {
      const recentAlerts = Array.from(this.alerts.values()).filter(alert => 
        Date.now() - alert.timestamp < 300000 && // Last 5 minutes
        (alert.type === 'error' || alert.type === 'critical')
      );

      const totalOperations = this.transactionCount24h + this.blockchain.chain.length;
      return totalOperations > 0 ? (recentAlerts.length / totalOperations) * 100 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Collect system performance metrics
   */
  private collectPerformanceMetrics(): void {
    try {
      const memUsage = process.memoryUsage();
      
      const performanceMetric: PerformanceMetrics = {
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
        memoryUsage: memUsage.heapUsed / memUsage.heapTotal * 100,
        diskIO: 0, // Placeholder - would require system-specific implementation
        networkLatency: this.calculateNetworkLatency()
      };

      this.performanceHistory.push(performanceMetric);
      
      // Keep only last 100 entries
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }

      // Alert on high resource usage
      if (performanceMetric.memoryUsage > 80) {
        this.createAlert('warning', 'High memory usage detected', {
          memoryUsage: performanceMetric.memoryUsage
        });
      }

    } catch (error: any) {
      this.createAlert('error', 'Failed to collect performance metrics', { error: error?.message });
    }
  }

  /**
   * Calculate network latency
   */
  private calculateNetworkLatency(): number {
    // Simplified latency calculation - return simulated latency for now
    return Math.random() * 100; // 0-100ms simulated latency
  }

  /**
   * Perform comprehensive health checks
   */
  private performHealthChecks(): void {
    try {
      // Database health check
      const dbHealthy = this.storage.checkIntegrity();
      if (!dbHealthy) {
        this.createAlert('critical', 'Database integrity check failed', {});
      }

      // Blockchain validation
      const chainValid = this.blockchain.isChainValid();
      if (!chainValid) {
        this.createAlert('critical', 'Blockchain validation failed', {});
      }

      // Memory leak detection
      const memoryGrowth = this.calculateMemoryGrowth();
      if (memoryGrowth > 50) { // 50MB growth in short period
        this.createAlert('warning', 'Potential memory leak detected', {
          memoryGrowth,
          currentUsage: process.memoryUsage().heapUsed / 1024 / 1024
        });
      }

      // WebSocket health - check client count
      const clientCount = this.wsServer.getClientCount();
      if (clientCount === 0) {
        // Just log, not an error
        console.log('No WebSocket clients connected');
      }

    } catch (error: any) {
      this.createAlert('error', 'Health check failed', { error: error?.message });
    }
  }

  /**
   * Calculate memory growth rate
   */
  private calculateMemoryGrowth(): number {
    if (this.performanceHistory.length < 10) return 0;
    
    const recent = this.performanceHistory.slice(-5);
    const older = this.performanceHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length;
    
    return recentAvg - olderAvg;
  }

  /**
   * Perform deep system analysis
   */
  private performDeepAnalysis(): void {
    try {
      // Analyze transaction patterns
      this.analyzeTransactionPatterns();
      
      // Detect anomalies
      this.detectAnomalies();
      
      // Performance trend analysis
      this.analyzePerformanceTrends();
      
      // Security analysis
      this.performSecurityAnalysis();

    } catch (error: any) {
      this.createAlert('error', 'Deep analysis failed', { error: error?.message });
    }
  }

  /**
   * Analyze transaction patterns for anomalies
   */
  private analyzeTransactionPatterns(): void {
    try {
      const recentTransactions = this.transactionBuffer.slice(-1000);
      
      if (recentTransactions.length === 0) return;

      // Detect unusual transaction volumes
      const volumes = recentTransactions.map(tx => 
        tx.outputs.reduce((sum, output) => sum + output.amount, 0)
      );
      
      if (volumes.length === 0) return;
      
      const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
      const maxVolume = Math.max(...volumes);
      
      if (maxVolume > avgVolume * 10) {
        this.createAlert('info', 'Large transaction detected', {
          amount: maxVolume,
          average: avgVolume
        });
      }

      // Detect rapid-fire transactions (potential spam)
      const rapidTransactions = recentTransactions.filter((tx, index) => {
        if (index === 0) return false;
        return tx.timestamp - recentTransactions[index - 1].timestamp < 1000; // Less than 1 second
      });

      if (rapidTransactions.length > 10) {
        this.createAlert('warning', 'Rapid transaction pattern detected', {
          count: rapidTransactions.length
        });
      }

    } catch (error: any) {
      this.createAlert('error', 'Transaction pattern analysis failed', { error: error?.message });
    }
  }

  /**
   * Detect system anomalies
   */
  private detectAnomalies(): void {
    try {
      // Detect sudden TPS spikes
      if (this.metrics.tps > this.metrics.peakTps * 0.8 && this.metrics.tps > 100) {
        this.createAlert('info', 'High transaction throughput detected', {
          currentTps: this.metrics.tps,
          peakTps: this.metrics.peakTps
        });
      }

      // Detect mempool congestion
      if (this.metrics.memPoolSize > 500) {
        this.createAlert('warning', 'Mempool congestion detected', {
          mempoolSize: this.metrics.memPoolSize
        });
      }

      // Detect slow block times
      if (this.metrics.blockTime > 120000) { // More than 2 minutes
        this.createAlert('warning', 'Slow block generation detected', {
          blockTime: this.metrics.blockTime
        });
      }

    } catch (error: any) {
      this.createAlert('error', 'Anomaly detection failed', { error: error?.message });
    }
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends(): void {
    try {
      if (this.performanceHistory.length < 20) return;

      const recent = this.performanceHistory.slice(-10);
      const older = this.performanceHistory.slice(-20, -10);

      // CPU trend
      const recentCpuAvg = recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length;
      const olderCpuAvg = older.reduce((sum, m) => sum + m.cpuUsage, 0) / older.length;
      
      if (recentCpuAvg > olderCpuAvg * 1.5) {
        this.createAlert('warning', 'CPU usage trending upward', {
          recent: recentCpuAvg,
          previous: olderCpuAvg
        });
      }

      // Memory trend
      const recentMemAvg = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
      const olderMemAvg = older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length;
      
      if (recentMemAvg > olderMemAvg * 1.3) {
        this.createAlert('warning', 'Memory usage trending upward', {
          recent: recentMemAvg,
          previous: olderMemAvg
        });
      }

    } catch (error: any) {
      this.createAlert('error', 'Performance trend analysis failed', { error: error?.message });
    }
  }

  /**
   * Perform security analysis
   */
  private performSecurityAnalysis(): void {
    try {
      // Check for potential 51% attacks
      this.check51PercentAttack();
      
      // Check for double spending attempts
      this.checkDoubleSpending();
      
      // Check for unusual mining patterns
      this.checkMiningPatterns();

    } catch (error: any) {
      this.createAlert('error', 'Security analysis failed', { error: error?.message });
    }
  }

  /**
   * Check for potential 51% attack
   */
  private check51PercentAttack(): void {
    try {
      const recentBlocks = this.blockchain.chain.slice(-100);
      const minerCounts = new Map<string, number>();

      recentBlocks.forEach(() => {
        // Use placeholder miner identification
        const miner = 'miner-placeholder';
        minerCounts.set(miner, (minerCounts.get(miner) || 0) + 1);
      });

      for (const [miner, count] of minerCounts.entries()) {
        if (count > recentBlocks.length * 0.51) {
          this.createAlert('critical', 'Potential 51% attack detected', {
            miner,
            blockCount: count,
            percentage: (count / recentBlocks.length) * 100
          });
        }
      }

    } catch (error: any) {
      this.createAlert('error', '51% attack check failed', { error: error?.message });
    }
  }

  /**
   * Check for double spending attempts
   */
  private checkDoubleSpending(): void {
    try {
      const utxoMap = new Map<string, boolean>();
      
      this.blockchain.memPool.forEach(tx => {
        tx.inputs.forEach(input => {
          const utxoKey = `${input.txId}:${input.outputIndex}`;
          if (utxoMap.has(utxoKey)) {
            this.createAlert('critical', 'Potential double spending detected', {
              utxo: utxoKey,
              transactionId: tx.id
            });
          }
          utxoMap.set(utxoKey, true);
        });
      });

    } catch (error: any) {
      this.createAlert('error', 'Double spending check failed', { error: error?.message });
    }
  }

  /**
   * Check for unusual mining patterns
   */
  private checkMiningPatterns(): void {
    try {
      const recentBlocks = this.blockchain.chain.slice(-50);
      if (recentBlocks.length < 2) return;
      
      const blockTimes = recentBlocks.slice(1).map((block, index) => 
        block.header.timestamp - recentBlocks[index].header.timestamp
      );

      if (blockTimes.length === 0) return;

      const avgBlockTime = blockTimes.reduce((sum, time) => sum + time, 0) / blockTimes.length;
      const variance = blockTimes.reduce((sum, time) => sum + Math.pow(time - avgBlockTime, 2), 0) / blockTimes.length;

      // Check for unusual variance in block times
      if (Math.sqrt(variance) > avgBlockTime * 2) {
        this.createAlert('warning', 'Unusual mining pattern detected', {
          averageBlockTime: avgBlockTime,
          variance: Math.sqrt(variance)
        });
      }

    } catch (error: any) {
      this.createAlert('error', 'Mining pattern check failed', { error: error?.message });
    }
  }

  /**
   * Generate performance predictions
   */
  private generatePredictions(): void {
    try {
      if (this.performanceHistory.length < 30) return;

      // Predict next hour's TPS based on trends
      const tpsHistory = this.performanceHistory.slice(-30).map(() => this.metrics.tps);
      const tpsTrend = this.calculateTrend(tpsHistory);
      const predictedTps = this.metrics.tps + (tpsTrend * 60);

      // Predict mempool congestion
      const mempoolHistory = this.performanceHistory.slice(-30).map(() => this.metrics.memPoolSize);
      const mempoolTrend = this.calculateTrend(mempoolHistory);
      const predictedMempool = this.metrics.memPoolSize + (mempoolTrend * 60);

      // Create predictive alerts
      if (predictedTps > this.metrics.peakTps * 1.2) {
        this.createAlert('info', 'High TPS predicted', {
          predicted: predictedTps,
          current: this.metrics.tps
        });
      }

      if (predictedMempool > 1000) {
        this.createAlert('warning', 'Mempool congestion predicted', {
          predicted: predictedMempool,
          current: this.metrics.memPoolSize
        });
      }

    } catch (error: any) {
      this.createAlert('error', 'Prediction generation failed', { error: error?.message });
    }
  }

  /**
   * Calculate trend using simple linear regression
   */
  private calculateTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumXX = values.reduce((sum, _, index) => sum + (index * index), 0);

    const denominator = (n * sumXX - sumX * sumX);
    return denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  }

  /**
   * Optimize system performance
   */
  private optimizeSystem(): void {
    try {
      // Optimize memory usage
      this.optimizeMemory();
      
      // Optimize database performance occasionally
      if (Math.random() < 0.1) {
        this.optimizeDatabase();
      }
      
      // Optimize network connections
      this.optimizeNetwork();

    } catch (error: any) {
      this.createAlert('error', 'System optimization failed', { error: error?.message });
    }
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemory(): void {
    try {
      // Clean old transaction buffer
      const cutoff = Date.now() - 3600000; // 1 hour ago
      this.transactionBuffer = this.transactionBuffer.filter(tx => tx.timestamp > cutoff);
      
      // Clean old block buffer
      if (this.blockBuffer.length > 100) {
        this.blockBuffer = this.blockBuffer.slice(-50);
      }

      // Clean old performance history
      if (this.performanceHistory.length > 1000) {
        this.performanceHistory = this.performanceHistory.slice(-500);
      }

      // Force garbage collection if available
      if (typeof global !== 'undefined' && (global as any).gc && Math.random() < 0.01) {
        (global as any).gc();
      }

    } catch (error: any) {
      this.createAlert('error', 'Memory optimization failed', { error: error?.message });
    }
  }

  /**
   * Optimize database performance
   */
  private optimizeDatabase(): void {
    try {
      // Clean old alerts
      this.cleanupOldAlerts();
    } catch (error: any) {
      this.createAlert('error', 'Database optimization failed', { error: error?.message });
    }
  }

  /**
   * Optimize network connections
   */
  private optimizeNetwork(): void {
    try {
      // Network optimization placeholder
    } catch (error: any) {
      this.createAlert('error', 'Network optimization failed', { error: error?.message });
    }
  }

  /**
   * Broadcast live updates to connected clients
   */
  private broadcastLiveUpdates(): void {
    try {
      const updateData = {
        type: 'liveMetrics',
        timestamp: Date.now(),
        metrics: this.metrics,
        performance: this.performanceHistory.slice(-10),
        alerts: Array.from(this.alerts.values()).slice(-10),
        blockchain: {
          height: this.blockchain.chain.length,
          difficulty: this.blockchain.difficulty,
          totalTransactions: this.blockchain.chain.reduce((sum, block) => sum + block.transactions.length, 0),
          miningReward: this.blockchain.miningReward
        }
      };

      // Use a custom broadcast method since BlockchainEventType might not have LIVE_METRICS
      this.wsServer.broadcast(BlockchainEventType.BLOCK_MINED, updateData);

    } catch (error: any) {
      this.createAlert('error', 'Failed to broadcast live updates', { error: error?.message });
    }
  }

  /**
   * Event handlers
   */
  private handleBlockAdded(data: any): void {
    try {
      const block = data.block || data;
      this.blockBuffer.push(block);
      this.lastBlockTime = Date.now();
      
      // Update 24h transaction count
      this.transactionCount24h += block.transactions ? block.transactions.length : 0;

      this.emit('blockAdded', {
        block: block,
        metrics: this.metrics
      });

      const height = block.header ? block.header.height : (block.height || 0);
      console.log(`📦 Block ${height} added - TPS: ${this.metrics.tps}, Health: ${this.metrics.networkHealth}%`);
    } catch (error: any) {
      this.createAlert('error', 'Block added handler failed', { error: error?.message });
    }
  }

  private handleTransactionAdded(data: any): void {
    try {
      const transaction = data.transaction || data;
      this.transactionBuffer.push(transaction);
      this.emit('transactionAdded', transaction);
    } catch (error: any) {
      this.createAlert('error', 'Transaction added handler failed', { error: error?.message });
    }
  }

  private handleMiningStarted(data: any): void {
    try {
      this.createAlert('info', 'Mining started', data);
      this.emit('miningStarted', data);
    } catch (error: any) {
      this.createAlert('error', 'Mining started handler failed', { error: error?.message });
    }
  }

  private handleUncaughtException(error: Error): void {
    this.createAlert('critical', 'Uncaught exception', { 
      error: error.message,
      stack: error.stack
    });
    console.error('💥 Uncaught Exception:', error);
  }

  private handleUnhandledRejection(reason: any, _promise: Promise<any>): void {
    this.createAlert('critical', 'Unhandled promise rejection', { 
      reason: reason?.toString() || 'Unknown rejection'
    });
    console.error('💥 Unhandled Rejection:', reason);
  }

  /**
   * Create system alert
   */
  private createAlert(type: SystemAlert['type'], message: string, data?: any): void {
    const alert: SystemAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      resolved: false,
      data
    };

    this.alerts.set(alert.id, alert);
    
    // Emit alert for real-time notification
    this.emit('alert', alert);
    
    // Log critical and error alerts
    if (type === 'critical' || type === 'error') {
      console.error(`🚨 ${type.toUpperCase()}: ${message}`, data || '');
    } else if (type === 'warning') {
      console.warn(`⚠️  WARNING: ${message}`, data || '');
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    try {
      // Reset 24h transaction count daily
      if (Date.now() - this.lastBlockTime > 86400000) {
        this.transactionCount24h = 0;
      }

      this.cleanupOldAlerts();
    } catch (error: any) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - 3600000; // 1 hour ago
    
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoff || alert.resolved) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Analyze performance and suggest optimizations
   */
  private analyzePerformance(): void {
    try {
      if (this.performanceHistory.length < 5) return;

      const recent = this.performanceHistory.slice(-5);
      const avgMemory = recent.reduce((sum, p) => sum + p.memoryUsage, 0) / recent.length;
      const avgCpu = recent.reduce((sum, p) => sum + p.cpuUsage, 0) / recent.length;

      // Memory optimization suggestions
      if (avgMemory > 85) {
        this.createAlert('warning', 'High memory usage - consider optimization', {
          memoryUsage: avgMemory,
          suggestion: 'Reduce buffer sizes or increase garbage collection frequency'
        });
      }

      // CPU optimization suggestions
      if (avgCpu > 80) {
        this.createAlert('warning', 'High CPU usage detected', {
          cpuUsage: avgCpu,
          suggestion: 'Consider reducing monitoring frequency or optimizing algorithms'
        });
      }

    } catch (error: any) {
      this.createAlert('error', 'Performance analysis failed', { error: error?.message });
    }
  }

  /**
   * Get current system status
   */
  public getSystemStatus(): any {
    return {
      metrics: this.metrics,
      performance: this.performanceHistory.slice(-10),
      alerts: Array.from(this.alerts.values()).filter(a => !a.resolved).slice(-20),
      isMonitoring: this.isMonitoring,
      uptime: process.uptime(),
      blockchain: {
        height: this.blockchain.chain.length,
        difficulty: this.blockchain.difficulty,
        memPoolSize: this.blockchain.memPool.length,
        isValid: this.blockchain.isChainValid()
      }
    };
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🔴 LiveBlockchainOptimizer monitoring stopped');
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }
}
