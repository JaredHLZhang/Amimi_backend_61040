// src/concepts/ConversationalAgent/ConversationalAgentConcept.ts

import { Collection, Db, ObjectId } from 'npm:mongodb';
import { ID } from '@utils/types.ts';
import { geminiService } from '@utils/gemini.ts';

// --- Type Definitions ---

/**
 * Interface for a Conversation document stored in MongoDB.
 */
export interface ConversationDocument {
  _id: ObjectId;       // Unique ID for the conversation
  userId: ID;          // ID of the user associated with this conversation
  context: string;     // Context string providing background for the AI
  createdAt: Date;     // Timestamp when the conversation was created
}

/**
 * Interface for a Message document stored in MongoDB.
 */
export interface MessageDocument {
  _id: ObjectId;           // Unique ID for the message
  conversationId: ObjectId; // ID of the conversation this message belongs to
  isFromUser: boolean;     // True if the message is from the user, false if from the agent
  content: string;         // The actual text content of the message
  timestamp: Date;         // Timestamp when the message was created
}

// --- Specific Return Types for Actions ---

// createConversation
export type CreateConversationResult =
  | { status: 'success'; conversation: ConversationDocument }
  | { status: 'error'; error: string };

// sendUserMessage
export type SendUserMessageResult =
  | { status: 'success'; message: MessageDocument }
  | { status: 'error'; error: string };

// getAgentResponse
export type GetAgentResponseResult =
  | { status: 'success'; message: MessageDocument }
  | { status: 'error'; error: string };

// getHistory
export type GetHistoryResult =
  | { status: 'success'; messages: MessageDocument[] }
  | { status: 'error'; error: string };

// updateContext
export type UpdateContextResult =
  | { status: 'success'; conversation: ConversationDocument }
  | { status: 'error'; error: string };

// deleteConversation
export type DeleteConversationResult =
  | { status: 'success'; message: string }
  | { status: 'error'; error: string };

/**
 * Implements the ConversationalAgent concept for managing chat conversations.
 * Utilizes MongoDB for persistent storage of conversations and messages.
 */
export default class ConversationalAgentConcept {
  private conversationsCollection: Collection<ConversationDocument>;
  private messagesCollection: Collection<MessageDocument>;

  /**
   * Initializes the ConversationalAgentConcept with a MongoDB database instance.
   * @param {Db} db - The MongoDB database instance.
   */
  constructor(db: Db) {
    this.conversationsCollection = db.collection<ConversationDocument>('conversations');
    this.messagesCollection = db.collection<MessageDocument>('messages');
    // Note: Indexes are not created in constructor to avoid hanging promises.
    // Recommended indexes:
    // - { userId: 1 } for conversations by user
    // - { conversationId: 1, timestamp: 1 } for messages by conversation
  }

  /**
   * Internal helper to retrieve a conversation by its ID.
   * @param {ObjectId} conversationId - The ID of the conversation.
   * @returns {Promise<ConversationDocument | null>} The conversation document or null if not found.
   */
  private async getConversationById(conversationId: ObjectId): Promise<ConversationDocument | null> {
    return this.conversationsCollection.findOne({ _id: conversationId });
  }

