// src/concepts/CommunicationInteraction/CommunicationInteractionConcept.test.ts

import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { ObjectId } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CommunicationInteractionConcept from "./CommunicationInteractionConcept.ts";

// Define some branded IDs for consistent testing
const USER_1_ID: ID = "user-1" as ID;
const USER_2_ID: ID = "user-2" as ID;
const USER_3_ID: ID = "user-3" as ID;
const NON_EXISTENT_ID: ID = "non-existent-user" as ID;

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

    assert(startResult.status === "success", `Failed to start interaction: ${startResult.status === "error" ? startResult.error : ""}`);
    assertExists(startResult.status === "success" ? startResult.interactionId : null, "Interaction ID should be returned on successful start.");

    const interactionId = startResult.status === "success" ? startResult.interactionId : new ObjectId();

    // Verify interaction is active for participants
    const activeForUser1 = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeForUser1.status === "success", `Failed to get active interaction for ${USER_1_ID}: ${activeForUser1.status === "error" ? activeForUser1.error : ""}`);
    assertExists(activeForUser1.status === "success" ? activeForUser1.interaction : null, `${USER_1_ID} should have an active interaction.`);
    if (activeForUser1.status === "success" && activeForUser1.interaction) {
      assertEquals(activeForUser1.interaction._id.toHexString(), interactionId.toHexString(), "Active interaction ID mismatch for User 1.");
      assertExists(activeForUser1.interaction.startTime, "Start time should be set for active interaction.");
      assertEquals(activeForUser1.interaction.endTime, null, "End time should not be set for active interaction.");
    }

    const activeForUser2 = await concept.getActiveInteraction({ userId: USER_2_ID });
    assert(activeForUser2.status === "success", `Failed to get active interaction for ${USER_2_ID}`);
    if (activeForUser2.status === "success" && activeForUser2.interaction) {
      assertEquals(activeForUser2.interaction._id.toHexString(), interactionId.toHexString(), "Active interaction ID mismatch for User 2.");
    }

    // Simulate some interaction time
    await delay(50); // Wait 50 milliseconds

    // 2. End interaction
    const endTime = new Date();
    const endResult = await concept.endInteraction({
      interactionId,
      participantId: initiatorId,
    });

    assert(endResult.status === "success", `Failed to end interaction`);
    if (endResult.status === "success") {
      assertExists(endResult.interaction, "Ended interaction object should be returned.");
      assertExists(endResult.interaction.endTime, "End time should be set after ending interaction.");
      assert(endResult.interaction.endTime!.getTime() >= startTime.getTime(), "End time must be after start time.");
    }

    const inactiveForUser1 = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(inactiveForUser1.status === "success");
    if (inactiveForUser1.status === "success") {
      assertEquals(inactiveForUser1.interaction, null, `${USER_1_ID} should no longer have an active interaction.`);
    }

    const inactiveForUser2 = await concept.getActiveInteraction({ userId: USER_2_ID });
    assert(inactiveForUser2.status === "success");
    if (inactiveForUser2.status === "success") {
      assertEquals(inactiveForUser2.interaction, null, `${USER_2_ID} should no longer have an active interaction.`);
    }

    // 3. Calculate and verify duration
    const durationResult = await concept.getInteractionDuration({ interactionId });
    assert(durationResult.status === "success", `Failed to get interaction duration`);
    if (durationResult.status === "success") {
      assertExists(durationResult.durationMs, "Duration should be present for a completed interaction.");
      assert(durationResult.durationMs > 0, "Duration should be positive.");
      assert(durationResult.durationMs >= 50, `Duration ${durationResult.durationMs}ms should be at least 50ms.`);
    }

    // Verify history for participants
    const historyUser1 = await concept.getInteractionHistory({ userId: USER_1_ID });
    assert(historyUser1.status === "success");
    if (historyUser1.status === "success") {
      assertEquals(historyUser1.interactions.length, 1, `${USER_1_ID} history should contain one interaction.`);
      assertEquals(historyUser1.interactions[0]._id.toHexString(), interactionId.toHexString(), "History interaction ID mismatch for User 1.");
      assertExists(historyUser1.interactions[0].endTime, "Historical interaction should have an endTime.");
    }

    const historyUser2 = await concept.getInteractionHistory({ userId: USER_2_ID });
    assert(historyUser2.status === "success");
    if (historyUser2.status === "success") {
      assertEquals(historyUser2.interactions.length, 1, `${USER_2_ID} history should contain one interaction.`);
      assertEquals(historyUser2.interactions[0]._id.toHexString(), interactionId.toHexString(), "History interaction ID mismatch for User 2.");
    }

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

    assert(result.status === "success", `Expected success, got error: ${result.status === "error" ? result.error : ""}`);
    if (result.status === "success") {
      assertExists(result.interactionId, "Interaction ID should be returned.");

      const activeInteraction = await concept.getActiveInteraction({ userId: USER_1_ID });
      assert(activeInteraction.status === "success");
      if (activeInteraction.status === "success" && activeInteraction.interaction) {
        assertEquals(activeInteraction.interaction._id.toHexString(), result.interactionId.toHexString());
        assertEquals(activeInteraction.interaction.participants.length, 2, "Should have two participants.");
        assert(activeInteraction.interaction.participants.includes(USER_1_ID), "User 1 should be a participant.");
        assert(activeInteraction.interaction.participants.includes(USER_2_ID), "User 2 should be a participant.");
        assertExists(activeInteraction.interaction.startTime, "Start time should be set.");
        assertEquals(activeInteraction.interaction.endTime, null, "End time should not be set.");
      }
    }
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
    if (result.status === "error") {
      assertEquals(result.error, "Participants array cannot be empty.", "Incorrect error message for empty participants.");
    }
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
    assert(firstStart.status === "success", `Failed to start first interaction`);

    const secondStart = await concept.startInteraction({
      participants: [USER_1_ID, USER_3_ID],
      initiatorId: USER_1_ID,
    });

    assert(secondStart.status === "error", "Expected an error for participant already active.");
    if (secondStart.status === "error") {
      assertEquals(
        secondStart.error,
        `Participant ${USER_1_ID} is already in an active communication interaction.`,
        "Incorrect error message for already active participant.",
      );
    }
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

    assert(result.status === "success", `Expected success`);
    if (result.status === "success") {
      assertExists(result.interactionId, "Interaction ID should be returned.");

      const activeInteraction = await concept.getActiveInteraction({ userId: USER_1_ID });
      assert(activeInteraction.status === "success");
      if (activeInteraction.status === "success" && activeInteraction.interaction) {
        assertEquals(activeInteraction.interaction.participants.length, 2, "Duplicate participants should be deduplicated.");
        assert(activeInteraction.interaction.participants.includes(USER_1_ID));
        assert(activeInteraction.interaction.participants.includes(USER_2_ID));
      }
    }
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
    const interactionId = startResult.status === "success" ? startResult.interactionId : new ObjectId();

    await delay(10);

    const endResult = await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    assert(endResult.status === "success", `Expected success`);
    if (endResult.status === "success") {
      assertExists(endResult.interaction, "Ended interaction should be returned.");
      assertExists(endResult.interaction.endTime, "endTime should be set after ending.");
      assert(endResult.interaction.endTime!.getTime() >= endResult.interaction.startTime.getTime(), "endTime must be after startTime.");
    }

    const activeCheck = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(activeCheck.status === "success");
    if (activeCheck.status === "success") {
      assertEquals(activeCheck.interaction, null, "Interaction should no longer be active for user 1.");
    }
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
    if (result.status === "error") {
      assertEquals(
        result.error,
        `Interaction with ID ${nonExistentId.toHexString()} not found.`,
        "Incorrect error message for interaction not found.",
      );
    }
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
    const interactionId = startResult.status === "success" ? startResult.interactionId : new ObjectId();

    await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    const secondEndResult = await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    assert(secondEndResult.status === "error", "Expected an error for already inactive interaction.");
    if (secondEndResult.status === "error") {
      assertEquals(
        secondEndResult.error,
        `Interaction with ID ${interactionId.toHexString()} is already inactive.`,
        "Incorrect error message for already inactive interaction.",
      );
    }
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
    const interactionId = startResult.status === "success" ? startResult.interactionId : new ObjectId();

    const result = await concept.endInteraction({
      interactionId,
      participantId: USER_3_ID,
    });

    assert(result.status === "error", "Expected an error for non-participant ending interaction.");
    if (result.status === "error") {
      assertEquals(
        result.error,
        `Participant ${USER_3_ID} is not part of interaction ${interactionId.toHexString()}.`,
        "Incorrect error message for non-participant.",
      );
    }
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
    const interactionId3 = startResult2.status === "success" ? startResult2.interactionId : new ObjectId();

    const result = await concept.getActiveInteraction({ userId: USER_3_ID });

    assert(result.status === "success", `Expected success`);
    if (result.status === "success" && result.interaction) {
      assertExists(result.interaction, "Should return an active interaction for User 3.");
      assertEquals(result.interaction._id.toHexString(), interactionId3.toHexString());
      assertEquals(result.interaction.participants.length, 1);
      assertExists(result.interaction.startTime);
      assertEquals(result.interaction.endTime, null);
    }
  } finally {
    await client.close();
  }
});

