'use client';
import { CartItem } from './Cart';

interface ReceiptData {
  orderId: string;
  orderType: string;
  items: CartItem[];
  subtotal: number;
  discount: { amount: number; reason: string };
  netTotal: number;
  cashReceived: number;
  change: number;
  cashierName: string;
  createdAt: Date;
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
      </table>
      <div class="divider"></div>
      <table class="grand">
        <tr><td>TOTAL</td><td style="text-align:right">Rs.${data.netTotal.toLocaleString()}</td></tr>
        <tr style="font-size:12px;font-weight:normal"><td>Cash</td><td style="text-align:right">Rs.${data.cashReceived.toLocaleString()}</td></tr>
        <tr style="font-size:12px;font-weight:normal"><td>Change</td><td style="text-align:right">Rs.${data.change.toLocaleString()}</td></tr>
      </table>
      <div class="divider"></div>
      <p class="footer">Thank you for dining with us!<br/>Please visit again 🙏</p>
    </body>
    </html>
  `;
}

export function printReceipt(data: ReceiptData) {
  const html = buildReceiptHTML(data);
  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) { alert('Please allow popups to print receipt'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

// Bluetooth driver stub — will be implemented once printer model is confirmed
export async function printReceiptBluetooth(_data: ReceiptData): Promise<void> {
  alert('Bluetooth printing will be enabled once the printer model is confirmed. Using browser print for now.');
  printReceipt(_data);
}
