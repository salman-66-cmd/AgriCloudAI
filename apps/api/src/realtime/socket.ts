import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config/env.js';

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Realtime client connected: ${socket.id}`);

    // Join specific farm or field rooms for targeted updates
    socket.on('join:farm', (farmId: string) => {
      socket.join(`farm:${farmId}`);
      console.log(`📡 Client ${socket.id} joined room farm:${farmId}`);
    });

    socket.on('leave:farm', (farmId: string) => {
      socket.leave(`farm:${farmId}`);
    });

    socket.on('join:field', (fieldId: string) => {
      socket.join(`field:${fieldId}`);
    });

    socket.on('leave:field', (fieldId: string) => {
      socket.leave(`field:${fieldId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected (${socket.id}): ${reason}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function broadcastSensorReading(reading: any, fieldId?: string, farmId?: string) {
  if (!io) return;
  // Global broadcast
  io.emit('sensor:reading', reading);

  // Room targeted
  if (fieldId) io.to(`field:${fieldId}`).emit('field:sensor:reading', reading);
  if (farmId) io.to(`farm:${farmId}`).emit('farm:sensor:reading', reading);
}

export function broadcastAlert(alert: any, fieldId?: string, farmId?: string) {
  if (!io) return;
  io.emit('alert:event', alert);
  if (fieldId) io.to(`field:${fieldId}`).emit('field:alert', alert);
  if (farmId) io.to(`farm:${farmId}`).emit('farm:alert', alert);
}

export function broadcastIrrigationEvent(event: any, fieldId?: string) {
  if (!io) return;
  io.emit('irrigation:status', event);
  if (fieldId) io.to(`field:${fieldId}`).emit('field:irrigation:status', event);
}
