// WS Client for reconnect with replay
// Usage: new WsClient('ws://localhost:3001/ws', { onMessage, clientId })

export interface WsClientOptions {
  url: string;
  clientId?: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
  maxReconnectDelay?: number;
  reconnectInterval?: number;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxDelay: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private lastSeq = 0;
  private clientId: string;

  constructor(private options: WsClientOptions) {
    this.clientId = options.clientId || `client_${Date.now()}`;
    this.maxDelay = options.maxReconnectDelay || 30_000;
    
    this.connect();
  }

  private connect(): void {
    const url = `${this.options.url}?cid=${encodeURIComponent(this.clientId)}&lastSeq=${this.lastSeq}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.reconnectDelay = 1000;
      this.options.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        
        // Track sequence
        if (data.seq && typeof data.seq === 'number') {
          this.lastSeq = Math.max(this.lastSeq, data.seq);
        }
        
        this.options.onMessage?.(data);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[WS] Closed: ${event.code} ${event.reason}`);
      this.options.onClose?.(event.code, event.reason);
      
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      this.options.onError?.(error);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    const delay = Math.min(this.reconnectDelay, this.maxDelay);
    this.reconnectDelay *= 2;
    
    console.log(`[WS] Reconnecting in ${delay}ms...`);
    this.options.onReconnect?.(Math.log2(this.reconnectDelay));
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay + Math.random() * 1000); // Add jitter
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

// Auto-export for simplicity
export default WsClient;