Deno.test("getActiveInteraction: Success - Return null when no active interaction", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const resultNonExistent = await concept.getActiveInteraction({ userId: NON_EXISTENT_ID });
    assert(resultNonExistent.status === "success", `Expected success`);
    if (resultNonExistent.status === "success") {
      assertEquals(resultNonExistent.interaction, null, "Should return null for a user with no active interactions.");
    }

    // Test for a user who had an interaction that ended
    const startResult = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult.status === "success");
    const interactionId = startResult.status === "success" ? startResult.interactionId : new ObjectId();
    await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    const resultAfterEnded = await concept.getActiveInteraction({ userId: USER_1_ID });
    assert(resultAfterEnded.status === "success");
    if (resultAfterEnded.status === "success") {
      assertEquals(resultAfterEnded.interaction, null, "Should return null after interaction has ended.");
    }
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
    if (result.status === "error") {
      assertEquals(result.error, "User ID cannot be empty.", "Incorrect error message for empty user ID.");
    }
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
    const interactionId = startResult.status === "success" ? startResult.interactionId : new ObjectId();

    await delay(30);

    await concept.endInteraction({ interactionId, participantId: USER_1_ID });

    const durationResult = await concept.getInteractionDuration({ interactionId });

    assert(durationResult.status === "success", `Expected success`);
    if (durationResult.status === "success") {
      assertExists(durationResult.durationMs, "Duration should be calculated.");
      assert(durationResult.durationMs >= 30, "Duration should be at least 30ms.");
      assert(durationResult.durationMs < 2000, "Duration should be less than 2000ms (to account for small overhead).");
    }
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
    if (result.status === "error") {
      assertEquals(
        result.error,
        `Interaction with ID ${nonExistentId.toHexString()} not found.`,
        "Incorrect error message for interaction not found.",
      );
    }
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
    const interactionId = startResult.status === "success" ? startResult.interactionId : new ObjectId();

    const result = await concept.getInteractionDuration({ interactionId });

    assert(result.status === "error", "Expected an error for active interaction.");
    if (result.status === "error") {
      assertEquals(
        result.error,
        `Interaction with ID ${interactionId.toHexString()} is still active, duration cannot be calculated.`,
        "Incorrect error message for active interaction.",
      );
    }
  } finally {
    await client.close();
  }
});

