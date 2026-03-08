import { FrontdeskSocketMessage } from '@/types/api';

type SocketHandlers = {
  onOpen: () => void;
  onMessage: (message: FrontdeskSocketMessage) => void;
  onClose: () => void;
  onError: () => void;
};

export class FrontdeskSocket {
  private ws: WebSocket | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempt = 0;

  constructor(
    private readonly baseHttpUrl: string,
    private readonly token: string,
    private readonly handlers: SocketHandlers,
  ) {}

  connect() {
    this.cleanupTimer();
    const wsBase = this.baseHttpUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    const url = `${wsBase}/ws/frontdesk?token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
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

    this.ws.onclose = () => {
      this.handlers.onClose();
      this.scheduleReconnect();
    };
  }

  disconnect() {
    this.cleanupTimer();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
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
}
