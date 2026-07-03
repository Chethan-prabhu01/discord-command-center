const axios = require("axios");

/**
 * Stretch goal: summarize/tag a /report's free text using Google Gemini's
 * free tier. Fails soft -- if the key is missing or the call errors, the
 * caller just gets `null` back and continues without AI (never blocks the
 * 3-second Discord response window on this, see interactionController.js).
 */
async function summarizeReportText(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.AI_ENABLED !== "true") return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `Summarize this user report in under 15 words and suggest one tag (bug, feedback, question, other). Report: "${text}"`;

    const { data } = await axios.post(
      url,
      { contents: [{ parts: [{ text: prompt }] }] },
      { timeout: 6000 }
    );

    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error("[ai] summarization failed:", err.message);
    return null;
  }
}

module.exports = { summarizeReportText };
