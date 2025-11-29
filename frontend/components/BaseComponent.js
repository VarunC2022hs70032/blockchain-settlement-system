/**
 * Base Component Class - Foundation for all UI components
 * Implements modern component lifecycle and state management
 */
export class BaseComponent {
    constructor(selector) {
        this.state = {};
        this.subscribers = new Set();
        this.mounted = false;
        if (typeof selector === 'string') {
            this.element = document.querySelector(selector);
            if (!this.element) {
                throw new Error(`Element not found: ${selector}`);
            }
        }
        else {
            this.element = selector;
        }
    }
    // Lifecycle hooks
    onMount() { }
    onUnmount() { }
    onUpdate(prevState) { }
    // State management
    setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        if (this.mounted) {
            this.update();
            this.onUpdate(prevState);
            this.notifySubscribers();
        }
    }
    getState() {
        return { ...this.state };
    }
    // Event handling
    on(event, handler, options) {
        this.element.addEventListener(event, handler, options);
    }
    emit(eventName, detail) {
        const event = new CustomEvent(eventName, { detail, bubbles: true });
        this.element.dispatchEvent(event);
    }
    // DOM manipulation with performance optimization
    query(selector) {
        return this.element.querySelector(selector);
    }
    queryAll(selector) {
        return this.element.querySelectorAll(selector);
    }
    // Animation utilities
    animate(keyframes, options = {}) {
        const defaultOptions = {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'both'
        };
        return this.element.animate(keyframes, { ...defaultOptions, ...options });
    }
    fadeIn(duration = 300) {
        return this.animate([
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration });
    }
    fadeOut(duration = 300) {
        return this.animate([
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-10px)' }
        ], { duration });
    }
    // Subscription system for reactive updates
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }
    // Component lifecycle
    mount(parentElement) {
        if (this.mounted)
            return;
        
        if (parentElement && parentElement !== this.element) {
            // If parentElement is provided and it's different from current element,
            // mount to the parent element
            if (!this.element) {
                this.element = parentElement;
            } else {
                // Append existing element to parent
                parentElement.appendChild(this.element);
            }
        }
        
        this.update();
        this.onMount();
        this.mounted = true;
        this.fadeIn();
        return this;
    }
    unmount() {
        if (!this.mounted)
            return;
        this.fadeOut().addEventListener('finish', () => {
            this.onUnmount();
            this.subscribers.clear();
            this.mounted = false;
        });
    }
    update() {
        const html = this.render();
        this.element.innerHTML = html;
        this.bindEvents();
    }
    // Override this method to bind component-specific events
    bindEvents() { }
    // Utility methods
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    // CSS class utilities
    addClass(className) {
        this.element.classList.add(className);
    }
    removeClass(className) {
        this.element.classList.remove(className);
    }
    toggleClass(className, force) {
        return this.element.classList.toggle(className, force);
    }
    hasClass(className) {
        return this.element.classList.contains(className);
    }
}
