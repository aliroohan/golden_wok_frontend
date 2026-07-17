'use client';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, Eye, EyeOff, Upload } from 'lucide-react';

interface Variant { _id: string; label: string; price: number; available: boolean; }
interface Category { _id: string; name: string; order: number; }
interface Item { _id: string; name: string; category: Category; image: string | null; available: boolean; variants: Variant[]; }

const EMPTY_VARIANT = { label: '', price: '' };

export default function MenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCat, setFilterCat] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({ name: '', category: '', variants: [{ ...EMPTY_VARIANT }], available: true });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [menuR, catR] = await Promise.all([api.get('/menu/all'), api.get('/menu/categories')]);
    setItems(menuR.data.items);
    setCategories(catR.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', category: categories[0]?._id || '', variants: [{ ...EMPTY_VARIANT }], available: true });
    setImageFile(null);
    setShowForm(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category._id, variants: item.variants.map((v) => ({ label: v.label, price: String(v.price) })), available: item.available });
    setImageFile(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('category', form.category);
      fd.append('available', String(form.available));
      fd.append('variants', JSON.stringify(form.variants.map((v) => ({ label: v.label, price: Number(v.price) }))));
      if (imageFile) fd.append('image', imageFile);

      if (editing) {
        await api.put(`/menu/items/${editing._id}`, fd);
      } else {
        await api.post('/menu/items', fd);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/menu/items/${id}`);
    load();
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await api.put(`/menu/items/${id}/availability`, { available: !current });
    load();
  };

  const filtered = filterCat === 'all' ? items : items.filter((i) => i.category._id === filterCat);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Menu Management</h1>
        <button id="add-item-btn" onClick={openNew} className="btn btn-primary">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <button onClick={() => setFilterCat('all')} className={`btn btn-sm ${filterCat === 'all' ? 'btn-primary' : 'btn-ghost'}`}>All</button>
        {categories.map((c) => (
          <button key={c._id} id={`filter-${c._id}`} onClick={() => setFilterCat(c._id)} className={`btn btn-sm ${filterCat === c._id ? 'btn-primary' : 'btn-ghost'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Category</th><th>Variants / Price</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      {item.image
                        ? <img src={item.image} alt={item.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🍜</div>
                      }
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-gray">{item.category.name}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {item.variants.map((v) => (
                        <span key={v._id} className={`badge ${v.available ? 'badge-gold' : 'badge-gray'}`}>
                          {v.label} · Rs.{v.price.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${item.available ? 'badge-green' : 'badge-red'}`}>
                      {item.available ? 'Available' : 'Not available'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button id={`toggle-${item._id}`} onClick={() => toggleAvailability(item._id, item.available)} className="btn btn-ghost btn-sm" title={item.available ? 'Mark 86\'d' : 'Mark available'}>
                        {item.available ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button id={`edit-${item._id}`} onClick={() => openEdit(item)} className="btn btn-ghost btn-sm">
                        <Edit2 size={14} />
                      </button>
                      <button id={`delete-${item._id}`} onClick={() => handleDelete(item._id)} className="btn btn-danger btn-sm">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No items found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1.2rem' }}>{editing ? 'Edit Item' : 'New Menu Item'}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label className="label">Item Name</label>
                <input id="item-name" className="input" placeholder="e.g. Chicken Fried Rice" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <label className="label">Category</label>
                <select id="item-category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Image (optional)</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm">
                    <Upload size={14} /> {imageFile ? imageFile.name : 'Choose image'}
                  </button>
                  {(editing?.image || imageFile) && (
                    <img src={imageFile ? URL.createObjectURL(imageFile) : editing?.image!} alt="preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>

              {/* Variants */}
              <div>
                <label className="label">Variants / Prices</label>
                {form.variants.map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <input id={`variant-label-${i}`} className="input" placeholder="Label (e.g. Half)" value={v.label} onChange={(e) => { const next = [...form.variants]; next[i].label = e.target.value; setForm({ ...form, variants: next }); }} style={{ flex: 2 }} />
                    <input id={`variant-price-${i}`} className="input" type="number" placeholder="Price" value={v.price} onChange={(e) => { const next = [...form.variants]; next[i].price = e.target.value; setForm({ ...form, variants: next }); }} style={{ flex: 1 }} />
                    {form.variants.length > 1 && (
                      <button type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })} className="btn btn-danger btn-sm"><Trash2 size={13} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setForm({ ...form, variants: [...form.variants, { ...EMPTY_VARIANT }] })} className="btn btn-ghost btn-sm" style={{ marginTop: '0.3rem' }}>
                  <Plus size={13} /> Add Variant
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button id="save-item-btn" onClick={handleSave} className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save Item'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
