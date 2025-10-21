import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ObjectId } from "npm:mongodb";
import { testDb } from "../../utils/database.ts";
import { ID } from "../../utils/types.ts";
import { GroupConversationConcept } from "./GroupConversationConcept.ts";

const createRandomId = (): ID => `user-${crypto.randomUUID()}` as ID;

Deno.test("Operational Principle Test: Full lifecycle (create → send → agent responds → history)", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const user3: ID = "user-charlie" as ID;
  const participants = [user1, user2, user3];
  const context = "Long-distance relationship support";

  let conversationId: string;

  try {
    // 1. Create group conversation
    const createResult = await concept.createGroupConversation({ participants, context });
    assert(createResult.status === "success", `Failed to create conversation: ${createResult.status === "error" ? createResult.error : "Unknown error"}`);
    conversationId = createResult.conversation.conversationId;
    assertExists(conversationId, "createGroupConversation should return a valid conversation ID");
    assert(ObjectId.isValid(conversationId), "Returned conversationId should be a valid ObjectId string");
    assertEquals(createResult.conversation.participants.length, 3, "Should have 3 participants");
    assertEquals(createResult.conversation.context, context, "Context should match");

    // 2. Send messages from different participants
    const message1Result = await concept.sendMessage({
      conversationId,
      sender: user1,
      content: "Hi everyone! How are you doing today?",
    });
    assert(message1Result.status === "success", `Failed to send message 1: ${message1Result.status === "error" ? message1Result.error : "Unknown error"}`);
    assertEquals(message1Result.message.sender, user1, "Message 1 sender should match");
    assertEquals(message1Result.message.isFromAgent, false, "Message 1 should not be from agent");

    const message2Result = await concept.sendMessage({
      conversationId,
      sender: user2,
      content: "Hey Alice! I'm doing great, thanks for asking.",
    });
    assert(message2Result.status === "success", `Failed to send message 2: ${message2Result.status === "error" ? message2Result.error : "Unknown error"}`);
    assertEquals(message2Result.message.sender, user2, "Message 2 sender should match");

    // 3. Get agent response
    const agentResult = await concept.getAgentResponse({
      conversationId,
      contextPrompt: "We're discussing our daily check-in routine",
    });
    assert(agentResult.status === "success", `Failed to get agent response: ${agentResult.status === "error" ? agentResult.error : "Unknown error"}`);
    assertEquals(agentResult.message.sender, "amimi-agent" as ID, "Agent response sender should be amimi-agent");
    assertEquals(agentResult.message.isFromAgent, true, "Agent response should be marked as from agent");
    assert(agentResult.message.content.length > 0, "Agent response should have content");

    // 4. Get history and verify chronological order
    const historyResult = await concept.getHistory({ conversationId });
    assert(historyResult.status === "success", `Failed to get history: ${historyResult.status === "error" ? historyResult.error : "Unknown error"}`);
    assertEquals(historyResult.messages.length, 3, "Should have 3 messages in history");
    
    // Verify chronological order (oldest first)
    const messages = historyResult.messages;
    assert(messages[0].timestamp <= messages[1].timestamp, "Messages should be in chronological order");
    assert(messages[1].timestamp <= messages[2].timestamp, "Messages should be in chronological order");
    
    // Verify message content
    assertEquals(messages[0].content, "Hi everyone! How are you doing today?", "First message content should match");
    assertEquals(messages[1].content, "Hey Alice! I'm doing great, thanks for asking.", "Second message content should match");
    assert(messages[2].isFromAgent, "Third message should be from agent");

  } finally {
    await client.close();
  }
});

Deno.test("createGroupConversation - success with 2 users", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];
  const context = "Test conversation";

  try {
    const result = await concept.createGroupConversation({ participants, context });
    assert(result.status === "success", `Failed to create conversation: ${result.status === "error" ? result.error : "Unknown error"}`);
    assertExists(result.conversation.conversationId, "Should return conversation ID");
    assertEquals(result.conversation.participants.length, 2, "Should have 2 participants");
    assertEquals(result.conversation.participants[0], user1, "First participant should match");
    assertEquals(result.conversation.participants[1], user2, "Second participant should match");
    assertEquals(result.conversation.context, context, "Context should match");
    assert(result.conversation.createdAt instanceof Date, "createdAt should be a Date");
  } finally {
    await client.close();
  }
});

