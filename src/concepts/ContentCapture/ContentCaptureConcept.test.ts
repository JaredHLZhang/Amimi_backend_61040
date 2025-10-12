// src/concepts/ContentCapture/ContentCaptureConcept.test.ts

import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { ObjectId } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ContentCaptureConcept from "./ContentCaptureConcept.ts";

// Test user IDs
const OWNER_1: ID = "owner-1" as ID;
const OWNER_2: ID = "owner-2" as ID;
const SOURCE_1: ID = "source-call-123" as ID;
const SOURCE_2: ID = "source-call-456" as ID;

// --- 1. Operational Principle Test ---
Deno.test("Operational Principle Test: Full lifecycle (start → stop → retrieve)", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const capturedText = "This is some captured audio text.";

  try {
    // 1. Start capture with valid parameters
    const startResult = await concept.startCapture({ sourceId: SOURCE_1, type: "audio", owner: OWNER_1 });
    assert(startResult.status === "success");
    if (startResult.status === "success") {
      assertExists(startResult.capture);
      const captureId = startResult.capture._id.toHexString();

      // 2. Verify capture is in "capturing" status
      const getResult1 = await concept.getCapture({ captureId });
      assert(getResult1.status === "success");
      if (getResult1.status === "success") {
        assertEquals(getResult1.capture.status, "capturing");
        assertEquals(getResult1.capture.captureType, "audio");
        assertEquals(getResult1.capture.sourceId, SOURCE_1);
        assertEquals(getResult1.capture.owner, OWNER_1);
        assertEquals(getResult1.capture.capturedText, undefined);
      }

      // 3. Stop capture with text
      const stopResult = await concept.stopCapture({ captureId, capturedText });
      assert(stopResult.status === "success");
      if (stopResult.status === "success") {
        assertEquals(stopResult.capture.status, "completed");
        assertEquals(stopResult.capture.capturedText, capturedText);
      }

      // 4. Retrieve and verify the capture
      const getResult2 = await concept.getCapture({ captureId });
      assert(getResult2.status === "success");
      if (getResult2.status === "success") {
        assertEquals(getResult2.capture.status, "completed");
        assertEquals(getResult2.capture.capturedText, capturedText);
      }
    }
  } finally {
    await client.close();
  }
});

// --- startCapture Tests ---

Deno.test("startCapture: Success - Create capture with valid audio type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const result = await concept.startCapture({ sourceId: SOURCE_1, type: "audio", owner: OWNER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertExists(result.capture);
      assertEquals(result.capture.captureType, "audio");
      assertEquals(result.capture.status, "capturing");
      assertEquals(result.capture.sourceId, SOURCE_1);
      assertEquals(result.capture.owner, OWNER_1);
    }
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - Create capture with valid image type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const result = await concept.startCapture({ sourceId: SOURCE_1, type: "image", owner: OWNER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.capture.captureType, "image");
    }
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - Create capture with valid text type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const result = await concept.startCapture({ sourceId: SOURCE_1, type: "text", owner: OWNER_1 });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.capture.captureType, "text");
    }
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Error - Invalid capture type", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const result = await concept.startCapture({ sourceId: SOURCE_1, type: "video" as any, owner: OWNER_1 });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid capture type"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("startCapture: Success - Multiple captures for same source", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const result1 = await concept.startCapture({ sourceId: SOURCE_1, type: "audio", owner: OWNER_1 });
    const result2 = await concept.startCapture({ sourceId: SOURCE_1, type: "image", owner: OWNER_1 });

    assert(result1.status === "success");
    assert(result2.status === "success");

    if (result1.status === "success" && result2.status === "success") {
      const id1 = result1.capture._id.toHexString();
      const id2 = result2.capture._id.toHexString();
      assert(id1 !== id2, "Capture IDs should be different");

      // Verify both exist via getCapturesBySource
      const sourceCapturesResult = await concept.getCapturesBySource({ sourceId: SOURCE_1 });
      assert(sourceCapturesResult.status === "success");
      if (sourceCapturesResult.status === "success") {
        assertEquals(sourceCapturesResult.captures.length, 2);
      }
    }
  } finally {
    await client.close();
  }
});

// --- stopCapture Tests ---

