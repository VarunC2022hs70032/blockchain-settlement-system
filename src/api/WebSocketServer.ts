import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import { BlockchainEvents, BlockchainEventType, WebSocketMessage } from '../events/BlockchainEvents';

/**
 * WebSocket server for real-time blockchain events
 */
export class WebSocketServer {
  private wss: WSServer;
  private clients: Set<WebSocket> = new Set();
  private events: BlockchainEvents;

  constructor(server: Server) {
    this.wss = new WSServer({ server, path: '/ws' });
    this.events = BlockchainEvents.getInstance();
    this.setupWebSocketServer();
    this.setupBlockchainEventListeners();
  }

  /**
   * Setup WebSocket server handlers
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📡 New WebSocket client connected');
      this.clients.add(ws);

      // Send initial connection message
      this.sendToClient(ws, {
        type: 'connection' as BlockchainEventType,
        data: {
          message: 'Connected to blockchain real-time events',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('📡 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle client errors
      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
        this.clients.delete(ws);
      });

      // Handle client messages (for future interactive features)
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });
    });
  }

  /**
   * Setup blockchain event listeners
   */
  private setupBlockchainEventListeners(): void {
    // Listen for all blockchain events
    Object.values(BlockchainEventType).forEach(eventType => {
      this.events.on(eventType, (data) => {
        this.broadcastToAllClients({
          type: eventType,
          data,
          timestamp: Date.now()
        });
      });
    });
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        // Handle event subscription (future feature)
        break;
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong' as BlockchainEventType,
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        });
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.clients.delete(ws);
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcastToAllClients(message: WebSocketMessage): void {
    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }

  /**
   * Get number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast custom event
   */
  public broadcast(type: BlockchainEventType, data: any): void {
    this.broadcastToAllClients({
      type,
      data,
      timestamp: Date.now()
    });
  }
}
