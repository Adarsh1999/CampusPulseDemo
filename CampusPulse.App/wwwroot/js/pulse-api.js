const API_BASE = "/api";

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = await response.json();
      message = payload?.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}

export async function getSessions() {
  return requestJson(`${API_BASE}/sessions`);
}

export async function createSession(payload) {
  return requestJson(`${API_BASE}/sessions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getSummary(code) {
  return requestJson(`${API_BASE}/sessions/${encodeURIComponent(code)}/summary`);
}

export async function getFeedback(code, take = 12) {
  const query = new URLSearchParams({ take: String(take) });
  return requestJson(`${API_BASE}/sessions/${encodeURIComponent(code)}/feedback?${query}`);
}

export async function submitFeedback(payload) {
  return requestJson(`${API_BASE}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function formatTime(iso) {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  return date.toLocaleString();
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}
