/**
 * Global State Management System
 * Implements reactive state with optimized updates
 */

interface BlockchainStats {
  blockHeight: number;
  totalTransactions: number;
  totalSupply: number;
  difficulty: number;
  memPoolSize: number;
  hashRate: number;
  isConnected: boolean;
  clientCount: number;
}

interface UserProfile {
  id?: string;
  username?: string;
  displayName?: string;
  email?: string;
  totalBalance: number;
  walletAddresses: string[];
  isAuthenticated: boolean;
}

interface SystemState {
  blockchain: BlockchainStats;
  user: UserProfile;
  ui: {
    activeSection: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: Notification[];
    isLoading: boolean;
  };
  realtime: {
    events: BlockchainEvent[];
    particles: ParticleData[];
  };
}

interface BlockchainEvent {
  id: string;
  type: 'block' | 'transaction' | 'mining' | 'connection' | 'error';
  message: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
}

interface ParticleData {
  id: string;
  type: 'transaction' | 'mining' | 'block';
  x: number;
  y: number;
  timestamp: number;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  persistent?: boolean;
}

type StateListener<T = any> = (newState: T, prevState: T) => void;
type Unsubscribe = () => void;

export class StateManager {
  private static instance: StateManager;
  private state: SystemState;
  private listeners: Map<string, Set<StateListener>> = new Map();
  private middlewares: Array<(action: any, state: SystemState) => void> = [];

