'use client';

import { useState } from 'react';
import { printer, TextStyle } from '../utils/ble';

const MM_TO_PX_RATIO = 0.82; // 1mm = 0.82 pixels

const FONTS = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Consolas',
  'Verdana',
];

const PrinterConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [heightMM, setHeightMM] = useState('90');
  const [fontSize, setFontSize] = useState(32); 
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontFamily: FONTS[0],
    bold: false,
    italic: false,
    underline: false,
  });
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
    const preview = printer.getPreview(text, heightPx, { ...textStyle, fontSize });
    setPreviewUrl(preview);
  };

  const printText = async () => {
    if (!text.trim() || !previewUrl) return; 
    
    setIsLoading(true);
    try {
      const heightPx = convertMMtoPX(parseInt(heightMM) || 90);
      await printer.printText(text, heightPx, { ...textStyle, fontSize });
      setText('');
      setPreviewUrl(null);
      setFontSize(32); 
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

  const updateStyle = (updates: Partial<TextStyle>) => {
    setTextStyle(prev => ({ ...prev, ...updates }));
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => {
      const newSize = Math.max(8, Math.min(200, prev + delta));
      return newSize;
    });
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
                style={{ 
                  fontFamily: textStyle.fontFamily,
                  fontWeight: textStyle.bold ? 'bold' : 'normal',
                  fontStyle: textStyle.italic ? 'italic' : 'normal',
                  textDecoration: textStyle.underline ? 'underline' : 'none',
                }}
              />
              <div className="input-controls">
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
                <div className="font-control">
                  <label htmlFor="font">Font:</label>
                  <select
                    id="font"
                    value={textStyle.fontFamily}
                    onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                    disabled={isLoading}
                    style={{ fontFamily: textStyle.fontFamily }}
                  >
                    {FONTS.map(font => (
                      <option 
                        key={font} 
                        value={font}
                        style={{ fontFamily: font }}
                      >
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="style-controls">
                  <label>Style:</label>
                  <div className="style-buttons">
                    <button
                      type="button"
                      onClick={() => updateStyle({ bold: !textStyle.bold })}
                      className={`style-btn ${textStyle.bold ? 'active' : ''}`}
                      disabled={isLoading}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStyle({ italic: !textStyle.italic })}
                      className={`style-btn ${textStyle.italic ? 'active' : ''}`}
                      disabled={isLoading}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStyle({ underline: !textStyle.underline })}
                      className={`style-btn ${textStyle.underline ? 'active' : ''}`}
                      disabled={isLoading}
                    >
                      U
                    </button>
                  </div>
                </div>
              </div>
              <div className="button-group">
                <button 
                  onClick={updatePreview}
                  disabled={isLoading || !text.trim()}
                  className="preview-btn"
                >
                  Preview
                </button>
              </div>
            </div>
            {previewUrl && (
              <div className="preview-container">
                <div className="preview">
                  <img src={previewUrl} alt="Print preview" style={{ width: '100%' }} />
                </div>
                <div className="preview-controls">
                  <div className="size-controls">
                    <button 
                      onClick={() => {
                        adjustFontSize(-4);
                        updatePreview();
                      }}
                      disabled={isLoading || fontSize <= 8}
                      className="size-btn"
                    >
                      -
                    </button>
                    <span className="size-display">{fontSize}px</span>
                    <button 
                      onClick={() => {
                        adjustFontSize(4);
                        updatePreview();
                      }}
                      disabled={isLoading || fontSize >= 200}
                      className="size-btn"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={printText} 
                    disabled={isLoading || !text.trim()}
                    className="print-btn"
                  >
                    {isLoading ? 'Printing...' : 'Print Text'}
                  </button>
                </div>
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
