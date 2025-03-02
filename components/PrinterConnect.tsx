'use client';

import { useState } from 'react';
import { printer } from '../utils/ble';

const PrinterConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');

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
      await printer.printText(text);
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
