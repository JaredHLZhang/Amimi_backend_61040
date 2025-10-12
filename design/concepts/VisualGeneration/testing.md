# VisualGeneration Concept Testing

## Background Context

Please review the following documents to understand the concept testing principles:

* [[design/background/testing-concepts]]

## Concept Specification

* [[design/concepts/VisualGeneration/VisualGeneration]]

## Implementation

* [[src/concepts/VisualGeneration/VisualGenerationConcept]]

## Reference Test File

For testing patterns, please review this example:
* [[src/concepts/LikertSurvey/LikertSurveyConcept.test]]

## Task

Please create comprehensive tests for the `VisualGeneration` concept in `src/concepts/VisualGeneration/VisualGenerationConcept.test.ts`

### Testing Requirements

1. **Test Structure**: 
   - Use separate `Deno.test()` calls for each test scenario (NOT nested `t.step()`)
   - Each test should get its own database instance using `testDb()`
   - Always close the database client in a `finally` block to prevent connection leaks
   
2. **Test Coverage**:
   - **1 operational principle test**: Test the full lifecycle (generate → get → regenerate → delete)
   - **At least 15 action tests** covering:
     - Success cases for all 5 actions
     - Error cases (invalid inputs, not found, invalid styles)
     - Edge cases (invalid ObjectId format, empty text, multiple visuals per user)
   - **Query tests** for getUserVisuals

3. **Important Testing Patterns**:
   - Use branded `ID` type: `const owner: ID = "user-123" as ID;`
   - Create separate test database for each test using `testDb()`
   - Close connections: `await client.close()` in `finally` blocks
   - Use `ObjectId.toHexString()` to get string representation for visualId
   - Test both success paths (`status === "success"`) and error paths (`status === "error"`)

4. **Specific Test Scenarios to Include**:
   
   **Operational Principle Test:**
   - Generate visual with valid text and style
   - Verify visual exists with correct data
   - Regenerate visual (should get new URL)
   - Verify URL changed
   - Delete visual
   - Verify visual no longer exists

   **generateVisual Tests:**
   - ✅ Success: Generate with each valid style (comic, photo, abstract, sketch, watercolor)
   - ❌ Error: Invalid style (e.g., "oil-painting")
   - ❌ Error: Empty text prompt
   - ✅ Multiple visuals for same owner

   **getVisual Tests:**
   - ✅ Success: Get existing visual
   - ❌ Error: Visual not found
   - ❌ Error: Invalid visualId format

   **regenerateVisual Tests:**
   - ✅ Success: Regenerate existing visual (verify URL changes)
   - ❌ Error: Visual not found
   - ❌ Error: Invalid visualId format
   - ✅ Verify prompt and style remain unchanged

   **deleteVisual Tests:**
   - ✅ Success: Delete existing visual
   - ❌ Error: Visual not found
   - ❌ Error: Invalid visualId format

   **getUserVisuals Tests:**
   - ✅ Success: Get all visuals for user (multiple)
   - ✅ Success: Return empty array when no visuals
   - ✅ Success: Filter by userId correctly

5. **Code Quality**:
   - Use descriptive test names
   - Include assertions with meaningful messages
   - Test both the happy path and error conditions
   - Verify exact error messages where appropriate

6. **Critical Pattern from LikertSurvey Example**:
   ```typescript
   Deno.test("Test name here", async () => {
     const [db, client] = await testDb();
     const concept = new VisualGenerationConcept(db);
     try {
       // ... test code ...
     } finally {
       await client.close();
     }
   });
   ```

Please provide a complete, comprehensive test suite that thoroughly validates the VisualGeneration concept.


# response:

