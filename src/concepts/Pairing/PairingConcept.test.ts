import { testDb } from "@utils/database.ts";
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import PairingConcept from "./PairingConcept.ts";
import { ID } from "@utils/types.ts";

const user1: ID = "user-alice" as ID;
const user2: ID = "user-bob" as ID;
const user3: ID = "user-charlie" as ID;
const user4: ID = "user-diana" as ID;

// ===== OPERATIONAL PRINCIPLE TEST =====

Deno.test("Principle: Users can successfully pair and unpair", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    console.log("\n=== Operational Principle Test ===");
    
    // 1. User1 generates a pairing code
    console.log("Step 1: User1 (Alice) generates a pairing code");
    const generateResult = await pairing.generateCode({ user: user1 });
    assertExists((generateResult as { code: ID }).code);
    const code1 = (generateResult as { code: ID }).code;
    console.log(`  -> Code generated: ${code1}`);

    // Verify User1 is not yet paired
    assertEquals(await pairing.isPaired({ user: user1 }), false);
    assertEquals(await pairing.isPaired({ user: user2 }), false);

    // 2. User2 accepts the code
    console.log("Step 2: User2 (Bob) accepts the pairing code");
    const acceptResult = await pairing.acceptPairing({ user: user2, code: code1 });
    assertExists((acceptResult as { pair: ID }).pair);
    const pairId = (acceptResult as { pair: ID }).pair;
    console.log(`  -> Pair created with ID: ${pairId}`);

    // 3. Verify both users are now paired
    console.log("Step 3: Verifying both users are paired");
    assertEquals(await pairing.isPaired({ user: user1 }), true);
    assertEquals(await pairing.isPaired({ user: user2 }), true);

    const user1Pair = await pairing.getPair({ user: user1 });
    assertEquals((user1Pair as { pair: ID }).pair, pairId);
    
    const user2Pair = await pairing.getPair({ user: user2 });
    assertEquals((user2Pair as { pair: ID }).pair, pairId);
    console.log("  -> Both users correctly paired");

    // 4. User1 dissolves the pair
    console.log("Step 4: User1 dissolves the pair");
    const dissolveResult = await pairing.dissolvePair({ pair: pairId });
    assertEquals(dissolveResult, {});
    console.log("  -> Pair dissolved successfully");

    // 5. Verify both users are no longer paired
    console.log("Step 5: Verifying users are no longer paired");
    assertEquals(await pairing.isPaired({ user: user1 }), false);
    assertEquals(await pairing.isPaired({ user: user2 }), false);

    const getPairAfterDissolve = await pairing.getPair({ user: user1 });
    assertExists((getPairAfterDissolve as { error: string }).error);
    console.log("  -> Users successfully unpaired");
  } finally {
    await client.close();
  }
});

// ===== GENERATE CODE TESTS =====

Deno.test("Action: generateCode - success case", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    const result = await pairing.generateCode({ user: user1 });
    assertExists((result as { code: ID }).code);
    assertEquals(typeof (result as { code: ID }).code, "string");
    
    const isPaired = await pairing.isPaired({ user: user1 });
    assertEquals(isPaired, false);
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateCode - user cannot generate multiple codes", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    const result1 = await pairing.generateCode({ user: user1 });
    assertExists((result1 as { code: ID }).code);

    const result2 = await pairing.generateCode({ user: user1 });
    assertExists((result2 as { error: string }).error);
    assertEquals((result2 as { error: string }).error.includes("has already generated a pending pairing code"), true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateCode - already paired user cannot generate code", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // Setup: Pair user1 and user2
    const code = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;
    await pairing.acceptPairing({ user: user2, code: code });
    assertEquals(await pairing.isPaired({ user: user1 }), true);

    // Attempt to generate new code
    const result = await pairing.generateCode({ user: user1 });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error.includes("is already in an active pair"), true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateCode - returns unique codes for different users", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    const result1 = await pairing.generateCode({ user: user1 });
    const code1 = (result1 as { code: ID }).code;

    const result2 = await pairing.generateCode({ user: user2 });
    const code2 = (result2 as { code: ID }).code;

    assertNotEquals(code1, code2);
  } finally {
    await client.close();
  }
});

// ===== ACCEPT PAIRING TESTS =====

