import React, { useState } from 'react';
import { useLogger } from '../context/LoggerContext';
import { Terminal, X, Copy, ChevronUp, ChevronDown } from 'lucide-react';

const SystemLogger = () => {
  const { logs, clearLogs } = useLogger();
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Logs copiados al portapapeles');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="Abrir Logs del Sistema"
      >
        <Terminal size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-1/2 lg:w-1/3 h-64 bg-gray-900 text-green-400 font-mono text-xs shadow-2xl z-50 flex flex-col border-t-2 border-green-600">
      {/* Header */}
      <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
        <span className="font-bold flex items-center gap-2">
          <Terminal size={14} /> System Logs
        </span>
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className="hover:text-white" title="Copiar Logs"><Copy size={14}/></button>
          <button onClick={clearLogs} className="hover:text-white" title="Limpiar"><X size={14}/></button>
          <button onClick={() => setIsOpen(false)} className="hover:text-white"><ChevronDown size={14}/></button>
        </div>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {logs.length === 0 && <div className="text-gray-500 italic">Sistema listo. Esperando eventos...</div>}
        {logs.map(log => (
          <div key={log.id} className={`${log.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemLogger;
