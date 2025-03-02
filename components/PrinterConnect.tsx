'use client';

import { useState } from 'react';
import { printer } from '../utils/ble';

const PrinterConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [height, setHeight] = useState(384); // Default height

  const connect = async () => {
    setIsLoading(true);
    try {
      await printer.connect();
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    await printer.disconnect();
    setIsConnected(false);
  };

  const printText = async () => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    try {
      await printer.printText(text, height);
      setText(''); // Clear the input after successful print
    } catch (error) {
      console.error('Failed to print:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const feedPaper = async () => {
    setIsLoading(true);
    try {
      await printer.feedPaper();
    } catch (error) {
      console.error('Failed to feed paper:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="printer-connect">
      <div className="controls">
        {!isConnected ? (
          <button 
            onClick={connect} 
            disabled={isLoading}
            className="connect-btn"
          >
            {isLoading ? 'Connecting...' : 'Connect to Printer'}
          </button>
        ) : (
          <>
            <div className="text-input">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to print..."
                rows={4}
                disabled={isLoading}
              />
              <div className="height-control">
                <label htmlFor="height">Height (px):</label>
                <input
                  id="height"
                  type="number"
                  min="0"
                  max="800"
                  value={height}
                  onChange={(e) => setHeight(Math.max(0, Math.min(800, parseInt(e.target.value) || 384)))}
                  disabled={isLoading}
                />
              </div>
              <button 
                onClick={printText} 
                disabled={isLoading || !text.trim()}
                className="print-btn"
              >
                {isLoading ? 'Printing...' : 'Print Text'}
              </button>
            </div>
            <div className="action-buttons">
              <button 
                onClick={feedPaper} 
                disabled={isLoading}
                className="feed-btn"
              >
                Feed Paper
              </button>
              <button 
                onClick={disconnect}
                disabled={isLoading} 
                className="disconnect-btn"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrinterConnect;
