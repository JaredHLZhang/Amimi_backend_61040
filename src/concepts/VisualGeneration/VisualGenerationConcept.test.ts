// src/concepts/VisualGeneration/VisualGenerationConcept.test.ts

import { assert, assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { ObjectId } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import VisualGenerationConcept from "./VisualGenerationConcept.ts";

// Test user IDs
const OWNER_1: ID = "owner-1" as ID;
const OWNER_2: ID = "owner-2" as ID;

// --- 1. Operational Principle Test ---
Deno.test("Operational Principle Test: Full lifecycle (generate → get → regenerate → delete)", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const prompt = "A cat playing a violin";
  const style = "comic";

  try {
    // 1. Generate visual
    const generateResult = await concept.generateVisual({ text: prompt, style, owner: OWNER_1 });
    assert(generateResult.status === "success");
    if (generateResult.status !== "success") return; // Guard for TypeScript
    
    assertExists(generateResult.visual.visualId);
    assertExists(generateResult.visual.visualUrl);
    assertEquals(generateResult.visual.promptText, prompt);
    assertEquals(generateResult.visual.style, style);
    
    const visualId = generateResult.visual.visualId;
    const initialUrl = generateResult.visual.visualUrl;

    // 2. Verify visual exists with correct data
    const getResult1 = await concept.getVisual({ visualId });
    assert(getResult1.status === "success");
    if (getResult1.status === "success") {
      assertEquals(getResult1.visual.visualId, visualId);
      assertEquals(getResult1.visual.promptText, prompt);
      assertEquals(getResult1.visual.style, style);
    }

    // 3. Regenerate visual (should get new URL)
    const regenerateResult = await concept.regenerateVisual({ visualId });
    assert(regenerateResult.status === "success");
    if (regenerateResult.status === "success") {
      assertNotEquals(regenerateResult.visual.visualUrl, initialUrl, "URL should change after regeneration");
      assertEquals(regenerateResult.visual.promptText, prompt, "Prompt should remain the same");
      assertEquals(regenerateResult.visual.style, style, "Style should remain the same");
    }

    // 4. Delete visual
    const deleteResult = await concept.deleteVisual({ visualId });
    assert(deleteResult.status === "success");

    // 5. Verify visual no longer exists
    const getResult2 = await concept.getVisual({ visualId });
    assert(getResult2.status === "error");
  } finally {
    await client.close();
  }
});

// --- generateVisual Tests ---

Deno.test("generateVisual: Success - Create visual with 'comic' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.generateVisual({ text: "A superhero", style: "comic", owner: OWNER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.visual.style, "comic");
      assertEquals(result.visual.promptText, "A superhero");
      assertExists(result.visual.visualUrl);
    }
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - Create visual with 'photo' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.generateVisual({ text: "A portrait", style: "photo", owner: OWNER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.visual.style, "photo");
    }
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - Create visual with 'abstract' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.generateVisual({ text: "Geometric shapes", style: "abstract", owner: OWNER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.visual.style, "abstract");
    }
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - Create visual with 'sketch' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.generateVisual({ text: "A park bench", style: "sketch", owner: OWNER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.visual.style, "sketch");
    }
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - Create visual with 'watercolor' style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.generateVisual({ text: "A landscape", style: "watercolor", owner: OWNER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.visual.style, "watercolor");
    }
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Error - Invalid style", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.generateVisual({ text: "A painting", style: "oil-painting" as any, owner: OWNER_1 });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid visual style"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Error - Empty text prompt", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.generateVisual({ text: "", style: "photo", owner: OWNER_1 });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("cannot be empty"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("generateVisual: Success - Multiple visuals for same owner", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result1 = await concept.generateVisual({ text: "First visual", style: "comic", owner: OWNER_1 });
    const result2 = await concept.generateVisual({ text: "Second visual", style: "photo", owner: OWNER_1 });

    assert(result1.status === "success");
    assert(result2.status === "success");

    if (result1.status === "success" && result2.status === "success") {
      assertNotEquals(result1.visual.visualId, result2.visual.visualId);

      // Verify both exist via getUserVisuals
      const userVisualsResult = await concept.getUserVisuals({ userId: OWNER_1 });
      assert(userVisualsResult.status === "success");
      if (userVisualsResult.status === "success") {
        assertEquals(userVisualsResult.visuals.length, 2);
      }
    }
  } finally {
    await client.close();
  }
});

// --- getVisual Tests ---

