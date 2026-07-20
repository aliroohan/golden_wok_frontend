'use client';
import { CartItem } from './Cart';

export interface ReceiptData {
  orderId: string;
  orderType: string;
  items: CartItem[];
  subtotal: number;
  discount: { amount: number; reason: string };
  deliveryFee?: number;
  netTotal: number;
  cashReceived: number;
  change: number;
  cashierName: string;
  createdAt: Date;
}

let printerCharacteristic: any = null;
let printerDevice: any = null;

class ESCPOSBuilder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();

  init() {
    this.buffer.push(0x1B, 0x40); // ESC @
    return this;
  }

  align(dir: 'left' | 'center' | 'right') {
    const val = dir === 'left' ? 0 : dir === 'center' ? 1 : 2;
    this.buffer.push(0x1B, 0x61, val); // ESC a n
    return this;
  }

  bold(on: boolean) {
    this.buffer.push(0x1B, 0x45, on ? 1 : 0); // ESC E n
    return this;
  }

  size(doubleWidth: boolean, doubleHeight: boolean) {
    let sizeByte = 0x00;
    if (doubleWidth) sizeByte |= 0x10;
    if (doubleHeight) sizeByte |= 0x01;
    this.buffer.push(0x1D, 0x21, sizeByte); // GS ! n
    return this;
  }

  text(str: string) {
    const bytes = this.encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  line(str: string = '') {
    this.text(str + '\n');
    return this;
  }

  feed(lines: number = 3) {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0A);
    }
    // Cut command (GS V 66 0)
    this.buffer.push(0x1D, 0x56, 0x42, 0x00);
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

async function writeEscPosData(characteristic: any, data: Uint8Array) {
  const chunkSize = 20;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await characteristic.writeValue(chunk);
  }
}

export async function connectBluetoothPrinter(): Promise<string> {
  const nav = navigator as any;
  if (typeof window === 'undefined' || !nav.bluetooth) {
    throw new Error('Web Bluetooth is not supported by your browser or platform.');
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard printer service
        '000018f1-0000-1000-8000-00805f9b34fb', // Standard printer variation
        '00001101-0000-1000-8000-00805f9b34fb', // SPP Serial Port Profile
        '0000ff00-0000-1000-8000-00805f9b34fb', // Common custom printer service (Hoin, etc.)
        '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat custom service / generic printer
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC BLE SPP profile
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // generic printer
      ]
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Failed to connect to GATT server');

    let service;
    try {
      // Try standard first
      service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    } catch (e) {
      // Fallback: discover all primary services allowed by optionalServices
      const services = await server.getPrimaryServices();
      if (services.length > 0) {
        service = services[0];
      } else {
        throw new Error('No services found on printer. Ensure printer BLE is advertised.');
      }
    }

    const characteristics = await service.getCharacteristics();
    const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
    if (!writeChar) throw new Error('No write characteristic found on device');

    printerCharacteristic = writeChar;
    printerDevice = device;

    return device.name || 'Bluetooth Printer';
  } catch (err: any) {
    console.error(err);
    throw err;
  }
}

export function isBluetoothConnected(): boolean {
  return !!(printerCharacteristic && printerDevice?.gatt?.connected);
}

export function getConnectedDeviceName(): string {
  return printerDevice ? (printerDevice.name || 'Bluetooth Printer') : '';
}

export function disconnectBluetoothPrinter(): void {
  if (printerDevice && printerDevice.gatt?.connected) {
    printerDevice.gatt.disconnect();
  }
  printerCharacteristic = null;
  printerDevice = null;
}