Deno.test("Action: acceptPairing - successfully accepts valid code", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    const generatorResult = await pairing.generateCode({ user: user1 });
    const code = (generatorResult as { code: ID }).code;

    const acceptResult = await pairing.acceptPairing({ user: user2, code: code });
    assertExists((acceptResult as { pair: ID }).pair);

    assertEquals(await pairing.isPaired({ user: user1 }), true);
    assertEquals(await pairing.isPaired({ user: user2 }), true);
    
    // Verify pending code is removed
    const pendingCode = await db.collection("Pairing.pendingCodes").findOne({ _id: code });
    assertEquals(pendingCode, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: acceptPairing - user cannot accept own code", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    const generateResult = await pairing.generateCode({ user: user1 });
    const code = (generateResult as { code: ID }).code;

    const acceptResult = await pairing.acceptPairing({ user: user1, code: code });
    assertExists((acceptResult as { error: string }).error);
    assertEquals((acceptResult as { error: string }).error.includes("cannot accept a pairing code they generated"), true);

    assertEquals(await pairing.isPaired({ user: user1 }), false);
  } finally {
    await client.close();
  }
});

Deno.test("Action: acceptPairing - cannot accept invalid or used code", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // Case 1: Invalid code
    const invalidCode: ID = "non-existent-code" as ID;
    const resultInvalid = await pairing.acceptPairing({ user: user2, code: invalidCode });
    assertExists((resultInvalid as { error: string }).error);
    assertEquals((resultInvalid as { error: string }).error.includes("is invalid or has already been used"), true);

    // Case 2: Already used code
    const generateResult = await pairing.generateCode({ user: user1 });
    const code = (generateResult as { code: ID }).code;
    await pairing.acceptPairing({ user: user2, code: code });

    const resultUsed = await pairing.acceptPairing({ user: user3, code: code });
    assertExists((resultUsed as { error: string }).error);
    assertEquals((resultUsed as { error: string }).error.includes("is invalid or has already been used"), true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: acceptPairing - already paired acceptor cannot accept new code", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // Setup: Pair user1 and user2
    const code1 = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;
    await pairing.acceptPairing({ user: user2, code: code1 });
    assertEquals(await pairing.isPaired({ user: user2 }), true);

    // User3 generates another code
    const code2 = (await pairing.generateCode({ user: user3 }) as { code: ID }).code;

    // User2 tries to accept code2
    const result = await pairing.acceptPairing({ user: user2, code: code2 });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error.includes("is already in an active pair"), true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: acceptPairing - cannot accept if generator is already paired", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // User1 generates code1
    const code1 = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;

    // User1 gets paired with User3 using code2
    const code2 = (await pairing.generateCode({ user: user3 }) as { code: ID }).code;
    await pairing.acceptPairing({ user: user1, code: code2 });
    assertEquals(await pairing.isPaired({ user: user1 }), true);

    // User2 tries to accept code1
    const result = await pairing.acceptPairing({ user: user2, code: code1 });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error.includes("is already in an active pair"), true);
  } finally {
    await client.close();
  }
});

// ===== DISSOLVE PAIR TESTS =====

Deno.test("Action: dissolvePair - successfully dissolves active pair", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // Setup: Create active pair
    const code = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;
    const pairId = (await pairing.acceptPairing({ user: user2, code: code }) as { pair: ID }).pair;
    assertEquals(await pairing.isPaired({ user: user1 }), true);

    // Dissolve the pair
    const dissolveResult = await pairing.dissolvePair({ pair: pairId });
    assertEquals(dissolveResult, {});

    // Verify users are no longer paired
    assertEquals(await pairing.isPaired({ user: user1 }), false);
    assertEquals(await pairing.isPaired({ user: user2 }), false);

    // Verify pair document exists but is inactive
    const dissolvedPair = await db.collection("Pairing.pairs").findOne({ _id: pairId });
    assertExists(dissolvedPair);
    assertEquals(dissolvedPair?.active, false);
  } finally {
    await client.close();
  }
});

Deno.test("Action: dissolvePair - cannot dissolve non-existent pair", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    const nonExistentPairId: ID = "fake-pair-id" as ID;
    const result = await pairing.dissolvePair({ pair: nonExistentPairId });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error.includes("does not exist or is not active"), true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: dissolvePair - cannot dissolve already dissolved pair", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // Setup: Create and dissolve a pair
    const code = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;
    const pairId = (await pairing.acceptPairing({ user: user2, code: code }) as { pair: ID }).pair;
    await pairing.dissolvePair({ pair: pairId });

    // Attempt to dissolve again
    const result = await pairing.dissolvePair({ pair: pairId });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error.includes("does not exist or is not active"), true);
  } finally {
    await client.close();
  }
});

// ===== GET PAIR / IS PAIRED TESTS =====

