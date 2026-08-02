import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function main() {
  try {
    const res = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: "hi" });
    console.log(res.text);
  } catch (e) {
    console.error("ERROR:", e);
  }
}
main();
