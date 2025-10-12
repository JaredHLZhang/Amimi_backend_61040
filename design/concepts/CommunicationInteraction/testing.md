# CommunicationInteraction Concept Testing

## Background Context

Please review the following documents to understand the concept testing principles:

* [[design/background/testing-concepts]]

## Concept Specification

* [[design/concepts/CommunicationInteraction/CommunicationInteraction]]

## Implementation

* [[src/concepts/CommunicationInteraction/CommunicationInteractionConcept]]

## Reference Test File

For testing patterns, please review this example:
* [[src/concepts/LikertSurvey/LikertSurveyConcept.test]]

## Task

Please create comprehensive tests for the `CommunicationInteraction` concept in `src/concepts/CommunicationInteraction/CommunicationInteractionConcept.test.ts`

### Testing Requirements

1. **Test Structure**: 
   - Use separate `Deno.test()` calls for each test scenario (NOT nested `t.step()`)
   - Each test should get its own database instance using `testDb()`
   - Always close the database client in a `finally` block to prevent connection leaks
   
2. **Test Coverage**:
   - **1 operational principle test**: Test the full lifecycle (start → active → end → duration recorded)
   - **At least 15 action tests** covering:
     - Success cases for all 5 actions
     - Error cases (invalid inputs, not found, authorization failures, state violations)
     - Edge cases (concurrent interactions, empty participants, duplicate participants)
   - **Query tests** for getting interaction history

3. **Important Testing Patterns**:
   - Use branded `ID` type: `const userId: ID = "user-123" as ID;`
   - Create separate test database for each test using `testDb()`
   - Close connections: `await client.close()` in `finally` blocks
   - Use `ObjectId` for interaction IDs
   - Test both success paths (`status === "success"`) and error paths (`status === "error"`)

4. **Specific Test Scenarios to Include**:
   
   **Operational Principle Test:**
   - Start interaction with multiple participants
   - Verify interaction is active
   - End interaction
   - Verify interaction is inactive and has endTime
   - Calculate and verify duration

   **startInteraction Tests:**
   - ✅ Success: Create interaction with valid participants
   - ❌ Error: Empty participants array
   - ❌ Error: Participant already in active interaction
   - ✅ Edge case: Duplicate participants (should be deduplicated)

   **endInteraction Tests:**
   - ✅ Success: End active interaction
   - ❌ Error: Interaction not found
   - ❌ Error: Interaction already inactive
   - ❌ Error: User not a participant (authorization)
   - ❌ Error: Invalid interaction ID format

   **getActiveInteraction Tests:**
   - ✅ Success: Get active interaction for user
   - ✅ Success: Return null when no active interaction
   - ❌ Error: Empty user ID

   **getInteractionDuration Tests:**
   - ✅ Success: Calculate duration for completed interaction
   - ❌ Error: Interaction not found
   - ❌ Error: Interaction still active (no endTime)
   - ❌ Error: Invalid interaction ID format

   **getInteractionHistory Tests:**
   - ✅ Success: Get all interactions for user
   - ✅ Success: Return empty array when no history
   - ❌ Error: Empty user ID
   - ✅ Success: Include both active and inactive interactions

5. **Code Quality**:
   - Use descriptive test names
   - Include assertions with meaningful messages
   - Test both the happy path and error conditions
   - Verify exact error messages where appropriate

6. **Critical Pattern from LikertSurvey Example**:
   ```typescript
   Deno.test("Test name here", async () => {
     const [db, client] = await testDb();
     const concept = new CommunicationInteractionConcept(db);
     try {
       // ... test code ...
     } finally {
       await client.close();
     }
   });
   ```

Please provide a complete, comprehensive test suite that thoroughly validates the CommunicationInteraction concept.


# response:

To create comprehensive tests for the `CommunicationInteraction` concept, we'll follow the specified structure, coverage, and patterns.

Here's the content for `src/concepts/CommunicationInteraction/CommunicationInteractionConcept.test.ts`:

