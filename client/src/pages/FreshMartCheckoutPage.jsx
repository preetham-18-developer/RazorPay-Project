import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { processCheckout } from '../api/freshmart';

export default function FreshMartCheckoutPage({ cart, clearCart }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [address, setAddress] = useState({
    name: 'Preetham Kumar',
    email: 'customer@freshsmart.com',
    street: '#42 Organic Avenue, Indiranagar',
    city: 'Bengaluru',
    pincode: '560038'
  });

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleCheckout = async (simulateFailure = false) => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const itemsPayload = cart.map(item => ({
        product_id: item.product_id || item.sku,
        qty: item.qty
      }));

      const res = await processCheckout({
        items: itemsPayload,
        payment_mode: 'RAZORPAY_TEST',
        simulate_failure: simulateFailure,
        customer_id: 'cust_fm_demo_user'
      });

      if (res.success && res.order_id) {
        clearCart();
        navigate(`/orders/${res.order_id}`);
      } else {
        setErrorMsg(res.error || 'Payment failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <FreshMartHeader cartCount={cartCount} />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem 4rem 2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>
          Checkout & Razorpay Payment
        </h1>

        {errorMsg && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
          {/* Delivery Details Form */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
              Shipping & Delivery Details
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Full Name</label>
                <input
                  type="text"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Email Address</label>
                <input
                  type="email"
                  value={address.email}
                  onChange={(e) => setAddress({ ...address, email: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Delivery Address</label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>City</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Pincode</label>
                  <input
                    type="text"
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Action Summary */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Payment Gateway</h2>
            
            <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Razorpay Test Mode Active
              </div>
              <div style={{ fontSize: '0.85rem', color: '#9a3412', lineHeight: 1.4 }}>
                Simulating secure test payment. No real money charged.
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Total Amount</span>
              <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#f97316' }}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleCheckout(false)}
                disabled={submitting || cart.length === 0}
                className="btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
              >
                {submitting ? 'Processing Payment...' : '💳 Pay with Razorpay Test Mode'}
              </button>

              <button
                onClick={() => handleCheckout(true)}
                disabled={submitting || cart.length === 0}
                className="btn-secondary"
                style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', color: '#ef4444', borderColor: '#fca5a5' }}
              >
                Simulate Payment Failure
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