Deno.test("stopCapture: Success - Stop active capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const capturedText = "Sample captured content";

  try {
    const startResult = await concept.startCapture({ sourceId: SOURCE_1, type: "text", owner: OWNER_1 });
    assert(startResult.status === "success");

    if (startResult.status === "success") {
      const captureId = startResult.capture._id.toHexString();
      const stopResult = await concept.stopCapture({ captureId, capturedText });

      assert(stopResult.status === "success");
      if (stopResult.status === "success") {
        assertEquals(stopResult.capture.status, "completed");
        assertEquals(stopResult.capture.capturedText, capturedText);
      }
    }
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - Capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.stopCapture({ captureId: nonExistentId, capturedText: "text" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - Capture already completed", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const startResult = await concept.startCapture({ sourceId: SOURCE_1, type: "audio", owner: OWNER_1 });
    assert(startResult.status === "success");

    if (startResult.status === "success") {
      const captureId = startResult.capture._id.toHexString();
      
      // First stop - should succeed
      await concept.stopCapture({ captureId, capturedText: "first text" });

      // Second stop - should fail
      const secondStopResult = await concept.stopCapture({ captureId, capturedText: "second text" });
      assert(secondStopResult.status === "error");
      if (secondStopResult.status === "error") {
        assert(secondStopResult.error.includes("not in 'capturing' status"));
      }
    }
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Error - Invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const result = await concept.stopCapture({ captureId: "invalid-id", capturedText: "text" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("stopCapture: Success - Empty string as capturedText", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const startResult = await concept.startCapture({ sourceId: SOURCE_1, type: "image", owner: OWNER_1 });
    assert(startResult.status === "success");

    if (startResult.status === "success") {
      const captureId = startResult.capture._id.toHexString();
      const stopResult = await concept.stopCapture({ captureId, capturedText: "" });

      assert(stopResult.status === "success");
      if (stopResult.status === "success") {
        assertEquals(stopResult.capture.capturedText, "");
      }
    }
  } finally {
    await client.close();
  }
});

// --- getCapture Tests ---

Deno.test("getCapture: Success - Get existing capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const startResult = await concept.startCapture({ sourceId: SOURCE_1, type: "audio", owner: OWNER_1 });
    assert(startResult.status === "success");

    if (startResult.status === "success") {
      const captureId = startResult.capture._id.toHexString();
      const getResult = await concept.getCapture({ captureId });

      assert(getResult.status === "success");
      if (getResult.status === "success") {
        assertEquals(getResult.capture._id.toHexString(), captureId);
        assertEquals(getResult.capture.sourceId, SOURCE_1);
      }
    }
  } finally {
    await client.close();
  }
});

Deno.test("getCapture: Error - Capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.getCapture({ captureId: nonExistentId });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("getCapture: Error - Invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const result = await concept.getCapture({ captureId: "not-valid" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

// --- getCapturesBySource Tests ---

Deno.test("getCapturesBySource: Success - Get multiple captures for source", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    await concept.startCapture({ sourceId: SOURCE_1, type: "audio", owner: OWNER_1 });
    await concept.startCapture({ sourceId: SOURCE_1, type: "image", owner: OWNER_1 });
    await concept.startCapture({ sourceId: SOURCE_2, type: "text", owner: OWNER_2 });

    const result = await concept.getCapturesBySource({ sourceId: SOURCE_1 });

    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.captures.length, 2);
      assert(result.captures.every(c => c.sourceId === SOURCE_1));
    }
  } finally {
    await client.close();
  }
});

Deno.test("getCapturesBySource: Success - Empty array when no captures", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentSource: ID = "source-999" as ID;

  try {
    const result = await concept.getCapturesBySource({ sourceId: nonExistentSource });
    
    assert(result.status === "success");
    if (result.status === "success") {
      assertEquals(result.captures.length, 0);
    }
  } finally {
    await client.close();
  }
});

Deno.test("getCapturesBySource: Success - Filter by sourceId correctly", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    await concept.startCapture({ sourceId: SOURCE_1, type: "audio", owner: OWNER_1 });
    await concept.startCapture({ sourceId: SOURCE_2, type: "image", owner: OWNER_2 });

    const result1 = await concept.getCapturesBySource({ sourceId: SOURCE_1 });
    const result2 = await concept.getCapturesBySource({ sourceId: SOURCE_2 });

    assert(result1.status === "success" && result2.status === "success");
    if (result1.status === "success" && result2.status === "success") {
      assertEquals(result1.captures.length, 1);
      assertEquals(result2.captures.length, 1);
      assertEquals(result1.captures[0].sourceId, SOURCE_1);
      assertEquals(result2.captures[0].sourceId, SOURCE_2);
    }
  } finally {
    await client.close();
  }
});

// --- deleteCapture Tests ---

Deno.test("deleteCapture: Success - Delete existing capture", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const startResult = await concept.startCapture({ sourceId: SOURCE_1, type: "text", owner: OWNER_1 });
    assert(startResult.status === "success");

    if (startResult.status === "success") {
      const captureId = startResult.capture._id.toHexString();
      
      const deleteResult = await concept.deleteCapture({ captureId });
      assert(deleteResult.status === "success");

      // Verify it's deleted
      const getResult = await concept.getCapture({ captureId });
      assert(getResult.status === "error");
    }
  } finally {
    await client.close();
  }
});

Deno.test("deleteCapture: Error - Capture not found", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);
  const nonExistentId = new ObjectId().toHexString();

  try {
    const result = await concept.deleteCapture({ captureId: nonExistentId });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("not found"));
    }
  } finally {
    await client.close();
  }
});

Deno.test("deleteCapture: Error - Invalid captureId format", async () => {
  const [db, client] = await testDb();
  const concept = new ContentCaptureConcept(db);

  try {
    const result = await concept.deleteCapture({ captureId: "invalid-format" });
    
    assert(result.status === "error");
    if (result.status === "error") {
      assert(result.error.includes("Invalid"));
    }
  } finally {
    await client.close();
  }
});

