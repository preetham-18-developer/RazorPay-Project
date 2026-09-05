import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { getProducts, processCheckout } from '../api/freshmart';

export default function FreshMartStorePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('RAZORPAY_TEST');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    async function fetchCatalog() {
      try {
        setLoading(true);
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        setError('Failed to load store catalog');
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.product_id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.product_id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, { ...product, qty: 1 }];
      }
    });
    setIsCartOpen(true);
  };

  const updateQty = (productId, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product_id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const categories = ['ALL', 'Pantry & Gourmet', 'Staples & Grains', 'Dairy & Cold Store', 'Fruits & Produce', 'Beverages & Teas', 'Bakery'];

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotalPaise = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartTotalRupees = (cartTotalPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  const handleCheckout = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const itemsPayload = cart.map(i => ({
        product_id: i.product_id,
        sku: i.sku,
        qty: i.qty
      }));

      const res = await processCheckout({
        items: itemsPayload,
        payment_mode: paymentMode,
        simulate_failure: simulateFailure,
        customer_id: 'cust_fm_demo_user'
      });

      if (res.success) {
        setCompletedOrder(res);
        setCart([]);
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
      }
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <FreshMartHeader
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
      />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
        {/* Banner Hero */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '2rem 2.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          <div style={{ maxWidth: '680px' }}>
            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              🌿 PREMIUM ONLINE SUPERMARKET
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', margin: '0 0 0.5rem 0', color: '#f8fafc', fontWeight: 700, lineHeight: 1.2 }}>
              Fresh essentials & artisanal pantry reserves, delivered simply.
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              Browse organic produce, daily staples, and luxury food hampers. Order operational events automatically stream to DisputeShield for evidence grounding.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPaymentMode('RAZORPAY_TEST')}
                style={{
                  padding: '0.55rem 0.95rem',
                  border: paymentMode === 'RAZORPAY_TEST' ? '1px solid #38bdf8' : '1px solid #334155',
                  backgroundColor: paymentMode === 'RAZORPAY_TEST' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: paymentMode === 'RAZORPAY_TEST' ? '#38bdf8' : '#94a3b8',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ● RAZORPAY TEST MODE
              </button>
              <button
                onClick={() => setPaymentMode('SIMULATION')}
                style={{
                  padding: '0.55rem 0.95rem',
                  border: paymentMode === 'SIMULATION' ? '1px solid #f59e0b' : '1px solid #334155',
                  backgroundColor: paymentMode === 'SIMULATION' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  color: paymentMode === 'SIMULATION' ? '#f59e0b' : '#94a3b8',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ● SIMULATION MODE
              </button>
            </div>
            <Link to="/freshmart/merchant" style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
              Switch to Merchant Console →
            </Link>
          </div>
        </div>

        {/* Order Completed Notice Modal / Card */}
        {completedOrder && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', padding: '1.5rem 2rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="mono" style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>
                ✓ ORDER CONFIRMED & PAYMENT CAPTURED
              </span>
              <h2 style={{ fontSize: '1.3rem', margin: '0 0 0.3rem 0', color: '#f8fafc' }}>Order #{completedOrder.order_id}</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                Payment ID: <code style={{ color: '#f8fafc', backgroundColor: '#1e293b', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>{completedOrder.payment_id}</code> · Gateway Mode: <strong style={{ color: '#38bdf8' }}>{completedOrder.mode}</strong> · Total Paid: <strong style={{ color: '#f8fafc' }}>{((completedOrder.total_amount || 0) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link to="/freshmart/merchant" style={{ backgroundColor: '#10b981', color: '#090d16', textDecoration: 'none', padding: '0.65rem 1.25rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
                OPEN MERCHANT WORKFLOW TO FULFILL →
              </Link>
              <Link to={`/freshmart/orders/${completedOrder.order_id}`} style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', textDecoration: 'none', padding: '0.65rem 1.25rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
                TRACK TIMELINE →
              </Link>
              <button onClick={() => setCompletedOrder(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem 1.25rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
            <span className="mono" style={{ color: '#f87171', fontWeight: 700, fontSize: '0.8rem', display: 'block' }}>CHECKOUT EXCEPTION:</span>
            <p style={{ color: '#f8fafc', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>{error}</p>
          </div>
        )}

        {/* Search & Category Filter Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.45rem 0.85rem',
                  border: selectedCategory === cat ? '1px solid #10b981' : '1px solid #1e293b',
                  backgroundColor: selectedCategory === cat ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                  color: selectedCategory === cat ? '#10b981' : '#94a3b8',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ width: '280px' }}>
            <input
              type="text"
              placeholder="Search products or SKUs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b', padding: '0.5rem 0.85rem', borderRadius: '4px', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {/* Product Catalog Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: '#94a3b8' }}>
            <span>LOADING FRESHMART STORE CATALOG...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {filteredProducts.map(product => {
              const isHeroProduct = product.product_id === 'prod_fm_09' || product.price >= 1800000;
              return (
                <div
                  key={product.product_id}
                  style={{
                    backgroundColor: '#0f172a',
                    border: isHeroProduct ? '2px solid #f59e0b' : '1px solid #1e293b',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    position: 'relative'
                  }}
                >
                  {isHeroProduct && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#f59e0b', color: '#090d16', fontWeight: 800, fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 10 }}>
                      ⭐ HERO DEMO SCENARIO (₹18,999)
                    </div>
                  )}

                  <div>
                    <img src={product.image} alt={product.name} style={{ width: '100%', height: '190px', objectFit: 'cover' }} />
                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span className="mono" style={{ fontSize: '0.65rem', color: isHeroProduct ? '#f59e0b' : '#38bdf8', backgroundColor: '#1e293b', padding: '0.15rem 0.4rem', borderRadius: '2px' }}>
                          {product.sku}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{product.category}</span>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', margin: '0.4rem 0', color: '#f8fafc', fontWeight: 600, minHeight: '2.5rem', lineHeight: 1.3 }}>
                        {product.name}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4, margin: '0.4rem 0 1rem 0' }}>
                        {product.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: '0.85rem' }}>
                    <span className="mono" style={{ fontSize: '1.15rem', color: isHeroProduct ? '#f59e0b' : '#f8fafc', fontWeight: 700 }}>
                      {(product.price / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </span>
                    <button
                      onClick={() => addToCart(product)}
                      style={{
                        backgroundColor: isHeroProduct ? '#f59e0b' : '#10b981',
                        color: '#090d16',
                        border: 'none',
                        padding: '0.55rem 1.1rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      + ADD TO CART
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Sidebar Drawer */}
      {isCartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div style={{ width: '440px', backgroundColor: '#0f172a', borderLeft: '1px solid #1e293b', padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.85rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#f8fafc' }}>Your Shopping Basket ({cartCount})</h2>
                <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
                  <p>Your grocery basket is empty.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
                  {cart.map(item => (
                    <div key={item.product_id} style={{ display: 'flex', gap: '1rem', backgroundColor: '#1e293b', padding: '0.85rem', borderRadius: '6px', alignItems: 'center' }}>
                      <img src={item.image} alt={item.name} style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.85rem', margin: 0, color: '#f8fafc' }}>{item.name}</h4>
                        <span className="mono" style={{ fontSize: '0.65rem', color: '#10b981' }}>{item.sku}</span>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                          {(item.price / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f172a', borderRadius: '4px', padding: '0.2rem 0.5rem' }}>
                        <button onClick={() => updateQty(item.product_id, -1)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>-</button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.product_id, 1)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 700 }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Order Total</span>
                  <span className="mono" style={{ fontSize: '1.3rem', color: '#f8fafc', fontWeight: 700 }}>{cartTotalRupees}</span>
                </div>
                <button
                  onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                  style={{ width: '100%', backgroundColor: '#10b981', color: '#090d16', border: 'none', padding: '0.9rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                >
                  PROCEED TO CHECKOUT →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div style={{ width: '520px', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#f8fafc' }}>FreshMart Order Checkout</h2>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Customer Info */}
            <div style={{ backgroundColor: '#1e293b', padding: '0.85rem 1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
              <span className="mono" style={{ fontSize: '0.65rem', color: '#10b981', display: 'block', fontWeight: 600 }}>DEMO CUSTOMER IDENTITY</span>
              <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>cust_fm_demo_user (Preetham Demo)</span>
            </div>

            {/* Order Summary */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>ORDER SUMMARY ({cartCount} ITEMS)</span>
              {cart.map(i => (
                <div key={i.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  <span>{i.name} (x{i.qty})</span>
                  <span className="mono">{((i.price * i.qty) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '0.65rem', marginTop: '0.65rem', fontWeight: 700, fontSize: '1rem' }}>
                <span>Total Amount</span>
                <span className="mono" style={{ color: '#10b981' }}>{cartTotalRupees}</span>
              </div>
            </div>

            {/* Payment Mode Selection Toggle */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>PAYMENT EXECUTION MODE</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMode('RAZORPAY_TEST')}
                  style={{
                    padding: '0.75rem',
                    border: paymentMode === 'RAZORPAY_TEST' ? '2px solid #38bdf8' : '1px solid #334155',
                    backgroundColor: paymentMode === 'RAZORPAY_TEST' ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                    color: '#f8fafc',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  RAZORPAY TEST MODE
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('SIMULATION')}
                  style={{
                    padding: '0.75rem',
                    border: paymentMode === 'SIMULATION' ? '2px solid #f59e0b' : '1px solid #334155',
                    backgroundColor: paymentMode === 'SIMULATION' ? 'rgba(245, 158, 11, 0.15)' : '#1e293b',
                    color: '#f8fafc',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  SIMULATION MODE
                </button>
              </div>
            </div>

            {/* Simulate Failure Checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={e => setSimulateFailure(e.target.checked)}
              />
              <span>Simulate Payment Failure (Declined by Gateway)</span>
            </label>

            {/* Pay Button */}
            <button
              onClick={handleCheckout}
              disabled={submitting}
              style={{
                width: '100%',
                backgroundColor: paymentMode === 'RAZORPAY_TEST' ? '#38bdf8' : '#f59e0b',
                color: '#0f172a',
                border: 'none',
                padding: '0.9rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              {submitting ? 'PROCESSING PAYMENT...' : `PAY ${cartTotalRupees} (${paymentMode})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

