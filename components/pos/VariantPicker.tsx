'use client';

import { CachedMenuItem } from '@/lib/db';
import { X } from 'lucide-react';

interface Props {
  item: CachedMenuItem;
  onSelect: (variantId: string, variantLabel: string, price: number) => void;
  onClose: () => void;
}

export default function VariantPicker({ item, onSelect, onClose }: Props) {
  const available = item.variants.filter((v) => v.available);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          background: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
          border: '1px solid #333', padding: '1.5rem', width: '100%', maxWidth: 480,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.name}</h3>
          <button id="variant-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>Select size / portion:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {available.map((v) => (
            <button
              key={v._id}
              id={`variant-${v._id}`}
              onClick={() => onSelect(v._id, v.label, v.price)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#242424', border: '1px solid #333', borderRadius: 12,
                padding: '0.9rem 1.2rem', cursor: 'pointer', transition: 'all 0.15s',
              }}
              className="card-hover"
            >
              <span style={{ fontWeight: 600, color: '#f0f0f0' }}>{v.label}</span>
              <span style={{ fontWeight: 700, color: '#f39c12', fontSize: '1rem' }}>Rs. {v.price.toLocaleString()}</span>
            </button>
          ))}
          {available.length === 0 && <p style={{ color: '#c0392b', textAlign: 'center' }}>All variants currently unavailable</p>}
        </div>
      </div>
    </div>
  );
}
