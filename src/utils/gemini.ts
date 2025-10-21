// src/utils/gemini.ts

// Load environment variables
import "jsr:@std/dotenv/load";

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    
    this.apiKey = apiKey;
    this.model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  /**
   * Generate a response from Gemini AI based on conversation history and context
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: Array<{ isFromUser: boolean; content: string }> = [],
    context: string = ""
  ): Promise<string> {
    try {
      // Build the conversation context
      const systemPrompt = this.buildSystemPrompt(context);
      const messages = this.buildMessageHistory(conversationHistory, userMessage);

      const requestBody = {
        contents: [
          {
            parts: [{ text: systemPrompt }],
            role: "user"
          },
          ...messages
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response generated from Gemini");
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      return generatedText.trim();

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildSystemPrompt(context: string): string {
    const basePrompt = `You are Amimi, an AI companion designed to support people in long-distance relationships. You are empathetic, understanding, and provide thoughtful advice about relationships, communication, and emotional support.

Your role is to:
- Listen actively and provide emotional support
- Offer practical advice for maintaining long-distance relationships
- Help users express their feelings and communicate better with their partners
- Suggest activities and ways to stay connected
- Be encouraging and positive while being realistic about challenges

Guidelines:
- Be warm, friendly, and understanding
- Ask follow-up questions to better understand their situation
- Provide specific, actionable advice when appropriate
- Acknowledge their feelings and validate their experiences
- Keep responses conversational and not too formal
- If they're having relationship issues, help them think through solutions rather than just giving advice`;

    if (context && context.trim()) {
      return `${basePrompt}\n\nAdditional context about this user: ${context}`;
    }

    return basePrompt;
  }

  private buildMessageHistory(
    history: Array<{ isFromUser: boolean; content: string }>,
    currentMessage: string
  ): GeminiMessage[] {
    const messages: GeminiMessage[] = [];

    // Add conversation history (limit to last 10 messages to avoid token limits)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.isFromUser ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Add the current user message
    messages.push({
      role: 'user',
      parts: [{ text: currentMessage }]
    });

    return messages;
  }
}

// Export a singleton instance
export const geminiService = new GeminiService();
