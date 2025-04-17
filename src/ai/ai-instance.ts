/ src/ai/ai-instance.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY ?? '');

export const generateResponse = async (prompt: string) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
};
