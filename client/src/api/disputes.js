/**
 * DisputeShield Frontend API Service Layer
 * Isolates HTTP communications with Express backend
 */

const API_BASE = ''; // Proxy handles /disputes

export async function getDisputes() {
  const response = await fetch(`${API_BASE}/disputes`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch disputes (Status ${response.status})`);
  }

  return response.json();
}

export async function getDispute(id) {
  if (!id) throw new Error('Dispute ID is required');

  const response = await fetch(`${API_BASE}/disputes/${id}`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Dispute ${id} not found (Status ${response.status})`);
  }

  return response.json();
}

export async function analyzeDispute(id) {
  if (!id) throw new Error('Dispute ID is required');

  const response = await fetch(`${API_BASE}/disputes/${id}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to analyze dispute ${id} (Status ${response.status})`);
  }

  return response.json();
}

export async function generateDraft(id) {
  if (!id) throw new Error('Dispute ID is required');

  const response = await fetch(`${API_BASE}/disputes/${id}/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate draft for dispute ${id}`);
  }

  return response.json();
}

export async function getReviewState(id) {
  if (!id) throw new Error('Dispute ID is required');

  const response = await fetch(`${API_BASE}/disputes/${id}/review`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get review state for dispute ${id}`);
  }

  return response.json();
}

export async function getAllReviewStates(disputeIds = []) {
  if (!Array.isArray(disputeIds) || disputeIds.length === 0) return {};

  const results = await Promise.all(
    disputeIds.map(async (id) => {
      try {
        const rev = await getReviewState(id);
        return { id, rev };
      } catch (e) {
        return { id, rev: { status: 'pending_review' } };
      }
    })
  );

  const reviewMap = {};
  results.forEach(({ id, rev }) => {
    reviewMap[id] = rev;
  });

  return reviewMap;
}

export async function approveReview(id, data = {}) {
  if (!id) throw new Error('Dispute ID is required');

  const response = await fetch(`${API_BASE}/disputes/${id}/review/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to approve review for dispute ${id}`);
  }

  return response.json();
}

export async function rejectReview(id, data = {}) {
  if (!id) throw new Error('Dispute ID is required');

  const response = await fetch(`${API_BASE}/disputes/${id}/review/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to reject review for dispute ${id}`);
  }

  return response.json();
}

export async function requestChanges(id, data = {}) {
  if (!id) throw new Error('Dispute ID is required');

  const response = await fetch(`${API_BASE}/disputes/${id}/review/request-changes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to request changes for dispute ${id}`);
  }

  return response.json();
}

export async function getIntegrationStatus() {
  try {
    const response = await fetch(`${API_BASE}/disputes/system/integration-status`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) return { mode: 'simulation', razorpay_configured: false };
    return response.json();
  } catch (e) {
    return { mode: 'simulation', razorpay_configured: false };
  }
}
