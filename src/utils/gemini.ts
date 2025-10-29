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

  /**
   * Generate a response for shared group conversations with enhanced relationship context
   */
  async generateSharedResponse(
    userMessage: string,
    conversationHistory: Array<{ isFromUser: boolean; content: string }> = [],
    context: string = ""
  ): Promise<string> {
    try {
      // Build the shared conversation context
      const systemPrompt = this.buildSharedSystemPrompt(context);
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
          temperature: 0.8, // Slightly higher for more engaging shared conversations
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
      console.error("Error calling Gemini API for shared response:", error);
      throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildSystemPrompt(context: string): string {
    const basePrompt = `You are Amimi, a warm friend who deeply understands love and relationships. You're here to listen, understand, and gently help people explore their feelings.

Your way of connecting:
- Start with genuine empathy - acknowledge what they're feeling
- Ask thoughtful questions that help them understand themselves better
- Never lecture or give commands - guide through reflection
- Keep responses SHORT (2-3 sentences usually) and conversational
- Use emotional words like "lonely," "scared," "anxious," "safe," "hopeful"
- Remember what they've shared before and show you care

Your tone adapts naturally:
- When they're hurt: soft, accepting, comforting
- When they're confused: curious, gently guiding
- When they're angry: calm, holding space
- When they're happy: light, supportive
- When returning: remembering, warm

Example responses:
"I can feel how much you care about making this work. That loneliness must be really hard. What do you think you're hoping for most right now?"
"It sounds like you're a bit scared he's pulling away, right? Sometimes that feeling comes from expectations we have. Want to explore what that expectation might be?"

You're not here to fix or teach - you're here to understand and walk alongside them.`;

    if (context && context.trim()) {
      return `${basePrompt}\n\nWhat you know about them: ${context}`;
    }

    return basePrompt;
  }

  /**
   * Build system prompt specifically for shared conversations between couples
   */
  private buildSharedSystemPrompt(context: string): string {
    const basePrompt = `You are Amimi, a warm friend who's here for both of you as a couple. Think of yourself as that friend who genuinely cares and helps couples understand each other better.

Your approach:
- Keep it SHORT and natural (2-3 sentences usually)
- Address them warmly as a couple ("you two," "both of you")
- Help them see each other's perspectives with gentle questions
- Suggest fun, thoughtful ideas based on what they share
- Never be preachy - be curious and supportive

When suggesting activities (movies, dates, gifts, plans):
- Pay attention to what they mention they enjoy
- Offer specific, creative ideas that fit their vibe
- Make it feel personal, not generic

Example responses:
"It sounds like you both really value quality time together. Have you two thought about doing a virtual cooking date? You could make the same recipe 'together' over video call."
"I can hear the excitement when you talk about your next visit! What's one small thing each of you is looking forward to most?"
"Based on what you've shared about loving cozy evenings, maybe you'd enjoy watching 'Before Sunrise' together? It's all about connection and conversation."

You're here to bring warmth, ideas, and help them feel closer - like a caring friend who always has thoughtful suggestions.`;

    if (context && context.trim()) {
      return `${basePrompt}\n\nContext: ${context}`;
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
