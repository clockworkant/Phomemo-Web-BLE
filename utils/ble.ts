// T02 Service and Characteristic UUIDs
const T02 = {
  SERVICE: 0xff00,
  NOTIFY1: 0xff01,
  WRITE: 0xff02,
  NOTIFY2: 0xff03
};

// ESC/POS Commands for thermal printers
const COMMANDS = {
  INIT: new Uint8Array([0x1B, 0x40]), // ESC @ Initialize printer
  FEED_PAPER: new Uint8Array([0x1B, 0x64, 0x01]), // ESC d 1 - Feed paper 1 line
  FEED_AND_CUT: new Uint8Array([0x1D, 0x56, 0x42, 0x00]), // GS V B 0 - Feed and cut paper
  // PeriPage specific commands
  START_PRINT: new Uint8Array([0x10, 0xff, 0xfe, 0x01]), // Start print command
  PADDING: new Uint8Array(12), // 12 zeros padding
  BITMAP_MODE: new Uint8Array([0x1d, 0x76, 0x30, 0x00]) // GS v 0 - Print raster bit image
};

const CHUNK_SIZE = 512; // Maximum BLE packet size
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

export interface TextStyle {
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize?: number;
}

export class BLEPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private readonly PRINTER_WIDTH = 384; // T02 printer width in pixels
  private readonly SERVICE_UUID = '49535343-FE7D-4AE5-8FA9-9FAFD205E455';
  private readonly CHARACTERISTIC_UUID = '49535343-8841-43F4-A8D4-ECBE34729BB3';
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
  }

  async connect() {
    try {
      // Request T02 device with specific service
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'T02' }
        ],
        optionalServices: [T02.SERVICE]
      });

      if (!this.device) {
        throw new Error('No device selected');
      }

      await this.ensureConnected();
      console.log('Connected to printer');
      return true;
    } catch (error) {
      console.error('Error connecting to printer:', error);
      throw error;
    }
  }

  private async ensureConnected() {
    if (!this.device) {
      throw new Error('No device selected');
    }

    if (!this.device.gatt?.connected) {
      console.log('Connecting to GATT Server...');
      const server = await this.device.gatt.connect();
      
      // Get the FF00 service
      console.log('Getting printer service...');
      const service = await server.getPrimaryService(T02.SERVICE);
      
      // Get all characteristics
      const characteristics = await service.getCharacteristics();
      console.log('Available characteristics:', characteristics.map(c => c.uuid));
      
      // Find FF02 characteristic for writing
      const writableChar = characteristics.find(c => c.uuid.includes('ff02'));
      if (!writableChar) {
        throw new Error('No writable characteristic found');
      }

      this.characteristic = writableChar;
      
      // Initialize printer
      await this.sendCommand(COMMANDS.INIT);
    }
  }

  private async sendCommand(command: Uint8Array, retryCount = 0): Promise<void> {
    try {
      await this.ensureConnected();

      if (!this.characteristic) {
        throw new Error('No writable characteristic found');
      }

      // Split data into chunks if needed
      for (let i = 0; i < command.length; i += CHUNK_SIZE) {
        const chunk = command.slice(i, i + CHUNK_SIZE);
        await this.characteristic.writeValueWithoutResponse(chunk);
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      if (retryCount < RETRY_ATTEMPTS) {
        console.log(`Retrying command... (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.sendCommand(command, retryCount + 1);
      }
      throw error;
    }
  }

  private renderText(text: string, height: number, preview = false, style: TextStyle): HTMLCanvasElement {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas context not initialized');
    }

    // Set canvas size
    this.canvas.width = this.PRINTER_WIDTH;
    this.canvas.height = height;
    
    // Clear canvas with white
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Build font string
    const getFontString = (size: number) => [
      style.italic ? 'italic' : '',
      style.bold ? 'bold' : '',
      `${size}px`,
      style.fontFamily
    ].filter(Boolean).join(' ');
    
    // Split text into lines
    const words = text.split(' ');
    const lines: string[] = [];
    
    // Use provided font size or find the largest that fits
    let fontSize = style.fontSize || height;
    
    // If no font size provided, do binary search
    if (!style.fontSize) {
      let minSize = 8;
      let maxSize = height;
      let bestFontSize = minSize;
      
      while (minSize <= maxSize) {
        fontSize = Math.floor((minSize + maxSize) / 2);
        this.ctx.font = getFontString(fontSize);
        
        // Try to form lines with current font size
        let currentLine = '';
        const currentLines = [];
        let fitsWidth = true;
        
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = this.ctx.measureText(testLine);
          
          if (metrics.width > this.PRINTER_WIDTH) {
            if (currentLine === '') {
              fitsWidth = false;
              break;
            }
            currentLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        if (!fitsWidth) {
          maxSize = fontSize - 1;
          continue;
        }
        
        if (currentLine) {
          currentLines.push(currentLine);
        }
        
        const totalHeight = currentLines.length * fontSize;
        
        if (totalHeight <= height) {
          bestFontSize = fontSize;
          minSize = fontSize + 1;
        } else {
          maxSize = fontSize - 1;
        }
      }
      
      fontSize = bestFontSize;
    }
    
    // Set final font
    this.ctx.font = getFontString(fontSize);
    
    // Form final lines
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > this.PRINTER_WIDTH) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Force break long word
          lines.push(word);
          currentLine = '';
        }
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Draw lines
    this.ctx.fillStyle = 'black';
    const totalHeight = lines.length * fontSize;
    const startY = (height - totalHeight) / 2 + fontSize;
    
    lines.forEach((line, index) => {
      const metrics = this.ctx.measureText(line);
      const x = (this.PRINTER_WIDTH - metrics.width) / 2;
      const y = startY + (index * fontSize);
      
      // Draw text
      this.ctx.fillText(line, x, y);
      
      // Draw underline if enabled
      if (style.underline) {
        const underlineY = y + 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, underlineY);
        this.ctx.lineTo(x + metrics.width, underlineY);
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    });

    if (!preview) {
      // Apply Floyd-Steinberg dithering
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const ditheredData = this.floydSteinbergDither(imageData);
      this.ctx.putImageData(ditheredData, 0, 0);
    }

    // Draw top and bottom lines last
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // Function to set a pixel black
    const setPixelBlack = (x: number, y: number) => {
      const index = (y * this.canvas.width + x) * 4;
      data[index] = data[index + 1] = data[index + 2] = 0; // Black
      data[index + 3] = 255; // Full opacity
    };

    // Draw top and bottom lines pixel by pixel, 2 pixels thick
    for (let x = 0; x < this.canvas.width; x++) {
      // Top line
      setPixelBlack(x, 0);
      setPixelBlack(x, 1);
      // Bottom line
      setPixelBlack(x, this.canvas.height - 2);
      setPixelBlack(x, this.canvas.height - 1);
    }

    // Put the modified image data back
    this.ctx.putImageData(imageData, 0, 0);

    return this.canvas;
  }

  public getPreview(text: string, height: number, style: TextStyle): string {
    const canvas = this.renderText(text, height, true, style);
    return canvas.toDataURL('image/png');
  }

  public async printText(text: string, height: number, style: TextStyle): Promise<void> {
    const canvas = this.renderText(text, height, false, style);
    await this.printCanvas(canvas);
  }

  private floydSteinbergDither(imageData: ImageData): ImageData {
    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8ClampedArray(imageData.data);
    
    const index = (x: number, y: number) => (y * width + x) * 4;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = index(x, y);
        
        // Get the grayscale value (assuming R=G=B)
        const oldPixel = data[i];
        // Convert to black or white
        const newPixel = oldPixel < 128 ? 0 : 255;
        
        // Calculate the error
        const error = oldPixel - newPixel;
        
        // Set the current pixel
        data[i] = data[i + 1] = data[i + 2] = newPixel;
        
        // Distribute the error to neighboring pixels
        if (x + 1 < width) {
          data[i + 4] += error * 7 / 16;
          data[i + 5] += error * 7 / 16;
          data[i + 6] += error * 7 / 16;
        }
        if (y + 1 < height) {
          if (x > 0) {
            data[i + width * 4 - 4] += error * 3 / 16;
            data[i + width * 4 - 3] += error * 3 / 16;
            data[i + width * 4 - 2] += error * 3 / 16;
          }
          data[i + width * 4] += error * 5 / 16;
          data[i + width * 4 + 1] += error * 5 / 16;
          data[i + width * 4 + 2] += error * 5 / 16;
          if (x + 1 < width) {
            data[i + width * 4 + 4] += error * 1 / 16;
            data[i + width * 4 + 5] += error * 1 / 16;
            data[i + width * 4 + 6] += error * 1 / 16;
          }
        }
      }
    }
    
    return new ImageData(data, width, height);
  }

  private canvasToBitmap(): Uint8Array {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas context not initialized');
    }

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const bitmap = new Uint8Array(Math.ceil(this.canvas.width * this.canvas.height / 8));

    let byteIndex = 0;
    let bitIndex = 0;

    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        const i = (y * this.canvas.width + x) * 4;
        // Since we've already dithered, just check if it's black (0) or white (255)
        if (data[i] === 0) { // Black pixel
          bitmap[byteIndex] |= (1 << (7 - bitIndex));
        }

        bitIndex++;
        if (bitIndex === 8) {
          bitIndex = 0;
          byteIndex++;
        }
      }
    }

    return bitmap;
  }

  async feedPaper() {
    try {
      await this.ensureConnected(); // Ensure we're still connected before feeding
      await this.sendCommand(COMMANDS.FEED_PAPER);
      console.log('Feed paper command sent');
    } catch (error) {
      console.error('Error feeding paper:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  isConnected(): boolean {
    return this.device?.gatt?.connected ?? false;
  }

  private async printCanvas(canvas: HTMLCanvasElement): Promise<void> {
    try {
      // Convert to bitmap data
      const bitmap = this.canvasToBitmap();
      
      // Send PeriPage/T02 specific commands
      await this.sendCommand(COMMANDS.START_PRINT);
      await this.sendCommand(COMMANDS.PADDING);

      // Calculate width in bytes (round up to nearest byte)
      const widthInBytes = Math.ceil(this.canvas.width / 8);
      
      // Send bitmap header
      const header = new Uint8Array([
        ...COMMANDS.BITMAP_MODE,
        widthInBytes, 0x00, // width in bytes, little endian
        this.canvas.height & 0xff, (this.canvas.height >> 8) & 0xff // height, little endian
      ]);

      await this.sendCommand(header);
      await this.sendCommand(bitmap);
      await this.feedPaper();

    } catch (error) {
      console.error('Error printing canvas:', error);
      throw error;
    }
  }
}

export const printer = new BLEPrinter();
