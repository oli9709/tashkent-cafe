import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],       // [{ id, name_uz, price, emoji, quantity }]
  mode: null,      // 'togo' | 'bozor'
  orderId: null,   // created order id

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(i => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },

  removeItem: (id) => {
    set((state) => ({ items: state.items.filter(i => i.id !== id) }));
  },

  updateQty: (id, qty) => {
    if (qty <= 0) {
      get().removeItem(id);
      return;
    }
    set((state) => ({
      items: state.items.map(i => i.id === id ? { ...i, quantity: qty } : i),
    }));
  },

  setMode: (mode) => set({ mode }),

  setOrderId: (orderId) => set({ orderId }),

  loadFromLastOrder: (lastOrderItems) => {
    const items = lastOrderItems.map(i => ({
      id: i.item_id,
      name_uz: i.name_uz,
      price: i.price,
      emoji: '🍽️',
      quantity: i.quantity,
    }));
    set({ items });
  },

  clear: () => set({ items: [], mode: null, orderId: null }),
}));

export default useCartStore;
