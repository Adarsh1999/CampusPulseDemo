import { formatPercent, formatTime, getFeedback, getSessions, getSummary } from "./pulse-api.js";

const sessionSelect = document.getElementById("sessionSelect");
const connectButton = document.getElementById("connectButton");
const statusEl = document.getElementById("status");
const titleEl = document.getElementById("sessionTitle");
const feedbackList = document.getElementById("feedbackList");

const avgRatingEl = document.getElementById("avgRating");
const totalResponsesEl = document.getElementById("totalResponses");
const positiveShareEl = document.getElementById("positiveShare");
const sentimentEl = document.getElementById("sentiment");

let currentSource = null;

function setStatus(message) {
  statusEl.textContent = message || "";
}

async function loadSessions() {
  const sessions = await getSessions();
  sessionSelect.innerHTML = "";

  sessions.forEach((session) => {
    const option = document.createElement("option");
    option.value = session.code;
    option.textContent = `${session.title} (${session.code})`;
    sessionSelect.appendChild(option);
  });

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (code) {
    sessionSelect.value = code.toUpperCase();
  }

  if (sessionSelect.value) {
    await connect();
  }
}

function renderSummary(summary) {
  titleEl.textContent = `${summary.title} - ${summary.speaker}`;
  avgRatingEl.textContent = summary.totalResponses ? summary.averageRating.toFixed(1) : "-";
  totalResponsesEl.textContent = summary.totalResponses ?? "-";
  positiveShareEl.textContent = formatPercent(summary.positiveShare);
  sentimentEl.textContent = summary.totalResponses ? summary.sentimentAverage.toFixed(1) : "-";
}

function renderFeedback(entries) {
  feedbackList.innerHTML = "";
  entries.forEach(addFeedbackItem);
}

function addFeedbackItem(item) {
  const card = document.createElement("div");
  card.className = "feedback-item fade-in";
  const score = item.rating ? `${item.rating}/5` : "";
  const comment = item.comment ? item.comment : "No comment yet.";
  card.innerHTML = `
    <strong>${comment}</strong>
    <small>${score} - ${formatTime(item.createdUtc)}</small>
  `;
  feedbackList.prepend(card);

  const cards = feedbackList.querySelectorAll(".feedback-item");
  if (cards.length > 12) {
    cards[cards.length - 1].remove();
  }
}

async function connect() {
  const code = sessionSelect.value;
  if (!code) {
    setStatus("Pick a session first.");
    return;
  }

  setStatus("Loading session data...");

  if (currentSource) {
    currentSource.close();
    currentSource = null;
  }

  try {
    const summary = await getSummary(code);
    renderSummary(summary);

    const feedback = await getFeedback(code, 12);
    renderFeedback(feedback);

    const source = new EventSource(`/api/sessions/${encodeURIComponent(code)}/stream`);
    source.addEventListener("update", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.summary) {
        renderSummary(payload.summary);
      }
      if (payload.feedback) {
        addFeedbackItem(payload.feedback);
      }
    });
    source.onerror = () => {
      setStatus("Stream disconnected. Reconnecting...");
    };

    currentSource = source;
    setStatus("Live updates connected.");
  } catch (error) {
    setStatus(error.message);
  }
}

connectButton.addEventListener("click", connect);

loadSessions().catch((error) => {
  setStatus(error.message);
});
