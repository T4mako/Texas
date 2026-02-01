import { io, Socket } from 'socket.io-client';

// Use relative URL to leverage Vite proxy in dev and same-origin in prod
const URL = '/';

class SocketService {
  socket: Socket;

  constructor() {
    this.socket = io(URL, {
      autoConnect: false,
      reconnection: true,
    });
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  off(event: string) {
    this.socket.off(event);
  }

  emit(event: string, data?: any, callback?: (response: any) => void) {
    this.socket.emit(event, data, callback);
  }

  getId() {
    return this.socket.id;
  }
}

export const socketService = new SocketService();