```typescript
// src/concepts/CommunicationInteraction/CommunicationInteractionConcept.test.ts

import {
  assert,
  assertEquals,
  assertExists,
  assertMatch,
} from "https://deno.land/std@0.217.0/testing/asserts.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { testDb, ID } from "../../utils.ts"; // Assuming utils.ts provides testDb and ID type
import { CommunicationInteractionConcept } from "./CommunicationInteractionConcept.ts";

// Define some branded IDs for consistent testing
const USER_1_ID: ID = "user-1" as ID;
const USER_2_ID: ID = "user-2" as ID;
const USER_3_ID: ID = "user-3" as ID;
const NON_EXISTENT_ID: ID = "non-existent-user" as ID;
const INVALID_OBJECT_ID_STRING = "invalid-object-id-format";

// Helper function to simulate time passing for duration tests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- 1. Operational Principle Test ---
Deno.test("Operational Principle Test: Full lifecycle (start -> active -> end -> duration -> history)", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const participants = [USER_1_ID, USER_2_ID];
    const initiatorId = USER_1_ID;

    // 1. Start interaction with multiple participants
    const startTime = new Date();
    const startResult = await concept.startInteraction({
      participants,
      initiatorId,
    });

    assert(startResult.status === "success", `Failed to start interaction: ${startResult.error}`);
    assertExists(startResult.interactionId, "Interaction ID should be returned on successful start.");

    const interactionId = startResult.interactionId;

    // Verify interaction is active for participants
    const activeForUser1 = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeForUser1.status === "success", `Failed to get active interaction for ${USER_1_ID}: ${activeForUser1.error}`);
    assertExists(activeForUser1.interaction, `${USER_1_ID} should have an active interaction.`);
    assertEquals(activeForUser1.interaction?._id.toHexString(), interactionId.toHexString(), "Active interaction ID mismatch for User 1.");
    assertExists(activeForUser1.interaction?.startTime, "Start time should be set for active interaction.");
    assertEquals(activeForUser1.interaction?.endTime, undefined, "End time should not be set for active interaction.");

    const activeForUser2 = await concept.getActiveInteraction({ userId: USER_2_ID });
    assert(activeForUser2.status === "success", `Failed to get active interaction for ${USER_2_ID}: ${activeForUser2.error}`);
    assertExists(activeForUser2.interaction, `${USER_2_ID} should have an active interaction.`);
    assertEquals(activeForUser2.interaction?._id.toHexString(), interactionId.toHexString(), "Active interaction ID mismatch for User 2.");

    // Simulate some interaction time
    await delay(50); // Wait 50 milliseconds

    // 2. End interaction
    const endTime = new Date(); // Capture end time slightly after delay
    const endResult = await concept.endInteraction({
      interactionId,
      participantId: initiatorId, // Any participant can end it
    });

    assert(endResult.status === "success", `Failed to end interaction: ${endResult.error}`);
    assertExists(endResult.interaction, "Ended interaction object should be returned.");

    // Verify interaction is inactive and has endTime
    const endedInteraction = endResult.interaction;
    assertExists(endedInteraction.endTime, "End time should be set after ending interaction.");
    assert(endedInteraction.endTime.getTime() >= startTime.getTime(), "End time must be after start time.");

    const inactiveForUser1 = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(inactiveForUser1.status === "success", `Failed to check active interaction for ${USER_1_ID} after end: ${inactiveForUser1.error}`);
    assertEquals(inactiveForUser1.interaction, null, `${USER_1_ID} should no longer have an active interaction.`);

    const inactiveForUser2 = await concept.getActiveInteraction({ userId: USER_2_ID });
    assert(inactiveForUser2.status === "success", `Failed to check active interaction for ${USER_2_ID} after end: ${inactiveForUser2.error}`);
    assertEquals(inactiveForUser2.interaction, null, `${USER_2_ID} should no longer have an active interaction.`);

    // 3. Calculate and verify duration
    const durationResult = await concept.getInteractionDuration({ interactionId });
    assert(durationResult.status === "success", `Failed to get interaction duration: ${durationResult.error}`);
    assertExists(durationResult.durationMs, "Duration should be present for a completed interaction.");
    assert(durationResult.durationMs > 0, "Duration should be positive.");
    // Assert duration is within a reasonable range, accounting for test execution overhead
    const minExpectedDuration = 50;
    const maxExpectedDuration = endTime.getTime() - endedInteraction.startTime.getTime() + 10; // +10ms buffer
    assert(
      durationResult.durationMs >= minExpectedDuration,
      `Duration ${durationResult.durationMs}ms should be at least ${minExpectedDuration}ms.`,
    );
    assert(
      durationResult.durationMs <= maxExpectedDuration,
      `Duration ${durationResult.durationMs}ms should be at most ${maxExpectedDuration}ms.`,
    );

    // Verify history for participants
    const historyUser1 = await concept.getInteractionHistory({ userId: USER_1_ID });
    assert(historyUser1.status === "success", `Failed to get history for ${USER_1_ID}: ${historyUser1.error}`);
    assertEquals(historyUser1.interactions.length, 1, `${USER_1_ID} history should contain one interaction.`);
    assertEquals(historyUser1.interactions[0]._id.toHexString(), interactionId.toHexString(), "History interaction ID mismatch for User 1.");
    assertExists(historyUser1.interactions[0].endTime, "Historical interaction should have an endTime.");

    const historyUser2 = await concept.getInteractionHistory({ userId: USER_2_ID });
    assert(historyUser2.status === "success", `Failed to get history for ${USER_2_ID}: ${historyUser2.error}`);
    assertEquals(historyUser2.interactions.length, 1, `${USER_2_ID} history should contain one interaction.`);
    assertEquals(historyUser2.interactions[0]._id.toHexString(), interactionId.toHexString(), "History interaction ID mismatch for User 2.");

  } finally {
    await client.close();
  }
});

// --- startInteraction Tests ---

Deno.test("startInteraction: Success - Create interaction with valid participants", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const participants = [USER_1_ID, USER_2_ID];
    const initiatorId = USER_1_ID;
    const result = await concept.startInteraction({ participants, initiatorId });

    assert(result.status === "success", `Expected success, got error: ${result.error}`);
    assertExists(result.interactionId, "Interaction ID should be returned.");

    const activeInteraction = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeInteraction.status === "success", `Failed to get active interaction: ${activeInteraction.error}`);
    assertExists(activeInteraction.interaction, "User 1 should have an active interaction.");
    assertEquals(activeInteraction.interaction._id.toHexString(), result.interactionId!.toHexString());
    assertEquals(activeInteraction.interaction.participants.length, 2, "Should have two participants.");
    assert(activeInteraction.interaction.participants.includes(USER_1_ID), "User 1 should be a participant.");
    assert(activeInteraction.interaction.participants.includes(USER_2_ID), "User 2 should be a participant.");
    assertExists(activeInteraction.interaction.startTime, "Start time should be set.");
    assertEquals(activeInteraction.interaction.endTime, undefined, "End time should not be set.");
  } finally {
    await client.close();
  }
});

Deno.test("startInteraction: Error - Empty participants array", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.startInteraction({ participants: [], initiatorId: USER_1_ID });

    assert(result.status === "error", "Expected an error for empty participants.");
    assertEquals(result.error, "Participants array cannot be empty.", "Incorrect error message for empty participants.");
  } finally {
    await client.close();
  }
});

Deno.test("startInteraction: Error - Participant already in active interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const firstStart = await concept.startInteraction({
      participants: [USER_1_ID, USER_2_ID],
      initiatorId: USER_1_ID,
    });
    assert(firstStart.status === "success", `Failed to start first interaction: ${firstStart.error}`);

    const secondStart = await concept.startInteraction({
      participants: [USER_1_ID, USER_3_ID], // USER_1_ID is already active
      initiatorId: USER_1_ID,
    });

    assert(secondStart.status === "error", "Expected an error for participant already active.");
    assertEquals(
      secondStart.error,
      `Participant ${USER_1_ID} is already in an active communication interaction.`,
      "Incorrect error message for already active participant.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("startInteraction: Edge case - Duplicate participants should be deduplicated", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const participantsWithDuplicates = [USER_1_ID, USER_2_ID, USER_1_ID];
    const result = await concept.startInteraction({
      participants: participantsWithDuplicates,
      initiatorId: USER_1_ID,
    });

    assert(result.status === "success", `Expected success, got error: ${result.error}`);
    assertExists(result.interactionId, "Interaction ID should be returned.");

    const activeInteraction = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeInteraction.status === "success");
    assertExists(activeInteraction.interaction);
    assertEquals(activeInteraction.interaction.participants.length, 2, "Duplicate participants should be deduplicated.");
    assert(activeInteraction.interaction.participants.includes(USER_1_ID));
    assert(activeInteraction.interaction.participants.includes(USER_2_ID));
  } finally {
    await client.close();
  }
});

// --- endInteraction Tests ---

Deno.test("endInteraction: Success - End active interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({
      participants: [USER_1_ID, USER_2_ID],
      initiatorId: USER_1_ID,
    });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    await delay(10); // Simulate some duration

    const endResult = await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    assert(endResult.status === "success", `Expected success, got error: ${endResult.error}`);
    assertExists(endResult.interaction, "Ended interaction should be returned.");
    assertExists(endResult.interaction.endTime, "endTime should be set after ending.");
    assert(endResult.interaction.endTime!.getTime() >= endResult.interaction.startTime.getTime(), "endTime must be after startTime.");

    const activeCheck = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeCheck.status === "success");
    assertEquals(activeCheck.interaction, null, "Interaction should no longer be active for user 1.");
  } finally {
    await client.close();
  }
});

Deno.test("endInteraction: Error - Interaction not found", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const nonExistentId = new ObjectId();
    const result = await concept.endInteraction({
      interactionId: nonExistentId,
      participantId: USER_1_ID,
    });

    assert(result.status === "error", "Expected an error for non-existent interaction.");
    assertEquals(
      result.error,
      `Interaction with ID ${nonExistentId.toHexString()} not found.`,
      "Incorrect error message for interaction not found.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("endInteraction: Error - Interaction already inactive", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    await concept.endInteraction({ interactionId, participantId: USER_1_ID }); // First end (success)

    const secondEndResult = await concept.endInteraction({ interactionId, participantId: USER_1_ID }); // Second end (should fail)

    assert(secondEndResult.status === "error", "Expected an error for already inactive interaction.");
    assertEquals(
      secondEndResult.error,
      `Interaction with ID ${interactionId.toHexString()} is already inactive.`,
      "Incorrect error message for already inactive interaction.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("endInteraction: Error - User not a participant (authorization)", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({
      participants: [USER_1_ID, USER_2_ID],
      initiatorId: USER_1_ID,
    });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    const result = await concept.endInteraction({
      interactionId,
      participantId: USER_3_ID, // USER_3_ID is not a participant
    });

    assert(result.status === "error", "Expected an error for non-participant ending interaction.");
    assertEquals(
      result.error,
      `Participant ${USER_3_ID} is not part of interaction ${interactionId.toHexString()}.`,
      "Incorrect error message for non-participant.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("endInteraction: Error - Invalid interaction ID format", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.endInteraction({
      interactionId: INVALID_OBJECT_ID_STRING as unknown as ObjectId, // Simulate invalid format
      participantId: USER_1_ID,
    });

    assert(result.status === "error", "Expected an error for invalid interaction ID format.");
    assertMatch(result.error!, /invalid BSON ObjectId/, "Error message should indicate invalid ID format.");
  } finally {
    await client.close();
  }
});

// --- getActiveInteraction Tests ---

Deno.test("getActiveInteraction: Success - Get active interaction for user", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    await concept.startInteraction({ participants: [USER_1_ID, USER_2_ID], initiatorId: USER_1_ID });
    const startResult2 = await concept.startInteraction({ participants: [USER_3_ID], initiatorId: USER_3_ID });
    assert(startResult2.status === "success");
    const interactionId3 = startResult2.interactionId!;

    const result = await concept.getActiveInteraction({ userId: USER_3_ID });

    assert(result.status === "success", `Expected success, got error: ${result.error}`);
    assertExists(result.interaction, "Should return an active interaction for User 3.");
    assertEquals(result.interaction._id.toHexString(), interactionId3.toHexString());
    assertEquals(result.interaction.participants.length, 1);
    assertExists(result.interaction.startTime);
    assertEquals(result.interaction.endTime, undefined);
  } finally {
    await client.close();
  }
});

Deno.test("getActiveInteraction: Success - Return null when no active interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const resultNonExistent = await concept.getActiveInteraction({ userId: NON_EXISTENT_ID });
    assert(resultNonExistent.status === "success", `Expected success, got error: ${resultNonExistent.error}`);
    assertEquals(resultNonExistent.interaction, null, "Should return null for a user with no active interactions.");

    // Test for a user who had an interaction that ended
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    await concept.endInteraction({ interactionId: startResult.interactionId!, participantId: USER_1_ID });

    const resultAfterEnded = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(resultAfterEnded.status === "success");
    assertEquals(resultAfterEnded.interaction, null, "Should return null after interaction has ended.");
  } finally {
    await client.close();
  }
});

Deno.test("getActiveInteraction: Error - Empty user ID", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getActiveInteraction({ userId: "" as ID });

    assert(result.status === "error", "Expected an error for empty user ID.");
    assertEquals(result.error, "User ID cannot be empty.", "Incorrect error message for empty user ID.");
  } finally {
    await client.close();
  }
});

// --- getInteractionDuration Tests ---

Deno.test("getInteractionDuration: Success - Calculate duration for completed interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    await delay(30); // Simulate duration

    await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    const durationResult = await concept.getInteractionDuration({ interactionId });

    assert(durationResult.status === "success", `Expected success, got error: ${durationResult.error}`);
    assertExists(durationResult.durationMs, "Duration should be calculated.");
    assert(durationResult.durationMs >= 30, "Duration should be at least 30ms.");
    assert(durationResult.durationMs < 100, "Duration should be less than 100ms (to account for small overhead).");
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionDuration: Error - Interaction not found", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const nonExistentId = new ObjectId();
    const result = await concept.getInteractionDuration({ interactionId: nonExistentId });

    assert(result.status === "error", "Expected an error for non-existent interaction.");
    assertEquals(
      result.error,
      `Interaction with ID ${nonExistentId.toHexString()} not found.`,
      "Incorrect error message for interaction not found.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionDuration: Error - Interaction still active (no endTime)", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    const result = await concept.getInteractionDuration({ interactionId });

    assert(result.status === "error", "Expected an error for active interaction.");
    assertEquals(
      result.error,
      `Interaction with ID ${interactionId.toHexString()} is still active, duration cannot be calculated.`,
      "Incorrect error message for active interaction.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionDuration: Error - Invalid interaction ID format", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getInteractionDuration({
      interactionId: INVALID_OBJECT_ID_STRING as unknown as ObjectId, // Simulate invalid format
    });

    assert(result.status === "error", "Expected an error for invalid interaction ID format.");
    assertMatch(result.error!, /invalid BSON ObjectId/, "Error message should indicate invalid ID format.");
  } finally {
    await client.close();
  }
});

// --- getInteractionHistory Tests ---

Deno.test("getInteractionHistory: Success - Get all interactions for user", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    // Interaction 1: Active for USER_1_ID
    const startResult1 = await concept.startInteraction({ participants: [USER_1_ID, USER_2_ID], initiatorId: USER_1_ID });
    assert(startResult1.status === "success");
    const activeInteractionId = startResult1.interactionId!;

    await delay(10);

    // Interaction 2: Ended for USER_1_ID
    const startResult2 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult2.status === "success");
    const inactiveInteractionId = startResult2.interactionId!;
    await delay(10);
    await concept.endInteraction({ interactionId: inactiveInteractionId, participantId: USER_1_ID });

    // Interaction 3: For USER_3_ID (not USER_1_ID)
    await concept.startInteraction({ participants: [USER_3_ID], initiatorId: USER_3_ID });

    const historyResult = await concept.getInteractionHistory({ userId: USER_1_ID });

    assert(historyResult.status === "success", `Expected success, got error: ${historyResult.error}`);
    assertEquals(historyResult.interactions.length, 2, "User 1 should have 2 interactions in history (one active, one inactive).");

    const interactionIds = historyResult.interactions.map((i) => i._id.toHexString());
    assert(interactionIds.includes(activeInteractionId.toHexString()), "History should include the active interaction.");
    assert(interactionIds.includes(inactiveInteractionId.toHexString()), "History should include the inactive interaction.");

    const activeInHistory = historyResult.interactions.find((i) => i._id.toHexString() === activeInteractionId.toHexString());
    assertExists(activeInHistory, "Active interaction should be found in history.");
    assertEquals(activeInHistory.endTime, undefined, "Active interaction in history should not have an endTime.");

    const inactiveInHistory = historyResult.interactions.find((i) => i._id.toHexString() === inactiveInteractionId.toHexString());
    assertExists(inactiveInHistory, "Inactive interaction should be found in history.");
    assertExists(inactiveInHistory.endTime, "Inactive interaction in history should have an endTime.");
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionHistory: Success - Return empty array when no history", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getInteractionHistory({ userId: NON_EXISTENT_ID });

    assert(result.status === "success", `Expected success, got error: ${result.error}`);
    assertEquals(result.interactions.length, 0, "Should return an empty array for a user with no history.");
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionHistory: Error - Empty user ID", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getInteractionHistory({ userId: "" as ID });

    assert(result.status === "error", "Expected an error for empty user ID.");
    assertEquals(result.error, "User ID cannot be empty.", "Incorrect error message for empty user ID.");
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionHistory: Success - Include both active and inactive interactions", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    // Create an active interaction
    const startResult1 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult1.status === "success");
    const activeInteractionId = startResult1.interactionId!;

    // Create an inactive interaction
    const startResult2 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult2.status === "success");
    const inactiveInteractionId = startResult2.interactionId!;
    await delay(10);
    await concept.endInteraction({ interactionId: inactiveInteractionId, participantId: USER_1_ID });

    const historyResult = await concept.getInteractionHistory({ userId: USER_1_ID });

    assert(historyResult.status === "success", `Expected success, got error: ${historyResult.error}`);
    assertEquals(historyResult.interactions.length, 2, "History should contain both active and inactive interactions.");

    const activeInteractionInHistory = historyResult.interactions.find((i) => i._id.toHexString() === activeInteractionId.toHexString());
    assertExists(activeInteractionInHistory, "Active interaction should be in history.");
    assertEquals(activeInteractionInHistory.endTime, undefined, "Active interaction should not have an endTime.");

    const inactiveInteractionInHistory = historyResult.interactions.find(
      (i) => i._id.toHexString() === inactiveInteractionId.toHexString(),
    );
    assertExists(inactiveInteractionInHistory, "Inactive interaction should be in history.");
    assertExists(inactiveInteractionInHistory.endTime, "Inactive interaction should have an endTime.");
  } finally {
    await client.close();
  }
});
```---
timestamp: 'Sat Oct 11 2025 16:12:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_161210.2c765e09.md]]'
content_id: 9557e55b3c70793f40770ff93037e71dcccab39c79eadaba27139ed8a0196e19
---

