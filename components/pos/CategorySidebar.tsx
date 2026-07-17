'use client';

import { CachedCategory } from '@/lib/db';

interface Props {
  categories: CachedCategory[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function CategorySidebar({ categories, selected, onSelect }: Props) {
  return (
    <aside className="pos-sidebar">
      {categories.map((cat) => {
        const active = selected === cat._id;
        return (
          <button
            key={cat._id}
            id={`cat-${cat._id}`}
            onClick={() => onSelect(cat._id)}
            style={{
              background: active ? '#c0392b' : 'transparent',
              color: active ? '#fff' : '#888',
              border: active ? '1px solid #96281b' : '1px solid transparent',
              borderRadius: 10,
              padding: '0.7rem 0.5rem',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              textAlign: 'center',
              lineHeight: 1.3,
              transition: 'all 0.15s',
            }}
          >
            {cat.name}
          </button>
        );
      })}
    </aside>
  );
}
