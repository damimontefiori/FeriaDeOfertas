import React, { createContext, useState, useContext, useCallback } from 'react';

const LoggerContext = createContext();

export const useLogger = () => useContext(LoggerContext);

export const LoggerProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { id: Date.now(), timestamp, message, type };
    
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Mantener solo los últimos 50
    
    // También a consola para debugging estándar
    if (type === 'error') console.error(`[${timestamp}]`, message);
    else console.log(`[${timestamp}]`, message);
  }, []);

  const clearLogs = () => setLogs([]);

  return (
    <LoggerContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LoggerContext.Provider>
  );
};