```typescript
// src/concepts/VisualGeneration/VisualGenerationConcept.test.ts

import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
  assertArrayIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

import { testDb } from "../../../test/testDb.ts";
import { ID } from "../../data/id.ts";
import { VisualGenerationConcept } from "./VisualGenerationConcept.ts";
import {
  VisualGenerationConceptError,
  VisualStyle,
} from "./VisualGenerationConcept.types.ts";

Deno.test("Operational Principle: Full lifecycle of a visual", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-lifecycle-test" as ID;
  const prompt = "A cat playing a violin";
  const style: VisualStyle = "comic";

  let visualId: string;
  let initialUrl: string;
  let newUrl: string;

  try {
    // 1. Generate visual
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success", "Expected generate to succeed");
    assertExists(generateResult.data.visualId, "Expected visualId to be returned");
    assertExists(generateResult.data.imageUrl, "Expected imageUrl to be returned");
    assertObjectMatch(generateResult.data, {
      ownerId: owner,
      prompt,
      style,
    });

    visualId = generateResult.data.visualId;
    initialUrl = generateResult.data.imageUrl;

    // 2. Verify visual exists with correct data (using getVisual)
    const getResult1 = await concept.getVisual(visualId);
    assertEquals(getResult1.status, "success", "Expected get visual to succeed after generation");
    assertObjectMatch(getResult1.data, {
      visualId,
      ownerId: owner,
      prompt,
      style,
      imageUrl: initialUrl,
    });
    assertEquals(getResult1.data.createdAt instanceof Date, true, "createdAt should be a Date");

    // 3. Regenerate visual
    const regenerateResult = await concept.regenerateVisual(visualId);
    assertEquals(regenerateResult.status, "success", "Expected regenerate to succeed");
    assertExists(regenerateResult.data.imageUrl, "Expected new imageUrl to be returned");
    assertNotEquals(regenerateResult.data.imageUrl, initialUrl, "Expected imageUrl to change after regeneration");

    newUrl = regenerateResult.data.imageUrl;
    assertObjectMatch(regenerateResult.data, {
      visualId,
      ownerId: owner,
      prompt, // Prompt should remain the same
      style, // Style should remain the same
    });

    // 4. Verify URL changed (using getVisual)
    const getResult2 = await concept.getVisual(visualId);
    assertEquals(getResult2.status, "success", "Expected get visual to succeed after regeneration");
    assertObjectMatch(getResult2.data, {
      visualId,
      ownerId: owner,
      prompt,
      style,
      imageUrl: newUrl,
    });

    // 5. Delete visual
    const deleteResult = await concept.deleteVisual(visualId);
    assertEquals(deleteResult.status, "success", "Expected delete to succeed");

    // 6. Verify visual no longer exists (using getVisual)
    const getResult3 = await concept.getVisual(visualId);
    assertEquals(getResult3.status, "error", "Expected get visual to fail after deletion");
    assertEquals(
      (getResult3 as VisualGenerationConceptError).code,
      "NOT_FOUND",
      "Expected NOT_FOUND error code"
    );
    assertEquals(
      (getResult3 as VisualGenerationConceptError).message,
      `Visual not found with ID: ${visualId}`,
      "Expected 'Visual not found' message"
    );
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'comic' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-comic" as ID;
  const prompt = "A superhero flying over a city";
  const style: VisualStyle = "comic";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
    assertExists(result.data.visualId);
    assertExists(result.data.imageUrl);
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'photo' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-photo" as ID;
  const prompt = "A hyper-realistic portrait of an old man";
  const style: VisualStyle = "photo";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'abstract' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-abstract" as ID;
  const prompt = "A chaotic arrangement of geometric shapes";
  const style: VisualStyle = "abstract";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'sketch' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-sketch" as ID;
  const prompt = "A quick sketch of a park bench";
  const style: VisualStyle = "sketch";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'watercolor' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-watercolor" as ID;
  const prompt = "A serene landscape with soft watercolor tones";
  const style: VisualStyle = "watercolor";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Error - Invalid style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-invalid-style" as ID;
  const prompt = "A beautiful painting";
  const invalidStyle = "oil-painting" as VisualStyle; // Cast to bypass type check for test
  try {
    const result = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style: invalidStyle,
    });
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Invalid style"), `Expected "Invalid style" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Error - Empty text prompt", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-empty-prompt" as ID;
  const prompt = "";
  const style: VisualStyle = "photo";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Prompt cannot be empty"), `Expected "Prompt cannot be empty" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - Multiple visuals for same owner", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-multiple" as ID;
  try {
    const result1 = await concept.generateVisual({
      ownerId: owner,
      prompt: "First visual",
      style: "comic",
    });
    assertEquals(result1.status, "success");

    const result2 = await concept.generateVisual({
      ownerId: owner,
      prompt: "Second visual",
      style: "abstract",
    });
    assertEquals(result2.status, "success");

    assertNotEquals(result1.data.visualId, result2.data.visualId);

    const getUserVisualsResult = await concept.getUserVisuals(owner);
    assertEquals(getUserVisualsResult.status, "success");
    assertEquals(getUserVisualsResult.data.length, 2);
  } finally {
    await client.close();
  }
});

