'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  subtotal: number;
  onApply: (discount: { amount: number; reason: string }) => void;
  onClose: () => void;
}

export default function DiscountModal({ subtotal, onApply, onClose }: Props) {
  const [type, setType] = useState<'flat' | 'percent'>('flat');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const computed = type === 'flat'
    ? Math.min(Number(value) || 0, subtotal)
    : Math.min((subtotal * (Number(value) || 0)) / 100, subtotal);

  const handleApply = () => {
    if (!reason.trim()) return alert('Please enter a reason for the discount');
    onApply({ amount: computed, reason: reason.trim() });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 400, border: '1px solid #3a1010' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ fontWeight: 700 }}>Apply Discount</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['flat', 'percent'] as const).map((t) => (
            <button key={t} id={`discount-type-${t}`} onClick={() => setType(t)} className={`btn ${type === t ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
              {t === 'flat' ? 'Fixed (Rs.)' : 'Percentage (%)'}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <label className="label">{type === 'flat' ? 'Amount (Rs.)' : 'Percentage (%)'}</label>
          <input
            id="discount-value"
            className="input"
            type="number"
            min={0}
            max={type === 'flat' ? subtotal : 100}
            placeholder={type === 'flat' ? '0' : '0-100'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="label">Reason (required)</label>
          <input id="discount-reason" className="input" placeholder="e.g. Staff discount, loyalty, manager override" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        {Number(value) > 0 && (
          <div style={{ background: '#1e1e1e', borderRadius: 10, padding: '0.8rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>Discount amount</span>
            <span style={{ fontWeight: 700, color: '#e74c3c' }}>−Rs. {computed.toLocaleString()}</span>
          </div>
        )}

        <button id="discount-apply" onClick={handleApply} className="btn btn-primary btn-full" disabled={!value || Number(value) <= 0}>
          Apply Discount
        </button>
      </div>
    </div>
  );
}
