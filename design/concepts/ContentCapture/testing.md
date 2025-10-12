# ContentCapture Concept Testing

## Background Context

Please review the following documents to understand the concept testing principles:

* [[design/background/testing-concepts]]

## Concept Specification

* [[design/concepts/ContentCapture/ContentCapture]]

## Implementation

* [[src/concepts/ContentCapture/ContentCaptureConcept]]

## Reference Test File

For testing patterns, please review this example:
* [[src/concepts/LikertSurvey/LikertSurveyConcept.test]]

## Task

Please create comprehensive tests for the `ContentCapture` concept in `src/concepts/ContentCapture/ContentCaptureConcept.test.ts`

### Testing Requirements

1. **Test Structure**: 
   - Use separate `Deno.test()` calls for each test scenario (NOT nested `t.step()`)
   - Each test should get its own database instance using `testDb()`
   - Always close the database client in a `finally` block to prevent connection leaks
   
2. **Test Coverage**:
   - **1 operational principle test**: Test the full lifecycle (start capturing → stop capturing → retrieve captured text)
   - **At least 15 action tests** covering:
     - Success cases for all 5 actions
     - Error cases (invalid inputs, not found, invalid status transitions)
     - Edge cases (invalid ObjectId format, multiple captures per source)
   - **Query tests** for getCapturesBySource

3. **Important Testing Patterns**:
   - Use branded `ID` type: `const owner: ID = "user-123" as ID;`
   - Create separate test database for each test using `testDb()`
   - Close connections: `await client.close()` in `finally` blocks
   - Use `ObjectId.toHexString()` to get string representation for captureId
   - Test both success paths (`status === "success"`) and error paths (`status === "error"`)

4. **Specific Test Scenarios to Include**:
   
   **Operational Principle Test:**
   - Start capture with valid parameters
   - Verify capture is in "capturing" status
   - Stop capture with text
   - Verify capture is "completed" and has capturedText
   - Retrieve and verify the capture

   **startCapture Tests:**
   - ✅ Success: Create capture with valid audio type
   - ✅ Success: Create capture with valid image type
   - ✅ Success: Create capture with valid text type
   - ❌ Error: Invalid capture type (e.g., "video")
   - ✅ Multiple captures for same source

   **stopCapture Tests:**
   - ✅ Success: Stop active capture
   - ❌ Error: Capture not found
   - ❌ Error: Capture already completed
   - ❌ Error: Invalid captureId format
   - ✅ Success: Stop with empty string as capturedText (valid)

   **getCapture Tests:**
   - ✅ Success: Get existing capture
   - ❌ Error: Capture not found
   - ❌ Error: Invalid captureId format

   **getCapturesBySource Tests:**
   - ✅ Success: Get all captures for source (multiple)
   - ✅ Success: Return empty array when no captures
   - ✅ Success: Filter by sourceId correctly

   **deleteCapture Tests:**
   - ✅ Success: Delete existing capture
   - ❌ Error: Capture not found
   - ❌ Error: Invalid captureId format

5. **Code Quality**:
   - Use descriptive test names
   - Include assertions with meaningful messages
   - Test both the happy path and error conditions
   - Verify exact error messages where appropriate

6. **Critical Pattern from LikertSurvey Example**:
   ```typescript
   Deno.test("Test name here", async () => {
     const [db, client] = await testDb();
     const concept = new ContentCaptureConcept(db);
     try {
       // ... test code ...
     } finally {
       await client.close();
     }
   });
   ```

Please provide a complete, comprehensive test suite that thoroughly validates the ContentCapture concept.


# response:

