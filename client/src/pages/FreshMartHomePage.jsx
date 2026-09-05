import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { getProducts } from '../api/freshmart';

export default function FreshMartHomePage({ cart, addToCart }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Failed to load catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  const categories = ['All', 'Staples', 'Fruits', 'Dairy', 'Beverages'];

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <FreshMartHeader cartCount={cartCount} />

      {/* Hero Section */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '3.5rem 2rem 4rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              🍊 100% Farm Fresh & Guaranteed Authentic
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Fresh groceries.<br /><span style={{ color: '#f97316' }}>Delivered simply.</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '520px' }}>
              Order premium organic produce, artisanal staples, and gourmet reserves delivered directly to your doorstep with guaranteed quality and trace provenance.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/products')}
                className="btn-primary"
                style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}
              >
                Shop Now →
              </button>
              <a
                href="#categories"
                className="btn-secondary"
                style={{ fontSize: '1rem', padding: '0.85rem 1.75rem', textDecoration: 'none' }}
              >
                Explore Categories
              </a>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80"
              alt="Fresh Groceries"
              style={{ width: '100%', height: '420px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            />
          </div>
        </div>
      </section>

      {/* Shop By Category */}
      <section id="categories" style={{ maxWidth: '1280px', margin: '0 auto', padding: '3.5rem 2rem 1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Shop by Category</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Select a category to filter fresh organic groceries</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                backgroundColor: selectedCategory === cat ? '#f97316' : '#ffffff',
                color: selectedCategory === cat ? '#ffffff' : '#334155',
                border: selectedCategory === cat ? 'none' : '1px solid #cbd5e1',
                padding: '0.6rem 1.35rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: selectedCategory === cat ? '0 2px 4px rgba(249, 115, 22, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 2rem 4rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Featured Products</h2>
          <Link to="/products" style={{ color: '#ea580c', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
            View All Catalog ({products.length}) →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            Loading products catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>No products found in this category.</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.5rem' }}>
            {filteredProducts.map(product => (
              <div
                key={product.product_id || product.sku}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Product Image */}
                <div style={{ position: 'relative', height: '180px', backgroundColor: '#f1f5f9' }}>
                  <img
                    src={product.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {product.sku === 'PANTRY-RES-18999' && (
                    <span style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: '#f97316', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                      HERO DEMO ITEM
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      {product.category || 'General'} • SKU: {product.sku}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: '0.5rem' }}>
                      <Link to={`/product/${product.product_id || product.sku}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {product.name}
                      </Link>
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {product.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      + Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
