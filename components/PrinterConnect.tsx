'use client';

import { useState } from 'react';
import { printer } from '../utils/ble';

const MM_TO_PX_RATIO = 0.82; // 1mm = 0.82 pixels

const PrinterConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [heightMM, setHeightMM] = useState('90'); // ~110px
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const convertMMtoPX = (mm: number): number => {
    return Math.round(mm * MM_TO_PX_RATIO);
  };

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
    setPreviewUrl(null);
  };

  const updatePreview = () => {
    if (!text.trim()) {
      setPreviewUrl(null);
      return;
    }
    const heightPx = convertMMtoPX(parseInt(heightMM) || 90);
    const preview = printer.getPreview(text, heightPx);
    setPreviewUrl(preview);
  };

  const printText = async () => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    try {
      const heightPx = convertMMtoPX(parseInt(heightMM) || 90);
      await printer.printText(text, heightPx);
      setText('');
      setPreviewUrl(null);
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
                <label htmlFor="height">Height (mm):</label>
                <input
                  id="height"
                  type="text"
                  value={heightMM}
                  onChange={(e) => setHeightMM(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="button-group">
                <button 
                  onClick={updatePreview}
                  disabled={isLoading || !text.trim()}
                  className="preview-btn"
                >
                  Preview
                </button>
                <button 
                  onClick={printText} 
                  disabled={isLoading || !text.trim()}
                  className="print-btn"
                >
                  {isLoading ? 'Printing...' : 'Print Text'}
                </button>
              </div>
            </div>
            {previewUrl && (
              <div className="preview">
                <img src={previewUrl} alt="Print preview" style={{ width: '100%' }} />
              </div>
            )}
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