Deno.test("createGroupConversation - success with 3+ users", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const user3: ID = "user-charlie" as ID;
  const user4: ID = "user-diana" as ID;
  const participants = [user1, user2, user3, user4];

  try {
    const result = await concept.createGroupConversation({ participants });
    assert(result.status === "success", `Failed to create conversation: ${result.status === "error" ? result.error : "Unknown error"}`);
    assertEquals(result.conversation.participants.length, 4, "Should have 4 participants");
    assertEquals(result.conversation.context, "", "Default context should be empty string");
  } finally {
    await client.close();
  }
});

Deno.test("createGroupConversation - error cases", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);

  try {
    // Empty participants array
    const emptyResult = await concept.createGroupConversation({ participants: [] });
    assert(emptyResult.status === "error", "Should return error for empty participants");
    assertEquals(emptyResult.error, "Participants array cannot be empty.", "Error message should match");

    // Duplicate participants
    const user1: ID = "user-alice" as ID;
    const duplicateResult = await concept.createGroupConversation({ 
      participants: [user1, user1] 
    });
    assert(duplicateResult.status === "error", "Should return error for duplicate participants");
    assertEquals(duplicateResult.error, "Participants array contains duplicate IDs.", "Error message should match");

    // Invalid participant (empty string)
    const invalidResult = await concept.createGroupConversation({ 
      participants: [user1, "" as ID] 
    });
    assert(invalidResult.status === "error", "Should return error for invalid participant");
    assertEquals(invalidResult.error, "All participant IDs must be non-empty strings.", "Error message should match");

  } finally {
    await client.close();
  }
});

Deno.test("sendMessage - success", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation first
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Send message
    const messageResult = await concept.sendMessage({
      conversationId,
      sender: user1,
      content: "Hello everyone!",
    });
    assert(messageResult.status === "success", `Failed to send message: ${messageResult.status === "error" ? messageResult.error : "Unknown error"}`);
    assertEquals(messageResult.message.sender, user1, "Sender should match");
    assertEquals(messageResult.message.content, "Hello everyone!", "Content should match");
    assertEquals(messageResult.message.isFromAgent, false, "Should not be from agent");
    assert(messageResult.message.timestamp instanceof Date, "Timestamp should be a Date");
  } finally {
    await client.close();
  }
});

Deno.test("sendMessage - not participant", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const user3: ID = "user-charlie" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation with user1 and user2
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Try to send message as user3 (not a participant)
    const messageResult = await concept.sendMessage({
      conversationId,
      sender: user3,
      content: "I shouldn't be able to send this",
    });
    assert(messageResult.status === "error", "Should return error for non-participant");
    assertEquals(messageResult.error, "Sender is not a participant in this conversation.", "Error message should match");
  } finally {
    await client.close();
  }
});

Deno.test("sendMessage - empty content", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation first
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Try to send empty message
    const messageResult = await concept.sendMessage({
      conversationId,
      sender: user1,
      content: "",
    });
    assert(messageResult.status === "error", "Should return error for empty content");
    assertEquals(messageResult.error, "Content must be a non-empty string.", "Error message should match");
  } finally {
    await client.close();
  }
});

