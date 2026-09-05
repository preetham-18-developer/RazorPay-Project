/**
 * FreshMart Client API Helper Wrapper
 */

const API_BASE = '';

export async function getProducts() {
  const res = await fetch(`${API_BASE}/freshmart/products`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch product catalog');
  return res.json();
}

export async function processCheckout(payload) {
  const res = await fetch(`${API_BASE}/freshmart/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Checkout failed');
  }
  return data;
}

export async function getFreshMartOrders() {
  const res = await fetch(`${API_BASE}/freshmart/orders`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function getFreshMartOrderTimeline(orderId) {
  const res = await fetch(`${API_BASE}/freshmart/orders/${orderId}/timeline`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error(`Failed to fetch timeline for order ${orderId}`);
  return res.json();
}
