import { asyncHandler } from '../middleware/errorHandler.js';
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

export const assessImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'image file is required' });
  }

  const base64Image = req.file.buffer.toString('base64');

  const response = await genAI.models.generateContent({
    model: MODELS.CORE,
    contents: [
      {
        role: 'user',
        parts: [
          { text: ASSESSMENT_PROMPT },
          {
            inlineData: {
              mimeType: req.file.mimetype,
              data: base64Image,
            },
          },
        ],
      },
    ],
  });

  const rawText = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw Object.assign(new Error('No response from Gemini'), { status: 502 });
  }

  let assessment;
  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    assessment = JSON.parse(cleaned);
  } catch (parseErr) {
    throw Object.assign(
      new Error('Failed to parse Gemini response as JSON'),
      { status: 502 }
    );
  }

  res.json({ assessment });
});