Deno.test("sendMessage - conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const fakeConversationId = new ObjectId().toHexString();

  try {
    const messageResult = await concept.sendMessage({
      conversationId: fakeConversationId,
      sender: user1,
      content: "This conversation doesn't exist",
    });
    assert(messageResult.status === "error", "Should return error for non-existent conversation");
    assertEquals(messageResult.error, "Conversation not found.", "Error message should match");
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse - success", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation first
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Get agent response
    const agentResult = await concept.getAgentResponse({
      conversationId,
      contextPrompt: "We need help with communication",
    });
    assert(agentResult.status === "success", `Failed to get agent response: ${agentResult.status === "error" ? agentResult.error : "Unknown error"}`);
    assertEquals(agentResult.message.sender, "amimi-agent" as ID, "Sender should be amimi-agent");
    assertEquals(agentResult.message.isFromAgent, true, "Should be marked as from agent");
    assert(agentResult.message.content.length > 0, "Should have content");
    assert(agentResult.message.timestamp instanceof Date, "Timestamp should be a Date");
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse - conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const fakeConversationId = new ObjectId().toHexString();

  try {
    const agentResult = await concept.getAgentResponse({
      conversationId: fakeConversationId,
      contextPrompt: "Test prompt",
    });
    assert(agentResult.status === "error", "Should return error for non-existent conversation");
    assertEquals(agentResult.error, "Conversation not found.", "Error message should match");
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse - validates context", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation first
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Try with empty context prompt
    const agentResult = await concept.getAgentResponse({
      conversationId,
      contextPrompt: "",
    });
    assert(agentResult.status === "error", "Should return error for empty context prompt");
    assertEquals(agentResult.error, "Context prompt must be a non-empty string.", "Error message should match");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory - chronological order", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation first
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Send multiple messages with small delays
    await concept.sendMessage({ conversationId, sender: user1, content: "First message" });
    await new Promise(resolve => setTimeout(resolve, 10));
    await concept.sendMessage({ conversationId, sender: user2, content: "Second message" });
    await new Promise(resolve => setTimeout(resolve, 10));
    await concept.sendMessage({ conversationId, sender: user1, content: "Third message" });

    // Get history
    const historyResult = await concept.getHistory({ conversationId });
    assert(historyResult.status === "success", `Failed to get history: ${historyResult.status === "error" ? historyResult.error : "Unknown error"}`);
    assertEquals(historyResult.messages.length, 3, "Should have 3 messages");

    // Verify chronological order
    const messages = historyResult.messages;
    assertEquals(messages[0].content, "First message", "First message should be first");
    assertEquals(messages[1].content, "Second message", "Second message should be second");
    assertEquals(messages[2].content, "Third message", "Third message should be third");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory - empty history", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation but don't send any messages
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Get history
    const historyResult = await concept.getHistory({ conversationId });
    assert(historyResult.status === "success", `Failed to get history: ${historyResult.status === "error" ? historyResult.error : "Unknown error"}`);
    assertEquals(historyResult.messages.length, 0, "Should have no messages");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory - filters by conversation", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const user3: ID = "user-charlie" as ID;

  try {
    // Create two conversations
    const conv1Result = await concept.createGroupConversation({ 
      participants: [user1, user2] 
    });
    assert(conv1Result.status === "success");
    const conversationId1 = conv1Result.conversation.conversationId;

    const conv2Result = await concept.createGroupConversation({ 
      participants: [user2, user3] 
    });
    assert(conv2Result.status === "success");
    const conversationId2 = conv2Result.conversation.conversationId;

    // Send messages to both conversations
    await concept.sendMessage({ conversationId: conversationId1, sender: user1, content: "Message in conv1" });
    await concept.sendMessage({ conversationId: conversationId2, sender: user2, content: "Message in conv2" });

    // Get history for conversation 1
    const history1Result = await concept.getHistory({ conversationId: conversationId1 });
    assert(history1Result.status === "success");
    assertEquals(history1Result.messages.length, 1, "Conversation 1 should have 1 message");
    assertEquals(history1Result.messages[0].content, "Message in conv1", "Should only have conv1 message");

    // Get history for conversation 2
    const history2Result = await concept.getHistory({ conversationId: conversationId2 });
    assert(history2Result.status === "success");
    assertEquals(history2Result.messages.length, 1, "Conversation 2 should have 1 message");
    assertEquals(history2Result.messages[0].content, "Message in conv2", "Should only have conv2 message");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory - conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const fakeConversationId = new ObjectId().toHexString();

  try {
    const historyResult = await concept.getHistory({ conversationId: fakeConversationId });
    assert(historyResult.status === "error", "Should return error for non-existent conversation");
    assertEquals(historyResult.error, "Conversation not found.", "Error message should match");
  } finally {
    await client.close();
  }
});

Deno.test("updateContext - success", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];
  const originalContext = "Original context";
  const newContext = "Updated context";

  try {
    // Create conversation with original context
    const createResult = await concept.createGroupConversation({ 
      participants, 
      context: originalContext 
    });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;
    assertEquals(createResult.conversation.context, originalContext, "Original context should match");

    // Update context
    const updateResult = await concept.updateContext({ 
      conversationId, 
      newContext 
    });
    assert(updateResult.status === "success", `Failed to update context: ${updateResult.status === "error" ? updateResult.error : "Unknown error"}`);
    assertEquals(updateResult.conversation.context, newContext, "Updated context should match");
    assertEquals(updateResult.conversation.participants.length, 2, "Participants should remain unchanged");
  } finally {
    await client.close();
  }
});

