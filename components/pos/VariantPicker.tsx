'use client';

import { useState } from 'react';
import { CachedMenuItem } from '@/lib/db';
import { X } from 'lucide-react';

interface Props {
  item: CachedMenuItem;
  onSelect: (variantId: string, variantLabel: string, price: number, qty: number) => void;
  onClose: () => void;
}

export default function VariantPicker({ item, onSelect, onClose }: Props) {
  const available = item.variants.filter((v) => v.available);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(available[0]?._id || null);
  const [qty, setQty] = useState(1);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          background: 'var(--surface)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
          border: '1px solid var(--border)', padding: '1.5rem', width: '100%', maxWidth: 480,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>{item.name}</h3>
          <button id="variant-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Select size / portion:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {available.map((v) => {
            const active = selectedVariantId === v._id;
            return (
              <button
                key={v._id}
                id={`variant-${v._id}`}
                onClick={() => setSelectedVariantId(v._id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: active ? 'var(--red)' : 'var(--surface-2)',
                  border: active ? '1px solid var(--red-dark)' : '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '0.9rem 1.2rem', cursor: 'pointer', transition: 'all 0.15s',
                }}
                className={active ? '' : 'card-hover'}
              >
                <span style={{ fontWeight: 600, color: active ? '#fff' : 'var(--text)' }}>{v.label}</span>
                <span style={{ fontWeight: 700, color: active ? '#fff' : 'var(--gold)', fontSize: '1rem' }}>Rs. {v.price.toLocaleString()}</span>
              </button>
            );
          })}
          {available.length === 0 && <p style={{ color: 'var(--danger)', textAlign: 'center' }}>All variants currently unavailable</p>}
        </div>

        {/* Quantity Selector */}
        {available.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.88rem' }}>Quantity</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.2rem' }}>
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{
                  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                  fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                }}
                className="card-hover"
              >
                -
              </button>
              <span style={{ minWidth: 35, textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                style={{
                  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
                  fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                }}
                className="card-hover"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Add to Order Button */}
        {available.length > 0 && (
          <button
            id="variant-confirm-btn"
            onClick={() => {
              const selectedVariant = available.find((v) => v._id === selectedVariantId);
              if (selectedVariant) {
                onSelect(selectedVariant._id, selectedVariant.label, selectedVariant.price, qty);
              }
            }}
            disabled={!selectedVariantId}
            className="btn btn-gold btn-full"
            style={{ marginTop: '1.2rem', padding: '0.8rem', fontWeight: 700 }}
          >
            Add to Order
          </button>
        )}
      </div>
    </div>
  );
}
