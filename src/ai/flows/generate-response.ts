'use server';

/**
 * @fileOverview This file defines a Genkit flow that sends user input to the Gemini API and returns the AI's response, incorporating chat history.
 *
 * - generateResponse - A function that sends user input and chat history to the Gemini API and returns the AI's response.
 * - GenerateResponseInput - The input type for the generateResponse function, including the user message and chat history.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

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
      chatHistory: z.array(ChatMessageSchema).optional().describe('Previous messages in the conversation.'),
      image: z.string().optional().describe('Optional image data URL.'), // Added image to the schema
    }),
  },
  output: {
    schema: z.object({
      response: z.string().describe('The AI response.'),
    }),
  },
  prompt: `You are a helpful AI assistant. Respond to the user message, taking into account the previous chat history to maintain context.  If the user uploads an image, describe the image, or answer the user's question about the image.

{{#if chatHistory}}
Chat History:
  {{#each chatHistory}}
    {{#if isUser}}
      User: {{{text}}}
      {{#if image}}
        User Image: {{media url=image}}
      {{/if}}
    {{else}}
      AI: {{{text}}}
    {{/if}}
  {{/each}}
{{/if}}

Message: {{{message}}}
{{#if image}}
User Image: {{media url=image}}
Please describe the image.
{{/if}}`,
  tools: [useFallbackModel],
});

const generateResponseFallbackPrompt = ai.definePrompt({
  name: 'generateResponseFallbackPrompt',
  input: {
    schema: z.object({
      message: z.string().describe('The user input message.'),
      chatHistory: z.array(ChatMessageSchema).optional().describe('Previous messages in the conversation.'),
      image: z.string().optional().describe('Optional image data URL.'), // Added image to the schema
    }),
  },
  output: {
    schema: z.object({
      response: z.string().describe('The AI response.'),
    }),
  },
  prompt: `You are a helpful AI assistant, using a less capable model than usual. Respond to the user message, taking into account the previous chat history to maintain context. If the user uploads an image, describe the image, or answer the user's question about the image.

{{#if chatHistory}}
Chat History:
  {{#each chatHistory}}
    {{#if isUser}}
      User: {{{text}}}
       {{#if image}}
        User Image: {{media url=image}}
      {{/if}}
    {{else}}
      AI: {{{text}}}
    {{/if}}
  {{/each}}
{{/if}}

Message: {{{message}}}
{{#if image}}
User Image: {{media url=image}}
Please describe the image.
{{/if}}`,
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
