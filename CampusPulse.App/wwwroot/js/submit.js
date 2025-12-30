import { submitFeedback, getSessions } from "./pulse-api.js";

const form = document.getElementById("feedbackForm");
const ratingButtons = Array.from(document.querySelectorAll(".rating-button"));
const statusEl = document.getElementById("status");
const sessionInput = document.getElementById("sessionCode");
const sessionPicker = document.getElementById("sessionPicker");

let selectedRating = 0;
let sessions = [];

// Get prefilled code from URL
const params = new URLSearchParams(window.location.search);
const prefillCode = params.get("code")?.toUpperCase();

// Load sessions on page load
async function loadSessions() {
  console.log("Loading sessions...");
  try {
    sessions = await getSessions();
    console.log("Sessions loaded:", sessions);
    renderSessionPicker();
  } catch (error) {
    console.error("Failed to load sessions:", error);
    sessionPicker.innerHTML = `
      <div class="session-picker-empty">
        Failed to load sessions. <a href="javascript:location.reload()">Retry</a>
      </div>
    `;
  }
}

function renderSessionPicker() {
  if (!sessions || sessions.length === 0) {
    sessionPicker.innerHTML = `
      <div class="session-picker-empty">
        No active sessions available. <a href="/admin.html">Create one</a>
      </div>
    `;
    return;
  }

  // Build session cards HTML
  const cardsHtml = sessions.map(session => {
    const isSelected = prefillCode && prefillCode === session.code.toUpperCase();
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

  sessionPicker.innerHTML = cardsHtml;

  // Add click handlers to each session card
  const sessionOptions = sessionPicker.querySelectorAll('.session-option');
  sessionOptions.forEach(option => {
    option.addEventListener('click', () => selectSession(option));
  });

  console.log("Rendered", sessionOptions.length, "session cards");
}

function selectSession(option) {
  // Remove selected from all
  sessionPicker.querySelectorAll('.session-option').forEach(o => {
    o.classList.remove('selected');
  });
  
  // Add selected to clicked
  option.classList.add('selected');
  
  // Update hidden input
  sessionInput.value = option.dataset.code;
  
  // Clear any error message
  statusEl.textContent = '';
  
  console.log("Selected session:", option.dataset.code);
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
  statusEl.style.color = "";

  const sessionCode = sessionInput.value.trim();
  const comment = document.getElementById("comment")?.value?.trim() || "";
  const submittedBy = document.getElementById("student")?.value?.trim() || "";

  if (!sessionCode) {
    statusEl.textContent = "⚠ Please select a session first.";
    statusEl.style.color = "var(--accent)";
    return;
  }

  if (!selectedRating) {
    statusEl.textContent = "⚠ Please pick a rating (1-5).";
    statusEl.style.color = "var(--accent)";
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
    document.getElementById("comment").value = "";
    document.getElementById("student").value = "";
    ratingButtons.forEach((btn) => btn.classList.remove("active"));
    selectedRating = 0;
    
    statusEl.textContent = "✓ Thanks! Your feedback was sent.";
    statusEl.style.color = "var(--accent-2)";
  } catch (error) {
    console.error("Submit error:", error);
    statusEl.textContent = "✗ " + error.message;
    statusEl.style.color = "var(--accent)";
  }
});

// Initialize - load sessions when page loads
loadSessions();
