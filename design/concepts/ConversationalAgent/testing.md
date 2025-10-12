# ConversationalAgent Concept Testing

## Background Context

Please review the following documents to understand the concept testing principles:

* [[design/background/testing-concepts]]

## Concept Specification

* [[design/concepts/ConversationalAgent/ConversationalAgent]]

## Implementation

* [[src/concepts/ConversationalAgent/ConversationalAgentConcept]]

## Reference Test File

For testing patterns, please review this example:
* [[src/concepts/LikertSurvey/LikertSurveyConcept.test]]

## Task

Please create comprehensive tests for the `ConversationalAgent` concept in `src/concepts/ConversationalAgent/ConversationalAgentConcept.test.ts`

### Testing Requirements

1. **Test Structure**: 
   - Use separate `Deno.test()` calls for each test scenario (NOT nested `t.step()`)
   - Each test should get its own database instance using `testDb()`
   - Always close the database client in a `finally` block to prevent connection leaks
   
2. **Test Coverage**:
   - **1 operational principle test**: Test the full lifecycle (create conversation → send message → get response → get history → update context → delete)
   - **At least 18 action tests** covering:
     - Success cases for all 6 actions
     - Error cases (invalid inputs, not found, empty messages)
     - Edge cases (invalid ObjectId format, empty context, multiple messages, message ordering)
   - **Query tests** for getHistory (verify chronological ordering)

3. **Important Testing Patterns**:
   - Use branded `ID` type: `const userId: ID = "user-123" as ID;`
   - Create separate test database for each test using `testDb()`
   - Close connections: `await client.close()` in `finally` blocks
   - Use `ObjectId.toHexString()` to get string representation for conversationId
   - Test both success paths (`status === "success"`) and error paths (`status === "error"`)

4. **Specific Test Scenarios to Include**:
   
   **Operational Principle Test:**
   - Create conversation with context
   - Send user message
   - Get agent response (verify it references user message)
   - Get history (verify 2 messages in chronological order)
   - Update context
   - Verify context updated
   - Delete conversation
   - Verify conversation and messages deleted

   **createConversation Tests:**
   - ✅ Success: Create with context
   - ✅ Success: Create with empty context
   - ✅ Success: Multiple conversations for same user

   **sendUserMessage Tests:**
   - ✅ Success: Send message to existing conversation
   - ❌ Error: Conversation not found
   - ❌ Error: Empty message content
   - ❌ Error: Invalid conversationId format

   **getAgentResponse Tests:**
   - ✅ Success: Get response (verify placeholder format)
   - ❌ Error: Conversation not found
   - ❌ Error: Invalid conversationId format
   - ✅ Verify response saved to database

   **getHistory Tests:**
   - ✅ Success: Get messages in chronological order
   - ✅ Success: Empty history for new conversation
   - ❌ Error: Conversation not found
   - ❌ Error: Invalid conversationId format
   - ✅ Verify messages include both user and agent messages

   **updateContext Tests:**
   - ✅ Success: Update context
   - ❌ Error: Conversation not found
   - ❌ Error: Invalid conversationId format
   - ✅ Verify context persisted

   **deleteConversation Tests:**
   - ✅ Success: Delete conversation and messages
   - ❌ Error: Conversation not found
   - ❌ Error: Invalid conversationId format
   - ✅ Verify messages also deleted

5. **Code Quality**:
   - Use descriptive test names
   - Include assertions with meaningful messages
   - Test both the happy path and error conditions
   - Verify exact error messages where appropriate
   - Test message ordering in getHistory

6. **Critical Pattern from LikertSurvey Example**:
   ```typescript
   Deno.test("Test name here", async () => {
     const [db, client] = await testDb();
     const concept = new ConversationalAgentConcept(db);
     try {
       // ... test code ...
     } finally {
       await client.close();
     }
   });
   ```

7. **Conversation ID Handling**:
   - Methods accept conversationId as string (not ObjectId)
   - Tests should use `conversation._id.toHexString()` to get string ID
   - Validate invalid ObjectId format errors

Please provide a complete, comprehensive test suite that thoroughly validates the ConversationalAgent concept.


# response:

