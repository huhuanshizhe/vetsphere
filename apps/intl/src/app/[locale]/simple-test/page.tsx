'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleTestPage() {
  const [count, setCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Test useEffect
  useEffect(() => {
    console.log('=== SIMPLE TEST: useEffect START ===');
    console.log('Current count:', count);
    
    const timer = setTimeout(() => {
      console.log('=== SIMPLE TEST: Timer fired ===');
      setCount(c => c + 1);
    }, 1000);

    return () => {
      console.log('=== SIMPLE TEST: Cleanup ===');
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="p-8 min-h-screen bg-white">
      <h1 className="text-3xl font-bold mb-6">Simple Test Page</h1>
      
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 rounded">
          <h2 className="font-bold text-lg mb-2">Count: {count}</h2>
          <button
            onClick={() => setCount(c => c + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Increment
          </button>
        </div>

        <div className="p-4 bg-green-50 rounded">
          <h2 className="font-bold text-lg mb-2">Event Logs:</h2>
          <div className="h-64 overflow-y-auto text-sm font-mono bg-white border rounded p-2">
            {logs.map((log, i) => (
              <div key={i} className="py-1">
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-yellow-50 rounded text-sm">
          <strong>Instructions:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Open browser console (F12) to see console logs</li>
            <li>If no logs appear, check for JavaScript errors</li>
            <li>Click "Increment" to test state updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
