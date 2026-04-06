const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('../config');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const userQueries = {
  upsert: async ({ telegram_id, name, username }) => {
    const { data } = await supabase
      .from('users')
      .upsert({ telegram_id, name, username }, { onConflict: 'telegram_id' })
      .select()
      .single();
    return data;
  },
  findByTelegramId: async (telegram_id) => {
    const { data } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();
    return data;
  },
  updateLastOrder: async (last_order_id, telegram_id) => {
    await supabase.from('users').update({ last_order_id }).eq('telegram_id', telegram_id);
  },
  getAllBozorUsers: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('orders')
      .select('users!inner(telegram_id, name), status, mode, created_at')
      .eq('mode', 'bozor')
      .neq('status', 'rejected')
      .neq('status', 'delivered')
      .gte('created_at', today + 'T00:00:00Z');
      
    if (!data) return [];
    const usersMap = new Map();
    data.forEach(o => {
      const u = o.users;
      if (u && !usersMap.has(u.telegram_id)) usersMap.set(u.telegram_id, u);
    });
    return Array.from(usersMap.values());
  }
};

const menuQueries = {
  getAll: async () => {
    const { data } = await supabase.from('menu').select('*').order('category').order('id');
    return data || [];
  },
  getById: async (id) => {
    const { data } = await supabase.from('menu').select('*').eq('id', id).single();
    return data;
  },
  toggleSoldOut: async (is_sold_out, id) => {
    await supabase.from('menu').update({ is_sold_out: !!is_sold_out }).eq('id', id);
  }
};

const orderQueries = {
  create: async ({ user_id, mode, total }) => {
    const { data } = await supabase.from('orders').insert({ user_id, mode, total }).select().single();
    return data;
  },
  addItem: async ({ order_id, item_id, name_uz, quantity, price }) => {
    await supabase.from('order_items').insert({ order_id, menu_item_id: item_id, name_uz, quantity, price });
  },
  updateStatus: async ({ status, id }) => {
    await supabase.from('orders').update({ status }).eq('id', id);
  },
  updatePayment: async ({ screenshot, id }) => {
    // screenshot comes as full path, we store string, this isn't native Supabase storage but works locally or via render ephemeral disk if path used properly. Ideally we upload to Supabase storage, but we'll adapt later.
    await supabase.from('orders').update({ payment_screenshot: screenshot, status: 'payment_uploaded' }).eq('id', id);
  },
  updateAiResult: async ({ ai_verified, ai_amount, ai_confidence, id }) => {
    const status = ai_verified ? 'ai_verified' : 'payment_uploaded';
    await supabase.from('orders').update({ ai_verified, ai_amount, ai_confidence, status }).eq('id', id);
  },
  getById: async (id) => {
    const { data } = await supabase.from('orders').select('*, users!inner(telegram_id, name, username)').eq('id', id).single();
    if(data) {
      data.telegram_id = data.users.telegram_id;
      data.user_name = data.users.name;
      data.username = data.users.username;
    }
    return data;
  },
  getItemsByOrderId: async (id) => {
    const { data } = await supabase.from('order_items').select('*').eq('order_id', id);
    return (data || []).map(i => ({ ...i, item_id: i.menu_item_id }));
  },
  getLastSuccessful: async (telegram_id) => {
    const { data } = await supabase.from('orders')
      .select('*, users!inner(telegram_id)')
      .eq('users.telegram_id', telegram_id)
      .in('status', ['confirmed', 'delivered', 'ai_verified'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); 
    
    if (data) data.telegram_id = data.users.telegram_id;
    return data;
  },
  getAll: async () => {
    const { data } = await supabase.from('orders')
      .select('*, users!inner(telegram_id, name, username)')
      .order('created_at', { ascending: false })
      .limit(100);
      
    return (data || []).map(o => {
      o.telegram_id = o.users.telegram_id;
      o.user_name = o.users.name;
      o.username = o.users.username;
      return o;
    });
  },
  getWeeklyAnalytics: async () => {
    const { data } = await supabase.from('orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());
    const weeklyMap = {};
    (data || []).forEach(o => {
      const d = o.created_at.split('T')[0];
      const key = d + '_' + o.mode;
      if (!weeklyMap[key]) {
        weeklyMap[key] = { date: d, mode: o.mode, order_count: 0, revenue: 0, confirmed_count: 0 };
      }
      weeklyMap[key].order_count++;
      weeklyMap[key].revenue += o.total;
      if (['confirmed','delivered','ai_verified'].includes(o.status)) weeklyMap[key].confirmed_count++;
    });
    return Object.values(weeklyMap).sort((a,b) => b.date.localeCompare(a.date));
  },
  getTopItems: async () => {
    const { data } = await supabase.from('order_items')
      .select('*, orders!inner(status, created_at)')
      .gte('orders.created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString())
      .in('orders.status', ['confirmed','delivered','ai_verified']);
      
    const itemsMap = {};
    (data || []).forEach(oi => {
      if(!itemsMap[oi.menu_item_id]) {
        itemsMap[oi.menu_item_id] = { name_uz: oi.name_uz, total_qty: 0, revenue: 0 };
      }
      itemsMap[oi.menu_item_id].total_qty += oi.quantity;
      itemsMap[oi.menu_item_id].revenue += (oi.quantity * oi.price);
    });
    return Object.values(itemsMap).sort((a,b) => b.total_qty - a.total_qty).slice(0, 10);
  }
};

const createOrderTransaction = async (userId, mode, total, items) => {
  const order = await orderQueries.create({ user_id: userId, mode, total });
  for (const item of items) {
    await orderQueries.addItem({
      order_id: order.id,
      item_id: item.id,
      name_uz: item.name_uz,
      quantity: item.quantity,
      price: item.price
    });
  }
  return order.id;
};

module.exports = {
  supabase,
  userQueries,
  menuQueries,
  orderQueries,
  createOrderTransaction
};