```typescript
// src/concepts/ContentCapture/ContentCaptureConcept.test.ts

import {
  assert,
  assertEquals,
  assertRejects,
  assertExists,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { testDb } from "../../../test/testUtils.ts"; // Adjust path as necessary
import { ContentCaptureConcept, ID, CaptureType, CaptureStatus } from "./ContentCaptureConcept.ts";

// Helper function to create a random branded ID
const createRandomId = (): ID => `test-source-${crypto.randomUUID()}` as ID;
// Helper function to create a random ObjectId string as a branded ID (for non-existent capture IDs)
const createRandomObjectIdAsId = (): ID => new ObjectId().toHexString() as ID;

Deno.test("Operational Principle Test: Full lifecycle of a content capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  const capturedTextContent = "This is some captured text content.";

  let captureId: ID; // Variable to store the created capture ID

  try {
    // 1. Start capture with valid parameters
    captureId = await concept.startCapture(sourceId, captureType);
    assertExists(captureId, "startCapture should return a valid capture ID");
    assert(ObjectId.isValid(captureId), "Returned captureId should be a valid ObjectId string");

    // Verify capture is in "capturing" status
    let capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should be retrievable immediately after starting");
    assertEquals(capture.sourceId, sourceId, "Source ID of the started capture should match");
    assertEquals(capture.type, captureType, "Type of the started capture should match");
    assertEquals(capture.status, "capturing", "Status of the capture should be 'capturing'");
    assert(capture.createdAt instanceof Date, "createdAt should be a Date object");
    assert(capture.updatedAt instanceof Date, "updatedAt should be a Date object");
    assertEquals(capture.createdAt.getTime(), capture.updatedAt.getTime(), "createdAt and updatedAt should be same initially");
    assert(!capture.capturedText, "capturedText should not be set initially");

    // 2. Stop capture with text
    await concept.stopCapture(captureId, capturedTextContent);

    // Verify capture is "completed" and has capturedText
    capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should still be retrievable after stopping");
    assertEquals(capture.status, "completed", "Status of the capture should be 'completed' after stopping");
    assertEquals(capture.capturedText, capturedTextContent, "capturedText should match the provided content");
    assert(capture.updatedAt.getTime() > capture.createdAt.getTime(), "updatedAt should be updated after stopCapture");

    // 3. Retrieve and verify the final state of the capture
    const finalCapture = await concept.getCapture(captureId);
    assertExists(finalCapture, "Final capture should be retrievable");
    assertEquals(finalCapture.sourceId, sourceId, "Final capture source ID should be correct");
    assertEquals(finalCapture.type, captureType, "Final capture type should be correct");
    assertEquals(finalCapture.status, "completed", "Final capture status should be 'completed'");
    assertEquals(finalCapture.capturedText, capturedTextContent, "Final captured text should be correct");
  } finally {
    await client.close(); // Always close the database client
  }
});

// --- startCapture Tests ---

Deno.test("startCapture: Success - creates capture with valid 'audio' type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "audio";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    assertExists(captureId, "startCapture should return a valid ID for 'audio' type");
    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should be found in the database");
    assertEquals(capture.sourceId, sourceId, "Source ID should match the input");
    assertEquals(capture.type, captureType, "Capture type should be 'audio'");
    assertEquals(capture.status, "capturing", "Initial status should be 'capturing'");
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - creates capture with valid 'image' type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "image";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    assertExists(captureId, "startCapture should return a valid ID for 'image' type");
    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should be found in the database");
    assertEquals(capture.type, captureType, "Capture type should be 'image'");
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - creates capture with valid 'text' type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    assertExists(captureId, "startCapture should return a valid ID for 'text' type");
    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should be found in the database");
    assertEquals(capture.type, captureType, "Capture type should be 'text'");
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Error - rejects with invalid capture type (e.g., 'video')", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  // Using an "any" cast to bypass TypeScript's type checking for testing invalid input
  const invalidType = "video" as CaptureType;
  try {
    await assertRejects(
      () => concept.startCapture(sourceId, invalidType),
      Error,
      "Invalid capture type", // Expecting this specific error message
      "Should reject with 'Invalid capture type' error for unsupported types"
    );
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - allows multiple captures for the same sourceId", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType1: CaptureType = "text";
  const captureType2: CaptureType = "audio";
  try {
    const captureId1 = await concept.startCapture(sourceId, captureType1);
    const captureId2 = await concept.startCapture(sourceId, captureType2);

    assertExists(captureId1, "First capture ID should be returned");
    assertExists(captureId2, "Second capture ID should be returned");
    assertNotEquals(captureId1, captureId2, "Capture IDs for the same source should be unique");

    const captures = await concept.getCapturesBySource(sourceId);
    assertEquals(captures.length, 2, "Should find two captures for the same sourceId");
    assert(captures.some(c => c._id.toHexString() === captureId1 && c.type === captureType1), "First capture should be present");
    assert(captures.some(c => c._id.toHexString() === captureId2 && c.type === captureType2), "Second capture should be present");
  } finally {
    await client.close();
  }
});

// --- stopCapture Tests ---

Deno.test("stopCapture: Success - stops an active capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  const capturedTextContent = "The quick brown fox jumps over the lazy dog.";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, capturedTextContent);

    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should still exist after stopping");
    assertEquals(capture.status, "completed", "Capture status should be 'completed'");
    assertEquals(capture.capturedText, capturedTextContent, "capturedText should be correctly set");
    assert(capture.updatedAt.getTime() > capture.createdAt.getTime(), "updatedAt should be updated after stopping");
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - rejects if capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentCaptureId: ID = createRandomObjectIdAsId();
  const someText = "Non-existent capture text.";
  try {
    await assertRejects(
      () => concept.stopCapture(nonExistentCaptureId, someText),
      Error,
      `Capture with ID ${nonExistentCaptureId} not found`,
      "Should reject if the capture ID does not exist"
    );
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - rejects if capture already completed", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "audio";
  const firstText = "Initial audio captured.";
  const secondTextAttempt = "Attempting to re-stop.";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, firstText); // First stop - successful

    await assertRejects(
      () => concept.stopCapture(captureId, secondTextAttempt),
      Error,
      `Capture with ID ${captureId} is already completed`,
      "Should reject if capture status is already 'completed'"
    );

    // Verify that the captured text remains the first text and doesn't get overwritten
    const capture = await concept.getCapture(captureId);
    assertEquals(capture?.capturedText, firstText, "Captured text should not change on a failed second stop attempt");
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - rejects if invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const invalidCaptureId: ID = "not-a-valid-objectid-string" as ID;
  const someText = "Text content.";
  try {
    await assertRejects(
      () => concept.stopCapture(invalidCaptureId, someText),
      Error,
      `Invalid ObjectId format for ID: ${invalidCaptureId}`,
      "Should reject for a captureId with an invalid ObjectId format"
    );
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Success - allows empty string as capturedText", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "image";
  const emptyText = "";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, emptyText);

    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should still exist");
    assertEquals(capture.status, "completed", "Status should be 'completed'");
    assertEquals(capture.capturedText, emptyText, "capturedText should be an empty string");
  } finally {
    await client.close();
  }
});

// --- getCapture Tests ---

Deno.test("getCapture: Success - retrieves an existing capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  const capturedTextContent = "Existing content.";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, capturedTextContent);

    const capture = await concept.getCapture(captureId);
    assertExists(capture, "getCapture should return the existing capture");
    assertEquals(capture._id.toHexString() as ID, captureId, "Retrieved capture ID should match");
    assertEquals(capture.sourceId, sourceId, "Retrieved source ID should match");
    assertEquals(capture.type, captureType, "Retrieved type should match");
    assertEquals(capture.status, "completed", "Retrieved status should be 'completed'");
    assertEquals(capture.capturedText, capturedTextContent, "Retrieved captured text should match");
  } finally {
    await client.close();
  }
});

Deno.test("getCapture: Returns undefined if capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentCaptureId: ID = createRandomObjectIdAsId();
  try {
    const capture = await concept.getCapture(nonExistentCaptureId);
    assertEquals(capture, undefined, "getCapture should return undefined for a non-existent ID");
  } finally {
    await client.close();
  }
});

Deno.test("getCapture: Error - rejects if invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const invalidCaptureId: ID = "invalid-id-string" as ID;
  try {
    await assertRejects(
      () => concept.getCapture(invalidCaptureId),
      Error,
      `Invalid ObjectId format for ID: ${invalidCaptureId}`,
      "Should reject for an invalid ObjectId format"
    );
  } finally {
    await client.close();
  }
});

// --- getCapturesBySource Tests ---

Deno.test("getCapturesBySource: Success - retrieves multiple captures for a source", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const otherSourceId: ID = createRandomId(); // For negative testing
  const captureType1: CaptureType = "text";
  const captureType2: CaptureType = "image";
  try {
    const captureId1 = await concept.startCapture(sourceId, captureType1);
    await concept.stopCapture(captureId1, "First capture text");
    const captureId2 = await concept.startCapture(sourceId, captureType2);
    await concept.stopCapture(captureId2, "Second capture image description");
    // Create a capture for a different source
    await concept.startCapture(otherSourceId, "audio");

    const captures = await concept.getCapturesBySource(sourceId);
    assertEquals(captures.length, 2, "Should return exactly two captures for the specified source");

    const returnedIds = captures.map(c => c._id.toHexString() as ID);
    assert(returnedIds.includes(captureId1), "Returned captures should include the first capture ID");
    assert(returnedIds.includes(captureId2), "Returned captures should include the second capture ID");

    // Verify properties of retrieved captures
    const foundCapture1 = captures.find(c => c._id.toHexString() === captureId1);
    assertExists(foundCapture1);
    assertEquals(foundCapture1.sourceId, sourceId);
    assertEquals(foundCapture1.type, captureType1);
  } finally {
    await client.close();
  }
});

Deno.test("getCapturesBySource: Success - returns an empty array when no captures for source", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentSourceId: ID = createRandomId();
  try {
    const captures = await concept.getCapturesBySource(nonExistentSourceId);
    assertEquals(captures.length, 0, "Should return an empty array for a source with no captures");
  } finally {
    await client.close();
  }
});

Deno.test("getCapturesBySource: Success - filters by sourceId correctly, not returning captures from other sources", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId1: ID = createRandomId();
  const sourceId2: ID = createRandomId();
  try {
    const captureId1_1 = await concept.startCapture(sourceId1, "text");
    await concept.stopCapture(captureId1_1, "Text for source 1, capture 1");
    const captureId2_1 = await concept.startCapture(sourceId2, "audio");
    await concept.stopCapture(captureId2_1, "Audio for source 2, capture 1");

    const capturesForSource1 = await concept.getCapturesBySource(sourceId1);
    assertEquals(capturesForSource1.length, 1, "Should return exactly one capture for sourceId1");
    assertEquals(capturesForSource1[0]._id.toHexString() as ID, captureId1_1, "The capture for sourceId1 should be correct");
    assertEquals(capturesForSource1[0].sourceId, sourceId1);

    const capturesForSource2 = await concept.getCapturesBySource(sourceId2);
    assertEquals(capturesForSource2.length, 1, "Should return exactly one capture for sourceId2");
    assertEquals(capturesForSource2[0]._id.toHexString() as ID, captureId2_1, "The capture for sourceId2 should be correct");
    assertEquals(capturesForSource2[0].sourceId, sourceId2);

    // Ensure captures from source2 are not in source1's results and vice-versa
    assert(!capturesForSource1.some(c => c._id.toHexString() === captureId2_1), "Source1 results should not contain capture from Source2");
    assert(!capturesForSource2.some(c => c._id.toHexString() === captureId1_1), "Source2 results should not contain capture from Source1");
  } finally {
    await client.close();
  }
});

// --- deleteCapture Tests ---

Deno.test("deleteCapture: Success - deletes an existing capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, "Text to be deleted.");
    assertExists(await concept.getCapture(captureId), "Capture should exist before deletion");

    await concept.deleteCapture(captureId);

    const capture = await concept.getCapture(captureId);
    assertEquals(capture, undefined, "Capture should be undefined after successful deletion");
  } finally {
    await client.close();
  }
});

Deno.test("deleteCapture: Error - rejects if capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentCaptureId: ID = createRandomObjectIdAsId();
  try {
    await assertRejects(
      () => concept.deleteCapture(nonExistentCaptureId),
      Error,
      `Capture with ID ${nonExistentCaptureId} not found`,
      "Should reject if the capture ID does not exist for deletion"
    );
  } finally {
    await client.close();
  }
});

Deno.test("deleteCapture: Error - rejects if invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const invalidCaptureId: ID = "invalid-objectid-format-here" as ID;
  try {
    await assertRejects(
      () => concept.deleteCapture(invalidCaptureId),
      Error,
      `Invalid ObjectId format for ID: ${invalidCaptureId}`,
      "Should reject for an invalid ObjectId format during deletion"
    );
  } finally {
    await client.close();
  }
});
```---
timestamp: 'Sat Oct 11 2025 16:25:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_162538.6529da0c.md]]'
content_id: 79067ac556369c24093be9fe37627cced8094e5620a396773fc7f596830bb08f
---

