import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DisputesPage from './pages/DisputesPage';
import CaseOpeningPage from './pages/CaseOpeningPage';
import DisputeInvestigationPage from './pages/DisputeInvestigationPage';

import FreshMartHomePage from './pages/FreshMartHomePage';
import FreshMartProductsPage from './pages/FreshMartProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import FreshMartCartPage from './pages/FreshMartCartPage';
import FreshMartCheckoutPage from './pages/FreshMartCheckoutPage';
import CustomerLoginPage from './pages/CustomerLoginPage';
import CustomerSignupPage from './pages/CustomerSignupPage';
import CustomerAccountPage from './pages/CustomerAccountPage';
import CustomerSupportPage from './pages/CustomerSupportPage';
import CustomerFeedbackPage from './pages/CustomerFeedbackPage';
import FreshMartOrdersPage from './pages/FreshMartOrdersPage';
import FreshMartOrderDetailPage from './pages/FreshMartOrderDetailPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import FreshMartScenariosPage from './pages/FreshMartScenariosPage';

export default function App() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('freshsmart_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('freshsmart_cart', JSON.stringify(cart));
    } catch (e) {
      // ignore
    }
  }, [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.product_id || item.sku === product.sku);
      if (existing) {
        return prev.map(item =>
          (item.product_id === product.product_id || item.sku === product.sku)
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.product_id === productId ? { ...item, qty: newQty } : item));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <Routes>
      <Route path="/" element={<FreshMartHomePage cart={cart} addToCart={addToCart} />} />
      <Route path="/products" element={<FreshMartProductsPage cart={cart} addToCart={addToCart} />} />
      <Route path="/product/:id" element={<ProductDetailPage cart={cart} addToCart={addToCart} />} />
      <Route path="/cart" element={<FreshMartCartPage cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} />} />
      <Route path="/checkout" element={<FreshMartCheckoutPage cart={cart} clearCart={clearCart} />} />
      <Route path="/login" element={<CustomerLoginPage />} />
      <Route path="/signup" element={<CustomerSignupPage />} />
      <Route path="/account" element={<CustomerAccountPage />} />
      <Route path="/support" element={<CustomerSupportPage />} />
      <Route path="/feedback" element={<CustomerFeedbackPage />} />
      
      <Route path="/orders" element={<FreshMartOrdersPage />} />
      <Route path="/orders/:id" element={<FreshMartOrderDetailPage />} />
      
      {/* Legacy / Direct Route Compatibility */}
      <Route path="/freshmart" element={<FreshMartHomePage cart={cart} addToCart={addToCart} />} />
      <Route path="/freshmart/orders" element={<FreshMartOrdersPage />} />
      <Route path="/freshmart/orders/:id" element={<FreshMartOrderDetailPage />} />
      <Route path="/freshmart/merchant" element={<AdminDashboardPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/freshmart/scenarios" element={<FreshMartScenariosPage />} />

      {/* DisputeShield Intelligence Workbench */}
      <Route path="/disputes" element={<DisputesPage />} />
      <Route path="/disputes/:id/investigate" element={<CaseOpeningPage />} />
      <Route path="/disputes/:id" element={<DisputeInvestigationPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

