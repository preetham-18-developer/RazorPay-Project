import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';
import { getProducts } from '../api/freshmart';

export default function FreshMartProductsPage({ cart, addToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <FreshMartHeader cartCount={cartCount} />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 2rem 4rem 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Fresh Grocery Catalog
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>
            Browse organic staples, daily essentials, and gourmet reserve selections
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)' }}>
          
          {/* Categories */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  backgroundColor: selectedCategory === cat ? '#f97316' : '#f1f5f9',
                  color: selectedCategory === cat ? '#ffffff' : '#475569',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ flexGrow: 1, maxWidth: '360px' }}>
            <input
              type="text"
              placeholder="Search products or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            Loading database product catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>No products found</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Try clearing your search query or selecting another category.</p>
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
                  boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.03)'
                }}
              >
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

                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      {product.category || 'Staples'} • SKU: {product.sku}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: '0.5rem' }}>
                      <Link to={`/product/${product.product_id || product.sku}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {product.name}
                      </Link>
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4, marginBottom: '1rem' }}>
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
      </main>
    </div>
  );
}
