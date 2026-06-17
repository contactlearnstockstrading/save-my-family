export interface LocationPayload {
  type: 'LOCATION_UPDATE' | 'ALERT_CANCELLED' | 'VOLUNTEER_ACCEPTED';
  sessionId: string;
  senderId: string;
  senderName: string;
  latitude: number;
  longitude: number;
  role: 'VICTIM' | 'VOLUNTEER';
}

class SocketService {
  private ws: WebSocket | null = null;
  private url = 'ws://localhost:8081/ws/sos';

  /**
   * Connect to the WebSocket endpoint for a specific emergency session
   */
  public connect(sessionId: string, onMessage: (data: LocationPayload) => void) {
    if (this.ws) {
      this.disconnect();
    }

    const connectionUrl = `${this.url}?sessionId=${sessionId}`;
    this.ws = new WebSocket(connectionUrl);

    this.ws.onopen = () => {
      console.log(`WebSocket connected to SOS Session: ${sessionId}`);
    };

    this.ws.onmessage = (event) => {
      try {
        const data: LocationPayload = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.warn('Failed to parse WebSocket incoming message payload:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.warn('WebSocket connection error:', error);
    };

    this.ws.onclose = (e) => {
      console.log('WebSocket connection closed:', e.reason);
    };
  }

  /**
   * Broadcasts coordinates of current user
   */
  public sendLocation(payload: LocationPayload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn('WebSocket is not connected. Message skipped.');
    }
  }

  /**
   * Close the active WebSocket connection
   */
  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const socketService = new SocketService();