Deno.test("getVisual: Success - Get existing visual", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const generateResult = await concept.generateVisual({ text: "Test visual", style: "photo", owner: OWNER_1 });
    assert(generateResult.status === "success");

    if (generateResult.status === "success") {
      const visualId = generateResult.visual.visualId;
      const getResult = await concept.getVisual({ visualId });

      assert(getResult.status === "success");
      if (getResult.status === "success") {
        assertEquals(getResult.visual.visualId, visualId);
        assertEquals(getResult.visual.promptText, "Test visual");
      }
    }
  } finally {
    await client.close();
  }
});

Deno.test("getVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.getVisual({ visualId: nonExistentId });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("getVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.getVisual({ visualId: "invalid-id" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

// --- regenerateVisual Tests ---

Deno.test("regenerateVisual: Success - Verify URL changes", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const generateResult = await concept.generateVisual({ text: "A dragon", style: "sketch", owner: OWNER_1 });
    assert(generateResult.status === "success");

    if (generateResult.status === "success") {
      const visualId = generateResult.visual.visualId;
      const initialUrl = generateResult.visual.visualUrl;

      const regenerateResult = await concept.regenerateVisual({ visualId });
      assert(regenerateResult.status === "success");

      if (regenerateResult.status === "success") {
        assertNotEquals(regenerateResult.visual.visualUrl, initialUrl);
        assertEquals(regenerateResult.visual.promptText, "A dragon");
        assertEquals(regenerateResult.visual.style, "sketch");
      }
    }
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.regenerateVisual({ visualId: nonExistentId });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.regenerateVisual({ visualId: "invalid-id" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("regenerateVisual: Success - Prompt and style remain unchanged", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const generateResult = await concept.generateVisual({ text: "Original prompt", style: "watercolor", owner: OWNER_1 });
    assert(generateResult.status === "success");

    if (generateResult.status === "success") {
      const visualId = generateResult.visual.visualId;

      const regenerateResult = await concept.regenerateVisual({ visualId });
      assert(regenerateResult.status === "success");

      if (regenerateResult.status === "success") {
        assertEquals(regenerateResult.visual.promptText, "Original prompt");
        assertEquals(regenerateResult.visual.style, "watercolor");
      }
    }
  } finally {
    await client.close();
  }
});

// --- deleteVisual Tests ---

Deno.test("deleteVisual: Success - Delete existing visual", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const generateResult = await concept.generateVisual({ text: "To be deleted", style: "comic", owner: OWNER_1 });
    assert(generateResult.status === "success");

    if (generateResult.status === "success") {
      const visualId = generateResult.visual.visualId;
      
      const deleteResult = await concept.deleteVisual({ visualId });
      assert(deleteResult.status === "success");

      // Verify it's deleted
      const getResult = await concept.getVisual({ visualId });
      assert(getResult.status === "error");
    }
  } finally {
    await client.close();
  }
});

Deno.test("deleteVisual: Error - Visual not found", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.deleteVisual({ visualId: nonExistentId });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("deleteVisual: Error - Invalid visualId format", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    const result = await concept.deleteVisual({ visualId: "invalid-format" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

// --- getUserVisuals Tests ---

Deno.test("getUserVisuals: Success - Get multiple visuals for user", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    await concept.generateVisual({ text: "Visual 1", style: "comic", owner: OWNER_1 });
    await concept.generateVisual({ text: "Visual 2", style: "photo", owner: OWNER_1 });
    await concept.generateVisual({ text: "Visual 3", style: "abstract", owner: OWNER_2 });

    const result = await concept.getUserVisuals({ userId: OWNER_1 });

    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.visuals.length, 2);
      assert(result.visuals.every(v => v.owner === OWNER_1));
    }
  } finally {
    await client.close();
  }
});

Deno.test("getUserVisuals: Success - Empty array when no visuals", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);
  const nonExistentUser: ID = "user-999" as ID;

  try {
    const result = await concept.getUserVisuals({ userId: nonExistentUser });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.visuals.length, 0);
    }
  } finally {
    await client.close();
  }
});

Deno.test("getUserVisuals: Success - Filter by userId correctly", async () => {
  const [db, client] = await testDb();
  const concept = new VisualGenerationConcept(db);

  try {
    await concept.generateVisual({ text: "User 1 Visual", style: "comic", owner: OWNER_1 });
    await concept.generateVisual({ text: "User 2 Visual", style: "photo", owner: OWNER_2 });

    const result1 = await concept.getUserVisuals({ userId: OWNER_1 });
    const result2 = await concept.getUserVisuals({ userId: OWNER_2 });

    assert(result1.status === "success" && result2.status === "success");
    if (result1.status === "success" && result2.status === "success") {
      assertEquals(result1.visuals.length, 1);
      assertEquals(result2.visuals.length, 1);
      assertEquals(result1.visuals[0].owner, OWNER_1);
      assertEquals(result2.visuals[0].owner, OWNER_2);
    }
  } finally {
    await client.close();
  }
});

