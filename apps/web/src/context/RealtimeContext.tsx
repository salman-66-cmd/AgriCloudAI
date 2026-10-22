import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../services/socket.js';
import { SensorReading, Alert, IrrigationEvent } from '../types/index.js';

interface RealtimeContextType {
  isConnected: boolean;
  lastReading: any | null;
  lastAlert: Alert | null;
  lastIrrigation: IrrigationEvent | null;
  activeAlertNotification: Alert | null;
  dismissNotification: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastReading, setLastReading] = useState<any | null>(null);
  const [lastAlert, setLastAlert] = useState<Alert | null>(null);
  const [lastIrrigation, setLastIrrigation] = useState<IrrigationEvent | null>(null);
  const [activeAlertNotification, setActiveAlertNotification] = useState<Alert | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleReading = (reading: any) => {
      setLastReading(reading);
    };

    const handleAlert = (alert: Alert) => {
      setLastAlert(alert);
      if (alert.status === 'ACTIVE') {
        setActiveAlertNotification(alert);
      }
    };

    const handleIrrigation = (event: IrrigationEvent) => {
      setLastIrrigation(event);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('sensor:reading', handleReading);
    socket.on('alert:event', handleAlert);
    socket.on('irrigation:status', handleIrrigation);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('sensor:reading', handleReading);
      socket.off('alert:event', handleAlert);
      socket.off('irrigation:status', handleIrrigation);
    };
  }, []);

  const dismissNotification = () => {
    setActiveAlertNotification(null);
  };

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        lastReading,
        lastAlert,
        lastIrrigation,
        activeAlertNotification,
        dismissNotification,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