  /**
   * Creates a new conversation for a given user.
   *
   * @param params - Parameters object.
   * @param params.userId - The ID of the user initiating the conversation.
   * @param params.context - Optional initial context string for the AI.
   * @returns Result of the operation, containing the new conversation or an error.
   */
  public async createConversation({
    userId,
    context = '',
  }: {
    userId: ID;
    context?: string;
  }): Promise<CreateConversationResult> {
    const conversationId = new ObjectId(); // Pre-generate ObjectId
    const newConversation: ConversationDocument = {
      _id: conversationId,
      userId,
      context,
      createdAt: new Date(),
    };

    try {
      const result = await this.conversationsCollection.insertOne(newConversation);
      if (!result.acknowledged) {
        return { status: 'error', error: 'Failed to create conversation in the database.' };
      }
      return { status: 'success', conversation: newConversation };
    } catch (error: unknown) {
      console.error('Error creating conversation:', error);
      return { status: 'error', error: `Database error during createConversation: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Records a message sent by the user within a specified conversation.
   *
   * @param params - Parameters object.
   * @param params.conversationId - The ID of the conversation (as string).
   * @param params.content - The text content of the user's message.
   * @returns Result of the operation, containing the new message or an error.
   */
  public async sendUserMessage({
    conversationId,
    content,
  }: {
    conversationId: string;
    content: string;
  }): Promise<SendUserMessageResult> {
    // Validate content is non-empty
    if (!content || content.trim().length === 0) {
      return { status: 'error', error: 'Message content cannot be empty.' };
    }

    // Validate and convert conversationId
    if (!ObjectId.isValid(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }
    const convObjId = new ObjectId(conversationId);

    const conversation = await this.getConversationById(convObjId);
    if (!conversation) {
      return { status: 'error', error: 'Conversation not found.' };
    }

    const messageId = new ObjectId(); // Pre-generate ObjectId
    const newMessage: MessageDocument = {
      _id: messageId,
      conversationId: convObjId,
      isFromUser: true,
      content,
      timestamp: new Date(),
    };

    try {
      const result = await this.messagesCollection.insertOne(newMessage);
      if (!result.acknowledged) {
        return { status: 'error', error: 'Failed to send message to the database.' };
      }
      return { status: 'success', message: newMessage };
    } catch (error: unknown) {
      console.error('Error sending user message:', error);
      return { status: 'error', error: `Database error during sendUserMessage: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Generates an AI response using Gemini to a user message and records it in the conversation history.
   *
   * @param params - Parameters object.
   * @param params.conversationId - The ID of the conversation (as string).
   * @param params.userMessageContent - The content of the user's message that the AI is responding to.
   * @returns Result of the operation, containing the agent's message or an error.
   */
  public async getAgentResponse({
    conversationId,
    userMessageContent,
  }: {
    conversationId: string;
    userMessageContent: string;
  }): Promise<GetAgentResponseResult> {
    // Validate and convert conversationId
    if (!ObjectId.isValid(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }
    const convObjId = new ObjectId(conversationId);

    const conversation = await this.getConversationById(convObjId);
    if (!conversation) {
      return { status: 'error', error: 'Conversation not found.' };
    }

    try {
      // Get conversation history for context
      const historyResult = await this.getHistory({ conversationId });
      if (historyResult.status === 'error') {
        return { status: 'error', error: `Failed to get conversation history: ${historyResult.error}` };
      }

      // Convert message history to the format expected by Gemini
      const conversationHistory = historyResult.messages.map(msg => ({
        isFromUser: msg.isFromUser,
        content: msg.content
      }));

      // Generate AI response using Gemini
      const agentResponseContent = await geminiService.generateResponse(
        userMessageContent,
        conversationHistory,
        conversation.context
      );

      const messageId = new ObjectId(); // Pre-generate ObjectId
      const agentMessage: MessageDocument = {
        _id: messageId,
        conversationId: convObjId,
        isFromUser: false,
        content: agentResponseContent,
        timestamp: new Date(),
      };

      const result = await this.messagesCollection.insertOne(agentMessage);
      if (!result.acknowledged) {
        return { status: 'error', error: 'Failed to save agent response to the database.' };
      }
      return { status: 'success', message: agentMessage };
    } catch (error: unknown) {
      console.error('Error getting agent response:', error);
      
      // Fallback to a simple response if Gemini fails
      const fallbackResponse = "I'm sorry, I'm having trouble responding right now. Please try again in a moment.";
      const messageId = new ObjectId();
      const fallbackMessage: MessageDocument = {
        _id: messageId,
        conversationId: convObjId,
        isFromUser: false,
        content: fallbackResponse,
        timestamp: new Date(),
      };

      try {
        const result = await this.messagesCollection.insertOne(fallbackMessage);
        if (result.acknowledged) {
          return { status: 'success', message: fallbackMessage };
        }
      } catch (dbError) {
        console.error('Error saving fallback message:', dbError);
      }

      return { status: 'error', error: `Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Retrieves all messages for a given conversation, ordered by timestamp.
   *
   * @param params - Parameters object.
   * @param params.conversationId - The ID of the conversation (as string).
   * @returns Result of the operation, containing an array of messages or an error.
   */
  public async getHistory({ conversationId }: { conversationId: string }): Promise<GetHistoryResult> {
    // Validate and convert conversationId
    if (!ObjectId.isValid(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }
    const convObjId = new ObjectId(conversationId);

    const conversation = await this.getConversationById(convObjId);
    if (!conversation) {
      return { status: 'error', error: 'Conversation not found.' };
    }

    try {
      const messages = await this.messagesCollection
        .find({ conversationId: convObjId })
        .sort({ timestamp: 1 }) // Order by timestamp ascending
        .toArray();
      return { status: 'success', messages };
    } catch (error: unknown) {
      console.error('Error getting conversation history:', error);
      return { status: 'error', error: `Database error during getHistory: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Updates the context string for a specific conversation.
   *
   * @param params - Parameters object.
   * @param params.conversationId - The ID of the conversation to update (as string).
   * @param params.newContext - The new context string.
   * @returns Result of the operation, containing the updated conversation or an error.
   */
  public async updateContext({
    conversationId,
    newContext,
  }: {
    conversationId: string;
    newContext: string;
  }): Promise<UpdateContextResult> {
    // Validate and convert conversationId
    if (!ObjectId.isValid(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }
    const convObjId = new ObjectId(conversationId);

    const conversation = await this.getConversationById(convObjId);
    if (!conversation) {
      return { status: 'error', error: 'Conversation not found.' };
    }

    try {
      // Use updateOne + findOne pattern (following established patterns)
      const updateResult = await this.conversationsCollection.updateOne(
        { _id: convObjId },
        { $set: { context: newContext } }
      );

      if (updateResult.modifiedCount === 0) {
        // Check if conversation still exists
        const existingConv = await this.getConversationById(convObjId);
        if (!existingConv) {
          return { status: 'error', error: 'Conversation not found.' };
        }
      }

      // Fetch the updated document
      const updatedConversation = await this.getConversationById(convObjId);
      if (!updatedConversation) {
        return { status: 'error', error: 'Failed to retrieve updated conversation.' };
      }

      return { status: 'success', conversation: updatedConversation };
    } catch (error: unknown) {
      console.error('Error updating conversation context:', error);
      return { status: 'error', error: `Database error during updateContext: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Deletes a conversation and all messages associated with it.
   *
   * @param params - Parameters object.
   * @param params.conversationId - The ID of the conversation to delete (as string).
   * @returns Result of the operation, indicating success or an error.
   */
  public async deleteConversation({
    conversationId,
  }: {
    conversationId: string;
  }): Promise<DeleteConversationResult> {
    // Validate and convert conversationId
    if (!ObjectId.isValid(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }
    const convObjId = new ObjectId(conversationId);

    const conversation = await this.getConversationById(convObjId);
    if (!conversation) {
      return { status: 'error', error: 'Conversation not found.' };
    }

    try {
      // Delete the conversation document itself
      await this.conversationsCollection.deleteOne({ _id: convObjId });
      // Delete all messages belonging to this conversation
      await this.messagesCollection.deleteMany({ conversationId: convObjId });
      return { status: 'success', message: 'Conversation and all associated messages deleted successfully.' };
    } catch (error: unknown) {
      console.error('Error deleting conversation:', error);
      return { status: 'error', error: `Database error during deleteConversation: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

