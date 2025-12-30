import { submitFeedback, getSessions } from "./pulse-api.js";

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', init);

function init() {
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

  // Load sessions immediately
  loadSessions();

  async function loadSessions() {
    console.log("[CampusPulse] Loading sessions...");
    
    if (!sessionPicker) {
      console.error("[CampusPulse] Session picker element not found!");
      return;
    }

    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      sessions = await response.json();
      console.log("[CampusPulse] Loaded sessions:", sessions);
      renderSessionPicker();
    } catch (error) {
      console.error("[CampusPulse] Error loading sessions:", error);
      sessionPicker.innerHTML = `
        <div class="session-picker-empty">
          Failed to load sessions. <a href="javascript:location.reload()">Retry</a>
        </div>
      `;
    }
  }

  function renderSessionPicker() {
    console.log("[CampusPulse] Rendering", sessions.length, "sessions");
    
    if (!sessions || sessions.length === 0) {
      sessionPicker.innerHTML = `
        <div class="session-picker-empty">
          No active sessions available. <a href="/admin.html">Create one</a>
        </div>
      `;
      return;
    }

    // Build session cards
    let html = '';
    sessions.forEach(session => {
      const isSelected = prefillCode && prefillCode === session.code.toUpperCase();
      if (isSelected && sessionInput) {
        sessionInput.value = session.code;
      }
      
      html += `
        <div class="session-option ${isSelected ? 'selected' : ''}" data-code="${session.code}">
          <div class="session-option-header">
            <span class="session-option-code">${session.code}</span>
          </div>
          <div class="session-option-title">${escapeHtml(session.title)}</div>
          <div class="session-option-meta">👤 ${escapeHtml(session.speaker)}</div>
        </div>
      `;
    });

    sessionPicker.innerHTML = html;

    // Add click handlers
    sessionPicker.querySelectorAll('.session-option').forEach(option => {
      option.addEventListener('click', function() {
        // Remove selected from all
        sessionPicker.querySelectorAll('.session-option').forEach(o => {
          o.classList.remove('selected');
        });
        
        // Add selected to this one
        this.classList.add('selected');
        
        // Update hidden input
        if (sessionInput) {
          sessionInput.value = this.dataset.code;
        }
        
        // Clear status
        if (statusEl) {
          statusEl.textContent = '';
        }
        
        console.log("[CampusPulse] Selected:", this.dataset.code);
      });
    });

    console.log("[CampusPulse] Rendered session cards");
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // Rating buttons
  ratingButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedRating = Number(button.dataset.rating || 0);
      ratingButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  // Form submission
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.style.color = "";
      }

      const sessionCode = sessionInput?.value?.trim() || "";
      const comment = document.getElementById("comment")?.value?.trim() || "";
      const submittedBy = document.getElementById("student")?.value?.trim() || "";

      if (!sessionCode) {
        if (statusEl) {
          statusEl.textContent = "⚠ Please select a session first.";
          statusEl.style.color = "var(--accent)";
        }
        return;
      }

      if (!selectedRating) {
        if (statusEl) {
          statusEl.textContent = "⚠ Please pick a rating (1-5).";
          statusEl.style.color = "var(--accent)";
        }
        return;
      }

      try {
        await submitFeedback({
          sessionCode,
          rating: selectedRating,
          comment: comment || null,
          submittedBy: submittedBy || null
        });

        // Reset form fields but keep session
        const commentEl = document.getElementById("comment");
        const studentEl = document.getElementById("student");
        if (commentEl) commentEl.value = "";
        if (studentEl) studentEl.value = "";
        
        ratingButtons.forEach(btn => btn.classList.remove("active"));
        selectedRating = 0;
        
        if (statusEl) {
          statusEl.textContent = "✓ Thanks! Your feedback was sent.";
          statusEl.style.color = "var(--accent-2)";
        }
      } catch (error) {
        console.error("[CampusPulse] Submit error:", error);
        if (statusEl) {
          statusEl.textContent = "✗ " + error.message;
          statusEl.style.color = "var(--accent)";
        }
      }
    });
  }
}
