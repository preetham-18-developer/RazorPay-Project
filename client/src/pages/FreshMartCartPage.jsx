import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';

export default function FreshMartCartPage({ cart, updateQty, removeFromCart }) {
  const navigate = useNavigate();

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <FreshMartHeader cartCount={cartCount} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 2rem 4rem 2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>
          Shopping Cart ({cart.length} items)
        </h1>

        {cart.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Your cart is currently empty
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Explore our fresh organic groceries and add items to your cart.</p>
            <Link to="/products" className="btn-primary" style={{ textDecoration: 'none' }}>
              Browse Products Catalog
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
            
            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cart.map(item => (
                <div
                  key={item.product_id || item.sku}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <img
                    src={item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"}
                    alt={item.name}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                  />

                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>SKU: {item.sku}</div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>{item.name}</h3>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f97316' }}>
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
                    <button
                      onClick={() => updateQty(item.product_id, item.qty - 1)}
                      style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', padding: '0 0.4rem' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.product_id, item.qty + 1)}
                      style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', padding: '0 0.4rem' }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem' }}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Order Summary Box */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', height: 'fit-content', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>Order Summary</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <span>Subtotal</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <span>Delivery Charge</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', fontSize: '0.9rem', color: '#475569' }}>
                <span>Taxes & Fees</span>
                <span>Included</span>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Total Payable</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f97316' }}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
              >
                Proceed to Checkout →
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
