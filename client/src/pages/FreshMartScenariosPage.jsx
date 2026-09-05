import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FreshMartHeader from '../components/FreshMartHeader';

export default function FreshMartScenariosPage() {
  const [injecting, setInjecting] = useState(null);
  const [injectedResult, setInjectedResult] = useState(null);
  const [error, setError] = useState(null);

  const scenarios = [
    { code: 'A', title: 'SCENARIO A — STRONG DELIVERY', desc: 'Full lifecycle with OTP verified delivery and customer receipt confirmation.' },
    { code: 'B', title: 'SCENARIO B — GENUINE NON-DELIVERY', desc: 'Dispatched for delivery, but package lost in courier transit. No delivery event.' },
    { code: 'C', title: 'SCENARIO C — DELIVERY CONFLICT', desc: 'Driver marked delivered with OTP bypassed. Customer reports non-receipt.' },
    { code: 'D', title: 'SCENARIO D — WRONG PRODUCT / SKU MISMATCH', desc: 'Ordered Basmati Rice (RICE-5KG-001), but warehouse packed RICE-1KG-009.' },
    { code: 'E', title: 'SCENARIO E — MISSING ITEM IN BOX', desc: 'Customer ordered 1x Rice, but warehouse packing checklist omitted item.' },
    { code: 'G', title: 'SCENARIO G — DUPLICATE PAYMENT', desc: 'Two PAYMENT_CAPTURED events (pay_001 & pay_002) appended for single order.' },
    { code: 'H', title: 'SCENARIO H — PREMATURE NON-RECEIPT', desc: 'Customer claims non-receipt 15 mins after payment (delivery SLA = 24h).' }
  ];

  const handleInject = async (code) => {
    try {
      setInjecting(code);
      setError(null);
      const res = await fetch('/freshmart/scenarios/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_code: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scenario injection failed');
      setInjectedResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setInjecting(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <FreshMartHeader />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
          <div>
            <span className="mono" style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>DEMO / TEST ONLY TOOL</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', margin: '0.2rem 0', color: '#f8fafc' }}>
              FreshMart Scenario Injector Console
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/freshmart/merchant" style={{ backgroundColor: '#1e293b', color: '#38bdf8', textDecoration: 'none', padding: '0.6rem 1rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
              ← MERCHANT CONSOLE
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <span className="mono" style={{ color: '#f87171', fontWeight: 600 }}>ERROR:</span> {error}
          </div>
        )}

        {injectedResult && (
          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', padding: '1.25rem 1.5rem', borderRadius: '4px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="mono" style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.8rem' }}>
                ✓ SCENARIO {injectedResult.scenario_code} EVENT SEQUENCE INJECTED
              </span>
              <h3 style={{ fontSize: '1.1rem', margin: '0.2rem 0' }}>Order #{injectedResult.order_id}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                Events Appended: <strong>{injectedResult.state?.event_count}</strong> · Delivery State: <strong>{injectedResult.state?.delivery_status}</strong>
              </p>
            </div>
            <Link to={`/freshmart/orders/${injectedResult.order_id}`} style={{ backgroundColor: '#38bdf8', color: '#0f172a', textDecoration: 'none', padding: '0.6rem 1.2rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
              VIEW GENERATED TIMELINE →
            </Link>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {scenarios.map(sc => (
            <div key={sc.code} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  {sc.title}
                </span>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4, margin: '0.5rem 0 1.25rem 0' }}>
                  {sc.desc}
                </p>
              </div>

              <button
                onClick={() => handleInject(sc.code)}
                disabled={injecting === sc.code}
                style={{ backgroundColor: '#f59e0b', color: '#0f172a', border: 'none', padding: '0.65rem 1rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                {injecting === sc.code ? 'INJECTING EVENTS...' : `⚡ INJECT SCENARIO ${sc.code} EVENTS`}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
