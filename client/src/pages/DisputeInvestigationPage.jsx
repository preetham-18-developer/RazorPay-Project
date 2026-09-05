import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDispute, analyzeDispute, getReviewState, generateDraft, approveReview, rejectReview, requestChanges } from '../api/disputes';
import HeaderNav from '../components/HeaderNav';
import ModelVsPolicyCard from '../components/ModelVsPolicyCard';
import RiskEvidenceQuadrant from '../components/RiskEvidenceQuadrant';
import VerdictStamp from '../components/VerdictStamp';
import EvidenceFile from '../components/EvidenceFile';
import FindingsPanel from '../components/FindingsPanel';
import InvestigationTrail from '../components/InvestigationTrail';
import DefensePreparation from '../components/DefensePreparation';
import ActionRecordCard from '../components/ActionRecordCard';
import EvidenceSufficiencyCard from '../components/EvidenceSufficiencyCard';
import PaymentTelemetry from '../components/PaymentTelemetry';
import OrderDossier from '../components/OrderDossier';

export default function DisputeInvestigationPage() {
  const { id } = useParams();

  const [caseData, setCaseData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [reviewState, setReviewState] = useState(null);
  const [draft, setDraft] = useState(null);
  const [freshmartTimeline, setFreshmartTimeline] = useState(null);

  const [loading, setLoading] = useState(true);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [error, setError] = useState(null);

  const loadCaseDossier = async () => {
    setLoading(true);
    setError(null);
    try {
      const cData = await getDispute(id);
      setCaseData(cData);

      if (cData?.dispute?.order_id) {
        try {
          const fmRes = await fetch(`/freshmart/orders/${cData.dispute.order_id}/timeline`);
          if (fmRes.ok) {
            const fmData = await fmRes.json();
            setFreshmartTimeline(fmData.timeline);
          }
        } catch (err) {}
      }

      const res = await analyzeDispute(id);
      setAnalysisResult(res);

      try {
        const rev = await getReviewState(id);
        setReviewState(rev);
        if (rev.current_draft) {
          setDraft(rev.current_draft);
        } else if (res.decision === 'auto_draft' || res.gate_triggered) {
          const draftObj = await generateDraft(id);
          setDraft(draftObj);
        }
      } catch (e) {}
    } catch (err) {
      setError(err.message || `Dispute case #${id} could not be loaded.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseDossier();
  }, [id]);

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const draftObj = await generateDraft(id);
      setDraft(draftObj);
      const rev = await getReviewState(id);
      setReviewState(rev);
    } catch (err) {
      setError(err.message || 'Failed to generate draft.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleApproveDraft = async (editedBody) => {
    setSubmittingAction(true);
    try {
      await approveReview(id, { reviewer: 'demo-user', response_body: editedBody });
      const rev = await getReviewState(id);
      setReviewState(rev);
    } catch (err) {
      setError(err.message || 'Approval failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectDraft = async (reason) => {
    setSubmittingAction(true);
    try {
      await rejectReview(id, { reviewer: 'demo-user', reason });
      const rev = await getReviewState(id);
      setReviewState(rev);
    } catch (err) {
      setError(err.message || 'Rejection failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestChanges = async (feedback) => {
    setSubmittingAction(true);
    try {
      await requestChanges(id, { reviewer: 'demo-user', feedback });
      const rev = await getReviewState(id);
      setReviewState(rev);
    } catch (err) {
      setError(err.message || 'Request changes failed.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--ink)' }}>
        <HeaderNav />
        <div style={{ maxWidth: '1200px', margin: '5rem auto', textAlign: 'center' }}>
          <span className="lbl">RETRIEVING DOSSIER RESULTS FOR CASE #{id}...</span>
        </div>
      </div>
    );
  }

  const dispute = caseData ? caseData.dispute : null;

  if (!dispute) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--ink)' }}>
        <HeaderNav />
        <div style={{ maxWidth: '1200px', margin: '5rem auto', textAlign: 'center', padding: '0 1rem' }}>
          <span className="lbl" style={{ color: 'var(--ember-bright)', display: 'block', marginBottom: '0.5rem' }}>
            CASE DOSSIER NOT FOUND
          </span>
          <p style={{ color: 'var(--stone-light)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {error || `Dispute case #${id} does not exist in the active case ledger.`}
          </p>
          <Link to="/disputes" className="breadcrumb-nav-link" style={{ justifyContent: 'center' }}>
            <span className="arrow-icon">←</span>
            <span>CASE LEDGER</span>
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

  const disputeStatus = dispute.status ? dispute.status.toUpperCase().replace(/_/g, ' ') : 'OPEN';
  const rStatus = reviewState?.status || 'pending_review';

  let reviewLabel = 'PENDING REVIEW';
  let reviewColor = '#64748b';
  let reviewBg = '#f1f5f9';
  if (rStatus === 'approved') {
    reviewLabel = 'APPROVED ✓';
    reviewColor = '#16a34a';
    reviewBg = '#f0fdf4';
  } else if (rStatus === 'changes_requested') {
    reviewLabel = 'CHANGES REQUESTED ↻';
    reviewColor = '#d97706';
    reviewBg = '#fffbeb';
  } else if (rStatus === 'rejected') {
    reviewLabel = 'REJECTED ✕';
    reviewColor = '#dc2626';
    reviewBg = '#fef2f2';
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <HeaderNav />

      {/* Dedicated Full-Width Case Dossier Workspace (Max Width: 1200px) */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Quiet Editorial Navigation Link */}
        <Link to="/disputes" className="breadcrumb-nav-link" style={{ marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>
          <span className="arrow-icon">←</span>
          <span>DISPUTESHIELD CASE LEDGER</span>
        </Link>

        {/* Structured Case Header Hierarchy */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.75rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className="row-id" style={{ color: '#ea580c', fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  CASE DOSSIER #{dispute.id}
                </span>
                {isHighValue && (
                  <span className="badge-policy-gate">
                    ⚡ &gt;₹5,000 POLICY THRESHOLD GATE
                  </span>
                )}
              </div>

              {/* Case Title Display */}
              <h1 className="case-title" style={{ textTransform: 'capitalize', color: '#0f172a', fontSize: '2rem', fontWeight: 800 }}>
                {dispute.reason_code ? dispute.reason_code.replace(/_/g, ' ') : 'Dispute Claim'}
              </h1>

              <p className="prose-readable" style={{ marginTop: '0.4rem', color: '#475569', fontSize: '0.95rem' }}>
                {dispute.reason_description}
              </p>
            </div>

            {/* Transaction Amount & Separate Status Indicators */}
            <div style={{ textAlign: 'right' }}>
              <div className="amount-display" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ea580c' }}>
                {amountRupees}
              </div>

              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="lbl" style={{ fontSize: '0.65rem', color: '#64748b' }}>DISPUTE STATUS:</span>
                  <span className="mono" style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{disputeStatus}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="lbl" style={{ fontSize: '0.65rem', color: '#64748b' }}>REVIEW STATUS:</span>
                  <span className="mono" style={{ fontSize: '0.8rem', color: reviewColor, backgroundColor: reviewBg, padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>{reviewLabel}</span>
                </div>

                <span className="lbl" style={{ marginTop: '0.2rem', display: 'block', color: '#64748b' }}>
                  RESPOND BY {respondByStr}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div style={{ padding: '1rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
            <span className="lbl" style={{ color: '#dc2626', fontWeight: 700 }}>INVESTIGATION NOTICE:</span>
            <p style={{ color: '#991b1b', fontSize: '0.9rem', marginTop: '0.25rem', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Sectioned Information Architecture */}
        {analysisResult && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* FreshMart Operational Event Timeline */}
            {freshmartTimeline && freshmartTimeline.length > 0 && (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem 1.75rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <span className="mono" style={{ color: '#ea580c', fontSize: '0.75rem', fontWeight: 700 }}>OPERATIONAL PROVENANCE TIMELINE</span>
                <h3 style={{ fontSize: '1.15rem', margin: '0.25rem 0 1rem 0', color: '#0f172a', fontWeight: 800 }}>
                  🌱 FreshMart Event Ledger Stream ({freshmartTimeline.length} Recorded Events)
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {freshmartTimeline.map((item, i) => (
                    <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.85rem' }}>
                      <span className="mono" style={{ fontSize: '0.75rem', color: '#0f172a', display: 'block', fontWeight: 700 }}>
                        {item.event_type}
                      </span>
                      <span className="mono" style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {item.actor}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 01: Model vs Policy Evaluation */}
            <ModelVsPolicyCard
              gateTriggered={analysisResult.gate_triggered}
              amount={dispute.amount}
              initialDecision="auto_draft"
              finalDecision={analysisResult.decision}
            />

            {/* Section 02: Risk x Evidence Diagnostic Quadrant */}
            <RiskEvidenceQuadrant
              riskScore={analysisResult.risk_score}
              evidenceScore={analysisResult.evidence_score}
              decision={analysisResult.decision}
            />

            {/* Section 02b: Claim-Aware Evidence Sufficiency & Conflict Audit */}
            <EvidenceSufficiencyCard
              sufficiency={analysisResult.evidence_sufficiency}
              conflicts={analysisResult.conflicts}
              claimGrounding={analysisResult.claim_grounding}
            />

            {/* Section 03: Forensic Findings */}
            <FindingsPanel investigation={analysisResult.investigation} />

            {/* Section 04: Evidence File Dossier */}
            <EvidenceFile evidence={caseData ? caseData.evidence : []} />

            {/* Section 05: Official Verdict Stamp */}
            <VerdictStamp decision={analysisResult.decision} confidence={analysisResult.confidence} />

            {/* Section 06: Forensic Audit Trail */}
            <InvestigationTrail reasoningTrail={analysisResult.reasoning_trail} />

            {/* Section 07: Action Record (if approved) */}
            <ActionRecordCard reviewState={reviewState} />

            {/* Section 08: Defense Preparation & Human Review */}
            {!draft ? (
              <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '2rem', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: '1.5rem' }}>
                <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#ea580c' }}>AUTHORIZATION PACKET</span>
                <h2 className="section-title" style={{ marginBottom: '1rem', color: '#0f172a' }}>Dispute defense statement packet</h2>
                <button onClick={handleGenerateDraft} className="btn-primary" disabled={generatingDraft}>
                  {generatingDraft ? 'GENERATING...' : 'GENERATE DEFENSE STATEMENT'}
                </button>
              </div>
            ) : (
              <DefensePreparation
                draft={draft}
                reviewState={reviewState}
                onApprove={handleApproveDraft}
                onReject={handleRejectDraft}
                onRequestChanges={handleRequestChanges}
                isSubmitting={submittingAction}
                disputeId={dispute.id}
                amount={dispute.amount}
                reasonCode={dispute.reason_code}
              />
            )}

            {/* Section 09: Supporting Telemetry & Order Dossiers */}
            <div className="section-block" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span className="lbl" style={{ display: 'block', marginBottom: '0.35rem', color: '#ea580c' }}>SUPPORTING TELEMETRY</span>
              <h2 className="section-title" style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '1.25rem' }}>Payment & Order Dossiers</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <PaymentTelemetry payment={caseData ? caseData.payment : null} />
                <OrderDossier order={caseData ? caseData.order : null} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

