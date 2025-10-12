// src/concepts/ConversationalAgent/ConversationalAgentConcept.test.ts

import { assert, assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { ObjectId } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ConversationalAgentConcept from "./ConversationalAgentConcept.ts";

// Test user IDs
const USER_1: ID = "user-1" as ID;
const USER_2: ID = "user-2" as ID;

// Helper to add small delay for async operations to complete
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- 1. Operational Principle Test ---
Deno.test("Operational Principle Test: Full lifecycle (create → send → respond → history → update → delete)", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const initialContext = "User is learning TypeScript";

  try {
    // 1. Create conversation with context
    const createResult = await concept.createConversation({ userId: USER_1, context: initialContext });
    assert(createResult.status === "success");
    if (createResult.status !== "success") return;

    const conversationId = createResult.conversation._id.toHexString();
    assertEquals(createResult.conversation.context, initialContext);

    // 2. Send user message
    const userMessageContent = "How do I define types?";
    const sendResult = await concept.sendUserMessage({ conversationId, content: userMessageContent });
    assert(sendResult.status === "success");
    if (sendResult.status !== "success") return;
    
    assertEquals(sendResult.message.isFromUser, true);
    assertEquals(sendResult.message.content, userMessageContent);

    // 3. Get agent response (verify it references user message)
    const responseResult = await concept.getAgentResponse({ conversationId, userMessageContent });
    assert(responseResult.status === "success");
    if (responseResult.status !== "success") return;

    assertEquals(responseResult.message.isFromUser, false);
    assert(responseResult.message.content.includes(userMessageContent));

    // 4. Get history (verify 2 messages in chronological order)
    const historyResult = await concept.getHistory({ conversationId });
    assert(historyResult.status === "success");
    if (historyResult.status !== "success") return;

    assertEquals(historyResult.messages.length, 2);
    assert(historyResult.messages[0].isFromUser === true);
    assert(historyResult.messages[1].isFromUser === false);
    assert(historyResult.messages[0].timestamp <= historyResult.messages[1].timestamp);

    // 5. Update context
    const newContext = "User is now learning React";
    const updateResult = await concept.updateContext({ conversationId, newContext });
    assert(updateResult.status === "success");
    if (updateResult.status !== "success") return;

    assertEquals(updateResult.conversation.context, newContext);

    // 6. Delete conversation
    const deleteResult = await concept.deleteConversation({ conversationId });
    assert(deleteResult.status === "success");

    // 7. Verify conversation and messages deleted
    const historyAfterDelete = await concept.getHistory({ conversationId });
    assert(historyAfterDelete.status === "error");
  } finally {
    await client.close();
  }
});

// --- createConversation Tests ---

Deno.test("createConversation: Success - Create with context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const result = await concept.createConversation({ userId: USER_1, context: "Test context" });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.conversation.userId, USER_1);
      assertEquals(result.conversation.context, "Test context");
      assertExists(result.conversation.createdAt);
    }
  } finally {
    await client.close();
  }
});

Deno.test("createConversation: Success - Create with empty context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const result = await concept.createConversation({ userId: USER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.conversation.context, "");
    }
  } finally {
    await client.close();
  }
});

Deno.test("createConversation: Success - Multiple conversations for same user", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const result1 = await concept.createConversation({ userId: USER_1, context: "Context 1" });
    const result2 = await concept.createConversation({ userId: USER_1, context: "Context 2" });

    assert(result1.status === "success" && result2.status === "success");
    if (result1.status === "success" && result2.status === "success") {
      assertNotEquals(result1.conversation._id.toHexString(), result2.conversation._id.toHexString());
    }
  } finally {
    await client.close();
  }
});

// --- sendUserMessage Tests ---

