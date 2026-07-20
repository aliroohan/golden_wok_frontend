'use client';
import { CartItem } from './Cart';
import { jsPDF } from 'jspdf';

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
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 8px; }
        h1 { font-size:16px; text-align:center; font-weight:bold; margin-bottom:2px; }
        .sub { text-align:center; font-size:10px; color:#555; margin-bottom:6px; }
        .divider { border-top:1px dashed #000; margin:5px 0; }
        table { width:100%; border-collapse:collapse; }
        td { padding:2px 0; font-size:11px; }
        .totals td { font-size:12px; }
        .grand td { font-size:14px; font-weight:bold; }
        .footer { text-align:center; font-size:10px; margin-top:8px; }
      </style>
    </head>
    <body>
      <h1>🥢 Golden Wok</h1>
      <p class="sub">Chinese Restaurant</p>
      <div class="divider"></div>
      <p style="font-size:10px">${date} ${time} · ${data.orderType.toUpperCase()}</p>
      <p style="font-size:10px">Cashier: ${data.cashierName}</p>
      <p style="font-size:10px">Order: #${data.orderId.slice(-6).toUpperCase()}</p>
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
        <tr style="font-size:12px;font-weight:normal"><td>Cash</td><td style="text-align:right">Rs.${data.cashReceived.toLocaleString()}</td></tr>
        <tr style="font-size:12px;font-weight:normal"><td>Change</td><td style="text-align:right">Rs.${data.change.toLocaleString()}</td></tr>
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

  // Mobile: generate and download a PDF directly (no printer needed)
  if (isMobileDevice()) {
    saveReceiptAsPDF(data);
    return;
  }

  // Desktop browser print fallback
  const html = buildReceiptHTML(data);
  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) { alert('Please allow popups to print receipt'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Wait for full render before triggering print
  win.onload = () => {
    win.print();
    // Close only AFTER the print dialog is dismissed
    win.addEventListener('afterprint', () => {
      setTimeout(() => win.close(), 200);
    });
  };
  // Fallback: if onload never fires (some browsers), use a longer timeout
  setTimeout(() => {
    if (!win.closed) {
      win.print();
      win.addEventListener('afterprint', () => {
        setTimeout(() => win.close(), 200);
      });
    }
  }, 800);
}

/** Returns true when running on a mobile/tablet browser */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Generates a thermal-receipt-style PDF and triggers a download.
 * Works on Android & iOS without needing a printer.
 */
export function saveReceiptAsPDF(data: ReceiptData): void {
  const date = data.createdAt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = data.createdAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

  // 80mm thermal receipt width ≈ 80mm, arbitrary height (jsPDF auto-grows)
  const pageW = 80;   // mm
  const margin = 4;   // mm
  const contentW = pageW - margin * 2;

  // Estimate height: header(30) + items(8 each) + totals(40) + footer(20)
  const estimatedH = 30 + data.items.length * 8 + 60 + 20;
  const doc = new jsPDF({ unit: 'mm', format: [pageW, Math.max(estimatedH, 120)], orientation: 'portrait' });

  let y = margin;
  const lx = margin;          // left x
  const rx = pageW - margin;  // right x

  const setFont = (size: number, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('courier', style);
    doc.setFontSize(size);
  };

  const drawDivider = () => {
    doc.setLineDashPattern([1, 1], 0);
    doc.line(lx, y, rx, y);
    doc.setLineDashPattern([], 0);
    y += 3;
  };

  const writeCenter = (text: string, size = 9, bold: 'normal' | 'bold' = 'normal') => {
    setFont(size, bold);
    doc.text(text, pageW / 2, y, { align: 'center' });
    y += size * 0.45 + 1;
  };

  const writeLR = (left: string, right: string, size = 8, bold: 'normal' | 'bold' = 'normal') => {
    setFont(size, bold);
    doc.text(left, lx, y);
    doc.text(right, rx, y, { align: 'right' });
    y += size * 0.45 + 1;
  };

  const writeLeft = (text: string, size = 8) => {
    setFont(size);
    doc.text(text, lx, y);
    y += size * 0.45 + 1;
  };

  // ── Header ──
  writeCenter('Golden Wok', 12, 'bold');
  writeCenter('Chinese Restaurant', 8);
  y += 1;
  drawDivider();
  writeLeft(`${date}  ${time}  ${data.orderType.toUpperCase()}`);
  writeLeft(`Cashier: ${data.cashierName}`);
  writeLeft(`Order: #${data.orderId.slice(-6).toUpperCase()}`);
  drawDivider();

  // ── Items header ──
  writeLR('Item', 'Total', 8, 'bold');
  drawDivider();

  // ── Items ──
  for (const item of data.items) {
    const label = `${item.menuItemName} (${item.variantLabel})`;
    const price  = `Rs.${(item.qty * item.priceAtSale).toLocaleString()}`;
    setFont(8);
    // Wrap long item names
    const lines = doc.splitTextToSize(`x${item.qty}  ${label}`, contentW - 18);
    doc.text(lines, lx, y);
    doc.text(price, rx, y, { align: 'right' });
    y += (lines.length * 4) + 1;
  }

  drawDivider();

  // ── Totals ──
  writeLR('Subtotal', `Rs.${data.subtotal.toLocaleString()}`);
  if (data.discount.amount > 0) {
    writeLR(`Disc (${data.discount.reason})`, `-Rs.${data.discount.amount.toLocaleString()}`);
  }
  if (data.deliveryFee && data.deliveryFee > 0) {
    writeLR('Delivery Fee', `Rs.${data.deliveryFee.toLocaleString()}`);
  }
  drawDivider();
  writeLR('TOTAL', `Rs.${data.netTotal.toLocaleString()}`, 10, 'bold');
  writeLR('Cash', `Rs.${data.cashReceived.toLocaleString()}`, 8);
  writeLR('Change', `Rs.${data.change.toLocaleString()}`, 8);
  drawDivider();

  // ── Footer ──
  writeCenter('Thank you for dining with us!', 8);
  writeCenter('Please visit again', 8);

  const filename = `GoldenWok-${data.orderId.slice(-6).toUpperCase()}.pdf`;
  doc.save(filename);
}

export async function printReceiptBluetooth(data: ReceiptData): Promise<void> {
  await printReceipt(data, false);
}
