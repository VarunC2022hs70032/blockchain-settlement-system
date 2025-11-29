import { BaseComponent } from './BaseComponent.js';
import { stateManager, type BlockchainStats, type UserProfile } from './StateManager.js';

/**
 * Enhanced Dashboard Component
 * Features: Real-time updates, smooth animations, responsive design
 */
export class DashboardComponent extends BaseComponent {
  private unsubscribers: Array<() => void> = [];
  private animationFrame: number | null = null;
  private updateQueue: Set<string> = new Set();

  constructor(selector: string | HTMLElement) {
    super(selector);
    this.setupStateSubscriptions();
  }

  private setupStateSubscriptions(): void {
    // Subscribe to blockchain stats updates
    this.unsubscribers.push(
      stateManager.subscribe('blockchain', (stats: BlockchainStats) => {
        this.queueUpdate('stats');
        this.updateStatsDisplay(stats);
      })
    );

    // Subscribe to user profile updates
    this.unsubscribers.push(
      stateManager.subscribe('user', (user: UserProfile) => {
        this.queueUpdate('profile');
        this.updateProfileDisplay(user);
      })
    );

    // Subscribe to connection status
    this.unsubscribers.push(
      stateManager.subscribe('blockchain', (stats: BlockchainStats, prev: BlockchainStats) => {
        if (stats.isConnected !== prev.isConnected) {
          this.updateConnectionStatus(stats.isConnected);
        }
      })
    );
  }

  protected onMount(): void {
    // Load initial data
    this.loadInitialData();
    
    // Setup periodic updates
    this.startPeriodicUpdates();
    
    // Setup intersection observer for performance
    this.setupIntersectionObserver();
  }

