import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { getProducts } from '../api/freshmart';

export default function ProductDetailPage({ cart, addToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const catalog = await getProducts();
        const found = catalog.find(p => p.product_id === id || p.sku === id);
        setProduct(found || null);
      } catch (err) {
        console.error("Failed to load product detail:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addToCart(product);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
        <FreshMartHeader cartCount={cartCount} />
        <div style={{ maxWidth: '1280px', margin: '4rem auto', textAlign: 'center', color: '#64748b' }}>
          Loading product details...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
        <FreshMartHeader cartCount={cartCount} />
        <div style={{ maxWidth: '1280px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Product Not Found</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>The product you requested does not exist in the database.</p>
          <Link to="/products" className="btn-primary" style={{ textDecoration: 'none' }}>
            Back to Products Catalog →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <FreshMartHeader cartCount={cartCount} />

      <main style={{ maxWidth: '1280px', margin: '2.5rem auto', padding: '0 2rem' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#64748b' }}>Home</Link>
          <span>/</span>
          <Link to="/products" style={{ textDecoration: 'none', color: '#64748b' }}>Products</Link>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{product.name}</span>
        </div>

        {/* Product Card Details Layout */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', padding: '2.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          
          {/* Image Side */}
          <div style={{ position: 'relative', height: '420px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            <img
              src={product.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {product.sku === 'PANTRY-RES-18999' && (
              <span style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: '#f97316', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ⭐ HERO DEMO ITEM
              </span>
            )}
          </div>

          {/* Details Side */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f97316', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {product.category || 'General'}
                </span>
                <span className="mono" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  SKU: {product.sku}
                </span>
              </div>

              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginBottom: '1rem' }}>
                {product.name}
              </h1>

              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f97316', marginBottom: '1.25rem' }}>
                ₹{Number(product.price).toLocaleString('en-IN')}
              </div>

              <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                {product.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🚚</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>FreshSmart Guaranteed Express Delivery</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Sourced directly from verified organic farms & artisanal producers</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    style={{ border: 'none', backgroundColor: '#f1f5f9', padding: '0.6rem 1rem', fontSize: '1rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    -
                  </button>
                  <span style={{ padding: '0.6rem 1.25rem', fontWeight: 700, fontSize: '1rem', minWidth: '40px', textAlign: 'center' }}>
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    style={{ border: 'none', backgroundColor: '#f1f5f9', padding: '0.6rem 1rem', fontSize: '1rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.85rem 1.75rem', fontSize: '1rem', borderRadius: '8px' }}
                >
                  {added ? '✓ Added to Cart!' : '+ Add to Cart'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => {
                    handleAddToCart();
                    navigate('/cart');
                  }}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
                >
                  Buy Now →
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
