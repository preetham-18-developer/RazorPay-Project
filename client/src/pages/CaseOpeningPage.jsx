import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDispute, analyzeDispute } from '../api/disputes';
import HeaderNav from '../components/HeaderNav';
import LoadingInvestigation from '../components/LoadingInvestigation';

export default function CaseOpeningPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCase = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDispute(id);
        setCaseData(data);
      } catch (err) {
        setError(err.message || `Dispute case #${id} could not be loaded.`);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  const handleBeginInvestigation = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      await analyzeDispute(id);
      
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const delay = mediaQuery.matches ? 100 : 1800;

      setTimeout(() => {
        navigate(`/disputes/${id}`);
      }, delay);
    } catch (err) {
      setError(err.message || 'Investigation analysis failed.');
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--ink)' }}>
        <HeaderNav />
        <div style={{ maxWidth: '800px', margin: '5rem auto', textAlign: 'center' }}>
          <span className="lbl">OPENING CASE FILE #{id}...</span>
        </div>
      </div>
    );
  }

  const dispute = caseData ? caseData.dispute : null;

  if (!dispute) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--ink)' }}>
        <HeaderNav />
        <div style={{ maxWidth: '800px', margin: '5rem auto', textAlign: 'center', padding: '0 1rem' }}>
          <span className="lbl" style={{ color: 'var(--ember-bright)', display: 'block', marginBottom: '0.5rem' }}>
            CASE DOSSIER NOT FOUND
          </span>
          <p style={{ color: 'var(--stone-light)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {error || `Dispute case #${id} does not exist in the active case ledger.`}
          </p>
          <Link to="/disputes" className="btn-secondary">
            ← BACK TO CASE LEDGER
          </Link>
        </div>
      </div>
    );
  }

  const amountRupees = (dispute.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const respondByStr = dispute.respond_by
    ? new Date(dispute.respond_by * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : 'N/A';
  const isHighValue = dispute.amount > 500000;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--ink)' }}>
      <HeaderNav />

      <main style={{ flex: 1, maxWidth: '840px', width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Navigation back link */}
        <Link to="/disputes" className="btn-secondary" style={{ width: 'fit-content', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
          ← BACK TO CASE LEDGER
        </Link>

        {analyzing ? (
          <LoadingInvestigation disputeId={id} />
        ) : (
          <>
            {/* Case Opening Header */}
            <div style={{ borderBottom: '1px solid var(--ink-line)', paddingBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
                <div>
                  <span className="row-id" style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>
                    CASE #{dispute.id}
                  </span>

                  <h1 className="dossier-headline" style={{ fontSize: '2rem', marginTop: '0.2rem', textTransform: 'capitalize' }}>
                    {dispute.reason_code ? dispute.reason_code.replace(/_/g, ' ') : 'Dispute Claim'}
                  </h1>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: '1.85rem', fontWeight: 600, color: 'var(--paper)', display: 'block' }}>
                    {amountRupees}
                  </span>
                  <span className="lbl">
                    RESPOND BY {respondByStr}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--stone-light)', lineHeight: 1.5, marginTop: '0.5rem' }}>
                {dispute.reason_description}
              </p>
            </div>

            {/* Error Notice */}
            {error && (
              <div style={{ padding: '0.85rem', border: '1px solid var(--ember)', borderRadius: '2px' }}>
                <span className="lbl" style={{ color: 'var(--ember-bright)' }}>INVESTIGATION NOTICE:</span>
                <p style={{ color: 'var(--stone-light)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
              </div>
            )}

            {/* Case File Ready Readiness Section */}
            <div style={{ backgroundColor: 'var(--ink-soft)', border: '1px solid var(--ink-line)', padding: '1.5rem', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span className="lbl" style={{ color: 'var(--moss-bright)', display: 'block', marginBottom: '0.25rem' }}>
                  INVESTIGATION STATUS
                </span>
                <h2 className="dossier-headline" style={{ fontSize: '1.35rem' }}>
                  CASE FILE READY
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--stone-light)', marginTop: '0.25rem' }}>
                  Payment telemetry, merchant order records, and evidentiary document dossiers are staged for analysis.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', borderTop: '1px solid var(--ink-line)', paddingTop: '1rem' }}>
                <div>
                  <span className="lbl" style={{ display: 'block' }}>PAYMENT RECORD</span>
                  <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--paper)' }}>VERIFIED</span>
                </div>

                <div>
                  <span className="lbl" style={{ display: 'block' }}>ORDER FULFILLMENT</span>
                  <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--paper)' }}>VERIFIED</span>
                </div>

                <div>
                  <span className="lbl" style={{ display: 'block' }}>EVIDENTIARY PROOF</span>
                  <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--gold)' }}>STAGED</span>
                </div>

                {isHighValue && (
                  <div>
                    <span className="lbl" style={{ display: 'block', color: 'var(--ember-bright)' }}>AUTONOMY THRESHOLD</span>
                    <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--ember-bright)' }}>&gt;₹5,000 POLICY GATE</span>
                  </div>
                )}
              </div>

              {/* Primary CTA */}
              <div style={{ paddingTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleBeginInvestigation}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.5rem', fontSize: '0.875rem' }}
                >
                  BEGIN INVESTIGATION →
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