Deno.test("Query: getPair - returns correct pair for active user", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // Setup: Create active pair
    const code = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;
    const pairId = (await pairing.acceptPairing({ user: user2, code: code }) as { pair: ID }).pair;

    // Query for both users
    const user1Pair = await pairing.getPair({ user: user1 });
    assertExists((user1Pair as { pair: ID }).pair);
    assertEquals((user1Pair as { pair: ID }).pair, pairId);

    const user2Pair = await pairing.getPair({ user: user2 });
    assertExists((user2Pair as { pair: ID }).pair);
    assertEquals((user2Pair as { pair: ID }).pair, pairId);
  } finally {
    await client.close();
  }
});

Deno.test("Query: getPair - returns error for unpaired user", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    const result = await pairing.getPair({ user: user1 });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error.includes("is not currently in an active pair"), true);
  } finally {
    await client.close();
  }
});

Deno.test("Query: isPaired - returns true for paired users", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // Setup: Create active pair
    const code = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;
    await pairing.acceptPairing({ user: user2, code: code });

    assertEquals(await pairing.isPaired({ user: user1 }), true);
    assertEquals(await pairing.isPaired({ user: user2 }), true);
  } finally {
    await client.close();
  }
});

Deno.test("Query: isPaired - returns false for unpaired users", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    assertEquals(await pairing.isPaired({ user: user1 }), false);

    // User who generated code but not yet paired
    await pairing.generateCode({ user: user3 });
    assertEquals(await pairing.isPaired({ user: user3 }), false);
  } finally {
    await client.close();
  }
});

Deno.test("Query: isPaired - returns false after dissolution", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // Setup: Create and dissolve pair
    const code = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;
    const pairId = (await pairing.acceptPairing({ user: user2, code: code }) as { pair: ID }).pair;
    await pairing.dissolvePair({ pair: pairId });

    assertEquals(await pairing.isPaired({ user: user1 }), false);
    assertEquals(await pairing.isPaired({ user: user2 }), false);
  } finally {
    await client.close();
  }
});

// ===== EDGE CASES & RACE CONDITIONS =====

Deno.test("Edge Case: concurrent acceptance of same code", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // User1 generates a code
    const generatorResult = await pairing.generateCode({ user: user1 });
    const code = (generatorResult as { code: ID }).code;

    // User2 and User3 try to accept same code concurrently
    const acceptPromises = [
      pairing.acceptPairing({ user: user2, code: code }),
      pairing.acceptPairing({ user: user3, code: code }),
    ];

    const results = await Promise.all(acceptPromises);

    // Exactly one should succeed
    let successCount = 0;
    let errorCount = 0;
    let successfulAcceptor: ID | undefined;

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const acceptor = (i === 0) ? user2 : user3;
      if ((res as { pair: ID }).pair) {
        successCount++;
        successfulAcceptor = acceptor;
      } else if ((res as { error: string }).error) {
        errorCount++;
      }
    }

    assertEquals(successCount, 1, "Exactly one acceptance should succeed");
    assertEquals(errorCount, 1, "Exactly one acceptance should fail");
    assertExists(successfulAcceptor);

    // Verify only successful acceptor is paired
    assertEquals(await pairing.isPaired({ user: user1 }), true);
    assertEquals(await pairing.isPaired({ user: successfulAcceptor as ID }), true);
    
    const unsuccessfulAcceptor = (successfulAcceptor === user2) ? user3 : user2;
    assertEquals(await pairing.isPaired({ user: unsuccessfulAcceptor as ID }), false);
  } finally {
    await client.close();
  }
});

Deno.test("Edge Case: generator gets paired while trying to accept another code", async () => {
  const [db, client] = await testDb();
  const pairing = new PairingConcept(db);

  try {
    // User1 generates codeA
    const codeA = (await pairing.generateCode({ user: user1 }) as { code: ID }).code;
    
    // User3 generates codeB
    const codeB = (await pairing.generateCode({ user: user3 }) as { code: ID }).code;

    // Concurrent: User2 accepts codeA, User1 accepts codeB
    const [user2AcceptResult, user1AcceptResult] = await Promise.all([
      pairing.acceptPairing({ user: user2, code: codeA }),
      pairing.acceptPairing({ user: user1, code: codeB }),
    ]);

    // User2 accepting codeA should succeed
    assertExists((user2AcceptResult as { pair: ID }).pair);
    assertEquals(await pairing.isPaired({ user: user1 }), true);
    assertEquals(await pairing.isPaired({ user: user2 }), true);

    // User1 accepting codeB should fail
    assertExists((user1AcceptResult as { error: string }).error);
    assertEquals((user1AcceptResult as { error: string }).error.includes("is already in an active pair"), true);

    // User3 should not be paired
    assertEquals(await pairing.isPaired({ user: user3 }), false);
  } finally {
    await client.close();
  }
});
