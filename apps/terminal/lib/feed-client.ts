// WebSocket Feed Client with automatic reconnect
// Implements exponential backoff and heartbeat

import { WS_CONFIG } from '@trading/shared';

export interface WSMessage {
  type: string;
  payload?: any;
}

export type WSEventHandler = (event: WSMessage) => void;

export class FeedClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectDelay: number;
  private maxReconnectDelay: number;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: Map<string, Set<WSEventHandler>> = new Map();
  private isConnected: boolean = false;
  private lastMessageTime: number = 0;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://127.0.0.1:3001') {
    this.url = baseUrl.replace('http', 'ws') + '/ws';
    this.reconnectDelay = WS_CONFIG.reconnectDelayMs;
    this.maxReconnectDelay = WS_CONFIG.maxReconnectDelayMs;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('[FeedClient] Connected to engine');
        this.isConnected = true;
        this.reconnectDelay = WS_CONFIG.reconnectDelayMs;
        this.startHeartbeat();
        this.broadcast({ type: 'connected' });
      };

      this.ws.onmessage = (event) => {
        this.lastMessageTime = Date.now();
        try {
          const msg = JSON.parse(event.data as string) as WSMessage;
          this.handleMessage(msg);
        } catch (e) {
          console.error('[FeedClient] Failed to parse message:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[FeedClient] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('[FeedClient] Connection closed');
        this.isConnected = false;
        this.stopHeartbeat();
        this.broadcast({ type: 'disconnected' });
        this.scheduleReconnect();
      };
    } catch (e) {
      console.error('[FeedClient] Failed to create connection:', e);
      this.scheduleReconnect();
    }
  }

  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(eventType: string, handler: WSEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  send(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[FeedClient] Cannot send: not connected');
    }
  }

  isConnectedState(): boolean {
    return this.isConnected;
  }

  private handleMessage(msg: WSMessage): void {
    // Broadcast to all handlers for this message type
    const handlers = this.eventHandlers.get(msg.type);
    if (handlers) {
      handlers.forEach(h => h(msg));
    }
    
    // Also broadcast to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(h => h(msg));
    }
  }

  private broadcast(message: WSMessage): void {
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(h => h(message));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Check if we haven't received a message in heartbeat interval
        const timeSinceLastMessage = Date.now() - this.lastMessageTime;
        if (timeSinceLastMessage > WS_CONFIG.heartbeatIntervalMs * 2) {
          console.warn('[FeedClient] No messages received, connection may be stale');
          this.ws.close();
        }
      }
    }, WS_CONFIG.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log(`[FeedClient] Reconnecting in ${this.reconnectDelay}ms...`);
      this.connect();
    }, this.reconnectDelay);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay
    );
  }
}

// Singleton instance
let client: FeedClient | null = null;

export function getFeedClient(baseUrl?: string): FeedClient {
  if (!client) {
    client = new FeedClient(baseUrl);
  }
  return client;
}
