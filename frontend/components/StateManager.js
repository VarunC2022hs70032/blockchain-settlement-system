/**
 * Global State Management System
 * Implements reactive state with optimized updates
 */
export class StateManager {
    constructor() {
        this.listeners = new Map();
        this.middlewares = [];
        this.state = this.getInitialState();
        this.setupDevTools();
    }
    static getInstance() {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }
    getInitialState() {
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
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    getBlockchainState() {
        return { ...this.state.blockchain };
    }
    getUserState() {
        return { ...this.state.user };
    }
    getUIState() {
        return { ...this.state.ui };
    }
    getRealtimeState() {
        return { ...this.state.realtime };
    }
    // State setters with change detection
    updateBlockchainStats(stats) {
        const prevState = { ...this.state.blockchain };
        this.state.blockchain = { ...this.state.blockchain, ...stats };
        this.notifyListeners('blockchain', this.state.blockchain, prevState);
        this.notifyListeners('*', this.state, { ...this.state, blockchain: prevState });
    }
    updateUserProfile(profile) {
        const prevState = { ...this.state.user };
        this.state.user = { ...this.state.user, ...profile };
        this.notifyListeners('user', this.state.user, prevState);
        this.notifyListeners('*', this.state, { ...this.state, user: prevState });
    }
    updateUIState(ui) {
        const prevState = { ...this.state.ui };
        this.state.ui = { ...this.state.ui, ...ui };
        this.notifyListeners('ui', this.state.ui, prevState);
        this.notifyListeners('*', this.state, { ...this.state, ui: prevState });
    }
    // Event management
    addEvent(event) {
        const newEvent = {
            ...event,
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        const events = [...this.state.realtime.events, newEvent].slice(-50); // Keep last 50 events
        const prevState = { ...this.state.realtime };
        this.state.realtime.events = events;
        this.notifyListeners('realtime', this.state.realtime, prevState);
        this.notifyListeners('events', events, prevState.events);
    }
    clearEvents() {
        const prevState = { ...this.state.realtime };
        this.state.realtime.events = [];
        this.notifyListeners('realtime', this.state.realtime, prevState);
        this.notifyListeners('events', [], prevState.events);
    }
    // Notification system
    addNotification(notification) {
        const newNotification = {
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
    removeNotification(id) {
        const notifications = this.state.ui.notifications.filter(n => n.id !== id);
        this.updateUIState({ notifications });
    }
    // Particle system for animations
    addParticle(particle) {
        const newParticle = {
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
    clearOldParticles() {
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
    subscribe(path, listener) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(listener);
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
    notifyListeners(path, newState, prevState) {
        const listeners = this.listeners.get(path);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(newState, prevState);
                }
                catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }
    }
    // Middleware system for actions
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }
    dispatch(action) {
        this.middlewares.forEach(middleware => {
            try {
                middleware(action, this.state);
            }
            catch (error) {
                console.error('Middleware error:', error);
            }
        });
    }
    // Computed properties
    getComputedStats() {
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
    saveToLocalStorage() {
        try {
            const persistentState = {
                user: this.state.user,
                ui: {
                    theme: this.state.ui.theme,
                    activeSection: this.state.ui.activeSection
                }
            };
            localStorage.setItem('blockchain_app_state', JSON.stringify(persistentState));
        }
        catch (error) {
            console.error('Failed to save state to localStorage:', error);
        }
    }
    loadFromLocalStorage() {
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
        }
        catch (error) {
            console.error('Failed to load state from localStorage:', error);
        }
    }
    // Development tools integration
    setupDevTools() {
        if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__) {
            window.__BLOCKCHAIN_STATE__ = this;
            console.log('🔧 State manager with dev tools initialized');
        }
    }
    // Reset state
    reset() {
        this.state = this.getInitialState();
        this.notifyListeners('*', this.state, {});
    }
}
// Export singleton instance
export const stateManager = StateManager.getInstance();
