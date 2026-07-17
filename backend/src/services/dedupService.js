import { genAI, MODELS } from '../config/gemini.js';

const DEDUP_PROMPT = `
You are assisting an animal rescue triage system in Kathmandu, Nepal. A new report has
come in from a location where an existing active case was already logged nearby.

Compare the NEW report against the EXISTING case and classify the relationship.

Respond with ONLY a JSON object (no markdown, no preamble, no code fences):

{
  "classification": "<duplicate|escalation>",
  "reasoning": "<one sentence explaining the classification>",
  "updatedUrgencyScore": <integer 1-5, only meaningful if classification is "escalation">
}

Rules:
- "duplicate": the new report describes the SAME ongoing situation as the existing case
  (e.g. same sick/injured animal, no significant change in condition). This includes
  simple re-sightings or confirmations of an already-known issue.
- "escalation": the new report indicates the animal's condition has SIGNIFICANTLY
  worsened, a new traumatic event has occurred (e.g. "was just hit by a car"), or the
  situation is now more urgent than previously known.
- If classification is "escalation", updatedUrgencyScore MUST be higher than the
  existing case's urgency score, reflecting the new severity (max 5).
- If classification is "duplicate", set updatedUrgencyScore equal to the existing case's
  current urgency score (no change).
- When uncertain, prefer "escalation" -- treating a duplicate as an escalation costs an
  unnecessary dispatch; treating a real escalation as a duplicate could delay urgent care.
`.trim();

export async function classifyAgainstExisting(newReportText, existingCase) {
  const prompt = `${DEDUP_PROMPT}

EXISTING CASE:
- Description: "${existingCase.description}"
- Current urgency score: ${existingCase.urgency_score}
- Reported: ${existingCase.created_at}
- Times reported so far: ${existingCase.report_count}

NEW REPORT:
"${newReportText}"`;

  const response = await genAI.models.generateContent({
    model: MODELS.CORE,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const rawText = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw Object.assign(new Error('No response from Gemini'), { status: 502 });
  }

  const cleaned = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}