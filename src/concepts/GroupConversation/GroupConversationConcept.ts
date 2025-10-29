import { Collection, Db, ObjectId } from 'npm:mongodb';
import { ID } from '../../utils/types.ts';
import { geminiService } from '@utils/gemini.ts';

// --- Type Definitions ---

export interface GroupConversation {
  conversationId: string;
  participants: ID[];
  context: string;
  createdAt: Date;
}

export interface GroupMessage {
  messageId: string;
  conversationId: string;
  sender: ID;
  isFromAgent: boolean;
  content: string;
  timestamp: Date;
}

// Internal MongoDB document interfaces
interface GroupConversationDocument {
  _id: ObjectId;
  participants: ID[];
  context: string;
  createdAt: Date;
}

interface GroupMessageDocument {
  _id: ObjectId;
  conversationId: ObjectId;
  sender: ID;
  isFromAgent: boolean;
  content: string;
  timestamp: Date;
}

// --- Action Input/Output Types ---

export type CreateGroupConversationParams = {
  participants: ID[];
  context?: string;
};
export type CreateGroupConversationResult =
  | { status: 'success'; conversation: GroupConversation }
  | { status: 'error'; error: string };

export type AddParticipantParams = {
  conversationId: string;
  user: ID;
};
export type AddParticipantResult =
  | { status: 'success'; conversation: GroupConversation }
  | { status: 'error'; error: string };

export type SendMessageParams = {
  conversationId: string;
  sender: ID;
  content: string;
};
export type SendMessageResult =
  | { status: 'success'; message: GroupMessage }
  | { status: 'error'; error: string };

export type GetAgentResponseParams = {
  conversationId: string;
  contextPrompt: string;
};
export type GetAgentResponseResult =
  | { status: 'success'; message: GroupMessage }
  | { status: 'error'; error: string };

export type GetHistoryParams = {
  conversationId: string;
};
export type GetHistoryResult =
  | { status: 'success'; messages: GroupMessage[] }
  | { status: 'error'; error: string };

export type UpdateContextParams = {
  conversationId: string;
  newContext: string;
};
export type UpdateContextResult =
  | { status: 'success'; conversation: GroupConversation }
  | { status: 'error'; error: string };

export type DeleteConversationParams = {
  conversationId: string;
};
export type DeleteConversationResult =
  | { status: 'success'; message: string }
  | { status: 'error'; error: string };

// --- GroupConversationConcept Class ---

export class GroupConversationConcept {
  private groupConversations: Collection<GroupConversationDocument>;
  private groupMessages: Collection<GroupMessageDocument>;

  constructor(private readonly db: Db) {
    this.groupConversations = this.db.collection('groupConversations');
    this.groupMessages = this.db.collection('groupMessages');
  }

  private static isValidObjectId(id: string): boolean {
    return ObjectId.isValid(id);
  }

  private static mapDocumentToGroupConversation(doc: GroupConversationDocument): GroupConversation {
    return {
      conversationId: doc._id.toHexString(),
      participants: doc.participants,
      context: doc.context,
      createdAt: doc.createdAt,
    };
  }

  private static mapDocumentToGroupMessage(doc: GroupMessageDocument): GroupMessage {
    return {
      messageId: doc._id.toHexString(),
      conversationId: doc.conversationId.toHexString(),
      sender: doc.sender,
      isFromAgent: doc.isFromAgent,
      content: doc.content,
      timestamp: doc.timestamp,
    };
  }

  public async createGroupConversation({
    participants,
    context = '',
  }: CreateGroupConversationParams): Promise<CreateGroupConversationResult> {
    if (!participants || participants.length === 0) {
      return { status: 'error', error: 'Participants array cannot be empty.' };
    }

    if (new Set(participants).size !== participants.length) {
      return { status: 'error', error: 'Participants array contains duplicate IDs.' };
    }

    if (participants.some(p => !p || typeof p !== 'string' || p.trim() === '')) {
      return { status: 'error', error: 'All participant IDs must be non-empty strings.' };
    }

    try {
      const now = new Date();
      const conversationId = new ObjectId();
      const newConversation: GroupConversationDocument = {
        _id: conversationId,
        participants,
        context,
        createdAt: now,
      };

      const result = await this.groupConversations.insertOne(newConversation);

      if (!result.acknowledged) {
        return { status: 'error', error: 'Failed to create group conversation.' };
      }

      return {
        status: 'success',
        conversation: GroupConversationConcept.mapDocumentToGroupConversation(newConversation),
      };
    } catch (error: any) {
      console.error('Error creating group conversation:', error);
      return { status: 'error', error: `Database error: ${error.message}` };
    }
  }