  protected onUnmount(): void {
    // Cleanup subscriptions
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    
    // Cancel animation frame
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  private queueUpdate(type: string): void {
    this.updateQueue.add(type);
    if (!this.animationFrame) {
      this.animationFrame = requestAnimationFrame(() => {
        this.flushUpdates();
        this.animationFrame = null;
      });
    }
  }

  private flushUpdates(): void {
    if (this.updateQueue.has('stats')) {
      this.animateStatsUpdate();
    }
    if (this.updateQueue.has('profile')) {
      this.animateProfileUpdate();
    }
    this.updateQueue.clear();
  }

  public render(): string {
    const blockchainStats = stateManager.getBlockchainState();
    const userProfile = stateManager.getUserState();
    const computedStats = stateManager.getComputedStats();

    return `
      <div class="dashboard-container">
        <!-- Header Section -->
        <header class="dashboard-header" data-animate="slideDown">
          <div class="header-content">
            <div class="header-title">
              <h1>
                <i class="fas fa-cube rotating-icon"></i>
                Blockchain Settlement System
              </h1>
              <p class="subtitle">Enterprise-grade blockchain with real-time monitoring</p>
            </div>
            
            <div class="connection-indicator">
              <div class="status-badge ${blockchainStats.isConnected ? 'connected' : 'disconnected'}" 
                   id="connectionBadge">
                <div class="status-dot"></div>
                <span class="status-text">
                  ${blockchainStats.isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span class="client-count">${blockchainStats.clientCount} clients</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Stats Grid -->
        <div class="stats-grid" data-animate="staggerUp">
          <div class="stat-card blockchain-height" data-stat="height">
            <div class="stat-icon">
              <i class="fas fa-layer-group"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="statBlockHeight">${blockchainStats.blockHeight.toLocaleString()}</div>
              <div class="stat-label">Block Height</div>
              <div class="stat-trend positive">
                <i class="fas fa-arrow-up"></i>
                <span class="trend-text">+${blockchainStats.blockHeight > 0 ? '1' : '0'}</span>
              </div>
            </div>
          </div>

          <div class="stat-card hash-rate" data-stat="hashrate">
            <div class="stat-icon">
              <i class="fas fa-tachometer-alt"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="statHashRate">${this.formatHashRate(blockchainStats.hashRate)}</div>
              <div class="stat-label">Hash Rate</div>
              <div class="stat-trend ${blockchainStats.hashRate > 1000 ? 'positive' : 'neutral'}">
                <i class="fas fa-chart-line"></i>
                <span class="trend-text">${computedStats.networkHealth}</span>
              </div>
            </div>
          </div>

          <div class="stat-card total-supply" data-stat="supply">
            <div class="stat-icon">
              <i class="fas fa-coins"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="statTotalSupply">${blockchainStats.totalSupply.toFixed(4)}</div>
              <div class="stat-label">Total Supply (BTC)</div>
              <div class="stat-trend positive">
                <i class="fas fa-plus-circle"></i>
                <span class="trend-text">Mining Active</span>
              </div>
            </div>
          </div>

          <div class="stat-card difficulty" data-stat="difficulty">
            <div class="stat-icon">
              <i class="fas fa-shield-alt"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="statDifficulty">${blockchainStats.difficulty.toLocaleString()}</div>
              <div class="stat-label">Difficulty</div>
              <div class="stat-trend neutral">
                <i class="fas fa-balance-scale"></i>
                <span class="trend-text">Stable</span>
              </div>
            </div>
          </div>

          <div class="stat-card mempool-size" data-stat="mempool">
            <div class="stat-icon">
              <i class="fas fa-hourglass-half"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="statMempool">${blockchainStats.memPoolSize}</div>
              <div class="stat-label">Pending Transactions</div>
              <div class="stat-trend ${blockchainStats.memPoolSize > 5 ? 'warning' : 'positive'}">
                <i class="fas fa-clock"></i>
                <span class="trend-text">${blockchainStats.memPoolSize > 5 ? 'High Load' : 'Normal'}</span>
              </div>
            </div>
          </div>

          <div class="stat-card user-balance" data-stat="balance">
            <div class="stat-icon">
              <i class="fas fa-wallet"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="statUserBalance">${userProfile.totalBalance.toFixed(4)}</div>
              <div class="stat-label">Your Balance (BTC)</div>
              <div class="stat-trend positive">
                <i class="fas fa-dollar-sign"></i>
                <span class="trend-text">≈$${computedStats.userPortfolioValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions" data-animate="fadeUp">
          <h2 class="section-title">
            <i class="fas fa-bolt"></i>
            Quick Actions
          </h2>
          
          <div class="actions-grid">
            <button class="action-card primary" data-action="mine" id="mineButton">
              <div class="action-icon">
                <i class="fas fa-pickaxe"></i>
              </div>
              <div class="action-content">
                <h3>Mine Block</h3>
                <p>Start mining a new block</p>
              </div>
              <div class="action-arrow">
                <i class="fas fa-chevron-right"></i>
              </div>
            </button>

            <button class="action-card success" data-action="send" id="sendButton">
              <div class="action-icon">
                <i class="fas fa-paper-plane"></i>
              </div>
              <div class="action-content">
                <h3>Send Transaction</h3>
                <p>Transfer cryptocurrency</p>
              </div>
              <div class="action-arrow">
                <i class="fas fa-chevron-right"></i>
              </div>
            </button>

            <button class="action-card info" data-action="wallet" id="walletButton">
              <div class="action-icon">
                <i class="fas fa-wallet"></i>
              </div>
              <div class="action-content">
                <h3>Manage Wallets</h3>
                <p>View and create wallets</p>
              </div>
              <div class="action-arrow">
                <i class="fas fa-chevron-right"></i>
              </div>
            </button>

            <button class="action-card warning" data-action="explorer" id="explorerButton">
              <div class="action-icon">
                <i class="fas fa-search"></i>
              </div>
              <div class="action-content">
                <h3>Blockchain Explorer</h3>
                <p>Browse blocks and transactions</p>
              </div>
              <div class="action-arrow">
                <i class="fas fa-chevron-right"></i>
              </div>
            </button>
          </div>
        </div>

        <!-- System Health -->
        <div class="system-health" data-animate="fadeUp">
          <h2 class="section-title">
            <i class="fas fa-heartbeat"></i>
            System Health
          </h2>
          
          <div class="health-grid">
            <div class="health-metric">
              <div class="metric-header">
                <span class="metric-name">Network Status</span>
                <span class="metric-status ${computedStats.networkHealth}">
                  ${computedStats.networkHealth.toUpperCase()}
                </span>
              </div>
              <div class="metric-bar">
                <div class="metric-progress" style="width: ${blockchainStats.isConnected ? '100' : '0'}%"></div>
              </div>
            </div>

            <div class="health-metric">
              <div class="metric-header">
                <span class="metric-name">System Load</span>
                <span class="metric-value">${Math.round(computedStats.systemLoad)}%</span>
              </div>
              <div class="metric-bar">
                <div class="metric-progress" style="width: ${computedStats.systemLoad}%"></div>
              </div>
            </div>

            <div class="health-metric">
              <div class="metric-header">
                <span class="metric-name">Connection Quality</span>
                <span class="metric-status ${computedStats.connectionQuality}">
                  ${computedStats.connectionQuality.toUpperCase()}
                </span>
              </div>
              <div class="metric-bar">
                <div class="metric-progress" style="width: ${computedStats.connectionQuality === 'good' ? '90' : '30'}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected bindEvents(): void {
    // Bind action buttons
    const mineButton = this.query('#mineButton');
    const sendButton = this.query('#sendButton');
    const walletButton = this.query('#walletButton');
    const explorerButton = this.query('#explorerButton');

    if (mineButton) {
      mineButton.addEventListener('click', () => this.handleMineAction());
    }

    if (sendButton) {
      sendButton.addEventListener('click', () => this.handleSendAction());
    }

    if (walletButton) {
      walletButton.addEventListener('click', () => this.handleWalletAction());
    }

    if (explorerButton) {
      explorerButton.addEventListener('click', () => this.handleExplorerAction());
    }

    // Setup stat card hover effects
    this.queryAll('.stat-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        this.animateStatHover(card as HTMLElement, true);
      });

      card.addEventListener('mouseleave', () => {
        this.animateStatHover(card as HTMLElement, false);
      });
    });

    // Setup entrance animations
    this.setupEntranceAnimations();
  }

  private setupEntranceAnimations(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const animationType = element.dataset.animate;
          
          switch (animationType) {
            case 'slideDown':
              this.animateSlideDown(element);
              break;
            case 'staggerUp':
              this.animateStaggerUp(element);
              break;
            case 'fadeUp':
              this.animateFadeUp(element);
              break;
          }
          
          observer.unobserve(element);
        }
      });
    }, { threshold: 0.1 });

    this.queryAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });
  }

  private animateSlideDown(element: HTMLElement): void {
    element.animate([
      { opacity: 0, transform: 'translateY(-30px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'both'
    });
  }

  private animateStaggerUp(element: HTMLElement): void {
    const cards = element.querySelectorAll('.stat-card');
    cards.forEach((card, index) => {
      (card as HTMLElement).animate([
        { opacity: 0, transform: 'translateY(30px) scale(0.95)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], {
        duration: 500,
        delay: index * 100,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'both'
      });
    });
  }

  private animateFadeUp(element: HTMLElement): void {
    element.animate([
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: 400,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'both'
    });
  }

  private animateStatHover(card: HTMLElement, hover: boolean): void {
    const icon = card.querySelector('.stat-icon') as HTMLElement;
    const trend = card.querySelector('.stat-trend') as HTMLElement;

    if (hover) {
      card.animate([
        { transform: 'translateY(0) scale(1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
        { transform: 'translateY(-5px) scale(1.02)', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }
      ], {
        duration: 200,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      });

      if (icon) {
        icon.animate([
          { transform: 'scale(1) rotate(0deg)' },
          { transform: 'scale(1.1) rotate(5deg)' }
        ], {
          duration: 200,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          fill: 'forwards'
        });
      }
    } else {
      card.animate([
        { transform: 'translateY(-5px) scale(1.02)', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' },
        { transform: 'translateY(0) scale(1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }
      ], {
        duration: 200,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      });

      if (icon) {
        icon.animate([
          { transform: 'scale(1.1) rotate(5deg)' },
          { transform: 'scale(1) rotate(0deg)' }
        ], {
          duration: 200,
          fill: 'forwards'
        });
      }
    }
  }

  private updateStatsDisplay(stats: BlockchainStats): void {
    this.updateStatValue('statBlockHeight', stats.blockHeight.toLocaleString());
    this.updateStatValue('statHashRate', this.formatHashRate(stats.hashRate));
    this.updateStatValue('statTotalSupply', stats.totalSupply.toFixed(4));
    this.updateStatValue('statDifficulty', stats.difficulty.toLocaleString());
    this.updateStatValue('statMempool', stats.memPoolSize.toString());
  }

  private updateProfileDisplay(profile: UserProfile): void {
    this.updateStatValue('statUserBalance', profile.totalBalance.toFixed(4));
  }

  private updateStatValue(id: string, value: string): void {
    const element = this.query(`#${id}`);
    if (element && element.textContent !== value) {
      // Animate the change
      element.animate([
        { transform: 'scale(1)', color: 'currentColor' },
        { transform: 'scale(1.05)', color: '#00ff00' },
        { transform: 'scale(1)', color: 'currentColor' }
      ], {
        duration: 300,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      });
      
      element.textContent = value;
    }
  }

  private updateConnectionStatus(isConnected: boolean): void {
    const badge = this.query('#connectionBadge');
    if (badge) {
      badge.className = `status-badge ${isConnected ? 'connected' : 'disconnected'}`;
      
      // Animate connection change
      badge.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' }
      ], {
        duration: 400,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      });
    }
  }

  private animateStatsUpdate(): void {
    const statsGrid = this.query('.stats-grid');
    if (statsGrid) {
      (statsGrid as HTMLElement).animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.01)', opacity: 0.95 },
        { transform: 'scale(1)', opacity: 1 }
      ], {
        duration: 300,
        easing: 'ease-out'
      });
    }
  }

  private animateProfileUpdate(): void {
    const balanceCard = this.query('[data-stat="balance"]');
    if (balanceCard) {
      (balanceCard as HTMLElement).animate([
        { borderColor: 'transparent' },
        { borderColor: '#00ff00' },
        { borderColor: 'transparent' }
      ], {
        duration: 500,
        easing: 'ease-in-out'
      });
    }
  }

  private formatHashRate(hashRate: number): string {
    if (hashRate >= 1e12) {
      return `${(hashRate / 1e12).toFixed(1)} TH/s`;
    } else if (hashRate >= 1e9) {
      return `${(hashRate / 1e9).toFixed(1)} GH/s`;
    } else if (hashRate >= 1e6) {
      return `${(hashRate / 1e6).toFixed(1)} MH/s`;
    } else if (hashRate >= 1e3) {
      return `${(hashRate / 1e3).toFixed(1)} KH/s`;
    } else {
      return `${Math.round(hashRate)} H/s`;
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      const response = await fetch('/api/stats');
      const stats = await response.json();
      stateManager.updateBlockchainStats(stats);
    } catch (error) {
      console.error('Failed to load initial stats:', error);
    }
  }

  private startPeriodicUpdates(): void {
    setInterval(async () => {
      try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        stateManager.updateBlockchainStats(stats);
      } catch (error) {
        console.error('Failed to update stats:', error);
      }
    }, 5000); // Update every 5 seconds
  }

  private setupIntersectionObserver(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.element.classList.add('visible');
        }
      });
    });

    observer.observe(this.element);
  }

  // Action handlers
  private handleMineAction(): void {
    this.emit('navigate', { section: 'mining' });
    
    // Add haptic feedback animation
    const button = this.query('#mineButton');
    if (button) {
      (button as HTMLElement).animate([
        { transform: 'scale(1)' },
        { transform: 'scale(0.95)' },
        { transform: 'scale(1.02)' },
        { transform: 'scale(1)' }
      ], {
        duration: 200,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      });
    }
  }

  private handleSendAction(): void {
    this.emit('navigate', { section: 'transactions' });
  }

  private handleWalletAction(): void {
    this.emit('navigate', { section: 'wallets' });
  }

  private handleExplorerAction(): void {
    this.emit('navigate', { section: 'blockchain' });
  }
}