```typescript
// src/concepts/ConversationalAgent/ConversationalAgentConcept.test.ts

import {
  assert,
  assertEquals,
  assertExists,
  assertMatch,
  assertNotEquals,
  assertObjectMatch,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { ConversationalAgentConcept } from "./ConversationalAgentConcept.ts";
import { ID } from "../../utils/ID.ts";
import { testDb } from "../../../test/testUtils.ts";
import {
  ConversationalAgentMessage,
  ConversationalAgentStatus,
  MessageRole,
} from "../../../design/concepts/ConversationalAgent/ConversationalAgent.ts";

const PLACEHOLDER_AGENT_RESPONSE = "_PLACEHOLDER_AGENT_RESPONSE_";

Deno.test("Operational Principle Test: Full lifecycle of a conversation", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-op-1" as ID;
  const initialContext = { topic: "Science", level: "Beginner" };
  const updatedContext = { topic: "History", era: "Ancient" };

  try {
    // 1. Create conversation with context
    const createResult = await concept.createConversation(
      userId,
      initialContext,
    );
    assertStrictEquals(
      createResult.status,
      "success",
      "createConversation should succeed",
    );
    const conversationId = createResult.data.conversation._id.toHexString();
    assertExists(conversationId, "Conversation ID should be returned");
    assertEquals(
      createResult.data.conversation.userId,
      userId,
      "Conversation should belong to the correct user",
    );
    assertObjectMatch(
      createResult.data.conversation.context,
      initialContext,
      "Initial context should match",
    );

    // 2. Send user message
    const userMessageContent = "What is the capital of France?";
    const sendUserMessageResult = await concept.sendUserMessage(
      userId,
      conversationId,
      userMessageContent,
    );
    assertStrictEquals(
      sendUserMessageResult.status,
      "success",
      "sendUserMessage should succeed",
    );
    const userMessageId = sendUserMessageResult.data._id.toHexString();
    assertExists(userMessageId, "User message ID should be returned");

    // 3. Get agent response (verify it references user message)
    const getAgentResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(
      getAgentResponseResult.status,
      "success",
      "getAgentResponse should succeed",
    );
    const agentMessage = getAgentResponseResult.data.agentMessage;
    assertExists(agentMessage, "Agent message should be returned");
    assertEquals(
      agentMessage.content,
      PLACEHOLDER_AGENT_RESPONSE,
      "Agent message content should be the placeholder",
    );
    assertEquals(
      agentMessage.role,
      MessageRole.Agent,
      "Agent message role should be 'agent'",
    );
    assertStrictEquals(
      agentMessage.inReplyTo,
      userMessageId,
      "Agent message should reference the user message",
    );
    assertObjectMatch(
      getAgentResponseResult.data.conversationContext,
      initialContext,
      "Agent response should return current context",
    );
    const agentMessageId = agentMessage._id.toHexString();

    // 4. Get history (verify 2 messages in chronological order)
    const getHistoryResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(
      getHistoryResult.status,
      "success",
      "getHistory should succeed",
    );
    assertEquals(
      getHistoryResult.data.length,
      2,
      "History should contain 2 messages (user and agent)",
    );

    const history = getHistoryResult.data;
    const firstMessage = history[0];
    const secondMessage = history[1];

    assertEquals(
      firstMessage.role,
      MessageRole.User,
      "First message in history should be user message",
    );
    assertEquals(
      firstMessage.content,
      userMessageContent,
      "First message content should match",
    );
    assertStrictEquals(
      firstMessage._id.toHexString(),
      userMessageId,
      "First message ID should match user message ID",
    );

    assertEquals(
      secondMessage.role,
      MessageRole.Agent,
      "Second message in history should be agent message",
    );
    assertEquals(
      secondMessage.content,
      PLACEHOLDER_AGENT_RESPONSE,
      "Second message content should match agent placeholder",
    );
    assertStrictEquals(
      secondMessage._id.toHexString(),
      agentMessageId,
      "Second message ID should match agent message ID",
    );
    assert(
      firstMessage.timestamp < secondMessage.timestamp,
      "Messages should be in chronological order",
    );

    // 5. Update context
    const updateContextResult = await concept.updateContext(
      userId,
      conversationId,
      updatedContext,
    );
    assertStrictEquals(
      updateContextResult.status,
      "success",
      "updateContext should succeed",
    );

    // 6. Verify context updated (by getting agent response again, which returns context)
    const getAgentResponseAfterUpdate = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(
      getAgentResponseAfterUpdate.status,
      "success",
      "getAgentResponse after update should succeed",
    );
    assertObjectMatch(
      getAgentResponseAfterUpdate.data.conversationContext,
      updatedContext,
      "Context should be updated",
    );

    // 7. Delete conversation
    const deleteResult = await concept.deleteConversation(
      userId,
      conversationId,
    );
    assertStrictEquals(
      deleteResult.status,
      "success",
      "deleteConversation should succeed",
    );

    // 8. Verify conversation and messages deleted (try to get history)
    const getHistoryAfterDelete = await concept.getHistory(
      userId,
      conversationId,
    );
    assertStrictEquals(
      getHistoryAfterDelete.status,
      "error",
      "getHistory should fail after conversation is deleted",
    );
    assertStrictEquals(
      getHistoryAfterDelete.message,
      "Conversation not found.",
      "Error message should indicate conversation not found",
    );
  } finally {
    await client.close();
  }
});

// --- createConversation Tests ---

Deno.test("createConversation: Success - Create with context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-cc1" as ID;
  const context = { topic: "AI", difficulty: "intermediate" };

  try {
    const result = await concept.createConversation(userId, context);
    assertStrictEquals(result.status, "success");
    assertExists(result.data.conversation._id);
    assertEquals(result.data.conversation.userId, userId);
    assertObjectMatch(result.data.conversation.context, context);
    assertEquals(result.data.conversation.messages.length, 0);
  } finally {
    await client.close();
  }
});

Deno.test("createConversation: Success - Create with empty context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-cc2" as ID;
  const context = {}; // Empty context

  try {
    const result = await concept.createConversation(userId, context);
    assertStrictEquals(result.status, "success");
    assertExists(result.data.conversation._id);
    assertEquals(result.data.conversation.userId, userId);
    assertObjectMatch(result.data.conversation.context, {});
    assertEquals(result.data.conversation.messages.length, 0);
  } finally {
    await client.close();
  }
});

Deno.test("createConversation: Success - Multiple conversations for same user", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-cc3" as ID;
  const context1 = { theme: "space" };
  const context2 = { theme: "oceans" };

  try {
    const result1 = await concept.createConversation(userId, context1);
    const result2 = await concept.createConversation(userId, context2);

    assertStrictEquals(result1.status, "success");
    assertStrictEquals(result2.status, "success");
    assertExists(result1.data.conversation._id);
    assertExists(result2.data.conversation._id);
    assertNotEquals(
      result1.data.conversation._id.toHexString(),
      result2.data.conversation._id.toHexString(),
      "Conversation IDs should be unique",
    );
    assertEquals(result1.data.conversation.userId, userId);
    assertEquals(result2.data.conversation.userId, userId);
  } finally {
    await client.close();
  }
});

// --- sendUserMessage Tests ---

Deno.test("sendUserMessage: Success - Send message to existing conversation", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-sum1" as ID;
  const messageContent = "Hello agent!";

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    const sendResult = await concept.sendUserMessage(
      userId,
      conversationId,
      messageContent,
    );
    assertStrictEquals(sendResult.status, "success");
    assertExists(sendResult.data._id);
    assertEquals(sendResult.data.conversationId, conversationId);
    assertEquals(sendResult.data.userId, userId);
    assertEquals(sendResult.data.role, MessageRole.User);
    assertEquals(sendResult.data.content, messageContent);
    assertExists(sendResult.data.timestamp);

    // Verify message is in history
    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 1);
    assertEquals(historyResult.data[0].content, messageContent);
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-sum2" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();
  const messageContent = "Non-existent conversation message";

  try {
    const result = await concept.sendUserMessage(
      userId,
      nonExistentConversationId,
      messageContent,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Empty message content", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-sum3" as ID;
  const emptyMessageContent = "";

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    const result = await concept.sendUserMessage(
      userId,
      conversationId,
      emptyMessageContent,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Message content cannot be empty.");
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-sum4" as ID;
  const invalidConversationId = "invalid-id";
  const messageContent = "Valid message";

  try {
    const result = await concept.sendUserMessage(
      userId,
      invalidConversationId,
      messageContent,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

// --- getAgentResponse Tests ---

Deno.test("getAgentResponse: Success - Get response (verify placeholder format)", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gar1" as ID;
  const userMessage = "Tell me a joke.";

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();
    const sendResult = await concept.sendUserMessage(
      userId,
      conversationId,
      userMessage,
    );
    const userMessageId = sendResult.data._id.toHexString();

    const getResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(getResponseResult.status, "success");
    const agentMessage = getResponseResult.data.agentMessage;
    assertExists(agentMessage._id);
    assertEquals(agentMessage.conversationId, conversationId);
    assertEquals(agentMessage.userId, userId);
    assertEquals(agentMessage.role, MessageRole.Agent);
    assertEquals(
      agentMessage.content,
      PLACEHOLDER_AGENT_RESPONSE,
      "Agent response content should be the placeholder",
    );
    assertExists(agentMessage.timestamp);
    assertStrictEquals(
      agentMessage.inReplyTo,
      userMessageId,
      "Agent message should correctly reference the user message",
    );
    assertObjectMatch(
      getResponseResult.data.conversationContext,
      {},
      "Conversation context should be returned",
    );
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gar2" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();

  try {
    const result = await concept.getAgentResponse(
      userId,
      nonExistentConversationId,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gar3" as ID;
  const invalidConversationId = "bad-id";

  try {
    const result = await concept.getAgentResponse(
      userId,
      invalidConversationId,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse: Success - Verify response saved to database", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gar4" as ID;
  const userMessage = "Test message for saving.";

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();
    await concept.sendUserMessage(userId, conversationId, userMessage);

    const getResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(getResponseResult.status, "success");

    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 2); // User message + Agent message

    const agentMessageInHistory = historyResult.data.find((m) =>
      m.role === MessageRole.Agent
    );
    assertExists(agentMessageInHistory, "Agent message should be in history");
    assertEquals(
      agentMessageInHistory?.content,
      PLACEHOLDER_AGENT_RESPONSE,
      "Agent message in history should match placeholder",
    );
    assertStrictEquals(
      agentMessageInHistory?._id.toHexString(),
      getResponseResult.data.agentMessage._id.toHexString(),
      "Agent message ID in history should match returned agent message ID",
    );
  } finally {
    await client.close();
  }
});

// --- getHistory Tests ---

Deno.test("getHistory: Success - Get messages in chronological order", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh1" as ID;

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    const msg1 = await concept.sendUserMessage(userId, conversationId, "Msg A");
    await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure distinct timestamps
    const msg2 = await concept.getAgentResponse(userId, conversationId);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const msg3 = await concept.sendUserMessage(userId, conversationId, "Msg B");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const msg4 = await concept.getAgentResponse(userId, conversationId);

    assertStrictEquals(msg1.status, "success");
    assertStrictEquals(msg2.status, "success");
    assertStrictEquals(msg3.status, "success");
    assertStrictEquals(msg4.status, "success");

    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 4);

    const history = historyResult.data;
    assertEquals(history[0].content, "Msg A");
    assertEquals(history[0].role, MessageRole.User);
    assertEquals(history[1].content, PLACEHOLDER_AGENT_RESPONSE);
    assertEquals(history[1].role, MessageRole.Agent);
    assertEquals(history[2].content, "Msg B");
    assertEquals(history[2].role, MessageRole.User);
    assertEquals(history[3].content, PLACEHOLDER_AGENT_RESPONSE);
    assertEquals(history[3].role, MessageRole.Agent);

    // Verify chronological order based on timestamp
    for (let i = 0; i < history.length - 1; i++) {
      assert(
        history[i].timestamp < history[i + 1].timestamp,
        `Message ${i} (${history[i].content}) should be before Message ${i + 1} (${history[i + 1].content})`,
      );
    }
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Success - Empty history for new conversation", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh2" as ID;

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 0, "New conversation should have empty history");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh3" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();

  try {
    const result = await concept.getHistory(userId, nonExistentConversationId);
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh4" as ID;
  const invalidConversationId = "malformed-id";

  try {
    const result = await concept.getHistory(userId, invalidConversationId);
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Success - Verify messages include both user and agent messages", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh5" as ID;

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    await concept.sendUserMessage(userId, conversationId, "User Query 1");
    await concept.getAgentResponse(userId, conversationId);
    await concept.sendUserMessage(userId, conversationId, "User Query 2");
    await concept.getAgentResponse(userId, conversationId);

    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 4);

    const userMessages = historyResult.data.filter((m) =>
      m.role === MessageRole.User
    );
    const agentMessages = historyResult.data.filter((m) =>
      m.role === MessageRole.Agent
    );

    assertEquals(userMessages.length, 2, "Should contain 2 user messages");
    assertEquals(agentMessages.length, 2, "Should contain 2 agent messages");
    assert(
      userMessages.every((m) => m.content !== PLACEHOLDER_AGENT_RESPONSE),
      "User messages should not be placeholders",
    );
    assert(
      agentMessages.every((m) => m.content === PLACEHOLDER_AGENT_RESPONSE),
      "Agent messages should be placeholders",
    );
  } finally {
    await client.close();
  }
});

// --- updateContext Tests ---

Deno.test("updateContext: Success - Update context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-uc1" as ID;
  const initialContext = { subject: "Physics" };
  const newContext = { subject: "Chemistry", level: "Advanced" };

  try {
    const createResult = await concept.createConversation(
      userId,
      initialContext,
    );
    const conversationId = createResult.data.conversation._id.toHexString();

    const updateResult = await concept.updateContext(
      userId,
      conversationId,
      newContext,
    );
    assertStrictEquals(updateResult.status, "success");

    // Verify context persisted by fetching agent response (which returns context)
    const getResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(getResponseResult.status, "success");
    assertObjectMatch(
      getResponseResult.data.conversationContext,
      newContext,
      "Conversation context should be updated and persisted",
    );
  } finally {
    await client.close();
  }
});

Deno.test("updateContext: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-uc2" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();
  const newContext = { status: "active" };

  try {
    const result = await concept.updateContext(
      userId,
      nonExistentConversationId,
      newContext,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("updateContext: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-uc3" as ID;
  const invalidConversationId = "bad-id-format";
  const newContext = { state: "ongoing" };

  try {
    const result = await concept.updateContext(
      userId,
      invalidConversationId,
      newContext,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

Deno.test("updateContext: Success - Verify context persisted even with empty new context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-uc4" as ID;
  const initialContext = { setting: "Fantasy" };
  const emptyContext = {};

  try {
    const createResult = await concept.createConversation(
      userId,
      initialContext,
    );
    const conversationId = createResult.data.conversation._id.toHexString();

    const updateResult = await concept.updateContext(
      userId,
      conversationId,
      emptyContext,
    );
    assertStrictEquals(updateResult.status, "success");

    const getResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(getResponseResult.status, "success");
    assertObjectMatch(
      getResponseResult.data.conversationContext,
      emptyContext,
      "Conversation context should be updated to empty context",
    );
  } finally {
    await client.close();
  }
});

// --- deleteConversation Tests ---

Deno.test("deleteConversation: Success - Delete conversation and messages", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-dc1" as ID;
  const initialContext = { purpose: "test" };

  try {
    const createResult = await concept.createConversation(
      userId,
      initialContext,
    );
    const conversationId = createResult.data.conversation._id.toHexString();

    await concept.sendUserMessage(userId, conversationId, "Message 1");
    await concept.getAgentResponse(userId, conversationId);

    // Verify messages exist before deletion
    const historyBeforeDelete = await concept.getHistory(
      userId,
      conversationId,
    );
    assertStrictEquals(historyBeforeDelete.status, "success");
    assertEquals(historyBeforeDelete.data.length, 2);

    const deleteResult = await concept.deleteConversation(
      userId,
      conversationId,
    );
    assertStrictEquals(deleteResult.status, "success");

    // Verify conversation is gone
    const getHistoryAfterDelete = await concept.getHistory(
      userId,
      conversationId,
    );
    assertStrictEquals(
      getHistoryAfterDelete.status,
      "error",
      "getHistory should fail after conversation deletion",
    );
    assertStrictEquals(
      getHistoryAfterDelete.message,
      "Conversation not found.",
      "Error message should indicate conversation not found",
    );

    // Explicitly check if messages are also gone from the collection
    const messagesCollection = db.collection<ConversationalAgentMessage>(
      "conversationalAgentMessages",
    );
    const remainingMessages = await messagesCollection.countDocuments({
      conversationId: new ObjectId(conversationId),
    });
    assertEquals(
      remainingMessages,
      0,
      "All messages associated with the conversation should be deleted",
    );
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-dc2" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();

  try {
    const result = await concept.deleteConversation(
      userId,
      nonExistentConversationId,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-dc3" as ID;
  const invalidConversationId = "invalid-object-id";

  try {
    const result = await concept.deleteConversation(
      userId,
      invalidConversationId,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation: Success - Verify messages also deleted when conversation is deleted", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-dc4" as ID;

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    await concept.sendUserMessage(userId, conversationId, "User message");
    await concept.getAgentResponse(userId, conversationId);

    const messagesCollection = db.collection<ConversationalAgentMessage>(
      "conversationalAgentMessages",
    );
    const preDeleteMessageCount = await messagesCollection.countDocuments({
      conversationId: new ObjectId(conversationId),
    });
    assertEquals(preDeleteMessageCount, 2, "Expected 2 messages before delete");

    const deleteResult = await concept.deleteConversation(
      userId,
      conversationId,
    );
    assertStrictEquals(deleteResult.status, "success");

    const postDeleteMessageCount = await messagesCollection.countDocuments({
      conversationId: new ObjectId(conversationId),
    });
    assertEquals(
      postDeleteMessageCount,
      0,
      "Messages should be entirely removed after conversation deletion",
    );
  } finally {
    await client.close();
  }
});
```---
timestamp: 'Sat Oct 11 2025 16:40:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_164020.d786d9c3.md]]'
content_id: cddc4994a15b2551df008b6ee5624a5d177f2c71826bcfb3cbcaf35ee9173054
---