function buildReceiptHTML(data: ReceiptData): string {
  const date = data.createdAt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = data.createdAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

  const itemRows = data.items.map((i) =>
    `<tr>
      <td>${i.menuItemName} (${i.variantLabel})</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">Rs.${(i.qty * i.priceAtSale).toLocaleString()}</td>
    </tr>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <style>
        /*
         * @page tells the browser (and Save as PDF) to use 80mm thermal
         * receipt paper. "auto" height means the page grows to fit content.
         * This prevents the layout from breaking when you change paper
         * settings in the print dialog.
         */
        @page {
          size: 80mm auto;
          margin: 4mm 5mm;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        /*
         * width:100% fills whatever the @page size dictates.
         * Never use a hardcoded pixel width — that causes the
         * "error in preview" when the user changes paper settings.
         */
        body {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          width: 100%;
          background: #fff;
          color: #000;
        }
        h1 { font-size:15px; text-align:center; font-weight:bold; margin-bottom:2px; }
        .sub { text-align:center; font-size:9px; color:#444; margin-bottom:5px; }
        .divider { border-top:1px dashed #000; margin:4px 0; }
        table { width:100%; border-collapse:collapse; }
        td { padding:2px 0; font-size:10px; vertical-align:top; }
        .totals td { font-size:11px; }
        .grand td { font-size:13px; font-weight:bold; }
        .footer { text-align:center; font-size:9px; margin-top:6px; }
      </style>
    </head>
    <body>
      <h1>Golden Wok</h1>
      <p class="sub">Chinese Restaurant</p>
      <div class="divider"></div>
      <p style="font-size:9px">${date} ${time} &middot; ${data.orderType.toUpperCase()}</p>
      <p style="font-size:9px">Cashier: ${data.cashierName}</p>
      <p style="font-size:9px">Order: #${data.orderId.slice(-6).toUpperCase()}</p>
      <div class="divider"></div>
      <table>
        <thead><tr><td><b>Item</b></td><td style="text-align:center"><b>Qty</b></td><td style="text-align:right"><b>Total</b></td></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="divider"></div>
      <table class="totals">
        <tr><td>Subtotal</td><td style="text-align:right">Rs.${data.subtotal.toLocaleString()}</td></tr>
        ${data.discount.amount > 0 ? `<tr><td>Discount (${data.discount.reason})</td><td style="text-align:right">-Rs.${data.discount.amount.toLocaleString()}</td></tr>` : ''}
        ${data.deliveryFee && data.deliveryFee > 0 ? `<tr><td>Delivery Fee</td><td style="text-align:right">Rs.${data.deliveryFee.toLocaleString()}</td></tr>` : ''}
      </table>
      <div class="divider"></div>
      <table class="grand">
        <tr><td>TOTAL</td><td style="text-align:right">Rs.${data.netTotal.toLocaleString()}</td></tr>
        <tr style="font-size:11px;font-weight:normal"><td>Cash</td><td style="text-align:right">Rs.${data.cashReceived.toLocaleString()}</td></tr>
        <tr style="font-size:11px;font-weight:normal"><td>Change</td><td style="text-align:right">Rs.${data.change.toLocaleString()}</td></tr>
      </table>
      <div class="divider"></div>
      <p class="footer">Thank you for dining with us!<br/>Please visit again</p>
    </body>
    </html>
  `;
}

export async function printReceipt(data: ReceiptData, forceBrowser: boolean = false) {
  if (printerCharacteristic && printerDevice?.gatt?.connected && !forceBrowser) {
    try {
      const builder = new ESCPOSBuilder();
      
      const date = data.createdAt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = data.createdAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

      builder.init()
        .align('center')
        .size(true, true)
        .bold(true)
        .line('🥢 GOLDEN WOK')
        .size(false, false)
        .bold(false)
        .line('Chinese Restaurant')
        .line('--------------------------------')
        .align('left')
        .line(`${date} ${time}`)
        .line(`Order Type: ${data.orderType.toUpperCase()}`)
        .line(`Cashier: ${data.cashierName}`)
        .line(`Order: #${data.orderId.slice(-6).toUpperCase()}`)
        .line('--------------------------------')
        .bold(true)
        .line('Item              Qty      Price')
        .bold(false)
        .line('--------------------------------');

      for (const i of data.items) {
        const namePart = `${i.menuItemName} (${i.variantLabel})`.slice(0, 18);
        const qtyPart = `x${i.qty}`;
        const priceVal = `Rs.${(i.qty * i.priceAtSale).toLocaleString()}`;
        const row = namePart.padEnd(18) + qtyPart.padStart(4) + priceVal.padStart(10);
        builder.line(row);
      }

      builder.line('--------------------------------')
        .line('Subtotal'.padEnd(20) + `Rs.${data.subtotal.toLocaleString()}`.padStart(12));

      if (data.discount.amount > 0) {
        builder.line(`Disc (${data.discount.reason})`.slice(0, 20).padEnd(20) + `-Rs.${data.discount.amount.toLocaleString()}`.padStart(12));
      }

      if (data.deliveryFee && data.deliveryFee > 0) {
        builder.line('Delivery Fee'.padEnd(20) + `Rs.${data.deliveryFee.toLocaleString()}`.padStart(12));
      }

      builder.line('--------------------------------')
        .bold(true)
        .line('TOTAL'.padEnd(20) + `Rs.${data.netTotal.toLocaleString()}`.padStart(12))
        .bold(false)
        .line('Cash Recv'.padEnd(20) + `Rs.${data.cashReceived.toLocaleString()}`.padStart(12))
        .line('Change'.padEnd(20) + `Rs.${data.change.toLocaleString()}`.padStart(12))
        .line('--------------------------------')
        .align('center')
        .line('Thank you for dining with us!')
        .line('Please visit again')
        .feed(5);

      await writeEscPosData(printerCharacteristic, builder.getBytes());
      return;
    } catch (err) {
      console.error('Bluetooth printing failed, falling back to browser print:', err);
    }
  }

  // Browser / mobile print fallback (uses hidden iframe — works on mobile where
  // window.open() popups are blocked, and gives a proper @page-sized preview).
  printViaIframe(buildReceiptHTML(data));
}

/**
 * Injects a hidden <iframe> into the current document, writes the receipt HTML
 * into it, then calls contentWindow.print(). This approach:
 *  - Works on mobile browsers (no popup needed)
 *  - Respects @page CSS so the preview never breaks when paper is changed
 *  - Cleans up the iframe after the dialog closes
 */
function printViaIframe(html: string): void {
  // Remove any leftover iframe from a previous print
  const old = document.getElementById('receipt-print-frame');
  if (old) old.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'receipt-print-frame';
  // Position off-screen — must be attached to DOM for printing to work
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    console.error('Could not access iframe document');
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for iframe content to fully render, then print
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('iframe print failed:', e);
    }
    // Clean up after dialog is dismissed
    iframe.contentWindow?.addEventListener('afterprint', () => {
      setTimeout(() => iframe.remove(), 300);
    });
    // Safety cleanup if afterprint never fires (some mobile browsers)
    setTimeout(() => {
      if (document.getElementById('receipt-print-frame')) iframe.remove();
    }, 60000);
  };
}

export async function printReceiptBluetooth(data: ReceiptData): Promise<void> {
  await printReceipt(data, false);
}
