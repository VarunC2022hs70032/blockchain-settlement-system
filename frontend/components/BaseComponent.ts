/**
 * Base Component Class - Foundation for all UI components
 * Implements modern component lifecycle and state management
 */
export abstract class BaseComponent {
  protected element: HTMLElement;
  protected state: Record<string, any> = {};
  protected subscribers: Set<Function> = new Set();
  protected mounted = false;

  constructor(selector: string | HTMLElement) {
    if (typeof selector === 'string') {
      this.element = document.querySelector(selector) as HTMLElement;
      if (!this.element) {
        throw new Error(`Element not found: ${selector}`);
      }
    } else {
      this.element = selector;
    }
  }

  // Abstract methods to be implemented by child components
  abstract render(): string;
  
  // Lifecycle hooks
  protected onMount(): void {}
  protected onUnmount(): void {}
  protected onUpdate(prevState: Record<string, any>): void {}

  // State management
  protected setState(newState: Partial<typeof this.state>): void {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    if (this.mounted) {
      this.update();
      this.onUpdate(prevState);
      this.notifySubscribers();
    }
  }

  protected getState(): typeof this.state {
    return { ...this.state };
  }

  // Event handling
  protected on(event: string, handler: Function, options?: AddEventListenerOptions): void {
    this.element.addEventListener(event, handler as EventListener, options);
  }

  protected emit(eventName: string, detail?: any): void {
    const event = new CustomEvent(eventName, { detail, bubbles: true });
    this.element.dispatchEvent(event);
  }

  // DOM manipulation with performance optimization
  protected query(selector: string): HTMLElement | null {
    return this.element.querySelector(selector);
  }

  protected queryAll(selector: string): NodeListOf<HTMLElement> {
    return this.element.querySelectorAll(selector);
  }

  // Animation utilities
  protected animate(keyframes: Keyframe[], options: KeyframeAnimationOptions = {}): Animation {
    const defaultOptions: KeyframeAnimationOptions = {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both'
    };
    
    return this.element.animate(keyframes, { ...defaultOptions, ...options });
  }

  protected fadeIn(duration = 300): Animation {
    return this.animate([
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration });
  }

  protected fadeOut(duration = 300): Animation {
    return this.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-10px)' }
    ], { duration });
  }

  // Subscription system for reactive updates
  public subscribe(callback: Function): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  protected notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.state));
  }

  // Component lifecycle
  public mount(): void {
    if (this.mounted) return;
    
    this.update();
    this.onMount();
    this.mounted = true;
    this.fadeIn();
  }

  public unmount(): void {
    if (!this.mounted) return;
    
    this.fadeOut().addEventListener('finish', () => {
      this.onUnmount();
      this.subscribers.clear();
      this.mounted = false;
    });
  }

  private update(): void {
    const html = this.render();
    this.element.innerHTML = html;
    this.bindEvents();
  }

  // Override this method to bind component-specific events
  protected bindEvents(): void {}

  // Utility methods
  protected debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  protected throttle(func: Function, limit: number): Function {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // CSS class utilities
  protected addClass(className: string): void {
    this.element.classList.add(className);
  }

  protected removeClass(className: string): void {
    this.element.classList.remove(className);
  }

  protected toggleClass(className: string, force?: boolean): boolean {
    return this.element.classList.toggle(className, force);
  }

  protected hasClass(className: string): boolean {
    return this.element.classList.contains(className);
  }
}
