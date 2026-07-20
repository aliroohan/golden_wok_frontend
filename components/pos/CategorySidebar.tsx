'use client';

import { CachedCategory } from '@/lib/db';

/** Sentinel id used for the "All items" virtual category */
export const ALL_CATEGORY_ID = '__all__';

interface Props {
  categories: CachedCategory[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function CategorySidebar({ categories, selected, onSelect }: Props) {
  const btnStyle = (active: boolean) => ({
    background: active ? '#c0392b' : 'transparent',
    color: active ? '#fff' : '#888',
    border: active ? '1px solid #96281b' : '1px solid transparent',
    borderRadius: 10,
    padding: '0.7rem 0.5rem',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer' as const,
    textAlign: 'center' as const,
    lineHeight: 1.3,
    transition: 'all 0.15s',
  });

  return (
    <aside className="pos-sidebar">
      {/* "All" virtual category */}
      <button
        id="cat-all"
        onClick={() => onSelect(ALL_CATEGORY_ID)}
        style={btnStyle(selected === ALL_CATEGORY_ID)}
      >
        All
      </button>

      {categories.map((cat) => (
        <button
          key={cat._id}
          id={`cat-${cat._id}`}
          onClick={() => onSelect(cat._id)}
          style={btnStyle(selected === cat._id)}
        >
          {cat.name}
        </button>
      ))}
    </aside>
  );
}