# response:

```typescript
// src/concepts/ContentCapture/ContentCaptureConcept.test.ts

import {
  assert,
  assertEquals,
  assertRejects,
  assertExists,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { testDb } from "../../../test/testUtils.ts"; // Adjust path as necessary
import { ContentCaptureConcept, ID, CaptureType, CaptureStatus } from "./ContentCaptureConcept.ts";

// Helper function to create a random branded ID
const createRandomId = (): ID => `test-source-${crypto.randomUUID()}` as ID;
// Helper function to create a random ObjectId string as a branded ID (for non-existent capture IDs)
const createRandomObjectIdAsId = (): ID => new ObjectId().toHexString() as ID;

Deno.test("Operational Principle Test: Full lifecycle of a content capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  const capturedTextContent = "This is some captured text content.";

  let captureId: ID; // Variable to store the created capture ID

  try {
    // 1. Start capture with valid parameters
    captureId = await concept.startCapture(sourceId, captureType);
    assertExists(captureId, "startCapture should return a valid capture ID");
    assert(ObjectId.isValid(captureId), "Returned captureId should be a valid ObjectId string");

    // Verify capture is in "capturing" status
    let capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should be retrievable immediately after starting");
    assertEquals(capture.sourceId, sourceId, "Source ID of the started capture should match");
    assertEquals(capture.type, captureType, "Type of the started capture should match");
    assertEquals(capture.status, "capturing", "Status of the capture should be 'capturing'");
    assert(capture.createdAt instanceof Date, "createdAt should be a Date object");
    assert(capture.updatedAt instanceof Date, "updatedAt should be a Date object");
    assertEquals(capture.createdAt.getTime(), capture.updatedAt.getTime(), "createdAt and updatedAt should be same initially");
    assert(!capture.capturedText, "capturedText should not be set initially");

    // 2. Stop capture with text
    await concept.stopCapture(captureId, capturedTextContent);

    // Verify capture is "completed" and has capturedText
    capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should still be retrievable after stopping");
    assertEquals(capture.status, "completed", "Status of the capture should be 'completed' after stopping");
    assertEquals(capture.capturedText, capturedTextContent, "capturedText should match the provided content");
    assert(capture.updatedAt.getTime() > capture.createdAt.getTime(), "updatedAt should be updated after stopCapture");

    // 3. Retrieve and verify the final state of the capture
    const finalCapture = await concept.getCapture(captureId);
    assertExists(finalCapture, "Final capture should be retrievable");
    assertEquals(finalCapture.sourceId, sourceId, "Final capture source ID should be correct");
    assertEquals(finalCapture.type, captureType, "Final capture type should be correct");
    assertEquals(finalCapture.status, "completed", "Final capture status should be 'completed'");
    assertEquals(finalCapture.capturedText, capturedTextContent, "Final captured text should be correct");
  } finally {
    await client.close(); // Always close the database client
  }
});

// --- startCapture Tests ---

Deno.test("startCapture: Success - creates capture with valid 'audio' type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "audio";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    assertExists(captureId, "startCapture should return a valid ID for 'audio' type");
    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should be found in the database");
    assertEquals(capture.sourceId, sourceId, "Source ID should match the input");
    assertEquals(capture.type, captureType, "Capture type should be 'audio'");
    assertEquals(capture.status, "capturing", "Initial status should be 'capturing'");
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - creates capture with valid 'image' type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "image";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    assertExists(captureId, "startCapture should return a valid ID for 'image' type");
    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should be found in the database");
    assertEquals(capture.type, captureType, "Capture type should be 'image'");
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - creates capture with valid 'text' type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    assertExists(captureId, "startCapture should return a valid ID for 'text' type");
    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should be found in the database");
    assertEquals(capture.type, captureType, "Capture type should be 'text'");
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Error - rejects with invalid capture type (e.g., 'video')", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  // Using an "any" cast to bypass TypeScript's type checking for testing invalid input
  const invalidType = "video" as CaptureType;
  try {
    await assertRejects(
      () => concept.startCapture(sourceId, invalidType),
      Error,
      "Invalid capture type", // Expecting this specific error message
      "Should reject with 'Invalid capture type' error for unsupported types"
    );
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - allows multiple captures for the same sourceId", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType1: CaptureType = "text";
  const captureType2: CaptureType = "audio";
  try {
    const captureId1 = await concept.startCapture(sourceId, captureType1);
    const captureId2 = await concept.startCapture(sourceId, captureType2);

    assertExists(captureId1, "First capture ID should be returned");
    assertExists(captureId2, "Second capture ID should be returned");
    assertNotEquals(captureId1, captureId2, "Capture IDs for the same source should be unique");

    const captures = await concept.getCapturesBySource(sourceId);
    assertEquals(captures.length, 2, "Should find two captures for the same sourceId");
    assert(captures.some(c => c._id.toHexString() === captureId1 && c.type === captureType1), "First capture should be present");
    assert(captures.some(c => c._id.toHexString() === captureId2 && c.type === captureType2), "Second capture should be present");
  } finally {
    await client.close();
  }
});

// --- stopCapture Tests ---

Deno.test("stopCapture: Success - stops an active capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  const capturedTextContent = "The quick brown fox jumps over the lazy dog.";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, capturedTextContent);

    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should still exist after stopping");
    assertEquals(capture.status, "completed", "Capture status should be 'completed'");
    assertEquals(capture.capturedText, capturedTextContent, "capturedText should be correctly set");
    assert(capture.updatedAt.getTime() > capture.createdAt.getTime(), "updatedAt should be updated after stopping");
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - rejects if capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentCaptureId: ID = createRandomObjectIdAsId();
  const someText = "Non-existent capture text.";
  try {
    await assertRejects(
      () => concept.stopCapture(nonExistentCaptureId, someText),
      Error,
      `Capture with ID ${nonExistentCaptureId} not found`,
      "Should reject if the capture ID does not exist"
    );
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - rejects if capture already completed", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "audio";
  const firstText = "Initial audio captured.";
  const secondTextAttempt = "Attempting to re-stop.";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, firstText); // First stop - successful

    await assertRejects(
      () => concept.stopCapture(captureId, secondTextAttempt),
      Error,
      `Capture with ID ${captureId} is already completed`,
      "Should reject if capture status is already 'completed'"
    );

    // Verify that the captured text remains the first text and doesn't get overwritten
    const capture = await concept.getCapture(captureId);
    assertEquals(capture?.capturedText, firstText, "Captured text should not change on a failed second stop attempt");
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - rejects if invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const invalidCaptureId: ID = "not-a-valid-objectid-string" as ID;
  const someText = "Text content.";
  try {
    await assertRejects(
      () => concept.stopCapture(invalidCaptureId, someText),
      Error,
      `Invalid ObjectId format for ID: ${invalidCaptureId}`,
      "Should reject for a captureId with an invalid ObjectId format"
    );
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Success - allows empty string as capturedText", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "image";
  const emptyText = "";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, emptyText);

    const capture = await concept.getCapture(captureId);
    assertExists(capture, "Capture should still exist");
    assertEquals(capture.status, "completed", "Status should be 'completed'");
    assertEquals(capture.capturedText, emptyText, "capturedText should be an empty string");
  } finally {
    await client.close();
  }
});

// --- getCapture Tests ---

Deno.test("getCapture: Success - retrieves an existing capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  const capturedTextContent = "Existing content.";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, capturedTextContent);

    const capture = await concept.getCapture(captureId);
    assertExists(capture, "getCapture should return the existing capture");
    assertEquals(capture._id.toHexString() as ID, captureId, "Retrieved capture ID should match");
    assertEquals(capture.sourceId, sourceId, "Retrieved source ID should match");
    assertEquals(capture.type, captureType, "Retrieved type should match");
    assertEquals(capture.status, "completed", "Retrieved status should be 'completed'");
    assertEquals(capture.capturedText, capturedTextContent, "Retrieved captured text should match");
  } finally {
    await client.close();
  }
});

Deno.test("getCapture: Returns undefined if capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentCaptureId: ID = createRandomObjectIdAsId();
  try {
    const capture = await concept.getCapture(nonExistentCaptureId);
    assertEquals(capture, undefined, "getCapture should return undefined for a non-existent ID");
  } finally {
    await client.close();
  }
});

Deno.test("getCapture: Error - rejects if invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const invalidCaptureId: ID = "invalid-id-string" as ID;
  try {
    await assertRejects(
      () => concept.getCapture(invalidCaptureId),
      Error,
      `Invalid ObjectId format for ID: ${invalidCaptureId}`,
      "Should reject for an invalid ObjectId format"
    );
  } finally {
    await client.close();
  }
});

// --- getCapturesBySource Tests ---

Deno.test("getCapturesBySource: Success - retrieves multiple captures for a source", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const otherSourceId: ID = createRandomId(); // For negative testing
  const captureType1: CaptureType = "text";
  const captureType2: CaptureType = "image";
  try {
    const captureId1 = await concept.startCapture(sourceId, captureType1);
    await concept.stopCapture(captureId1, "First capture text");
    const captureId2 = await concept.startCapture(sourceId, captureType2);
    await concept.stopCapture(captureId2, "Second capture image description");
    // Create a capture for a different source
    await concept.startCapture(otherSourceId, "audio");

    const captures = await concept.getCapturesBySource(sourceId);
    assertEquals(captures.length, 2, "Should return exactly two captures for the specified source");

    const returnedIds = captures.map(c => c._id.toHexString() as ID);
    assert(returnedIds.includes(captureId1), "Returned captures should include the first capture ID");
    assert(returnedIds.includes(captureId2), "Returned captures should include the second capture ID");

    // Verify properties of retrieved captures
    const foundCapture1 = captures.find(c => c._id.toHexString() === captureId1);
    assertExists(foundCapture1);
    assertEquals(foundCapture1.sourceId, sourceId);
    assertEquals(foundCapture1.type, captureType1);
  } finally {
    await client.close();
  }
});

Deno.test("getCapturesBySource: Success - returns an empty array when no captures for source", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentSourceId: ID = createRandomId();
  try {
    const captures = await concept.getCapturesBySource(nonExistentSourceId);
    assertEquals(captures.length, 0, "Should return an empty array for a source with no captures");
  } finally {
    await client.close();
  }
});

Deno.test("getCapturesBySource: Success - filters by sourceId correctly, not returning captures from other sources", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId1: ID = createRandomId();
  const sourceId2: ID = createRandomId();
  try {
    const captureId1_1 = await concept.startCapture(sourceId1, "text");
    await concept.stopCapture(captureId1_1, "Text for source 1, capture 1");
    const captureId2_1 = await concept.startCapture(sourceId2, "audio");
    await concept.stopCapture(captureId2_1, "Audio for source 2, capture 1");

    const capturesForSource1 = await concept.getCapturesBySource(sourceId1);
    assertEquals(capturesForSource1.length, 1, "Should return exactly one capture for sourceId1");
    assertEquals(capturesForSource1[0]._id.toHexString() as ID, captureId1_1, "The capture for sourceId1 should be correct");
    assertEquals(capturesForSource1[0].sourceId, sourceId1);

    const capturesForSource2 = await concept.getCapturesBySource(sourceId2);
    assertEquals(capturesForSource2.length, 1, "Should return exactly one capture for sourceId2");
    assertEquals(capturesForSource2[0]._id.toHexString() as ID, captureId2_1, "The capture for sourceId2 should be correct");
    assertEquals(capturesForSource2[0].sourceId, sourceId2);

    // Ensure captures from source2 are not in source1's results and vice-versa
    assert(!capturesForSource1.some(c => c._id.toHexString() === captureId2_1), "Source1 results should not contain capture from Source2");
    assert(!capturesForSource2.some(c => c._id.toHexString() === captureId1_1), "Source2 results should not contain capture from Source1");
  } finally {
    await client.close();
  }
});

// --- deleteCapture Tests ---

Deno.test("deleteCapture: Success - deletes an existing capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const sourceId: ID = createRandomId();
  const captureType: CaptureType = "text";
  try {
    const captureId = await concept.startCapture(sourceId, captureType);
    await concept.stopCapture(captureId, "Text to be deleted.");
    assertExists(await concept.getCapture(captureId), "Capture should exist before deletion");

    await concept.deleteCapture(captureId);

    const capture = await concept.getCapture(captureId);
    assertEquals(capture, undefined, "Capture should be undefined after successful deletion");
  } finally {
    await client.close();
  }
});

Deno.test("deleteCapture: Error - rejects if capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentCaptureId: ID = createRandomObjectIdAsId();
  try {
    await assertRejects(
      () => concept.deleteCapture(nonExistentCaptureId),
      Error,
      `Capture with ID ${nonExistentCaptureId} not found`,
      "Should reject if the capture ID does not exist for deletion"
    );
  } finally {
    await client.close();
  }
});

Deno.test("deleteCapture: Error - rejects if invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const invalidCaptureId: ID = "invalid-objectid-format-here" as ID;
  try {
    await assertRejects(
      () => concept.deleteCapture(invalidCaptureId),
      Error,
      `Invalid ObjectId format for ID: ${invalidCaptureId}`,
      "Should reject for an invalid ObjectId format during deletion"
    );
  } finally {
    await client.close();
  }
});
```
