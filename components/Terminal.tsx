import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-full bg-innoxr-dark border border-innoxr-gray/50 rounded-lg p-4 font-mono text-xs md:text-sm h-64 overflow-hidden flex flex-col shadow-lg shadow-innoxr-accent/5">
      <div className="flex items-center justify-between mb-2 border-b border-innoxr-gray pb-2">
        <span className="text-innoxr-accent uppercase tracking-widest">System Log // INNOXR-01</span>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3">
            <span className="text-gray-500 opacity-50">[{log.timestamp}]</span>
            <span className={`
              ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
              ${log.type === 'success' ? 'text-green-400' : ''}
              ${log.type === 'warning' ? 'text-yellow-400' : ''}
              ${log.type === 'info' ? 'text-blue-300' : ''}
            `}>
              {log.type === 'info' && '> '}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
