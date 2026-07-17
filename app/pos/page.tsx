'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { getCachedMenu, saveOrderLocally, startSyncListener, syncPendingOrders } from '@/lib/sync';
import { CachedCategory, CachedMenuItem } from '@/lib/db';
import CategorySidebar from '@/components/pos/CategorySidebar';
import ItemGrid from '@/components/pos/ItemGrid';
import Cart, { CartItem } from '@/components/pos/Cart';
import VariantPicker from '@/components/pos/VariantPicker';
import DiscountModal from '@/components/pos/DiscountModal';
import SyncBanner from '@/components/pos/SyncBanner';
import { printReceipt } from '@/components/pos/ReceiptPrinter';
import { Tag, Pause, LogOut, LayoutDashboard, ClipboardList, ShoppingCart, ChevronRight, X } from 'lucide-react';
import TodayOrdersDrawer from '@/components/pos/TodayOrdersDrawer';

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export default function POSPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<CachedCategory[]>([]);
  const [allItems, setAllItems] = useState<CachedMenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [discount, setDiscount] = useState({ amount: 0, reason: '' });
  const [cashReceived, setCashReceived] = useState('');
  const [pickerItem, setPickerItem] = useState<CachedMenuItem | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [lastOrder, setLastOrder] = useState<null | { id: string }>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && user === null) router.replace('/login');
  }, [user, loading, router]);

  // Load menu cache + start sync listener
  useEffect(() => {
    startSyncListener();
    getCachedMenu().then(({ categories, items }) => {
      setCategories(categories);
      setAllItems(items);
      if (categories.length > 0) setSelectedCat(categories[0]._id);
    });
  }, []);

  const visibleItems = allItems.filter((i) => i.category._id === selectedCat);

  // Cart handlers
  const addItem = (item: CachedMenuItem) => {
    setPickerItem(item);
  };

  const addToCart = (cartItem: CartItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((c) => c.variantId === cartItem.variantId);
      if (idx >= 0) { const next = [...prev]; next[idx].qty += 1; return next; }
      return [...prev, cartItem];
    });
  };

  const qtyChange = (i: number, delta: number) => {
    setCartItems((prev) => {
      const next = [...prev];
      next[i].qty = Math.max(1, next[i].qty + delta);
      return next;
    });
  };

  const removeItem = (i: number) => setCartItems((prev) => prev.filter((_, idx) => idx !== i));

  const clearCart = () => { setCartItems([]); setDiscount({ amount: 0, reason: '' }); setCashReceived(''); };

  // Totals
  const subtotal = cartItems.reduce((s, i) => s + i.qty * i.priceAtSale, 0);
  const netTotal = Math.max(0, subtotal - discount.amount);
  const cash = Number(cashReceived) || 0;
  const change = Math.max(0, cash - netTotal);

  const canCheckout = cartItems.length > 0 && cash >= netTotal;

  // Checkout
  const handleCheckout = async () => {
    if (!user) return;
    setCheckingOut(true);
    const localId = uuidv4();
    const orderData = {
      localId,
      orderType,
      items: cartItems.map((i) => ({ ...i, menuItemId: i.menuItemId })),
      subtotal,
      discount,
      netTotal,
      cashReceived: cash,
      change,
      status: 'completed' as const,
      cashierId: user._id,
      cashierName: user.name,
      createdAt: new Date().toISOString(),
    };

    await saveOrderLocally(orderData); // always save locally first

    // Sync immediately if online (non-blocking)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncPendingOrders().catch(console.error);
    }

    // Print immediately — no network call needed
    printReceipt({
      orderId: localId,
      orderType,
      items: cartItems,
      subtotal,
      discount,
      netTotal,
      cashReceived: cash,
      change,
      cashierName: user.name,
      createdAt: new Date(),
    });

    setLastOrder({ id: localId });
    clearCart();
    setIsCartOpen(false);
    setCheckingOut(false);
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f' }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0f0f' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6rem 1rem', background: '#141414', borderBottom: '1px solid #2a2a2a',
        gap: '1rem', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f39c12' }}>🥢 Golden Wok</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SyncBanner />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ color: '#888', fontSize: '0.82rem' }}>{user.name}</span>
          <button id="nav-orders" onClick={() => setShowOrders(true)} className="btn btn-ghost btn-sm">
              <ClipboardList size={14} /> Orders
            </button>
          {user.role === 'owner' && (
            <button id="nav-admin" onClick={() => router.push('/admin')} className="btn btn-ghost btn-sm">
              <LayoutDashboard size={14} /> Admin
            </button>
          )}
          <button id="nav-logout" onClick={logout} className="btn btn-ghost btn-sm">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main body */}
      <div className="pos-layout">
        {/* Category sidebar */}
        <CategorySidebar categories={categories} selected={selectedCat} onSelect={setSelectedCat} />

        {/* Item grid */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ItemGrid items={visibleItems} onAdd={addItem} />
        </main>

        {/* Cart panel */}
        <aside className={`pos-cart-aside ${isCartOpen ? 'open' : ''}`}>
          {/* Mobile Close Button */}
          <div className="pos-mobile-cart-close" style={{ display: 'none', marginBottom: '1rem' }}>
            <button onClick={() => setIsCartOpen(false)} className="btn btn-ghost btn-sm btn-full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Close Order Panel</span>
              <X size={16} />
            </button>
          </div>

          {/* Order type */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.8rem' }}>
            {(['dine-in', 'takeaway', 'delivery'] as OrderType[]).map((t) => (
              <button key={t} id={`ot-${t}`} onClick={() => setOrderType(t)}
                style={{
                  flex: 1, padding: '0.45rem 0.2rem', borderRadius: 8, fontWeight: 600, fontSize: '0.72rem',
                  cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: orderType === t ? '#c0392b' : '#2e2e2e',
                  color: orderType === t ? '#fff' : '#888',
                }}>
                {t}
              </button>
            ))}
          </div>

          <Cart items={cartItems} onQtyChange={qtyChange} onRemove={removeItem} />

          {/* Totals & discount */}
          <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '0.8rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem', color: '#888' }}>
              <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {discount.amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem', color: '#e74c3c' }}>
                <span>Discount ({discount.reason})</span><span>−Rs. {discount.amount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: '#f0f0f0', marginBottom: '0.8rem' }}>
              <span>Total</span><span style={{ color: '#f39c12' }}>Rs. {netTotal.toLocaleString()}</span>
            </div>

            {/* Cash received */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label className="label">Cash Received (Rs.)</label>
              <input
                id="cash-received"
                className="input"
                type="number"
                min={0}
                placeholder="0"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                style={{ fontWeight: 700, fontSize: '1.1rem' }}
              />
            </div>

            {cash > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.9rem', color: change >= 0 ? '#2ecc71' : '#e74c3c' }}>
                <span>Change</span><span style={{ fontWeight: 700 }}>Rs. {change.toLocaleString()}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button id="discount-btn" onClick={() => setShowDiscount(true)} className="btn btn-ghost btn-sm" disabled={cartItems.length === 0} style={{ flex: 1 }}>
                <Tag size={13} /> Discount
              </button>
              <button id="hold-btn" onClick={clearCart} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                <Pause size={13} /> Clear
              </button>
            </div>

            <button
              id="checkout-btn"
              onClick={handleCheckout}
              className="btn btn-gold btn-full btn-lg"
              disabled={!canCheckout || checkingOut}
            >
              {checkingOut ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#111' }} /> : `Checkout · Rs. ${netTotal.toLocaleString()}`}
            </button>
          </div>
        </aside>
      </div>

      {/* Sticky Bottom Bar for Mobile Cart Toggle */}
      {cartItems.length > 0 && (
        <button className="pos-mobile-cart-toggle" onClick={() => setIsCartOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingCart size={18} />
            <span>{cartItems.reduce((acc, item) => acc + item.qty, 0)} Item(s)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>Rs. {netTotal.toLocaleString()}</span>
            <ChevronRight size={18} />
          </div>
        </button>
      )}

      {/* Modals */}
      {pickerItem && (
        <VariantPicker
          item={pickerItem}
          onSelect={(variantId, variantLabel, price) => {
            addToCart({ menuItemId: pickerItem._id, menuItemName: pickerItem.name, variantId, variantLabel, qty: 1, priceAtSale: price });
            setPickerItem(null);
            // Auto open cart drawer on mobile to show the newly added item
            if (window.innerWidth < 1024) setIsCartOpen(true);
          }}
          onClose={() => setPickerItem(null)}
        />
      )}
      {showDiscount && (
        <DiscountModal subtotal={subtotal} onApply={setDiscount} onClose={() => setShowDiscount(false)} />
      )}
      {showOrders && <TodayOrdersDrawer onClose={() => setShowOrders(false)} />}
      {lastOrder && (
        <div className="fade-in" style={{
          position: 'fixed', bottom: 20, right: 20, background: '#0a2e0a', border: '1px solid #1a5e1a',
          borderRadius: 12, padding: '0.8rem 1.2rem', color: '#2ecc71', fontSize: '0.9rem', fontWeight: 600,
          display: 'flex', gap: '0.5rem', alignItems: 'center', zIndex: 300,
        }}>
          ✅ Order #{lastOrder.id.slice(-6).toUpperCase()} saved &amp; receipt printed
          <button onClick={() => setLastOrder(null)} style={{ background: 'none', border: 'none', color: '#2ecc71', cursor: 'pointer', marginLeft: 4 }}>×</button>
        </div>
      )}
    </div>
  );
}
