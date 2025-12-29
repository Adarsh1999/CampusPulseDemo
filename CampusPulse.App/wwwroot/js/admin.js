import { createSession, formatTime, getSessions } from "./pulse-api.js";

const form = document.getElementById("sessionForm");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("sessionList");
const startDateInput = document.getElementById("startDate");
const startTimeInput = document.getElementById("startTime");
const setNowButton = document.getElementById("setNow");

async function loadSessions() {
  try {
    const sessions = await getSessions();
    renderSessions(sessions);
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

function renderSessions(sessions) {
  listEl.innerHTML = "";

  if (!sessions.length) {
    listEl.innerHTML = "<div class=\"card\">No sessions yet. Create one above.</div>";
    return;
  }

  sessions.forEach((session) => {
    const card = document.createElement("div");
    card.className = "card";

    const dashboardUrl = `/dashboard.html?code=${encodeURIComponent(session.code)}`;
    const submitUrl = `/submit.html?code=${encodeURIComponent(session.code)}`;

    card.innerHTML = `
      <div class="pill">${session.code}</div>
      <h3>${session.title}</h3>
      <p>Speaker: ${session.speaker}</p>
      <p>Starts: ${formatTime(session.startUtc)}</p>
      <div style="margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
        <a class="btn btn-secondary" href="${dashboardUrl}">Open dashboard</a>
        <a class="btn btn-secondary" href="${submitUrl}">Open submit view</a>
        <button class="btn btn-primary" data-copy="${session.code}">Copy links</button>
      </div>
    `;

    listEl.appendChild(card);
  });

  listEl.querySelectorAll("button[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = button.dataset.copy;
      const dashboardLink = `${window.location.origin}/dashboard.html?code=${code}`;
      const submitLink = `${window.location.origin}/submit.html?code=${code}`;
      const payload = `${dashboardLink}\r\n${submitLink}`;

      try {
        await navigator.clipboard.writeText(payload);
        button.textContent = "Copied!";
        setTimeout(() => {
          button.textContent = "Copy links";
        }, 2000);
      } catch {
        alert(`Dashboard: ${dashboardLink}\nSubmit: ${submitLink}`);
      }
    });
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "";

  const formData = new FormData(form);
  const title = (formData.get("title") || "").toString().trim();
  const speaker = (formData.get("speaker") || "").toString().trim();
  const startDate = (formData.get("startDate") || "").toString();
  const startTime = (formData.get("startTime") || "").toString();
  let startUtc = null;

  if (!title) {
    statusEl.textContent = "Enter a session title.";
    return;
  }

  if ((startDate && !startTime) || (!startDate && startTime)) {
    statusEl.textContent = "Pick both a start date and start time, or leave both empty.";
    return;
  }

  if (startDate && startTime) {
    const utcValue = `${startDate}T${startTime}:00Z`;
    const parsed = new Date(utcValue);
    if (Number.isNaN(parsed.getTime())) {
      statusEl.textContent = "Enter a valid start date and time.";
      return;
    }
    startUtc = parsed.toISOString();
  }

  try {
    await createSession({
      title,
      speaker,
      startUtc
    });
    form.reset();
    statusEl.textContent = "Session created.";
    await loadSessions();
  } catch (error) {
    statusEl.textContent = error.message;
  }
});

function setNowUtc() {
  const now = new Date();
  const pad = (value) => value.toString().padStart(2, "0");
  const date = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
  const time = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;

  startDateInput.value = date;
  startTimeInput.value = time;
}

setNowButton?.addEventListener("click", () => {
  setNowUtc();
  statusEl.textContent = "Start time set to current UTC.";
});

loadSessions();
