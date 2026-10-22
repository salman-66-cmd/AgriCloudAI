import { createServer } from 'http';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { initSocketServer } from './realtime/socket.js';
import { IoTSensorSimulator } from './jobs/simulator.js';
import { prisma } from './config/prisma.js';

const app = createApp();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initSocketServer(httpServer);

// Start server
httpServer.listen(config.port, () => {
  console.log(`
  ==============================================================
  🌱 AgriCloud Server Started Successfully
  ==============================================================
  🚀 Environment : ${config.nodeEnv}
  📡 API URL     : http://localhost:${config.port}${config.apiPrefix}
  📖 Swagger Docs: http://localhost:${config.port}/api-docs
  🩺 Health Check: http://localhost:${config.port}/health
  🔌 Socket.IO   : Active on port ${config.port}
  ==============================================================
  `);

  // Start IoT virtual sensor simulator background worker
  if (config.simulation.enabled) {
    IoTSensorSimulator.getInstance().start();
  } else {
    console.log('ℹ️ IoT Virtual Sensor Simulator is disabled by configuration.');
  }
});

// Graceful Shutdown
async function shutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down AgriCloud server...`);
  IoTSensorSimulator.getInstance().stop();

  httpServer.close(async () => {
    console.log('🔌 HTTP server closed.');
    await prisma.$disconnect();
    console.log('💾 Database connection closed.');
    process.exit(0);
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('⚠️ Forcefully terminating after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