// --- getInteractionHistory Tests ---

Deno.test("getInteractionHistory: Success - Get all interactions for user", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    // Interaction 1: Create and end for USER_1_ID
    const startResult1 = await concept.startInteraction({ participants: [USER_1_ID, USER_2_ID], initiatorId: USER_1_ID });
    assert(startResult1.status === "success");
    const inactiveInteractionId = startResult1.status === "success" ? startResult1.interactionId : new ObjectId();
    await delay(10);
    await concept.endInteraction({ interactionId: inactiveInteractionId, participantId: USER_1_ID });

    await delay(10);

    // Interaction 2: Create active for USER_1_ID
    const startResult2 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult2.status === "success");
    const activeInteractionId = startResult2.status === "success" ? startResult2.interactionId : new ObjectId();

    // Interaction 3: For USER_3_ID (not USER_1_ID)
    await concept.startInteraction({ participants: [USER_3_ID], initiatorId: USER_3_ID });

    const historyResult = await concept.getInteractionHistory({ userId: USER_1_ID });

    assert(historyResult.status === "success", `Expected success`);
    if (historyResult.status === "success") {
      assertEquals(historyResult.interactions.length, 2, "User 1 should have 2 interactions in history (one active, one inactive).");

      const interactionIds = historyResult.interactions.map((i) => i._id.toHexString());
      assert(interactionIds.includes(activeInteractionId.toHexString()), "History should include the active interaction.");
      assert(interactionIds.includes(inactiveInteractionId.toHexString()), "History should include the inactive interaction.");

      const activeInHistory = historyResult.interactions.find((i) => i._id.toHexString() === activeInteractionId.toHexString());
      assertExists(activeInHistory, "Active interaction should be found in history.");
      if (activeInHistory) {
        assertEquals(activeInHistory.endTime, null, "Active interaction in history should not have an endTime.");
      }

      const inactiveInHistory = historyResult.interactions.find((i) => i._id.toHexString() === inactiveInteractionId.toHexString());
      assertExists(inactiveInHistory, "Inactive interaction should be found in history.");
      if (inactiveInHistory) {
        assertExists(inactiveInHistory.endTime, "Inactive interaction in history should have an endTime.");
      }
    }
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionHistory: Success - Return empty array when no history", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    const result = await concept.getInteractionHistory({ userId: NON_EXISTENT_ID });

    assert(result.status === "success", `Expected success`);
    if (result.status === "success") {
      assertEquals(result.interactions.length, 0, "Should return an empty array for a user with no history.");
    }
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
    if (result.status === "error") {
      assertEquals(result.error, "User ID cannot be empty.", "Incorrect error message for empty user ID.");
    }
  } finally {
    await client.close();
  }
});

