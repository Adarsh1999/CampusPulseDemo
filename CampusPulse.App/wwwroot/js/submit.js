import { submitFeedback, getSessions } from "./pulse-api.js";

const form = document.getElementById("feedbackForm");
const ratingButtons = Array.from(document.querySelectorAll(".rating-button"));
const statusEl = document.getElementById("status");
const sessionInput = document.getElementById("sessionCode");
const sessionPicker = document.getElementById("sessionPicker");

let selectedRating = 0;
let sessions = [];

// Load sessions on page load
async function loadSessions() {
  try {
    sessions = await getSessions();
    renderSessionPicker();
  } catch (error) {
    sessionPicker.innerHTML = `<div class="session-picker-empty">Failed to load sessions. <a href="javascript:location.reload()">Retry</a></div>`;
  }
}

function renderSessionPicker() {
  if (sessions.length === 0) {
    sessionPicker.innerHTML = `<div class="session-picker-empty">No active sessions. <a href="/admin.html">Create one</a></div>`;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const prefillCode = params.get("code")?.toUpperCase();

  sessionPicker.innerHTML = sessions.map(session => {
    const isSelected = prefillCode === session.code;
    if (isSelected) {
      sessionInput.value = session.code;
    }
    
    return `
      <div class="session-option ${isSelected ? 'selected' : ''}" data-code="${session.code}">
        <div class="session-option-header">
          <span class="session-option-code">${session.code}</span>
        </div>
        <div class="session-option-title">${escapeHtml(session.title)}</div>
        <div class="session-option-meta">👤 ${escapeHtml(session.speaker)}</div>
      </div>
    `;
  }).join('');

  // Add click handlers
  sessionPicker.querySelectorAll('.session-option').forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected from all
      sessionPicker.querySelectorAll('.session-option').forEach(o => o.classList.remove('selected'));
      // Add selected to clicked
      option.classList.add('selected');
      // Update hidden input
      sessionInput.value = option.dataset.code;
      statusEl.textContent = '';
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Rating buttons
ratingButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRating = Number(button.dataset.rating || 0);
    ratingButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
});

// Form submission
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "";

  const formData = new FormData(form);
  const sessionCode = (formData.get("sessionCode") || "").toString().trim();
  const comment = (formData.get("comment") || "").toString().trim();
  const submittedBy = (formData.get("student") || "").toString().trim();

  if (!sessionCode) {
    statusEl.textContent = "Please select a session.";
    return;
  }

  if (!selectedRating) {
    statusEl.textContent = "Pick a rating from 1 to 5.";
    return;
  }

  try {
    await submitFeedback({
      sessionCode,
      rating: selectedRating,
      comment: comment || null,
      submittedBy: submittedBy || null
    });

    // Reset form but keep session selected
    const currentCode = sessionInput.value;
    form.reset();
    sessionInput.value = currentCode;
    ratingButtons.forEach((btn) => btn.classList.remove("active"));
    selectedRating = 0;
    statusEl.textContent = "✓ Thanks! Your feedback was sent.";
    statusEl.style.color = "var(--accent-2)";
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.style.color = "var(--accent)";
  }
});

// Initialize
loadSessions();