# response:

```typescript
// src/concepts/ConversationalAgent/ConversationalAgentConcept.test.ts

import {
  assert,
  assertEquals,
  assertExists,
  assertMatch,
  assertNotEquals,
  assertObjectMatch,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { ConversationalAgentConcept } from "./ConversationalAgentConcept.ts";
import { ID } from "../../utils/ID.ts";
import { testDb } from "../../../test/testUtils.ts";
import {
  ConversationalAgentMessage,
  ConversationalAgentStatus,
  MessageRole,
} from "../../../design/concepts/ConversationalAgent/ConversationalAgent.ts";

const PLACEHOLDER_AGENT_RESPONSE = "_PLACEHOLDER_AGENT_RESPONSE_";

Deno.test("Operational Principle Test: Full lifecycle of a conversation", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-op-1" as ID;
  const initialContext = { topic: "Science", level: "Beginner" };
  const updatedContext = { topic: "History", era: "Ancient" };

  try {
    // 1. Create conversation with context
    const createResult = await concept.createConversation(
      userId,
      initialContext,
    );
    assertStrictEquals(
      createResult.status,
      "success",
      "createConversation should succeed",
    );
    const conversationId = createResult.data.conversation._id.toHexString();
    assertExists(conversationId, "Conversation ID should be returned");
    assertEquals(
      createResult.data.conversation.userId,
      userId,
      "Conversation should belong to the correct user",
    );
    assertObjectMatch(
      createResult.data.conversation.context,
      initialContext,
      "Initial context should match",
    );

    // 2. Send user message
    const userMessageContent = "What is the capital of France?";
    const sendUserMessageResult = await concept.sendUserMessage(
      userId,
      conversationId,
      userMessageContent,
    );
    assertStrictEquals(
      sendUserMessageResult.status,
      "success",
      "sendUserMessage should succeed",
    );
    const userMessageId = sendUserMessageResult.data._id.toHexString();
    assertExists(userMessageId, "User message ID should be returned");

    // 3. Get agent response (verify it references user message)
    const getAgentResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(
      getAgentResponseResult.status,
      "success",
      "getAgentResponse should succeed",
    );
    const agentMessage = getAgentResponseResult.data.agentMessage;
    assertExists(agentMessage, "Agent message should be returned");
    assertEquals(
      agentMessage.content,
      PLACEHOLDER_AGENT_RESPONSE,
      "Agent message content should be the placeholder",
    );
    assertEquals(
      agentMessage.role,
      MessageRole.Agent,
      "Agent message role should be 'agent'",
    );
    assertStrictEquals(
      agentMessage.inReplyTo,
      userMessageId,
      "Agent message should reference the user message",
    );
    assertObjectMatch(
      getAgentResponseResult.data.conversationContext,
      initialContext,
      "Agent response should return current context",
    );
    const agentMessageId = agentMessage._id.toHexString();

    // 4. Get history (verify 2 messages in chronological order)
    const getHistoryResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(
      getHistoryResult.status,
      "success",
      "getHistory should succeed",
    );
    assertEquals(
      getHistoryResult.data.length,
      2,
      "History should contain 2 messages (user and agent)",
    );

    const history = getHistoryResult.data;
    const firstMessage = history[0];
    const secondMessage = history[1];

    assertEquals(
      firstMessage.role,
      MessageRole.User,
      "First message in history should be user message",
    );
    assertEquals(
      firstMessage.content,
      userMessageContent,
      "First message content should match",
    );
    assertStrictEquals(
      firstMessage._id.toHexString(),
      userMessageId,
      "First message ID should match user message ID",
    );

    assertEquals(
      secondMessage.role,
      MessageRole.Agent,
      "Second message in history should be agent message",
    );
    assertEquals(
      secondMessage.content,
      PLACEHOLDER_AGENT_RESPONSE,
      "Second message content should match agent placeholder",
    );
    assertStrictEquals(
      secondMessage._id.toHexString(),
      agentMessageId,
      "Second message ID should match agent message ID",
    );
    assert(
      firstMessage.timestamp < secondMessage.timestamp,
      "Messages should be in chronological order",
    );

    // 5. Update context
    const updateContextResult = await concept.updateContext(
      userId,
      conversationId,
      updatedContext,
    );
    assertStrictEquals(
      updateContextResult.status,
      "success",
      "updateContext should succeed",
    );

    // 6. Verify context updated (by getting agent response again, which returns context)
    const getAgentResponseAfterUpdate = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(
      getAgentResponseAfterUpdate.status,
      "success",
      "getAgentResponse after update should succeed",
    );
    assertObjectMatch(
      getAgentResponseAfterUpdate.data.conversationContext,
      updatedContext,
      "Context should be updated",
    );

    // 7. Delete conversation
    const deleteResult = await concept.deleteConversation(
      userId,
      conversationId,
    );
    assertStrictEquals(
      deleteResult.status,
      "success",
      "deleteConversation should succeed",
    );

    // 8. Verify conversation and messages deleted (try to get history)
    const getHistoryAfterDelete = await concept.getHistory(
      userId,
      conversationId,
    );
    assertStrictEquals(
      getHistoryAfterDelete.status,
      "error",
      "getHistory should fail after conversation is deleted",
    );
    assertStrictEquals(
      getHistoryAfterDelete.message,
      "Conversation not found.",
      "Error message should indicate conversation not found",
    );
  } finally {
    await client.close();
  }
});

// --- createConversation Tests ---

Deno.test("createConversation: Success - Create with context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-cc1" as ID;
  const context = { topic: "AI", difficulty: "intermediate" };

  try {
    const result = await concept.createConversation(userId, context);
    assertStrictEquals(result.status, "success");
    assertExists(result.data.conversation._id);
    assertEquals(result.data.conversation.userId, userId);
    assertObjectMatch(result.data.conversation.context, context);
    assertEquals(result.data.conversation.messages.length, 0);
  } finally {
    await client.close();
  }
});

Deno.test("createConversation: Success - Create with empty context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-cc2" as ID;
  const context = {}; // Empty context

  try {
    const result = await concept.createConversation(userId, context);
    assertStrictEquals(result.status, "success");
    assertExists(result.data.conversation._id);
    assertEquals(result.data.conversation.userId, userId);
    assertObjectMatch(result.data.conversation.context, {});
    assertEquals(result.data.conversation.messages.length, 0);
  } finally {
    await client.close();
  }
});

Deno.test("createConversation: Success - Multiple conversations for same user", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-cc3" as ID;
  const context1 = { theme: "space" };
  const context2 = { theme: "oceans" };

  try {
    const result1 = await concept.createConversation(userId, context1);
    const result2 = await concept.createConversation(userId, context2);

    assertStrictEquals(result1.status, "success");
    assertStrictEquals(result2.status, "success");
    assertExists(result1.data.conversation._id);
    assertExists(result2.data.conversation._id);
    assertNotEquals(
      result1.data.conversation._id.toHexString(),
      result2.data.conversation._id.toHexString(),
      "Conversation IDs should be unique",
    );
    assertEquals(result1.data.conversation.userId, userId);
    assertEquals(result2.data.conversation.userId, userId);
  } finally {
    await client.close();
  }
});

// --- sendUserMessage Tests ---

Deno.test("sendUserMessage: Success - Send message to existing conversation", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-sum1" as ID;
  const messageContent = "Hello agent!";

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    const sendResult = await concept.sendUserMessage(
      userId,
      conversationId,
      messageContent,
    );
    assertStrictEquals(sendResult.status, "success");
    assertExists(sendResult.data._id);
    assertEquals(sendResult.data.conversationId, conversationId);
    assertEquals(sendResult.data.userId, userId);
    assertEquals(sendResult.data.role, MessageRole.User);
    assertEquals(sendResult.data.content, messageContent);
    assertExists(sendResult.data.timestamp);

    // Verify message is in history
    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 1);
    assertEquals(historyResult.data[0].content, messageContent);
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-sum2" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();
  const messageContent = "Non-existent conversation message";

  try {
    const result = await concept.sendUserMessage(
      userId,
      nonExistentConversationId,
      messageContent,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Empty message content", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-sum3" as ID;
  const emptyMessageContent = "";

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    const result = await concept.sendUserMessage(
      userId,
      conversationId,
      emptyMessageContent,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Message content cannot be empty.");
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-sum4" as ID;
  const invalidConversationId = "invalid-id";
  const messageContent = "Valid message";

  try {
    const result = await concept.sendUserMessage(
      userId,
      invalidConversationId,
      messageContent,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

// --- getAgentResponse Tests ---

Deno.test("getAgentResponse: Success - Get response (verify placeholder format)", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gar1" as ID;
  const userMessage = "Tell me a joke.";

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();
    const sendResult = await concept.sendUserMessage(
      userId,
      conversationId,
      userMessage,
    );
    const userMessageId = sendResult.data._id.toHexString();

    const getResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(getResponseResult.status, "success");
    const agentMessage = getResponseResult.data.agentMessage;
    assertExists(agentMessage._id);
    assertEquals(agentMessage.conversationId, conversationId);
    assertEquals(agentMessage.userId, userId);
    assertEquals(agentMessage.role, MessageRole.Agent);
    assertEquals(
      agentMessage.content,
      PLACEHOLDER_AGENT_RESPONSE,
      "Agent response content should be the placeholder",
    );
    assertExists(agentMessage.timestamp);
    assertStrictEquals(
      agentMessage.inReplyTo,
      userMessageId,
      "Agent message should correctly reference the user message",
    );
    assertObjectMatch(
      getResponseResult.data.conversationContext,
      {},
      "Conversation context should be returned",
    );
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gar2" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();

  try {
    const result = await concept.getAgentResponse(
      userId,
      nonExistentConversationId,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gar3" as ID;
  const invalidConversationId = "bad-id";

  try {
    const result = await concept.getAgentResponse(
      userId,
      invalidConversationId,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse: Success - Verify response saved to database", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gar4" as ID;
  const userMessage = "Test message for saving.";

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();
    await concept.sendUserMessage(userId, conversationId, userMessage);

    const getResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(getResponseResult.status, "success");

    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 2); // User message + Agent message

    const agentMessageInHistory = historyResult.data.find((m) =>
      m.role === MessageRole.Agent
    );
    assertExists(agentMessageInHistory, "Agent message should be in history");
    assertEquals(
      agentMessageInHistory?.content,
      PLACEHOLDER_AGENT_RESPONSE,
      "Agent message in history should match placeholder",
    );
    assertStrictEquals(
      agentMessageInHistory?._id.toHexString(),
      getResponseResult.data.agentMessage._id.toHexString(),
      "Agent message ID in history should match returned agent message ID",
    );
  } finally {
    await client.close();
  }
});

// --- getHistory Tests ---

Deno.test("getHistory: Success - Get messages in chronological order", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh1" as ID;

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    const msg1 = await concept.sendUserMessage(userId, conversationId, "Msg A");
    await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure distinct timestamps
    const msg2 = await concept.getAgentResponse(userId, conversationId);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const msg3 = await concept.sendUserMessage(userId, conversationId, "Msg B");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const msg4 = await concept.getAgentResponse(userId, conversationId);

    assertStrictEquals(msg1.status, "success");
    assertStrictEquals(msg2.status, "success");
    assertStrictEquals(msg3.status, "success");
    assertStrictEquals(msg4.status, "success");

    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 4);

    const history = historyResult.data;
    assertEquals(history[0].content, "Msg A");
    assertEquals(history[0].role, MessageRole.User);
    assertEquals(history[1].content, PLACEHOLDER_AGENT_RESPONSE);
    assertEquals(history[1].role, MessageRole.Agent);
    assertEquals(history[2].content, "Msg B");
    assertEquals(history[2].role, MessageRole.User);
    assertEquals(history[3].content, PLACEHOLDER_AGENT_RESPONSE);
    assertEquals(history[3].role, MessageRole.Agent);

    // Verify chronological order based on timestamp
    for (let i = 0; i < history.length - 1; i++) {
      assert(
        history[i].timestamp < history[i + 1].timestamp,
        `Message ${i} (${history[i].content}) should be before Message ${i + 1} (${history[i + 1].content})`,
      );
    }
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Success - Empty history for new conversation", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh2" as ID;

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 0, "New conversation should have empty history");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh3" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();

  try {
    const result = await concept.getHistory(userId, nonExistentConversationId);
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh4" as ID;
  const invalidConversationId = "malformed-id";

  try {
    const result = await concept.getHistory(userId, invalidConversationId);
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Success - Verify messages include both user and agent messages", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-gh5" as ID;

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    await concept.sendUserMessage(userId, conversationId, "User Query 1");
    await concept.getAgentResponse(userId, conversationId);
    await concept.sendUserMessage(userId, conversationId, "User Query 2");
    await concept.getAgentResponse(userId, conversationId);

    const historyResult = await concept.getHistory(userId, conversationId);
    assertStrictEquals(historyResult.status, "success");
    assertEquals(historyResult.data.length, 4);

    const userMessages = historyResult.data.filter((m) =>
      m.role === MessageRole.User
    );
    const agentMessages = historyResult.data.filter((m) =>
      m.role === MessageRole.Agent
    );

    assertEquals(userMessages.length, 2, "Should contain 2 user messages");
    assertEquals(agentMessages.length, 2, "Should contain 2 agent messages");
    assert(
      userMessages.every((m) => m.content !== PLACEHOLDER_AGENT_RESPONSE),
      "User messages should not be placeholders",
    );
    assert(
      agentMessages.every((m) => m.content === PLACEHOLDER_AGENT_RESPONSE),
      "Agent messages should be placeholders",
    );
  } finally {
    await client.close();
  }
});

// --- updateContext Tests ---

Deno.test("updateContext: Success - Update context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-uc1" as ID;
  const initialContext = { subject: "Physics" };
  const newContext = { subject: "Chemistry", level: "Advanced" };

  try {
    const createResult = await concept.createConversation(
      userId,
      initialContext,
    );
    const conversationId = createResult.data.conversation._id.toHexString();

    const updateResult = await concept.updateContext(
      userId,
      conversationId,
      newContext,
    );
    assertStrictEquals(updateResult.status, "success");

    // Verify context persisted by fetching agent response (which returns context)
    const getResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(getResponseResult.status, "success");
    assertObjectMatch(
      getResponseResult.data.conversationContext,
      newContext,
      "Conversation context should be updated and persisted",
    );
  } finally {
    await client.close();
  }
});

Deno.test("updateContext: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-uc2" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();
  const newContext = { status: "active" };

  try {
    const result = await concept.updateContext(
      userId,
      nonExistentConversationId,
      newContext,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("updateContext: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-uc3" as ID;
  const invalidConversationId = "bad-id-format";
  const newContext = { state: "ongoing" };

  try {
    const result = await concept.updateContext(
      userId,
      invalidConversationId,
      newContext,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

Deno.test("updateContext: Success - Verify context persisted even with empty new context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-uc4" as ID;
  const initialContext = { setting: "Fantasy" };
  const emptyContext = {};

  try {
    const createResult = await concept.createConversation(
      userId,
      initialContext,
    );
    const conversationId = createResult.data.conversation._id.toHexString();

    const updateResult = await concept.updateContext(
      userId,
      conversationId,
      emptyContext,
    );
    assertStrictEquals(updateResult.status, "success");

    const getResponseResult = await concept.getAgentResponse(
      userId,
      conversationId,
    );
    assertStrictEquals(getResponseResult.status, "success");
    assertObjectMatch(
      getResponseResult.data.conversationContext,
      emptyContext,
      "Conversation context should be updated to empty context",
    );
  } finally {
    await client.close();
  }
});

// --- deleteConversation Tests ---

Deno.test("deleteConversation: Success - Delete conversation and messages", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-dc1" as ID;
  const initialContext = { purpose: "test" };

  try {
    const createResult = await concept.createConversation(
      userId,
      initialContext,
    );
    const conversationId = createResult.data.conversation._id.toHexString();

    await concept.sendUserMessage(userId, conversationId, "Message 1");
    await concept.getAgentResponse(userId, conversationId);

    // Verify messages exist before deletion
    const historyBeforeDelete = await concept.getHistory(
      userId,
      conversationId,
    );
    assertStrictEquals(historyBeforeDelete.status, "success");
    assertEquals(historyBeforeDelete.data.length, 2);

    const deleteResult = await concept.deleteConversation(
      userId,
      conversationId,
    );
    assertStrictEquals(deleteResult.status, "success");

    // Verify conversation is gone
    const getHistoryAfterDelete = await concept.getHistory(
      userId,
      conversationId,
    );
    assertStrictEquals(
      getHistoryAfterDelete.status,
      "error",
      "getHistory should fail after conversation deletion",
    );
    assertStrictEquals(
      getHistoryAfterDelete.message,
      "Conversation not found.",
      "Error message should indicate conversation not found",
    );

    // Explicitly check if messages are also gone from the collection
    const messagesCollection = db.collection<ConversationalAgentMessage>(
      "conversationalAgentMessages",
    );
    const remainingMessages = await messagesCollection.countDocuments({
      conversationId: new ObjectId(conversationId),
    });
    assertEquals(
      remainingMessages,
      0,
      "All messages associated with the conversation should be deleted",
    );
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-dc2" as ID;
  const nonExistentConversationId = new ObjectId().toHexString();

  try {
    const result = await concept.deleteConversation(
      userId,
      nonExistentConversationId,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Conversation not found.");
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-dc3" as ID;
  const invalidConversationId = "invalid-object-id";

  try {
    const result = await concept.deleteConversation(
      userId,
      invalidConversationId,
    );
    assertStrictEquals(result.status, "error");
    assertStrictEquals(result.message, "Invalid conversation ID format.");
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation: Success - Verify messages also deleted when conversation is deleted", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const userId: ID = "user-dc4" as ID;

  try {
    const createResult = await concept.createConversation(userId, {});
    const conversationId = createResult.data.conversation._id.toHexString();

    await concept.sendUserMessage(userId, conversationId, "User message");
    await concept.getAgentResponse(userId, conversationId);

    const messagesCollection = db.collection<ConversationalAgentMessage>(
      "conversationalAgentMessages",
    );
    const preDeleteMessageCount = await messagesCollection.countDocuments({
      conversationId: new ObjectId(conversationId),
    });
    assertEquals(preDeleteMessageCount, 2, "Expected 2 messages before delete");

    const deleteResult = await concept.deleteConversation(
      userId,
      conversationId,
    );
    assertStrictEquals(deleteResult.status, "success");

    const postDeleteMessageCount = await messagesCollection.countDocuments({
      conversationId: new ObjectId(conversationId),
    });
    assertEquals(
      postDeleteMessageCount,
      0,
      "Messages should be entirely removed after conversation deletion",
    );
  } finally {
    await client.close();
  }
});
```
