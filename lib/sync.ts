import { db, LocalOrder, CachedMenuItem, CachedCategory } from './db';
import api from './api';

// ── Menu Cache ───────────────────────────────────────────────

export async function seedMenuCache() {
  try {
    const { data } = await api.get('/menu/all');
    await db.transaction('rw', db.menuItems, db.categories, async () => {
      await db.menuItems.clear();
      await db.categories.clear();
      await db.menuItems.bulkPut(data.items);
      await db.categories.bulkPut(data.categories);
    });
    localStorage.setItem('menuCachedAt', new Date().toISOString());
    console.log('✅ Menu cache seeded from server');
  } catch {
    console.warn('⚠️ Could not seed menu from server — using cached data');
  }
}

export async function getCachedMenu(): Promise<{ categories: CachedCategory[]; items: CachedMenuItem[] }> {
  const [categories, items] = await Promise.all([
    db.categories.orderBy('order').toArray(),
    db.menuItems.toArray(),
  ]);
  return { categories, items };
}

// ── Order Queue ──────────────────────────────────────────────

// IMPORTANT: Store synced as 0/1 (number) NOT boolean.
// IndexedDB indexes treat 0 and false as different types — using numbers is reliable.

export async function saveOrderLocally(order: Omit<LocalOrder, 'id' | 'synced'>) {
  await db.orders.add({ ...order, synced: false });
}

export async function getPendingOrders(): Promise<LocalOrder[]> {
  // We store synced:false (boolean) — Dexie can filter booleans directly
  return db.orders.filter((o) => !o.synced).toArray();
}

export async function getPendingCount(): Promise<number> {
  return db.orders.filter((o) => !o.synced).count();
}

export async function syncPendingOrders(): Promise<void> {
  const pending = await getPendingOrders();
  if (pending.length === 0) return;

  try {
    const payload = pending.map((o) => ({
      localId: o.localId,
      orderType: o.orderType,
      items: o.items.map((i) => ({
        menuItem: i.menuItemId,
        menuItemName: i.menuItemName,
        variantId: i.variantId,
        variantLabel: i.variantLabel,
        qty: i.qty,
        priceAtSale: i.priceAtSale,
      })),
      subtotal: o.subtotal,
      discount: o.discount,
      netTotal: o.netTotal,
      deliveryFee: o.deliveryFee || 0,
      cashReceived: o.cashReceived,
      change: o.change,
      status: o.status,
      createdAt: o.createdAt,
    }));

    await api.post('/orders/bulk-sync', { orders: payload });

    // Mark all as synced in local DB
    const ids = pending.map((o) => o.id!).filter(Boolean);
    await db.orders.where('id').anyOf(ids).modify({ synced: true });
    console.log(`✅ Synced ${ids.length} offline order(s) to server`);
  } catch (err) {
    console.warn('⚠️ Sync failed, will retry on next opportunity:', err);
  }
}

// ── Online/Offline Listener ──────────────────────────────────

let syncListenerRegistered = false;

export function startSyncListener() {
  if (typeof window === 'undefined') return;
  if (syncListenerRegistered) return; // prevent duplicate listeners
  syncListenerRegistered = true;

  window.addEventListener('online', () => {
    console.log('🌐 Back online — syncing orders...');
    syncPendingOrders();
    seedMenuCache();
  });

  // Sync immediately on mount if online
  if (navigator.onLine) {
    syncPendingOrders();
    seedMenuCache();
  }
}
