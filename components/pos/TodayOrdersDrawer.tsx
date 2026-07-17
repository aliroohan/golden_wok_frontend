'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, XCircle, Printer } from 'lucide-react';
import api from '@/lib/api';
import { printReceipt } from './ReceiptPrinter';
import { db } from '@/lib/db';

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  deliveryFee?: number;
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
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders', {
        params: { from: selectedDate, to: selectedDate }
      });
      setOrders(data.orders);
    } catch (err) {
      console.warn('⚠️ Fetching orders from server failed, falling back to local database:', err);
      try {
        const localOrders = await db.orders.toArray();
        const mapped = localOrders
          .map((o) => ({
            _id: o.localId,
            localId: o.localId,
            orderType: o.orderType,
            items: o.items.map((i) => ({
              menuItemName: i.menuItemName,
              variantLabel: i.variantLabel,
              qty: i.qty,
              priceAtSale: i.priceAtSale,
            })),
            subtotal: o.subtotal,
            discount: o.discount,
            netTotal: o.netTotal,
            deliveryFee: o.deliveryFee,
            cashReceived: o.cashReceived,
            change: o.change,
            status: o.status,
            cashier: { name: o.cashierName, username: '' },
            createdAt: o.createdAt,
          }))
          .filter((o) => {
            const orderDateStr = getLocalDateString(new Date(o.createdAt));
            return orderDateStr === selectedDate;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setOrders(mapped);
      } catch (dbErr) {
        setError('Could not load orders. Are you offline?');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load, selectedDate]);

  const handleCancel = async (order: Order) => {
    if (!confirm(`Cancel order #${order.localId.slice(-6).toUpperCase()}?\nTotal: Rs. ${order.netTotal.toLocaleString()}\n\nThis cannot be undone.`)) return;
    setCancelling(order._id);
    try {
      await api.put(`/orders/${order._id}/cancel`);
      // Update local db if online cancel succeeds
      try {
        await db.orders.where('localId').equals(order.localId).modify({ status: 'voided', synced: true });
      } catch (dbErr) {
        console.error('Failed to sync void status to local DB:', dbErr);
      }
      setOrders((prev) => prev.map((o) => o._id === order._id ? { ...o, status: 'voided' } : o));
    } catch (err: any) {
      const isOffline = !navigator.onLine || err.message === 'Network Error' || !err.response;
      if (isOffline) {
        try {
          await db.orders.where('localId').equals(order.localId).modify({ status: 'voided', synced: false });
          setOrders((prev) => prev.map((o) => o._id === order._id ? { ...o, status: 'voided' } : o));
          alert('Order cancelled offline. This cancellation will sync when online.');
        } catch (dbErr) {
          alert('Could not cancel order locally');
        }
      } else {
        alert(err?.response?.data?.message || 'Could not cancel order');
      }
    } finally {
      setCancelling(null);
    }
  };

  const handleReprint = (order: Order) => {
    const receiptData = {
      orderId: order._id,
      orderType: order.orderType,
      items: order.items.map((item) => ({
        menuItemId: '',
        menuItemName: item.menuItemName,
        variantId: '',
        variantLabel: item.variantLabel,
        qty: item.qty,
        priceAtSale: item.priceAtSale,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      netTotal: order.netTotal,
      cashReceived: order.cashReceived,
      change: order.change,
      cashierName: order.cashier?.name || 'Cashier',
      createdAt: new Date(order.createdAt),
    };
    printReceipt(receiptData);
  };

  const todayTotal = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.netTotal, 0);
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', justifyContent: 'flex-end', zIndex: 200,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          width: '100%', maxWidth: 460, height: '100%',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Orders History</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
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

          {/* Date Picker Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.35rem 0.6rem',
                color: 'var(--text)',
                fontSize: '0.8rem',
                fontFamily: 'inherit',
                outline: 'none',
                flex: 1
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : error ? (
            <p style={{ color: 'var(--danger)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>{error}</p>
          ) : orders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem', fontSize: '0.9rem' }}>No orders found for this date</p>
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
                      background: 'var(--surface-2)',
                      border: `1px solid ${isCancelled ? 'var(--danger-border)' : 'var(--border)'}`,
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
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--gold)' }}>
                            #{order.localId.slice(-6).toUpperCase()}
                          </span>
                          <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`}>{order.status}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ORDER_TYPE_LABEL[order.orderType] || order.orderType}</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {time} · {order.cashier?.name || 'Unknown'} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Net total */}
                      <span style={{ fontWeight: 800, color: isCancelled ? 'var(--text-dim)' : 'var(--text)', fontSize: '0.95rem', flexShrink: 0 }}>
                        Rs. {order.netTotal.toLocaleString()}
                      </span>

                      {/* Reprint button */}
                      {!isCancelled && (
                        <button
                          id={`print-order-${order._id}`}
                          onClick={(e) => { e.stopPropagation(); handleReprint(order); }}
                          className="btn btn-ghost btn-sm"
                          title="Reprint receipt"
                          style={{ flexShrink: 0, padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Printer size={14} />
                        </button>
                      )}

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
                            ? <span className="spinner" style={{ width: 13, height: 13, borderTopColor: 'var(--danger)' }} />
                            : <XCircle size={14} />
                          }
                        </button>
                      )}
                    </div>

                    {/* Expanded items */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '0.6rem 0.9rem', background: 'var(--surface)' }}>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', color: 'var(--text-muted)' }}>
                            <span>{item.menuItemName} <span style={{ color: 'var(--text-dim)' }}>({item.variantLabel})</span> × {item.qty}</span>
                            <span style={{ color: 'var(--text)' }}>Rs. {(item.qty * item.priceAtSale).toLocaleString()}</span>
                          </div>
                        ))}
                        {order.discount.amount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', color: 'var(--danger)', borderTop: '1px solid var(--border)', marginTop: '0.4rem' }}>
                            <span>Discount ({order.discount.reason})</span>
                            <span>−Rs. {order.discount.amount.toLocaleString()}</span>
                          </div>
                        )}
                        {order.deliveryFee && order.deliveryFee > 0 ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', color: 'var(--text-muted)' }}>
                            <span>Delivery Fee</span>
                            <span>Rs. {order.deliveryFee.toLocaleString()}</span>
                          </div>
                        ) : null}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, padding: '0.3rem 0 0', borderTop: '1px solid var(--border)', marginTop: '0.3rem' }}>
                          <span>Total</span>
                          <span style={{ color: 'var(--gold)' }}>Rs. {order.netTotal.toLocaleString()}</span>
                        </div>
                        {order.cashReceived > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', paddingTop: '0.2rem' }}>
                            <span>Cash / Change</span>
                            <span>Rs. {order.cashReceived.toLocaleString()} / Rs. {order.change.toLocaleString()}</span>
                          </div>
                        )}
                        {!isCancelled && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.6rem', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
                            <button
                              id={`expanded-print-${order._id}`}
                              onClick={() => handleReprint(order)}
                              className="btn btn-ghost btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            >
                              <Printer size={13} />
                              Reprint Receipt
                            </button>
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
