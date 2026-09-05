import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { getFreshMartOrders } from '../api/freshmart';

export default function FreshMartOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const data = await getFreshMartOrders();
        setOrders(data);
      } catch (err) {
        setError('Failed to load orders history');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
      <FreshMartHeader />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 2rem 4rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
          <div>
            <div style={{ color: '#f97316', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CUSTOMER ACCOUNT DASHBOARD
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.2rem 0', color: '#0f172a' }}>
              My Orders & Transaction History
            </h1>
          </div>
          <Link to="/products" className="btn-secondary" style={{ textDecoration: 'none' }}>
            ← Back to Storefront
          </Link>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#dc2626' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: '#64748b' }}>
            Replaying chronological order state from event ledger...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              No orders found
            </h2>
            <p style={{ color: '#64748b', margin: '0 0 1.5rem 0' }}>Place your first grocery order to track fulfillment in real-time.</p>
            <Link to="/products" className="btn-primary" style={{ textDecoration: 'none' }}>
              Browse Products Catalog →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map(order => (
              <div
                key={order.order_id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.02)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <span className="mono" style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      #{order.order_id}
                    </span>
                    <span style={{ fontSize: '0.7rem', backgroundColor: order.payment_status === 'CAPTURED' ? '#dcfce7' : '#fee2e2', color: order.payment_status === 'CAPTURED' ? '#15803d' : '#dc2626', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
                      {order.payment_status}
                    </span>
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 600 }}>
                      {order.delivery_status || 'PROCESSING'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0.2rem 0' }}>
                    Operational Events: <strong style={{ color: '#0f172a' }}>{order.event_count}</strong> · Order Total: <strong style={{ color: '#f97316', fontSize: '1.05rem' }}>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</strong>
                  </p>
                </div>

                <Link
                  to={`/orders/${order.order_id}`}
                  className="btn-secondary"
                  style={{ textDecoration: 'none', fontSize: '0.85rem' }}
                >
                  View Details & Timeline →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

