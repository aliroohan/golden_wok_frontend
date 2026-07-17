import Dexie, { Table } from 'dexie';

export interface LocalOrder {
  id?: number;          // IndexedDB auto-increment
  localId: string;      // UUID — used as sync key
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  items: {
    menuItemId: string;
    menuItemName: string;
    variantId: string;
    variantLabel: string;
    qty: number;
    priceAtSale: number;
  }[];
  subtotal: number;
  discount: { amount: number; reason: string };
  netTotal: number;
  deliveryFee?: number;
  cashReceived: number;
  change: number;
  status: 'held' | 'completed' | 'voided';
  cashierId: string;
  cashierName: string;
  createdAt: string; // ISO string — preserved from offline creation time
  synced: boolean;
}

export interface CachedMenuItem {
  _id: string;
  name: string;
  category: { _id: string; name: string; order: number };
  image: string | null;
  available: boolean;
  variants: { _id: string; label: string; price: number; available: boolean }[];
}

export interface CachedCategory {
  _id: string;
  name: string;
  order: number;
  hidden: boolean;
}

class GoldenWokDB extends Dexie {
  orders!: Table<LocalOrder>;
  menuItems!: Table<CachedMenuItem>;
  categories!: Table<CachedCategory>;

  constructor() {
    super('GoldenWokPOS');
    this.version(1).stores({
      orders: '++id, localId, synced, status, createdAt',
      menuItems: '_id, name, [category._id], available',
      categories: '_id, order',
    });
  }
}

export const db = new GoldenWokDB();
