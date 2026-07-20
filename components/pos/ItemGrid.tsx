'use client';

import { CachedMenuItem } from '@/lib/db';

interface Props {
  items: CachedMenuItem[];
  onAdd: (item: CachedMenuItem) => void;
}

export default function ItemGrid({ items, onAdd }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
        No items found
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      gridAutoRows: 'max-content',
      alignContent: 'start',
      gap: '0.8rem',
      padding: '0.8rem',
      overflowY: 'auto',
      flex: 1,
    }}>
      {items.map((item) => {
        const unavailable = !item.available;
        const minPrice = Math.min(...item.variants.map((v) => v.price));
        const hasMultiVariants = item.variants.length > 1;

        return (
          <button
            key={item._id}
            id={`item-${item._id}`}
            onClick={() => !unavailable && onAdd(item)}
            disabled={unavailable}
            style={{
              background: unavailable ? 'var(--surface-2)' : 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '0.9rem 0.7rem',
              cursor: unavailable ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              transition: 'all 0.15s',
              opacity: unavailable ? 0.45 : 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            className={unavailable ? '' : 'card-hover'}
          >
            {item.image ? (
              <img src={item.image} alt={item.name} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                🍜
              </div>
            )}
            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.3 }}>{item.name}</span>
            <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.85rem' }}>
              {hasMultiVariants ? `From Rs. ${minPrice}` : `Rs. ${minPrice}`}
            </span>
            {hasMultiVariants && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '-4px' }}>tap to pick size</span>
            )}
            {unavailable && <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700 }}>Not available</span>}
          </button>
        );
      })}
    </div>
  );
}
