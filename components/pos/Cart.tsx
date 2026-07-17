'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';

export interface CartItem {
  menuItemId: string;
  menuItemName: string;
  variantId: string;
  variantLabel: string;
  qty: number;
  priceAtSale: number;
}

interface Props {
  items: CartItem[];
  onQtyChange: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
}

export default function Cart({ items, onQtyChange, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444', gap: '0.5rem' }}>
        <span style={{ fontSize: '2.5rem' }}>🛒</span>
        <p style={{ fontSize: '0.9rem' }}>Cart is empty</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem 0' }}>
      {items.map((item, i) => (
        <div key={`${item.variantId}-${i}`} style={{
          background: '#1e1e1e', border: '1px solid #2e2e2e', borderRadius: 10,
          padding: '0.7rem 0.8rem', display: 'flex', gap: '0.7rem', alignItems: 'center',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.menuItemName}
            </p>
            <p style={{ color: '#888', fontSize: '0.75rem' }}>{item.variantLabel} · Rs. {item.priceAtSale.toLocaleString()}</p>
          </div>

          {/* Qty controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <button id={`cart-minus-${i}`} onClick={() => onQtyChange(i, -1)} style={{ background: '#2e2e2e', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={13} />
            </button>
            <span style={{ width: 24, textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{item.qty}</span>
            <button id={`cart-plus-${i}`} onClick={() => onQtyChange(i, 1)} style={{ background: '#2e2e2e', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={13} />
            </button>
          </div>

          <span style={{ fontWeight: 700, color: '#f39c12', fontSize: '0.85rem', width: 72, textAlign: 'right', flexShrink: 0 }}>
            Rs. {(item.qty * item.priceAtSale).toLocaleString()}
          </span>

          <button id={`cart-remove-${i}`} onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
