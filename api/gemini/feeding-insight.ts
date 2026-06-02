import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { babyName, recentFeeds } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add it in Vercel project settings."
      });
    }

    const { GoogleGenAI, Type } = await import('@google/genai');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
You are an expert pediatric nurse and infant feeding schedule specialist. Analyze the following chronology of recent feeds for ${babyName || 'the baby'} to determine:
1. The average gap/interval between consecutive feeds.
2. The recommended next feeding time based on the last recorded feed.
3. Supportive and friendly commentary, patterns found (e.g. formula vs breastfeeding differences if any), and custom guidance.

Recent chronological feed events:
${JSON.stringify(recentFeeds, null, 2)}

Instructions:
- If there are fewer than 2 feeding sessions, warn gently in raw analysisText and suggest a default next feed time 3 hours after the last session, and write some general warm tips on tracking.
- If there are multiple sessions, calculate the actual time differences in minutes and find the average.
- Suggest a specific next feeding time (e.g., "05:15 PM") that adds the average gap (or a baseline 3-hour gap if data is sparse) to the last feed.
- Provide a highly encouraging, helpful Markdown analysis (100-150 words) under \`analysisText\`. Celebrates the parent's efforts!
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional pediatric consultant who provides intelligence about infant feeding patterns. Always return a perfectly structured JSON object matching the requested schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            averageGapMinutes: { 
              type: Type.INTEGER, 
              description: "The calculated average interval in minutes between feeds. Use 180 as default or if there are insufficient sessions." 
            },
            suggestedNextTime: { 
              type: Type.STRING, 
              description: "The calculated ideal next feeding time in HH:MM AM/PM format (e.g., '05:30 PM')." 
            },
            reasoning: { 
              type: Type.STRING, 
              description: "A short sentence explaining how this timing was estimated (e.g., 'Based on a 3h 15m average gap after your last feed at 2:00 PM.')." 
            },
            analysisText: { 
              type: Type.STRING, 
              description: "Extremely warm, supportive Markdown paragraph analysing the baby's timing routines, highlighting breast/bottle consistency, and providing developmental reassurance." 
            }
          },
          required: ["averageGapMinutes", "suggestedNextTime", "reasoning", "analysisText"]
        }
      }
    });

    const resultText = response.text || "{}";
    const parsedData = JSON.parse(resultText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Feeding Insight Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate feeding insights" });
  }
}
