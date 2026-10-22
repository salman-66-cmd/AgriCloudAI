import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('⚡ Realtime connected to AgriCloud IoT gateway:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ Realtime disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚡ Realtime connection error (fallback polling active):', err.message);
    });
  }

  return socket;
}
