import { genAI, MODELS } from '../config/gemini.js';

const ASSESSMENT_PROMPT = `
You are assisting an animal rescue triage system. You will be shown a photo of an
injured or distressed animal reported by a citizen in Kathmandu, Nepal.

Assess the visible situation and respond with ONLY a JSON object (no markdown, no
preamble, no code fences) matching exactly this shape:

{
  "urgencyScore": <integer 1-5, where 5 is life-threatening and needs immediate dispatch>,
  "injurySummary": "<one or two sentence plain description of what's visible>",
  "confidence": "<low|medium|high>",
  "visibleAnimalType": "<dog|cat|cow|bird|other|unclear>"
}

Rules:
- If the image is ambiguous, blurry, or you are uncertain about severity, err toward
  a HIGHER urgencyScore rather than a lower one -- missing a critical injury is far
  worse than an unnecessary dispatch.
- Do NOT attempt to guess or state any GPS coordinates, address, or location from
  the image. Location is handled separately by the reporting citizen.
- If no animal or injury is visible at all, set urgencyScore to 1 and explain why
  in injurySummary.
`.trim();

const TEXT_ASSESSMENT_PROMPT = `
You are assisting an animal rescue triage system in Kathmandu, Nepal. A citizen has
reported an injured or distressed animal via TEXT ONLY (no photo provided).

Analyze the report text and extract:
- Clinical indicators (e.g. "bleeding", "unable to walk", "foaming at the mouth", "unconscious")
- Temporal indicators (e.g. "just now", "yesterday", "an hour ago") -- these affect urgency,
  since a fresh injury is more urgent than an ongoing/chronic condition

Respond with ONLY a JSON object (no markdown, no preamble, no code fences) matching exactly:

{
  "urgencyScore": <integer 1-5, where 5 is life-threatening and needs immediate dispatch>,
  "injurySummary": "<one or two sentence plain restatement of the reported situation>",
  "confidence": "<low|medium|high>",
  "visibleAnimalType": "<dog|cat|cow|bird|other|unclear>"
}

Rules:
- Text-only reports carry inherent uncertainty since there is no visual confirmation.
  If the text lacks clear clinical indicators of severity, apply a DEFAULT CERTAINTY
  PENALTY: cap confidence at "low" and do not assign urgencyScore above 3 unless the
  text explicitly describes a severe/life-threatening detail (e.g. "hit by car", "not moving",
  "heavy bleeding").
- If the text explicitly describes severe trauma, still score it appropriately high (4-5)
  even without an image -- clear clinical language should not be discounted.
- If the report is vague (e.g. "there's a hurt dog somewhere"), set confidence to "low"
  and urgencyScore no higher than 2.
`.trim();

function isRetryableError(err) {
  return err?.status === 503 || err?.message?.includes('UNAVAILABLE');
}

async function callGeminiWithRetry(contents, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await genAI.models.generateContent({
        model: MODELS.CORE,
        contents,
      });

      const rawText = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw Object.assign(new Error('No response from Gemini'), { status: 502 });
      }

      const cleaned = rawText.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      if (isRetryableError(err) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (err instanceof SyntaxError) {
        throw Object.assign(new Error('Failed to parse Gemini response as JSON'), { status: 502 });
      }
      throw err;
    }
  }
}

export async function assessImageBuffer(buffer, mimeType) {
  const base64Image = buffer.toString('base64');

  return callGeminiWithRetry([
    {
      role: 'user',
      parts: [
        { text: ASSESSMENT_PROMPT },
        { inlineData: { mimeType, data: base64Image } },
      ],
    },
  ]);
}

export async function assessTextReport(description) {
  return callGeminiWithRetry([
    {
      role: 'user',
      parts: [{ text: `${TEXT_ASSESSMENT_PROMPT}\n\nCitizen report:\n"${description}"` }],
    },
  ]);
}