Deno.test("sendUserMessage: Success - Send message to existing conversation", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const createResult = await concept.createConversation({ userId: USER_1 });
    assert(createResult.status === "success");
    if (createResult.status !== "success") return;

    const conversationId = createResult.conversation._id.toHexString();
    const result = await concept.sendUserMessage({ conversationId, content: "Hello!" });

    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.message.content, "Hello!");
      assertEquals(result.message.isFromUser, true);
    }
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.sendUserMessage({ conversationId: nonExistentId, content: "Hello!" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
    await delay(10); // Allow async operations to complete
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Empty message content", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const createResult = await concept.createConversation({ userId: USER_1 });
    assert(createResult.status === "success");
    if (createResult.status !== "success") return;

    const conversationId = createResult.conversation._id.toHexString();
    const result = await concept.sendUserMessage({ conversationId, content: "" });

    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("empty"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("sendUserMessage: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const result = await concept.sendUserMessage({ conversationId: "invalid-id", content: "Hello!" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

// --- getAgentResponse Tests ---

Deno.test("getAgentResponse: Success - Get response with placeholder", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const createResult = await concept.createConversation({ userId: USER_1 });
    assert(createResult.status === "success");
    if (createResult.status !== "success") return;

    const conversationId = createResult.conversation._id.toHexString();
    const userMessage = "What is TypeScript?";
    
    const result = await concept.getAgentResponse({ conversationId, userMessageContent: userMessage });

    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.message.isFromUser, false);
      assert(result.message.content.includes(userMessage));
      assert(result.message.content.includes("Thank you for your message"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.getAgentResponse({ conversationId: nonExistentId, userMessageContent: "Hello" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("getAgentResponse: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const result = await concept.getAgentResponse({ conversationId: "invalid-id", userMessageContent: "Hello" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
    await delay(10); // Allow async operations to complete
  } finally {
    await client.close();
  }
});

// --- getHistory Tests ---

Deno.test("getHistory: Success - Get messages in chronological order", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    await delay(20); // Wait for previous test to fully complete
    
    const createResult = await concept.createConversation({ userId: USER_1 });
    assert(createResult.status === "success");
    if (createResult.status !== "success") return;

    const conversationId = createResult.conversation._id.toHexString();

    await concept.sendUserMessage({ conversationId, content: "First message" });
    await delay(10); // Small delay between operations
    await concept.getAgentResponse({ conversationId, userMessageContent: "First message" });
    await delay(10);
    await concept.sendUserMessage({ conversationId, content: "Second message" });

    const result = await concept.getHistory({ conversationId });

    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.messages.length, 3);
      assert(result.messages[0].timestamp <= result.messages[1].timestamp);
      assert(result.messages[1].timestamp <= result.messages[2].timestamp);
    }
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Success - Empty history for new conversation", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const createResult = await concept.createConversation({ userId: USER_1 });
    assert(createResult.status === "success");
    if (createResult.status !== "success") return;

    const conversationId = createResult.conversation._id.toHexString();
    const result = await concept.getHistory({ conversationId });

    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.messages.length, 0);
    }
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.getHistory({ conversationId: nonExistentId });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("getHistory: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const result = await concept.getHistory({ conversationId: "invalid-id" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

// --- updateContext Tests ---

Deno.test("updateContext: Success - Update context", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const createResult = await concept.createConversation({ userId: USER_1, context: "Old context" });
    assert(createResult.status === "success");
    if (createResult.status !== "success") return;

    const conversationId = createResult.conversation._id.toHexString();
    const result = await concept.updateContext({ conversationId, newContext: "New context" });

    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.conversation.context, "New context");
    }
  } finally {
    await client.close();
  }
});

Deno.test("updateContext: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.updateContext({ conversationId: nonExistentId, newContext: "New" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("updateContext: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const result = await concept.updateContext({ conversationId: "invalid-id", newContext: "New" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

// --- deleteConversation Tests ---

Deno.test("deleteConversation: Success - Delete conversation and messages", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const createResult = await concept.createConversation({ userId: USER_1 });
    assert(createResult.status === "success");
    if (createResult.status !== "success") return;

    const conversationId = createResult.conversation._id.toHexString();
    await concept.sendUserMessage({ conversationId, content: "Test message" });
    
    const deleteResult = await concept.deleteConversation({ conversationId });
    assert(deleteResult.status === "success");

    // Verify conversation is deleted
    const historyResult = await concept.getHistory({ conversationId });
    assert(historyResult.status === "error");
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation: Error - Conversation not found", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.deleteConversation({ conversationId: nonExistentId });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("deleteConversation: Error - Invalid conversationId format", async () => {
  const [db, client] = await testDb();
  const concept = new ConversationalAgentConcept(db);

  try {
    const result = await concept.deleteConversation({ conversationId: "invalid-id" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

