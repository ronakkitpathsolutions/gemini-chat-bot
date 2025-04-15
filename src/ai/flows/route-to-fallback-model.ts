'use server';

/**
 * @fileOverview An AI agent that routes to a fallback model if the primary model fails.
 *
 * - routeToFallbackModel - A function that handles the routing process.
 * - RouteToFallbackModelInput - The input type for the routeToFallbackModel function.
 * - RouteToFallbackModelOutput - The return type for the routeToFallbackModel function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const RouteToFallbackModelInputSchema = z.object({
  userInput: z.string().describe('The user input to process.'),
});
export type RouteToFallbackModelInput = z.infer<typeof RouteToFallbackModelInputSchema>;

const RouteToFallbackModelOutputSchema = z.object({
  response: z.string().describe('The response from the AI model.'),
});
export type RouteToFallbackModelOutput = z.infer<typeof RouteToFallbackModelOutputSchema>;

export async function routeToFallbackModel(input: RouteToFallbackModelInput): Promise<RouteToFallbackModelOutput> {
  return routeToFallbackModelFlow(input);
}

const primaryModelPrompt = ai.definePrompt({
  name: 'primaryModelPrompt',
  input: {
    schema: z.object({
      userInput: z.string().describe('The user input.'),
    }),
  },
  output: {
    schema: z.object({
      response: z.string().describe('The response from the primary AI model.'),
    }),
  },
  prompt: `You are a helpful chatbot. Respond to the following user input: {{{userInput}}}`,
});

const fallbackModelPrompt = ai.definePrompt({
  name: 'fallbackModelPrompt',
  input: {
    schema: z.object({
      userInput: z.string().describe('The user input.'),
    }),
  },
  output: {
    schema: z.object({
      response: z.string().describe('The response from the fallback AI model.'),
    }),
  },
  prompt: `You are a backup chatbot. Respond to the following user input: {{{userInput}}}`,
});

const routeToFallbackModelFlow = ai.defineFlow<
  typeof RouteToFallbackModelInputSchema,
  typeof RouteToFallbackModelOutputSchema
>(
  {
    name: 'routeToFallbackModelFlow',
    inputSchema: RouteToFallbackModelInputSchema,
    outputSchema: RouteToFallbackModelOutputSchema,
  },
  async input => {
    try {
      const {output} = await primaryModelPrompt(input);
      return {response: output!.response};
    } catch (error) {
      console.error('Primary model failed, routing to fallback model:', error);
      const {output} = await fallbackModelPrompt(input);
      return {response: output!.response};
    }
  }
);