  public async addParticipant({
    conversationId,
    user,
  }: AddParticipantParams): Promise<AddParticipantResult> {
    if (!GroupConversationConcept.isValidObjectId(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }

    if (!user || typeof user !== 'string' || user.trim() === '') {
      return { status: 'error', error: 'User ID must be a non-empty string.' };
    }

    try {
      const objectId = new ObjectId(conversationId);
      const conversation = await this.groupConversations.findOne({ _id: objectId });

      if (!conversation) {
        return { status: 'error', error: 'Conversation not found.' };
      }

      if (conversation.participants.includes(user)) {
        return { status: 'error', error: 'User is already a participant.' };
      }

      const result = await this.groupConversations.updateOne(
        { _id: objectId },
        { $addToSet: { participants: user } }
      );

      if (!result.acknowledged || result.modifiedCount === 0) {
        return { status: 'error', error: 'Failed to add participant.' };
      }

      const updatedConversation = await this.groupConversations.findOne({ _id: objectId });
      if (!updatedConversation) {
        return { status: 'error', error: 'Failed to retrieve updated conversation.' };
      }

      return {
        status: 'success',
        conversation: GroupConversationConcept.mapDocumentToGroupConversation(updatedConversation),
      };
    } catch (error: any) {
      console.error('Error adding participant:', error);
      return { status: 'error', error: `Database error: ${error.message}` };
    }
  }

  public async sendMessage({
    conversationId,
    sender,
    content,
  }: SendMessageParams): Promise<SendMessageResult> {
    if (!GroupConversationConcept.isValidObjectId(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }

    if (!sender || typeof sender !== 'string' || sender.trim() === '') {
      return { status: 'error', error: 'Sender ID must be a non-empty string.' };
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return { status: 'error', error: 'Content must be a non-empty string.' };
    }

    try {
      const objectId = new ObjectId(conversationId);
      const conversation = await this.groupConversations.findOne({ _id: objectId });

      if (!conversation) {
        return { status: 'error', error: 'Conversation not found.' };
      }

      if (!conversation.participants.includes(sender)) {
        return { status: 'error', error: 'Sender is not a participant in this conversation.' };
      }

      const messageId = new ObjectId();
      const newMessage: GroupMessageDocument = {
        _id: messageId,
        conversationId: objectId,
        sender,
        isFromAgent: false,
        content: content.trim(),
        timestamp: new Date(),
      };

      const result = await this.groupMessages.insertOne(newMessage);

      if (!result.acknowledged) {
        return { status: 'error', error: 'Failed to send message.' };
      }

      return {
        status: 'success',
        message: GroupConversationConcept.mapDocumentToGroupMessage(newMessage),
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { status: 'error', error: `Database error: ${error.message}` };
    }
  }

  public async getAgentResponse({
    conversationId,
    contextPrompt,
  }: GetAgentResponseParams): Promise<GetAgentResponseResult> {
    if (!GroupConversationConcept.isValidObjectId(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }

    if (!contextPrompt || typeof contextPrompt !== 'string' || contextPrompt.trim() === '') {
      return { status: 'error', error: 'Context prompt must be a non-empty string.' };
    }

    try {
      const objectId = new ObjectId(conversationId);
      const conversation = await this.groupConversations.findOne({ _id: objectId });

      if (!conversation) {
        return { status: 'error', error: 'Conversation not found.' };
      }

      // Get conversation history for context
      const historyResult = await this.getHistory({ conversationId });
      if (historyResult.status === 'error') {
        return { status: 'error', error: `Failed to get conversation history: ${historyResult.error}` };
      }

      // Convert message history to the format expected by Gemini
      const conversationHistory = historyResult.messages.map(msg => ({
        isFromUser: !msg.isFromAgent,
        content: `${msg.isFromAgent ? 'Amimi' : 'User'}: ${msg.content}`
      }));

      // Generate AI response using Gemini with shared response method
      const agentResponseContent = await geminiService.generateSharedResponse(
        contextPrompt,
        conversationHistory,
        `Shared conversation for couple with ${conversation.participants.length} participants. ${conversation.context}`
      );

      const messageId = new ObjectId();
      const agentMessage: GroupMessageDocument = {
        _id: messageId,
        conversationId: objectId,
        sender: 'amimi-agent' as ID,
        isFromAgent: true,
        content: agentResponseContent,
        timestamp: new Date(),
      };

      const result = await this.groupMessages.insertOne(agentMessage);

      if (!result.acknowledged) {
        return { status: 'error', error: 'Failed to save agent response to the database.' };
      }

      return {
        status: 'success',
        message: GroupConversationConcept.mapDocumentToGroupMessage(agentMessage),
      };
    } catch (error: unknown) {
      console.error('Error getting agent response:', error);
      
      // Fallback to a simple response if Gemini fails
      const fallbackResponse = "I'm sorry, I'm having trouble responding right now. Please try again in a moment.";
      const messageId = new ObjectId();
      const fallbackMessage: GroupMessageDocument = {
        _id: messageId,
        conversationId: new ObjectId(conversationId),
        sender: 'amimi-agent' as ID,
        isFromAgent: true,
        content: fallbackResponse,
        timestamp: new Date(),
      };

      try {
        const result = await this.groupMessages.insertOne(fallbackMessage);
        if (result.acknowledged) {
          return { status: 'success', message: GroupConversationConcept.mapDocumentToGroupMessage(fallbackMessage) };
        }
      } catch (dbError) {
        console.error('Error saving fallback message:', dbError);
      }

      return { status: 'error', error: `Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  public async getHistory({
    conversationId,
  }: GetHistoryParams): Promise<GetHistoryResult> {
    if (!GroupConversationConcept.isValidObjectId(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }

    try {
      const objectId = new ObjectId(conversationId);
      const conversation = await this.groupConversations.findOne({ _id: objectId });

      if (!conversation) {
        return { status: 'error', error: 'Conversation not found.' };
      }

      const messages = await this.groupMessages
        .find({ conversationId: objectId })
        .sort({ timestamp: 1 })
        .toArray();

      return {
        status: 'success',
        messages: messages.map(msg => GroupConversationConcept.mapDocumentToGroupMessage(msg)),
      };
    } catch (error: any) {
      console.error('Error getting history:', error);
      return { status: 'error', error: `Database error: ${error.message}` };
    }
  }

  public async updateContext({
    conversationId,
    newContext,
  }: UpdateContextParams): Promise<UpdateContextResult> {
    if (!GroupConversationConcept.isValidObjectId(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }

    if (typeof newContext !== 'string') {
      return { status: 'error', error: 'New context must be a string.' };
    }

    try {
      const objectId = new ObjectId(conversationId);
      const conversation = await this.groupConversations.findOne({ _id: objectId });

      if (!conversation) {
        return { status: 'error', error: 'Conversation not found.' };
      }

      const result = await this.groupConversations.updateOne(
        { _id: objectId },
        { $set: { context: newContext } }
      );

      if (!result.acknowledged || result.modifiedCount === 0) {
        return { status: 'error', error: 'Failed to update context.' };
      }

      const updatedConversation = await this.groupConversations.findOne({ _id: objectId });
      if (!updatedConversation) {
        return { status: 'error', error: 'Failed to retrieve updated conversation.' };
      }

      return {
        status: 'success',
        conversation: GroupConversationConcept.mapDocumentToGroupConversation(updatedConversation),
      };
    } catch (error: any) {
      console.error('Error updating context:', error);
      return { status: 'error', error: `Database error: ${error.message}` };
    }
  }

  public async deleteConversation({
    conversationId,
  }: DeleteConversationParams): Promise<DeleteConversationResult> {
    if (!GroupConversationConcept.isValidObjectId(conversationId)) {
      return { status: 'error', error: 'Invalid conversation ID format.' };
    }

    try {
      const objectId = new ObjectId(conversationId);
      const conversation = await this.groupConversations.findOne({ _id: objectId });

      if (!conversation) {
        return { status: 'error', error: 'Conversation not found.' };
      }

      // Delete all messages first
      const messagesResult = await this.groupMessages.deleteMany({ conversationId: objectId });
      
      // Then delete the conversation
      const conversationResult = await this.groupConversations.deleteOne({ _id: objectId });

      if (!conversationResult.acknowledged || conversationResult.deletedCount === 0) {
        return { status: 'error', error: 'Failed to delete conversation.' };
      }

      return {
        status: 'success',
        message: `Conversation and ${messagesResult.deletedCount} messages deleted successfully.`,
      };
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      return { status: 'error', error: `Database error: ${error.message}` };
    }
  }
}

export default GroupConversationConcept;