Deno.test("getInteractionHistory: Success - Include both active and inactive interactions", async () => {
  const [db, client] = await testDb();
  const concept = new CommunicationInteractionConcept(db);

  try {
    // Create an inactive interaction first
    const startResult1 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult1.status === "success");
    const inactiveInteractionId = startResult1.status === "success" ? startResult1.interactionId : new ObjectId();
    await delay(10);
    await concept.endInteraction({ interactionId: inactiveInteractionId, participantId: USER_1_ID });

    // Create an active interaction
    const startResult2 = await concept.startInteraction({ participants: [USER_1_ID], initiatorId: USER_1_ID });
    assert(startResult2.status === "success");
    const activeInteractionId = startResult2.status === "success" ? startResult2.interactionId : new ObjectId();

    const historyResult = await concept.getInteractionHistory({ userId: USER_1_ID });

    assert(historyResult.status === "success", `Expected success`);
    if (historyResult.status === "success") {
      assertEquals(historyResult.interactions.length, 2, "History should contain both active and inactive interactions.");

      const activeInteractionInHistory = historyResult.interactions.find((i) => i._id.toHexString() === activeInteractionId.toHexString());
      assertExists(activeInteractionInHistory, "Active interaction should be in history.");
      if (activeInteractionInHistory) {
        assertEquals(activeInteractionInHistory.endTime, null, "Active interaction should not have an endTime.");
      }

      const inactiveInteractionInHistory = historyResult.interactions.find(
        (i) => i._id.toHexString() === inactiveInteractionId.toHexString(),
      );
      assertExists(inactiveInteractionInHistory, "Inactive interaction should be in history.");
      if (inactiveInteractionInHistory) {
        assertExists(inactiveInteractionInHistory.endTime, "Inactive interaction should have an endTime.");
      }
    }
  } finally {
    await client.close();
  }
});

