'use server';

/**
 * @fileOverview This file defines a Genkit flow that sends user input to the Gemini API and returns the AI's response.
 *
 * - generateResponse - A function that sends user input to the Gemini API and returns the AI's response.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateResponseInputSchema = z.object({
  message: z.string().describe('The user input message.'),
});
export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The AI response.'),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

const useFallbackModel = ai.defineTool(
  {
    name: 'useFallbackModel',
    description: 'This tool should be called if the main model fails to provide a response.',
    inputSchema: z.object({
      reason: z.string().describe('The reason for using the fallback model.'),
    }),
    outputSchema: z.boolean().describe('Always returns true to indicate the fallback model should be used.'),
  },
  async input => {
    console.warn(`Fallback model triggered because: ${input.reason}`);
    return true;
  }
);

const generateResponsePrompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {
    schema: z.object({
      message: z.string().describe('The user input message.'),
    }),
  },
  output: {
    schema: z.object({
      response: z.string().describe('The AI response.'),
    }),
  },
  prompt: `You are a helpful AI assistant. Respond to the user message:

Message: {{{message}}}`,
  tools: [useFallbackModel],
});

const generateResponseFallbackPrompt = ai.definePrompt({
  name: 'generateResponseFallbackPrompt',
  input: {
    schema: z.object({
      message: z.string().describe('The user input message.'),
    }),
  },
  output: {
    schema: z.object({
      response: z.string().describe('The AI response.'),
    }),
  },
  prompt: `You are a helpful AI assistant, using a less capable model than usual. Respond to the user message:

Message: {{{message}}}`,
});

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
      const {output} = await generateResponsePrompt(input);
      return output!;
    } catch (e: any) {
      console.error('Main model failed', e);
      // If the tool was called, use the fallback model.
      const {output} = await generateResponseFallbackPrompt(input);
      return output!;
    }
  }
);
