'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, XCircle } from 'lucide-react';
import api from '@/lib/api';

interface OrderItem {
  menuItemName: string;
  variantLabel: string;
  qty: number;
  priceAtSale: number;
}

interface Order {
  _id: string;
  localId: string;
  orderType: string;
  items: OrderItem[];
  subtotal: number;
  discount: { amount: number; reason: string };
  netTotal: number;
  cashReceived: number;
  change: number;
  status: 'held' | 'completed' | 'voided';
  cashier: { name: string; username: string } | null;
  createdAt: string;
}

interface Props {
  onClose: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'badge-green',
  voided:    'badge-red',
  held:      'badge-gold',
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  'dine-in':  '🍽 Dine-in',
  takeaway:   '🥡 Takeaway',
  delivery:   '🚴 Delivery',
};

export default function TodayOrdersDrawer({ onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders');
      setOrders(data.orders);
    } catch {
      setError('Could not load orders. Are you offline?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (order: Order) => {
    if (!confirm(`Cancel order #${order.localId.slice(-6).toUpperCase()}?\nTotal: Rs. ${order.netTotal.toLocaleString()}\n\nThis cannot be undone.`)) return;
    setCancelling(order._id);
    try {
      await api.put(`/orders/${order._id}/cancel`);
      setOrders((prev) => prev.map((o) => o._id === order._id ? { ...o, status: 'voided' } : o));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not cancel order');
    } finally {
      setCancelling(null);
    }
  };

  const todayTotal = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.netTotal, 0);
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 200,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          width: '100%', maxWidth: 460, height: '100%',
          background: '#141414', borderLeft: '1px solid #2a2a2a',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Today&apos;s Orders</h3>
            <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 2 }}>
              {completedCount} completed · Rs. {todayTotal.toLocaleString()} total
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button id="orders-refresh" onClick={load} className="btn btn-ghost btn-sm" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <button id="orders-close" onClick={onClose} className="btn btn-ghost btn-sm">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : error ? (
            <p style={{ color: '#e74c3c', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>{error}</p>
          ) : orders.length === 0 ? (
            <p style={{ color: '#555', textAlign: 'center', padding: '3rem', fontSize: '0.9rem' }}>No orders today yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {orders.map((order) => {
                const isExpanded = expanded === order._id;
                const isCancelled = order.status === 'voided';
                const time = new Date(order.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

                return (
                  <div
                    key={order._id}
                    style={{
                      background: '#1e1e1e',
                      border: `1px solid ${isCancelled ? '#3a1010' : '#2e2e2e'}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      opacity: isCancelled ? 0.6 : 1,
                    }}
                  >
                    {/* Order row */}
                    <div
                      style={{ padding: '0.75rem 0.9rem', cursor: 'pointer', display: 'flex', gap: '0.6rem', alignItems: 'center' }}
                      onClick={() => setExpanded(isExpanded ? null : order._id)}
                    >
                      {/* Order ref + time */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace', color: '#f39c12' }}>
                            #{order.localId.slice(-6).toUpperCase()}
                          </span>
                          <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`}>{order.status}</span>
                          <span style={{ fontSize: '0.72rem', color: '#888' }}>{ORDER_TYPE_LABEL[order.orderType] || order.orderType}</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#888' }}>
                          {time} · {order.cashier?.name || 'Unknown'} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Net total */}
                      <span style={{ fontWeight: 800, color: isCancelled ? '#555' : '#f0f0f0', fontSize: '0.95rem', flexShrink: 0 }}>
                        Rs. {order.netTotal.toLocaleString()}
                      </span>

                      {/* Cancel button */}
                      {!isCancelled && (
                        <button
                          id={`cancel-order-${order._id}`}
                          onClick={(e) => { e.stopPropagation(); handleCancel(order); }}
                          disabled={cancelling === order._id}
                          className="btn btn-danger btn-sm"
                          title="Cancel this order"
                          style={{ flexShrink: 0 }}
                        >
                          {cancelling === order._id
                            ? <span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#e74c3c' }} />
                            : <XCircle size={14} />
                          }
                        </button>
                      )}
                    </div>

                    {/* Expanded items */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #2a2a2a', padding: '0.6rem 0.9rem', background: '#181818' }}>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', color: '#aaa' }}>
                            <span>{item.menuItemName} <span style={{ color: '#666' }}>({item.variantLabel})</span> × {item.qty}</span>
                            <span style={{ color: '#f0f0f0' }}>Rs. {(item.qty * item.priceAtSale).toLocaleString()}</span>
                          </div>
                        ))}
                        {order.discount.amount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', color: '#e74c3c', borderTop: '1px solid #2a2a2a', marginTop: '0.4rem' }}>
                            <span>Discount ({order.discount.reason})</span>
                            <span>−Rs. {order.discount.amount.toLocaleString()}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, padding: '0.3rem 0 0', borderTop: '1px solid #2a2a2a', marginTop: '0.3rem' }}>
                          <span>Total</span>
                          <span style={{ color: '#f39c12' }}>Rs. {order.netTotal.toLocaleString()}</span>
                        </div>
                        {order.cashReceived > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#888', paddingTop: '0.2rem' }}>
                            <span>Cash / Change</span>
                            <span>Rs. {order.cashReceived.toLocaleString()} / Rs. {order.change.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
