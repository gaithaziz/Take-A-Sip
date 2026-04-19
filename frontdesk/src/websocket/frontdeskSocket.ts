import { FrontdeskSocketMessage } from '@/types/api';

type SocketHandlers = {
  onOpen: () => void;
  onMessage: (message: FrontdeskSocketMessage) => void;
  onClose: () => void;
  onError: () => void;
  onUnauthorized?: () => void;
};

type ReactNativeWebSocketConstructor = new (
  url: string,
  protocols?: string | string[] | null,
  options?: { headers?: Record<string, string> },
) => WebSocket;

const WebSocketWithHeaders = WebSocket as unknown as ReactNativeWebSocketConstructor;

export class FrontdeskSocket {
  private ws: WebSocket | null = null;
  private shouldReconnect = true;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  private reconnectAttempt = 0;

  constructor(
    private readonly baseHttpUrl: string,
    private readonly token: string,
    private readonly handlers: SocketHandlers,
  ) {}

  connect() {
    this.shouldReconnect = true;
    this.cleanupTimer();
    this.cleanupKeepAlive();
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const wsBase = this.baseHttpUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    const url = `${wsBase}/ws/frontdesk`;
    this.ws = new WebSocketWithHeaders(url, undefined, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.startKeepAlive();
      this.handlers.onOpen();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as FrontdeskSocketMessage;
        this.handlers.onMessage(data);
      } catch {
        this.handlers.onError();
      }
    };

    this.ws.onerror = () => {
      this.handlers.onError();
    };

    this.ws.onclose = (event) => {
      this.cleanupKeepAlive();
      if (event.code === 1008) {
        this.shouldReconnect = false;
        if (this.handlers.onUnauthorized) {
          this.handlers.onUnauthorized();
        }
      }
      this.handlers.onClose();
      this.scheduleReconnect();
      this.ws = null;
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.cleanupTimer();
    this.cleanupKeepAlive();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) {
      return;
    }
    this.cleanupTimer();
    const delayMs = Math.min(30000, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delayMs);
  }

  private cleanupTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startKeepAlive() {
    this.cleanupKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        // Keep the connection active through idle network devices.
        this.ws.send('ping');
      } catch {
        try {
          this.ws.close();
        } catch {
          // Ignore close errors; reconnect scheduler will handle retry.
        }
      }
    }, 15000);
  }

  private cleanupKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}