  private constructor() {
    this.state = this.getInitialState();
    this.setupDevTools();
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  private getInitialState(): SystemState {
    return {
      blockchain: {
        blockHeight: 0,
        totalTransactions: 0,
        totalSupply: 0,
        difficulty: 0,
        memPoolSize: 0,
        hashRate: 0,
        isConnected: false,
        clientCount: 0
      },
      user: {
        totalBalance: 0,
        walletAddresses: [],
        isAuthenticated: false
      },
      ui: {
        activeSection: 'dashboard',
        theme: 'auto',
        notifications: [],
        isLoading: false
      },
      realtime: {
        events: [],
        particles: []
      }
    };
  }

  // State getters
  public getState(): SystemState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public getBlockchainState(): BlockchainStats {
    return { ...this.state.blockchain };
  }

  public getUserState(): UserProfile {
    return { ...this.state.user };
  }

  public getUIState() {
    return { ...this.state.ui };
  }

  public getRealtimeState() {
    return { ...this.state.realtime };
  }

  // State setters with change detection
  public updateBlockchainStats(stats: Partial<BlockchainStats>): void {
    const prevState = { ...this.state.blockchain };
    this.state.blockchain = { ...this.state.blockchain, ...stats };
    this.notifyListeners('blockchain', this.state.blockchain, prevState);
    this.notifyListeners('*', this.state, { ...this.state, blockchain: prevState });
  }

  public updateUserProfile(profile: Partial<UserProfile>): void {
    const prevState = { ...this.state.user };
    this.state.user = { ...this.state.user, ...profile };
    this.notifyListeners('user', this.state.user, prevState);
    this.notifyListeners('*', this.state, { ...this.state, user: prevState });
  }

  public updateUIState(ui: Partial<typeof this.state.ui>): void {
    const prevState = { ...this.state.ui };
    this.state.ui = { ...this.state.ui, ...ui };
    this.notifyListeners('ui', this.state.ui, prevState);
    this.notifyListeners('*', this.state, { ...this.state, ui: prevState });
  }

  // Event management
  public addEvent(event: Omit<BlockchainEvent, 'id'>): void {
    const newEvent: BlockchainEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const events = [...this.state.realtime.events, newEvent].slice(-50); // Keep last 50 events
    const prevState = { ...this.state.realtime };
    
    this.state.realtime.events = events;
    this.notifyListeners('realtime', this.state.realtime, prevState);
    this.notifyListeners('events', events, prevState.events);
  }

  public clearEvents(): void {
    const prevState = { ...this.state.realtime };
    this.state.realtime.events = [];
    this.notifyListeners('realtime', this.state.realtime, prevState);
    this.notifyListeners('events', [], prevState.events);
  }

  // Notification system
  public addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const notifications = [...this.state.ui.notifications, newNotification];
    this.updateUIState({ notifications });

    // Auto-remove non-persistent notifications after 5 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, 5000);
    }
  }

  public removeNotification(id: string): void {
    const notifications = this.state.ui.notifications.filter(n => n.id !== id);
    this.updateUIState({ notifications });
  }

  // Particle system for animations
  public addParticle(particle: Omit<ParticleData, 'id' | 'timestamp'>): void {
    const newParticle: ParticleData = {
      ...particle,
      id: `particle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const particles = [...this.state.realtime.particles, newParticle].slice(-20); // Keep last 20 particles
    const prevState = { ...this.state.realtime };
    
    this.state.realtime.particles = particles;
    this.notifyListeners('realtime', this.state.realtime, prevState);
    this.notifyListeners('particles', particles, prevState.particles);
  }

  public clearOldParticles(): void {
    const now = Date.now();
    const particles = this.state.realtime.particles.filter(p => now - p.timestamp < 10000); // Remove particles older than 10s
    
    if (particles.length !== this.state.realtime.particles.length) {
      const prevState = { ...this.state.realtime };
      this.state.realtime.particles = particles;
      this.notifyListeners('realtime', this.state.realtime, prevState);
      this.notifyListeners('particles', particles, prevState.particles);
    }
  }

  // Subscription system
  public subscribe(path: string, listener: StateListener): Unsubscribe {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  private notifyListeners(path: string, newState: any, prevState: any): void {
    const listeners = this.listeners.get(path);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(newState, prevState);
        } catch (error) {
          console.error('State listener error:', error);
        }
      });
    }
  }

  // Middleware system for actions
  public addMiddleware(middleware: (action: any, state: SystemState) => void): void {
    this.middlewares.push(middleware);
  }

  public dispatch(action: any): void {
    this.middlewares.forEach(middleware => {
      try {
        middleware(action, this.state);
      } catch (error) {
        console.error('Middleware error:', error);
      }
    });
  }

  // Computed properties
  public getComputedStats() {
    const { blockchain, user } = this.state;
    
    return {
      networkHealth: blockchain.isConnected ? 'healthy' : 'disconnected',
      averageBlockTime: blockchain.blockHeight > 0 ? 600 : 0, // 10 minutes default
      userPortfolioValue: user.totalBalance * 50000, // Mock BTC price
      systemLoad: Math.min((blockchain.memPoolSize / 10) * 100, 100),
      connectionQuality: blockchain.clientCount > 0 ? 'good' : 'poor'
    };
  }

  // Persistence
  public saveToLocalStorage(): void {
    try {
      const persistentState = {
        user: this.state.user,
        ui: {
          theme: this.state.ui.theme,
          activeSection: this.state.ui.activeSection
        }
      };
      localStorage.setItem('blockchain_app_state', JSON.stringify(persistentState));
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }

  public loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('blockchain_app_state');
      if (saved) {
        const persistentState = JSON.parse(saved);
        
        if (persistentState.user) {
          this.updateUserProfile(persistentState.user);
        }
        
        if (persistentState.ui) {
          this.updateUIState(persistentState.ui);
        }
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
    }
  }

  // Development tools integration
  private setupDevTools(): void {
    if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
      (window as any).__BLOCKCHAIN_STATE__ = this;
      console.log('🔧 State manager with dev tools initialized');
    }
  }

  // Reset state
  public reset(): void {
    this.state = this.getInitialState();
    this.notifyListeners('*', this.state, {});
  }
}

// Export singleton instance
export const stateManager = StateManager.getInstance();

// Export types for use in components
export type { SystemState, BlockchainStats, UserProfile, BlockchainEvent, Notification };
