import { submitFeedback } from "./pulse-api.js";

const form = document.getElementById("feedbackForm");
const ratingButtons = Array.from(document.querySelectorAll(".rating-button"));
const statusEl = document.getElementById("status");
const sessionInput = document.getElementById("sessionCode");

const params = new URLSearchParams(window.location.search);
const prefillCode = params.get("code");
if (prefillCode) {
  sessionInput.value = prefillCode;
}

let selectedRating = 0;

ratingButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRating = Number(button.dataset.rating || 0);
    ratingButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "";

  const formData = new FormData(form);
  const sessionCode = (formData.get("sessionCode") || "").toString().trim();
  const comment = (formData.get("comment") || "").toString().trim();
  const submittedBy = (formData.get("student") || "").toString().trim();

  if (!sessionCode) {
    statusEl.textContent = "Enter a session code.";
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

    form.reset();
    sessionInput.value = sessionCode;
    ratingButtons.forEach((btn) => btn.classList.remove("active"));
    selectedRating = 0;
    statusEl.textContent = "Thanks! Your feedback was sent.";
  } catch (error) {
    statusEl.textContent = error.message;
  }
});