Deno.test("updateContext - conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const fakeConversationId = new ObjectId().toHexString();

  try {
    const updateResult = await concept.updateContext({ 
      conversationId: fakeConversationId, 
      newContext: "New context" 
    });
    assert(updateResult.status === "error", "Should return error for non-existent conversation");
    assertEquals(updateResult.error, "Conversation not found.", "Error message should match");
  } finally {
    await client.close();
  }
});

Deno.test("updateContext - persists", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];
  const newContext = "Persistent context";

  try {
    // Create conversation
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Update context
    const updateResult = await concept.updateContext({ 
      conversationId, 
      newContext 
    });
    assert(updateResult.status === "success");

    // Verify context persists by getting history (which also retrieves conversation)
    const historyResult = await concept.getHistory({ conversationId });
    assert(historyResult.status === "success");
    
    // The context should be updated in the conversation
    // Note: This test verifies that the update was persisted to the database
    assert(updateResult.conversation.context === newContext, "Context should be updated");
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation - success", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Send some messages
    await concept.sendMessage({ conversationId, sender: user1, content: "Message 1" });
    await concept.sendMessage({ conversationId, sender: user2, content: "Message 2" });

    // Delete conversation
    const deleteResult = await concept.deleteConversation({ conversationId });
    assert(deleteResult.status === "success", `Failed to delete conversation: ${deleteResult.status === "error" ? deleteResult.error : "Unknown error"}`);
    assert(deleteResult.message.includes("2 messages deleted"), "Should mention deleted message count");

    // Verify conversation is deleted
    const historyResult = await concept.getHistory({ conversationId });
    assert(historyResult.status === "error", "Should return error for deleted conversation");
    assertEquals(historyResult.error, "Conversation not found.", "Error message should match");
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation - cascade deletes messages", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const user1: ID = "user-alice" as ID;
  const user2: ID = "user-bob" as ID;
  const participants = [user1, user2];

  try {
    // Create conversation
    const createResult = await concept.createGroupConversation({ participants });
    assert(createResult.status === "success");
    const conversationId = createResult.conversation.conversationId;

    // Send multiple messages
    await concept.sendMessage({ conversationId, sender: user1, content: "Message 1" });
    await concept.sendMessage({ conversationId, sender: user2, content: "Message 2" });
    await concept.getAgentResponse({ conversationId, contextPrompt: "Test" });

    // Verify messages exist
    const historyBefore = await concept.getHistory({ conversationId });
    assert(historyBefore.status === "success");
    assertEquals(historyBefore.messages.length, 3, "Should have 3 messages before deletion");

    // Delete conversation
    const deleteResult = await concept.deleteConversation({ conversationId });
    assert(deleteResult.status === "success");
    assert(deleteResult.message.includes("3 messages deleted"), "Should mention all deleted messages");

    // Verify messages are also deleted
    const historyAfter = await concept.getHistory({ conversationId });
    assert(historyAfter.status === "error", "Should return error after deletion");
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation - conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new GroupConversationConcept(db);
  const fakeConversationId = new ObjectId().toHexString();

  try {
    const deleteResult = await concept.deleteConversation({ conversationId: fakeConversationId });
    assert(deleteResult.status === "error", "Should return error for non-existent conversation");
    assertEquals(deleteResult.error, "Conversation not found.", "Error message should match");
  } finally {
    await client.close();
  }
});