Deno.test("getVisual: Success - Get existing visual", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-get-existing" as ID;
  const prompt = "A test visual";
  const style: VisualStyle = "photo";
  let visualId: string;
  try {
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success");
    visualId = generateResult.data.visualId;

    const getResult = await concept.getVisual(visualId);
    assertEquals(getResult.status, "success");
    assertObjectMatch(getResult.data, {
      visualId,
      ownerId: owner,
      prompt,
      style,
      imageUrl: generateResult.data.imageUrl,
    });
  } finally {
    await client.close();
  }
});

Deno.test("getVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();
  try {
    const result = await concept.getVisual(nonExistentId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "NOT_FOUND");
    assertEquals(error.message, `Visual not found with ID: ${nonExistentId}`);
  } finally {
    await client.close();
  }
});

Deno.test("getVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const invalidId = "not-an-objectid";
  try {
    const result = await concept.getVisual(invalidId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Invalid ObjectId format"), `Expected "Invalid ObjectId format" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Success - Regenerate existing visual and verify URL changes", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-regen-url-change" as ID;
  const prompt = "A dragon flying";
  const style: VisualStyle = "sketch";
  let visualId: string;
  let initialUrl: string;

  try {
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success");
    visualId = generateResult.data.visualId;
    initialUrl = generateResult.data.imageUrl;

    const regenerateResult = await concept.regenerateVisual(visualId);
    assertEquals(regenerateResult.status, "success");
    assertExists(regenerateResult.data.imageUrl);
    assertNotEquals(regenerateResult.data.imageUrl, initialUrl, "Expected imageUrl to change");

    const getResult = await concept.getVisual(visualId);
    assertEquals(getResult.status, "success");
    assertEquals(getResult.data.imageUrl, regenerateResult.data.imageUrl, "Stored URL should be the new URL");
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();
  try {
    const result = await concept.regenerateVisual(nonExistentId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "NOT_FOUND");
    assertEquals(error.message, `Visual not found with ID: ${nonExistentId}`);
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const invalidId = "invalid-objectid-string";
  try {
    const result = await concept.regenerateVisual(invalidId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Invalid ObjectId format"), `Expected "Invalid ObjectId format" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Success - Verify prompt and style remain unchanged", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-regen-data-unchanged" as ID;
  const prompt = "A futuristic city skyline";
  const style: VisualStyle = "abstract";
  let visualId: string;

  try {
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success");
    visualId = generateResult.data.visualId;

    const regenerateResult = await concept.regenerateVisual(visualId);
    assertEquals(regenerateResult.status, "success");
    assertObjectMatch(regenerateResult.data, {
      visualId,
      ownerId: owner,
      prompt, // Should be the same
      style, // Should be the same
    });

    const getResult = await concept.getVisual(visualId);
    assertEquals(getResult.status, "success");
    assertObjectMatch(getResult.data, {
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("deleteVisual: Success - Delete existing visual", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-del-success" as ID;
  const prompt = "Item to be deleted";
  const style: VisualStyle = "watercolor";
  let visualId: string;

  try {
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success");
    visualId = generateResult.data.visualId;

    const deleteResult = await concept.deleteVisual(visualId);
    assertEquals(deleteResult.status, "success");

    const getResult = await concept.getVisual(visualId);
    assertEquals(getResult.status, "error");
    assertEquals((getResult as VisualGenerationConceptError).code, "NOT_FOUND");
  } finally {
    await client.close();
  }
});

Deno.test("deleteVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();
  try {
    const result = await concept.deleteVisual(nonExistentId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "NOT_FOUND");
    assertEquals(error.message, `Visual not found with ID: ${nonExistentId}`);
  } finally {
    await client.close();
  }
});

Deno.test("deleteVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const invalidId = "invalid-visual-id";
  try {
    const result = await concept.deleteVisual(invalidId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Invalid ObjectId format"), `Expected "Invalid ObjectId format" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("getUserVisuals: Success - Get all visuals for a user (multiple)", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner1: ID = "user-get-multiple-1" as ID;
  const owner2: ID = "user-get-multiple-2" as ID;

  try {
    await concept.generateVisual({ ownerId: owner1, prompt: "V1", style: "comic" });
    await concept.generateVisual({ ownerId: owner1, prompt: "V2", style: "photo" });
    await concept.generateVisual({ ownerId: owner1, prompt: "V3", style: "sketch" });
    await concept.generateVisual({ ownerId: owner2, prompt: "V4", style: "abstract" }); // Visual for another user

    const result = await concept.getUserVisuals(owner1);
    assertEquals(result.status, "success");
    assertEquals(result.data.length, 3, "Expected 3 visuals for owner1");
    result.data.forEach((visual) => {
      assertEquals(visual.ownerId, owner1, "All returned visuals must belong to owner1");
      assertExists(visual.visualId);
      assertExists(visual.prompt);
      assertExists(visual.style);
      assertExists(visual.imageUrl);
      assertExists(visual.createdAt);
    });
  } finally {
    await client.close();
  }
});

Deno.test("getUserVisuals: Success - Return empty array when no visuals for user", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const ownerWithVisuals: ID = "user-with-visuals" as ID;
  const ownerWithoutVisuals: ID = "user-without-visuals" as ID;

  try {
    await concept.generateVisual({ ownerId: ownerWithVisuals, prompt: "A visual", style: "comic" });

    const result = await concept.getUserVisuals(ownerWithoutVisuals);
    assertEquals(result.status, "success");
    assertEquals(result.data.length, 0, "Expected an empty array for user with no visuals");
  } finally {
    await client.close();
  }
});

Deno.test("getUserVisuals: Success - Filter by userId correctly", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const userA: ID = "user-filter-A" as ID;
  const userB: ID = "user-filter-B" as ID;

  try {
    const visualA1 = await concept.generateVisual({ ownerId: userA, prompt: "User A V1", style: "comic" });
    const visualA2 = await concept.generateVisual({ ownerId: userA, prompt: "User A V2", style: "photo" });
    const visualB1 = await concept.generateVisual({ ownerId: userB, prompt: "User B V1", style: "abstract" });

    const visualsForA = await concept.getUserVisuals(userA);
    assertEquals(visualsForA.status, "success");
    assertEquals(visualsForA.data.length, 2);
    assertArrayIncludes(
      visualsForA.data.map((v) => v.visualId),
      [visualA1.data.visualId, visualA2.data.visualId]
    );
    assert(!visualsForA.data.some((v) => v.visualId === visualB1.data.visualId));

    const visualsForB = await concept.getUserVisuals(userB);
    assertEquals(visualsForB.status, "success");
    assertEquals(visualsForB.data.length, 1);
    assertArrayIncludes(
      visualsForB.data.map((v) => v.visualId),
      [visualB1.data.visualId]
    );
    assert(!visualsForB.data.some((v) => v.visualId === visualA1.data.visualId));
  } finally {
    await client.close();
  }
});
```---
timestamp: 'Sat Oct 11 2025 16:32:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_163243.84686b93.md]]'
content_id: 7e1dae687f9d7986bc4d8d204a36505fee650589af1bb2ae498fbe191f99cc7f
---

# response:

```typescript
// src/concepts/VisualGeneration/VisualGenerationConcept.test.ts

import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
  assertArrayIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

import { testDb } from "../../../test/testDb.ts";
import { ID } from "../../data/id.ts";
import { VisualGenerationConcept } from "./VisualGenerationConcept.ts";
import {
  VisualGenerationConceptError,
  VisualStyle,
} from "./VisualGenerationConcept.types.ts";

Deno.test("Operational Principle: Full lifecycle of a visual", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-lifecycle-test" as ID;
  const prompt = "A cat playing a violin";
  const style: VisualStyle = "comic";

  let visualId: string;
  let initialUrl: string;
  let newUrl: string;

  try {
    // 1. Generate visual
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success", "Expected generate to succeed");
    assertExists(generateResult.data.visualId, "Expected visualId to be returned");
    assertExists(generateResult.data.imageUrl, "Expected imageUrl to be returned");
    assertObjectMatch(generateResult.data, {
      ownerId: owner,
      prompt,
      style,
    });

    visualId = generateResult.data.visualId;
    initialUrl = generateResult.data.imageUrl;

    // 2. Verify visual exists with correct data (using getVisual)
    const getResult1 = await concept.getVisual(visualId);
    assertEquals(getResult1.status, "success", "Expected get visual to succeed after generation");
    assertObjectMatch(getResult1.data, {
      visualId,
      ownerId: owner,
      prompt,
      style,
      imageUrl: initialUrl,
    });
    assertEquals(getResult1.data.createdAt instanceof Date, true, "createdAt should be a Date");

    // 3. Regenerate visual
    const regenerateResult = await concept.regenerateVisual(visualId);
    assertEquals(regenerateResult.status, "success", "Expected regenerate to succeed");
    assertExists(regenerateResult.data.imageUrl, "Expected new imageUrl to be returned");
    assertNotEquals(regenerateResult.data.imageUrl, initialUrl, "Expected imageUrl to change after regeneration");

    newUrl = regenerateResult.data.imageUrl;
    assertObjectMatch(regenerateResult.data, {
      visualId,
      ownerId: owner,
      prompt, // Prompt should remain the same
      style, // Style should remain the same
    });

    // 4. Verify URL changed (using getVisual)
    const getResult2 = await concept.getVisual(visualId);
    assertEquals(getResult2.status, "success", "Expected get visual to succeed after regeneration");
    assertObjectMatch(getResult2.data, {
      visualId,
      ownerId: owner,
      prompt,
      style,
      imageUrl: newUrl,
    });

    // 5. Delete visual
    const deleteResult = await concept.deleteVisual(visualId);
    assertEquals(deleteResult.status, "success", "Expected delete to succeed");

    // 6. Verify visual no longer exists (using getVisual)
    const getResult3 = await concept.getVisual(visualId);
    assertEquals(getResult3.status, "error", "Expected get visual to fail after deletion");
    assertEquals(
      (getResult3 as VisualGenerationConceptError).code,
      "NOT_FOUND",
      "Expected NOT_FOUND error code"
    );
    assertEquals(
      (getResult3 as VisualGenerationConceptError).message,
      `Visual not found with ID: ${visualId}`,
      "Expected 'Visual not found' message"
    );
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'comic' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-comic" as ID;
  const prompt = "A superhero flying over a city";
  const style: VisualStyle = "comic";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
    assertExists(result.data.visualId);
    assertExists(result.data.imageUrl);
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'photo' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-photo" as ID;
  const prompt = "A hyper-realistic portrait of an old man";
  const style: VisualStyle = "photo";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'abstract' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-abstract" as ID;
  const prompt = "A chaotic arrangement of geometric shapes";
  const style: VisualStyle = "abstract";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'sketch' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-sketch" as ID;
  const prompt = "A quick sketch of a park bench";
  const style: VisualStyle = "sketch";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - with 'watercolor' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-watercolor" as ID;
  const prompt = "A serene landscape with soft watercolor tones";
  const style: VisualStyle = "watercolor";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "success");
    assertObjectMatch(result.data, {
      ownerId: owner,
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Error - Invalid style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-invalid-style" as ID;
  const prompt = "A beautiful painting";
  const invalidStyle = "oil-painting" as VisualStyle; // Cast to bypass type check for test
  try {
    const result = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style: invalidStyle,
    });
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Invalid style"), `Expected "Invalid style" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Error - Empty text prompt", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-empty-prompt" as ID;
  const prompt = "";
  const style: VisualStyle = "photo";
  try {
    const result = await concept.generateVisual({ ownerId: owner, prompt, style });
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Prompt cannot be empty"), `Expected "Prompt cannot be empty" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - Multiple visuals for same owner", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-gen-multiple" as ID;
  try {
    const result1 = await concept.generateVisual({
      ownerId: owner,
      prompt: "First visual",
      style: "comic",
    });
    assertEquals(result1.status, "success");

    const result2 = await concept.generateVisual({
      ownerId: owner,
      prompt: "Second visual",
      style: "abstract",
    });
    assertEquals(result2.status, "success");

    assertNotEquals(result1.data.visualId, result2.data.visualId);

    const getUserVisualsResult = await concept.getUserVisuals(owner);
    assertEquals(getUserVisualsResult.status, "success");
    assertEquals(getUserVisualsResult.data.length, 2);
  } finally {
    await client.close();
  }
});

Deno.test("getVisual: Success - Get existing visual", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-get-existing" as ID;
  const prompt = "A test visual";
  const style: VisualStyle = "photo";
  let visualId: string;
  try {
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success");
    visualId = generateResult.data.visualId;

    const getResult = await concept.getVisual(visualId);
    assertEquals(getResult.status, "success");
    assertObjectMatch(getResult.data, {
      visualId,
      ownerId: owner,
      prompt,
      style,
      imageUrl: generateResult.data.imageUrl,
    });
  } finally {
    await client.close();
  }
});

Deno.test("getVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();
  try {
    const result = await concept.getVisual(nonExistentId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "NOT_FOUND");
    assertEquals(error.message, `Visual not found with ID: ${nonExistentId}`);
  } finally {
    await client.close();
  }
});

Deno.test("getVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const invalidId = "not-an-objectid";
  try {
    const result = await concept.getVisual(invalidId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Invalid ObjectId format"), `Expected "Invalid ObjectId format" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Success - Regenerate existing visual and verify URL changes", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-regen-url-change" as ID;
  const prompt = "A dragon flying";
  const style: VisualStyle = "sketch";
  let visualId: string;
  let initialUrl: string;

  try {
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success");
    visualId = generateResult.data.visualId;
    initialUrl = generateResult.data.imageUrl;

    const regenerateResult = await concept.regenerateVisual(visualId);
    assertEquals(regenerateResult.status, "success");
    assertExists(regenerateResult.data.imageUrl);
    assertNotEquals(regenerateResult.data.imageUrl, initialUrl, "Expected imageUrl to change");

    const getResult = await concept.getVisual(visualId);
    assertEquals(getResult.status, "success");
    assertEquals(getResult.data.imageUrl, regenerateResult.data.imageUrl, "Stored URL should be the new URL");
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();
  try {
    const result = await concept.regenerateVisual(nonExistentId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "NOT_FOUND");
    assertEquals(error.message, `Visual not found with ID: ${nonExistentId}`);
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const invalidId = "invalid-objectid-string";
  try {
    const result = await concept.regenerateVisual(invalidId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Invalid ObjectId format"), `Expected "Invalid ObjectId format" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Success - Verify prompt and style remain unchanged", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-regen-data-unchanged" as ID;
  const prompt = "A futuristic city skyline";
  const style: VisualStyle = "abstract";
  let visualId: string;

  try {
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success");
    visualId = generateResult.data.visualId;

    const regenerateResult = await concept.regenerateVisual(visualId);
    assertEquals(regenerateResult.status, "success");
    assertObjectMatch(regenerateResult.data, {
      visualId,
      ownerId: owner,
      prompt, // Should be the same
      style, // Should be the same
    });

    const getResult = await concept.getVisual(visualId);
    assertEquals(getResult.status, "success");
    assertObjectMatch(getResult.data, {
      prompt,
      style,
    });
  } finally {
    await client.close();
  }
});

Deno.test("deleteVisual: Success - Delete existing visual", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner: ID = "user-del-success" as ID;
  const prompt = "Item to be deleted";
  const style: VisualStyle = "watercolor";
  let visualId: string;

  try {
    const generateResult = await concept.generateVisual({
      ownerId: owner,
      prompt,
      style,
    });
    assertEquals(generateResult.status, "success");
    visualId = generateResult.data.visualId;

    const deleteResult = await concept.deleteVisual(visualId);
    assertEquals(deleteResult.status, "success");

    const getResult = await concept.getVisual(visualId);
    assertEquals(getResult.status, "error");
    assertEquals((getResult as VisualGenerationConceptError).code, "NOT_FOUND");
  } finally {
    await client.close();
  }
});

Deno.test("deleteVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();
  try {
    const result = await concept.deleteVisual(nonExistentId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "NOT_FOUND");
    assertEquals(error.message, `Visual not found with ID: ${nonExistentId}`);
  } finally {
    await client.close();
  }
});

Deno.test("deleteVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const invalidId = "invalid-visual-id";
  try {
    const result = await concept.deleteVisual(invalidId);
    assertEquals(result.status, "error");
    const error = result as VisualGenerationConceptError;
    assertEquals(error.code, "INVALID_INPUT");
    assert(error.message.includes("Invalid ObjectId format"), `Expected "Invalid ObjectId format" in message, got "${error.message}"`);
  } finally {
    await client.close();
  }
});

Deno.test("getUserVisuals: Success - Get all visuals for a user (multiple)", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const owner1: ID = "user-get-multiple-1" as ID;
  const owner2: ID = "user-get-multiple-2" as ID;

  try {
    await concept.generateVisual({ ownerId: owner1, prompt: "V1", style: "comic" });
    await concept.generateVisual({ ownerId: owner1, prompt: "V2", style: "photo" });
    await concept.generateVisual({ ownerId: owner1, prompt: "V3", style: "sketch" });
    await concept.generateVisual({ ownerId: owner2, prompt: "V4", style: "abstract" }); // Visual for another user

    const result = await concept.getUserVisuals(owner1);
    assertEquals(result.status, "success");
    assertEquals(result.data.length, 3, "Expected 3 visuals for owner1");
    result.data.forEach((visual) => {
      assertEquals(visual.ownerId, owner1, "All returned visuals must belong to owner1");
      assertExists(visual.visualId);
      assertExists(visual.prompt);
      assertExists(visual.style);
      assertExists(visual.imageUrl);
      assertExists(visual.createdAt);
    });
  } finally {
    await client.close();
  }
});

Deno.test("getUserVisuals: Success - Return empty array when no visuals for user", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const ownerWithVisuals: ID = "user-with-visuals" as ID;
  const ownerWithoutVisuals: ID = "user-without-visuals" as ID;

  try {
    await concept.generateVisual({ ownerId: ownerWithVisuals, prompt: "A visual", style: "comic" });

    const result = await concept.getUserVisuals(ownerWithoutVisuals);
    assertEquals(result.status, "success");
    assertEquals(result.data.length, 0, "Expected an empty array for user with no visuals");
  } finally {
    await client.close();
  }
});

Deno.test("getUserVisuals: Success - Filter by userId correctly", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const userA: ID = "user-filter-A" as ID;
  const userB: ID = "user-filter-B" as ID;

  try {
    const visualA1 = await concept.generateVisual({ ownerId: userA, prompt: "User A V1", style: "comic" });
    const visualA2 = await concept.generateVisual({ ownerId: userA, prompt: "User A V2", style: "photo" });
    const visualB1 = await concept.generateVisual({ ownerId: userB, prompt: "User B V1", style: "abstract" });

    const visualsForA = await concept.getUserVisuals(userA);
    assertEquals(visualsForA.status, "success");
    assertEquals(visualsForA.data.length, 2);
    assertArrayIncludes(
      visualsForA.data.map((v) => v.visualId),
      [visualA1.data.visualId, visualA2.data.visualId]
    );
    assert(!visualsForA.data.some((v) => v.visualId === visualB1.data.visualId));

    const visualsForB = await concept.getUserVisuals(userB);
    assertEquals(visualsForB.status, "success");
    assertEquals(visualsForB.data.length, 1);
    assertArrayIncludes(
      visualsForB.data.map((v) => v.visualId),
      [visualB1.data.visualId]
    );
    assert(!visualsForB.data.some((v) => v.visualId === visualA1.data.visualId));
  } finally {
    await client.close();
  }
});
```
