'use server';

/**
 * @fileOverview This file defines a Genkit flow that sends user input to the Gemini API and returns the AI's response, incorporating chat history.
 *
 * - generateResponse - A function that sends user input and chat history to the Gemini API and returns the AI's response.
 * - GenerateResponseInput - The input type for the generateResponse function, including the user message and chat history.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import { generateResponse as callGenerateResponse } from '@/ai/ai-instance';
import { z } from 'genkit';

const ChatMessageSchema = z.object({
  text: z.string().describe('The content of the message.'),
  isUser: z.boolean().describe('Whether the message was sent by the user.'),
  image: z.string().optional().describe('Optional image data URL.'),
});

const GenerateResponseInputSchema = z.object({
  message: z.string().describe('The user input message.'),
  chatHistory: z.array(ChatMessageSchema).optional().describe('Previous messages in the conversation.'),
  image: z.string().optional().describe('Optional image data URL.'), // Added image input
});
export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The AI response.'),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const generateResponseFlow = ai.defineFlow<
  typeof GenerateResponseInputSchema,
  typeof GenerateResponseOutputSchema
>(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async input => {
    try {
      let prompt = `You are a helpful AI assistant. Respond to the user message, taking into account the previous chat history to maintain context.  If the user uploads an image, describe the image, or answer the user's question about the image.`;

      if (input.chatHistory) {
        prompt += `\nChat History:\n`;
        input.chatHistory.forEach(message => {
          if (message.isUser) {
            prompt += `User: ${message.text}\n`;
            if (message.image) {
              prompt += `User Image: ${message.image}\n`;
            }
          } else {
            prompt += `AI: ${message.text}\n`;
          }
        });
      }

      prompt += `\nMessage: ${input.message}`;

      // Only include the image in the prompt if there is also text input.
      if (input.message && input.image) {
        prompt += `\nUser Image: ${input.image}\nPlease describe the image.`;
      }

      const aiResponse = await callGenerateResponse(prompt);
      return { response: aiResponse };
    } catch (e: any) {
      console.error('Main model failed', e);
      return { response: 'Failed to get response from AI. Please try again.' };
    }
  }
);