# response:

To create comprehensive tests for the `CommunicationInteraction` concept, we'll follow the specified structure, coverage, and patterns.

Here's the content for `src/concepts/CommunicationInteraction/CommunicationInteractionConcept.test.ts`:

```typescript
// src/concepts/CommunicationInteraction/CommunicationInteractionConcept.test.ts

import {
  assert,
  assertEquals,
  assertExists,
  assertMatch,
} from "https://deno.land/std@0.217.0/testing/asserts.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { testDb, ID } from "../../utils.ts"; // Assuming utils.ts provides testDb and ID type
import { CommunicationInteractionConcept } from "./CommunicationInteractionConcept.ts";

// Define some branded IDs for consistent testing
const USER_1_ID: ID = "user-1" as ID;
const USER_2_ID: ID = "user-2" as ID;
const USER_3_ID: ID = "user-3" as ID;
const NON_EXISTENT_ID: ID = "non-existent-user" as ID;
const INVALID_OBJECT_ID_STRING = "invalid-object-id-format";

// Helper function to simulate time passing for duration tests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- 1. Operational Principle Test ---
Deno.test("Operational Principle Test: Full lifecycle (start -> active -> end -> duration -> history)", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const participants = [USER_1_ID, USER_2_ID];
    const initiatorId = USER_1_ID;

    // 1. Start interaction with multiple participants
    const startTime = new Date();
    const startResult = await concept.startInteraction({
      participants,
      initiatorId,
    });

    assert(startResult.status === "success", `Failed to start interaction: ${startResult.error}`);
    assertExists(startResult.interactionId, "Interaction ID should be returned on successful start.");

    const interactionId = startResult.interactionId;

    // Verify interaction is active for participants
    const activeForUser1 = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeForUser1.status === "success", `Failed to get active interaction for ${USER_1_ID}: ${activeForUser1.error}`);
    assertExists(activeForUser1.interaction, `${USER_1_ID} should have an active interaction.`);
    assertEquals(activeForUser1.interaction?._id.toHexString(), interactionId.toHexString(), "Active interaction ID mismatch for User 1.");
    assertExists(activeForUser1.interaction?.startTime, "Start time should be set for active interaction.");
    assertEquals(activeForUser1.interaction?.endTime, undefined, "End time should not be set for active interaction.");

    const activeForUser2 = await concept.getActiveInteraction({ userId: USER_2_ID });
    assert(activeForUser2.status === "success", `Failed to get active interaction for ${USER_2_ID}: ${activeForUser2.error}`);
    assertExists(activeForUser2.interaction, `${USER_2_ID} should have an active interaction.`);
    assertEquals(activeForUser2.interaction?._id.toHexString(), interactionId.toHexString(), "Active interaction ID mismatch for User 2.");

    // Simulate some interaction time
    await delay(50); // Wait 50 milliseconds

    // 2. End interaction
    const endTime = new Date(); // Capture end time slightly after delay
    const endResult = await concept.endInteraction({
      interactionId,
      participantId: initiatorId, // Any participant can end it
    });

    assert(endResult.status === "success", `Failed to end interaction: ${endResult.error}`);
    assertExists(endResult.interaction, "Ended interaction object should be returned.");

    // Verify interaction is inactive and has endTime
    const endedInteraction = endResult.interaction;
    assertExists(endedInteraction.endTime, "End time should be set after ending interaction.");
    assert(endedInteraction.endTime.getTime() >= startTime.getTime(), "End time must be after start time.");

    const inactiveForUser1 = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(inactiveForUser1.status === "success", `Failed to check active interaction for ${USER_1_ID} after end: ${inactiveForUser1.error}`);
    assertEquals(inactiveForUser1.interaction, null, `${USER_1_ID} should no longer have an active interaction.`);

    const inactiveForUser2 = await concept.getActiveInteraction({ userId: USER_2_ID });
    assert(inactiveForUser2.status === "success", `Failed to check active interaction for ${USER_2_ID} after end: ${inactiveForUser2.error}`);
    assertEquals(inactiveForUser2.interaction, null, `${USER_2_ID} should no longer have an active interaction.`);

    // 3. Calculate and verify duration
    const durationResult = await concept.getInteractionDuration({ interactionId });
    assert(durationResult.status === "success", `Failed to get interaction duration: ${durationResult.error}`);
    assertExists(durationResult.durationMs, "Duration should be present for a completed interaction.");
    assert(durationResult.durationMs > 0, "Duration should be positive.");
    // Assert duration is within a reasonable range, accounting for test execution overhead
    const minExpectedDuration = 50;
    const maxExpectedDuration = endTime.getTime() - endedInteraction.startTime.getTime() + 10; // +10ms buffer
    assert(
      durationResult.durationMs >= minExpectedDuration,
      `Duration ${durationResult.durationMs}ms should be at least ${minExpectedDuration}ms.`,
    );
    assert(
      durationResult.durationMs <= maxExpectedDuration,
      `Duration ${durationResult.durationMs}ms should be at most ${maxExpectedDuration}ms.`,
    );

    // Verify history for participants
    const historyUser1 = await concept.getInteractionHistory({ userId: USER_1_ID });
    assert(historyUser1.status === "success", `Failed to get history for ${USER_1_ID}: ${historyUser1.error}`);
    assertEquals(historyUser1.interactions.length, 1, `${USER_1_ID} history should contain one interaction.`);
    assertEquals(historyUser1.interactions[0]._id.toHexString(), interactionId.toHexString(), "History interaction ID mismatch for User 1.");
    assertExists(historyUser1.interactions[0].endTime, "Historical interaction should have an endTime.");

    const historyUser2 = await concept.getInteractionHistory({ userId: USER_2_ID });
    assert(historyUser2.status === "success", `Failed to get history for ${USER_2_ID}: ${historyUser2.error}`);
    assertEquals(historyUser2.interactions.length, 1, `${USER_2_ID} history should contain one interaction.`);
    assertEquals(historyUser2.interactions[0]._id.toHexString(), interactionId.toHexString(), "History interaction ID mismatch for User 2.");

  } finally {
    await client.close();
  }
});

// --- startInteraction Tests ---

Deno.test("startInteraction: Success - Create interaction with valid participants", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const participants = [USER_1_ID, USER_2_ID];
    const initiatorId = USER_1_ID;
    const result = await concept.startInteraction({ participants, initiatorId });

    assert(result.status === "success", `Expected success, got error: ${result.error}`);
    assertExists(result.interactionId, "Interaction ID should be returned.");

    const activeInteraction = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeInteraction.status === "success", `Failed to get active interaction: ${activeInteraction.error}`);
    assertExists(activeInteraction.interaction, "User 1 should have an active interaction.");
    assertEquals(activeInteraction.interaction._id.toHexString(), result.interactionId!.toHexString());
    assertEquals(activeInteraction.interaction.participants.length, 2, "Should have two participants.");
    assert(activeInteraction.interaction.participants.includes(USER_1_ID), "User 1 should be a participant.");
    assert(activeInteraction.interaction.participants.includes(USER_2_ID), "User 2 should be a participant.");
    assertExists(activeInteraction.interaction.startTime, "Start time should be set.");
    assertEquals(activeInteraction.interaction.endTime, undefined, "End time should not be set.");
  } finally {
    await client.close();
  }
});

Deno.test("startInteraction: Error - Empty participants array", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.startInteraction({ participants: [], initiatorId: USER_1_ID });

    assert(result.status === "error", "Expected an error for empty participants.");
    assertEquals(result.error, "Participants array cannot be empty.", "Incorrect error message for empty participants.");
  } finally {
    await client.close();
  }
});

Deno.test("startInteraction: Error - Participant already in active interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const firstStart = await concept.startInteraction({
      participants: [USER_1_ID, USER_2_ID],
      initiatorId: USER_1_ID,
    });
    assert(firstStart.status === "success", `Failed to start first interaction: ${firstStart.error}`);

    const secondStart = await concept.startInteraction({
      participants: [USER_1_ID, USER_3_ID], // USER_1_ID is already active
      initiatorId: USER_1_ID,
    });

    assert(secondStart.status === "error", "Expected an error for participant already active.");
    assertEquals(
      secondStart.error,
      `Participant ${USER_1_ID} is already in an active communication interaction.`,
      "Incorrect error message for already active participant.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("startInteraction: Edge case - Duplicate participants should be deduplicated", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const participantsWithDuplicates = [USER_1_ID, USER_2_ID, USER_1_ID];
    const result = await concept.startInteraction({
      participants: participantsWithDuplicates,
      initiatorId: USER_1_ID,
    });

    assert(result.status === "success", `Expected success, got error: ${result.error}`);
    assertExists(result.interactionId, "Interaction ID should be returned.");

    const activeInteraction = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeInteraction.status === "success");
    assertExists(activeInteraction.interaction);
    assertEquals(activeInteraction.interaction.participants.length, 2, "Duplicate participants should be deduplicated.");
    assert(activeInteraction.interaction.participants.includes(USER_1_ID));
    assert(activeInteraction.interaction.participants.includes(USER_2_ID));
  } finally {
    await client.close();
  }
});

// --- endInteraction Tests ---

Deno.test("endInteraction: Success - End active interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({
      participants: [USER_1_ID, USER_2_ID],
      initiatorId: USER_1_ID,
    });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    await delay(10); // Simulate some duration

    const endResult = await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    assert(endResult.status === "success", `Expected success, got error: ${endResult.error}`);
    assertExists(endResult.interaction, "Ended interaction should be returned.");
    assertExists(endResult.interaction.endTime, "endTime should be set after ending.");
    assert(endResult.interaction.endTime!.getTime() >= endResult.interaction.startTime.getTime(), "endTime must be after startTime.");

    const activeCheck = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeCheck.status === "success");
    assertEquals(activeCheck.interaction, null, "Interaction should no longer be active for user 1.");
  } finally {
    await client.close();
  }
});

Deno.test("endInteraction: Error - Interaction not found", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const nonExistentId = new ObjectId();
    const result = await concept.endInteraction({
      interactionId: nonExistentId,
      participantId: USER_1_ID,
    });

    assert(result.status === "error", "Expected an error for non-existent interaction.");
    assertEquals(
      result.error,
      `Interaction with ID ${nonExistentId.toHexString()} not found.`,
      "Incorrect error message for interaction not found.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("endInteraction: Error - Interaction already inactive", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    await concept.endInteraction({ interactionId, participantId: USER_1_ID }); // First end (success)

    const secondEndResult = await concept.endInteraction({ interactionId, participantId: USER_1_ID }); // Second end (should fail)

    assert(secondEndResult.status === "error", "Expected an error for already inactive interaction.");
    assertEquals(
      secondEndResult.error,
      `Interaction with ID ${interactionId.toHexString()} is already inactive.`,
      "Incorrect error message for already inactive interaction.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("endInteraction: Error - User not a participant (authorization)", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({
      participants: [USER_1_ID, USER_2_ID],
      initiatorId: USER_1_ID,
    });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    const result = await concept.endInteraction({
      interactionId,
      participantId: USER_3_ID, // USER_3_ID is not a participant
    });

    assert(result.status === "error", "Expected an error for non-participant ending interaction.");
    assertEquals(
      result.error,
      `Participant ${USER_3_ID} is not part of interaction ${interactionId.toHexString()}.`,
      "Incorrect error message for non-participant.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("endInteraction: Error - Invalid interaction ID format", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.endInteraction({
      interactionId: INVALID_OBJECT_ID_STRING as unknown as ObjectId, // Simulate invalid format
      participantId: USER_1_ID,
    });

    assert(result.status === "error", "Expected an error for invalid interaction ID format.");
    assertMatch(result.error!, /invalid BSON ObjectId/, "Error message should indicate invalid ID format.");
  } finally {
    await client.close();
  }
});

// --- getActiveInteraction Tests ---

Deno.test("getActiveInteraction: Success - Get active interaction for user", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    await concept.startInteraction({ participants: [USER_1_ID, USER_2_ID], initiatorId: USER_1_ID });
    const startResult2 = await concept.startInteraction({ participants: [USER_3_ID], initiatorId: USER_3_ID });
    assert(startResult2.status === "success");
    const interactionId3 = startResult2.interactionId!;

    const result = await concept.getActiveInteraction({ userId: USER_3_ID });

    assert(result.status === "success", `Expected success, got error: ${result.error}`);
    assertExists(result.interaction, "Should return an active interaction for User 3.");
    assertEquals(result.interaction._id.toHexString(), interactionId3.toHexString());
    assertEquals(result.interaction.participants.length, 1);
    assertExists(result.interaction.startTime);
    assertEquals(result.interaction.endTime, undefined);
  } finally {
    await client.close();
  }
});

Deno.test("getActiveInteraction: Success - Return null when no active interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const resultNonExistent = await concept.getActiveInteraction({ userId: NON_EXISTENT_ID });
    assert(resultNonExistent.status === "success", `Expected success, got error: ${resultNonExistent.error}`);
    assertEquals(resultNonExistent.interaction, null, "Should return null for a user with no active interactions.");

    // Test for a user who had an interaction that ended
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    await concept.endInteraction({ interactionId: startResult.interactionId!, participantId: USER_1_ID });

    const resultAfterEnded = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(resultAfterEnded.status === "success");
    assertEquals(resultAfterEnded.interaction, null, "Should return null after interaction has ended.");
  } finally {
    await client.close();
  }
});

Deno.test("getActiveInteraction: Error - Empty user ID", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getActiveInteraction({ userId: "" as ID });

    assert(result.status === "error", "Expected an error for empty user ID.");
    assertEquals(result.error, "User ID cannot be empty.", "Incorrect error message for empty user ID.");
  } finally {
    await client.close();
  }
});

// --- getInteractionDuration Tests ---

Deno.test("getInteractionDuration: Success - Calculate duration for completed interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    await delay(30); // Simulate duration

    await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    const durationResult = await concept.getInteractionDuration({ interactionId });

    assert(durationResult.status === "success", `Expected success, got error: ${durationResult.error}`);
    assertExists(durationResult.durationMs, "Duration should be calculated.");
    assert(durationResult.durationMs >= 30, "Duration should be at least 30ms.");
    assert(durationResult.durationMs < 100, "Duration should be less than 100ms (to account for small overhead).");
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionDuration: Error - Interaction not found", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const nonExistentId = new ObjectId();
    const result = await concept.getInteractionDuration({ interactionId: nonExistentId });

    assert(result.status === "error", "Expected an error for non-existent interaction.");
    assertEquals(
      result.error,
      `Interaction with ID ${nonExistentId.toHexString()} not found.`,
      "Incorrect error message for interaction not found.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionDuration: Error - Interaction still active (no endTime)", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    const interactionId = startResult.interactionId!;

    const result = await concept.getInteractionDuration({ interactionId });

    assert(result.status === "error", "Expected an error for active interaction.");
    assertEquals(
      result.error,
      `Interaction with ID ${interactionId.toHexString()} is still active, duration cannot be calculated.`,
      "Incorrect error message for active interaction.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionDuration: Error - Invalid interaction ID format", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getInteractionDuration({
      interactionId: INVALID_OBJECT_ID_STRING as unknown as ObjectId, // Simulate invalid format
    });

    assert(result.status === "error", "Expected an error for invalid interaction ID format.");
    assertMatch(result.error!, /invalid BSON ObjectId/, "Error message should indicate invalid ID format.");
  } finally {
    await client.close();
  }
});

// --- getInteractionHistory Tests ---

Deno.test("getInteractionHistory: Success - Get all interactions for user", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    // Interaction 1: Active for USER_1_ID
    const startResult1 = await concept.startInteraction({ participants: [USER_1_ID, USER_2_ID], initiatorId: USER_1_ID });
    assert(startResult1.status === "success");
    const activeInteractionId = startResult1.interactionId!;

    await delay(10);

    // Interaction 2: Ended for USER_1_ID
    const startResult2 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult2.status === "success");
    const inactiveInteractionId = startResult2.interactionId!;
    await delay(10);
    await concept.endInteraction({ interactionId: inactiveInteractionId, participantId: USER_1_ID });

    // Interaction 3: For USER_3_ID (not USER_1_ID)
    await concept.startInteraction({ participants: [USER_3_ID], initiatorId: USER_3_ID });

    const historyResult = await concept.getInteractionHistory({ userId: USER_1_ID });

    assert(historyResult.status === "success", `Expected success, got error: ${historyResult.error}`);
    assertEquals(historyResult.interactions.length, 2, "User 1 should have 2 interactions in history (one active, one inactive).");

    const interactionIds = historyResult.interactions.map((i) => i._id.toHexString());
    assert(interactionIds.includes(activeInteractionId.toHexString()), "History should include the active interaction.");
    assert(interactionIds.includes(inactiveInteractionId.toHexString()), "History should include the inactive interaction.");

    const activeInHistory = historyResult.interactions.find((i) => i._id.toHexString() === activeInteractionId.toHexString());
    assertExists(activeInHistory, "Active interaction should be found in history.");
    assertEquals(activeInHistory.endTime, undefined, "Active interaction in history should not have an endTime.");

    const inactiveInHistory = historyResult.interactions.find((i) => i._id.toHexString() === inactiveInteractionId.toHexString());
    assertExists(inactiveInHistory, "Inactive interaction should be found in history.");
    assertExists(inactiveInHistory.endTime, "Inactive interaction in history should have an endTime.");
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionHistory: Success - Return empty array when no history", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getInteractionHistory({ userId: NON_EXISTENT_ID });

    assert(result.status === "success", `Expected success, got error: ${result.error}`);
    assertEquals(result.interactions.length, 0, "Should return an empty array for a user with no history.");
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionHistory: Error - Empty user ID", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getInteractionHistory({ userId: "" as ID });

    assert(result.status === "error", "Expected an error for empty user ID.");
    assertEquals(result.error, "User ID cannot be empty.", "Incorrect error message for empty user ID.");
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionHistory: Success - Include both active and inactive interactions", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    // Create an active interaction
    const startResult1 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult1.status === "success");
    const activeInteractionId = startResult1.interactionId!;

    // Create an inactive interaction
    const startResult2 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult2.status === "success");
    const inactiveInteractionId = startResult2.interactionId!;
    await delay(10);
    await concept.endInteraction({ interactionId: inactiveInteractionId, participantId: USER_1_ID });

    const historyResult = await concept.getInteractionHistory({ userId: USER_1_ID });

    assert(historyResult.status === "success", `Expected success, got error: ${historyResult.error}`);
    assertEquals(historyResult.interactions.length, 2, "History should contain both active and inactive interactions.");

    const activeInteractionInHistory = historyResult.interactions.find((i) => i._id.toHexString() === activeInteractionId.toHexString());
    assertExists(activeInteractionInHistory, "Active interaction should be in history.");
    assertEquals(activeInteractionInHistory.endTime, undefined, "Active interaction should not have an endTime.");

    const inactiveInteractionInHistory = historyResult.interactions.find(
      (i) => i._id.toHexString() === inactiveInteractionId.toHexString(),
    );
    assertExists(inactiveInteractionInHistory, "Inactive interaction should be in history.");
    assertExists(inactiveInteractionInHistory.endTime, "Inactive interaction should have an endTime.");
  } finally {
    await client.close();
  }
});
```
