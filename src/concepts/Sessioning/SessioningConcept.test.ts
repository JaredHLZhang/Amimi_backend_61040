import { testDb } from "@utils/database.ts";
import { assertEquals, assertExists } from "jsr:@std/assert";
import SessioningConcept from "./SessioningConcept.ts";

// ===== OPERATIONAL PRINCIPLE TEST =====

Deno.test("Principle: Users can register, login, and logout", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    console.log("\n=== Operational Principle Test ===");
    
    // 1. Register a new user
    console.log("Step 1: Registering new user");
    const registerResult = await sessioning.register({
      email: "alice@example.com",
      password: "password123",
      name: "Alice",
    });
    assertExists((registerResult as { user: any }).user);
    const { user: userId, session: sessionToken } = registerResult as { user: any; session: any };
    console.log(`  -> User registered: ${userId}`);
    console.log(`  -> Session created: ${sessionToken}`);

    // 2. Validate session
    console.log("Step 2: Validating session");
    const validateResult = await sessioning.validateSession({ session: sessionToken });
    assertEquals(validateResult.valid, true);
    assertExists(validateResult.user);
    console.log("  -> Session is valid");

    // 3. Get user from session
    console.log("Step 3: Getting user from session");
    const getUserResult = await sessioning.getUser({ session: sessionToken });
    assertExists((getUserResult as { user: any }).user);
    assertEquals((getUserResult as { user: any }).user, userId);
    console.log("  -> User retrieved successfully");

    // 4. Login with same credentials
    console.log("Step 4: Logging in with credentials");
    const loginResult = await sessioning.login({
      email: "alice@example.com",
      password: "password123",
    });
    assertExists((loginResult as { user: any }).user);
    const { session: newSessionToken } = loginResult as { user: any; session: any };
    assertExists(newSessionToken);
    console.log("  -> Login successful, new session created");

    // 5. Logout
    console.log("Step 5: Logging out");
    const logoutResult = await sessioning.logout({ session: newSessionToken });
    assertEquals(logoutResult, {});
    console.log("  -> Logout successful");

    // 6. Verify session is invalid after logout
    console.log("Step 6: Verifying session is invalid after logout");
    const validateAfterLogout = await sessioning.validateSession({ session: newSessionToken });
    assertEquals(validateAfterLogout.valid, false);
    console.log("  -> Session correctly invalidated");
  } finally {
    await client.close();
  }
});

// ===== REGISTRATION TESTS =====

Deno.test("Action: register - success case", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const result = await sessioning.register({
      email: "bob@example.com",
      password: "securepass",
      name: "Bob",
    });
    assertExists((result as { user: any }).user);
    assertExists((result as { user: any; session: any }).session);
  } finally {
    await client.close();
  }
});

Deno.test("Action: register - duplicate email", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    await sessioning.register({
      email: "duplicate@example.com",
      password: "password123",
      name: "First",
    });

    const result = await sessioning.register({
      email: "duplicate@example.com",
      password: "password456",
      name: "Second",
    });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error, "Email already registered");
  } finally {
    await client.close();
  }
});

Deno.test("Action: register - invalid email", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const result = await sessioning.register({
      email: "notanemail",
      password: "password123",
      name: "Test",
    });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error, "Invalid email format");
  } finally {
    await client.close();
  }
});

Deno.test("Action: register - short password", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const result = await sessioning.register({
      email: "short@example.com",
      password: "123",
      name: "Test",
    });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error, "Password must be at least 6 characters");
  } finally {
    await client.close();
  }
});

Deno.test("Action: register - empty name", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const result = await sessioning.register({
      email: "noname@example.com",
      password: "password123",
      name: "",
    });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error, "Name is required");
  } finally {
    await client.close();
  }
});

// ===== LOGIN TESTS =====

Deno.test("Action: login - success case", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    // Register first
    const registerResult = await sessioning.register({
      email: "login@example.com",
      password: "testpass",
      name: "Login Test",
    });

    // Now login
    const loginResult = await sessioning.login({
      email: "login@example.com",
      password: "testpass",
    });
    assertExists((loginResult as { user: any }).user);
    assertExists((loginResult as { user: any; session: any }).session);
  } finally {
    await client.close();
  }
});

Deno.test("Action: login - wrong password", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    await sessioning.register({
      email: "wrongpass@example.com",
      password: "correctpass",
      name: "Test",
    });

    const result = await sessioning.login({
      email: "wrongpass@example.com",
      password: "wrongpass",
    });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error, "Invalid email or password");
  } finally {
    await client.close();
  }
});

Deno.test("Action: login - non-existent user", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const result = await sessioning.login({
      email: "nonexistent@example.com",
      password: "anypass",
    });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error, "Invalid email or password");
  } finally {
    await client.close();
  }
});

// ===== SESSION TESTS =====

Deno.test("Action: getUser - success case", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const registerResult = await sessioning.register({
      email: "getuser@example.com",
      password: "password123",
      name: "Get User",
    });
    const { session } = registerResult as { user: any; session: any };

    const result = await sessioning.getUser({ session });
    assertExists((result as { user: any }).user);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getUser - invalid session", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const result = await sessioning.getUser({ session: "invalid-session" as any });
    assertExists((result as { error: string }).error);
    assertEquals((result as { error: string }).error, "Invalid session");
  } finally {
    await client.close();
  }
});

Deno.test("Action: validateSession - valid session", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const registerResult = await sessioning.register({
      email: "valid@example.com",
      password: "password123",
      name: "Valid",
    });
    const { session } = registerResult as { user: any; session: any };

    const result = await sessioning.validateSession({ session });
    assertEquals(result.valid, true);
    assertExists(result.user);
  } finally {
    await client.close();
  }
});

Deno.test("Action: validateSession - invalid session", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const result = await sessioning.validateSession({ session: "invalid" as any });
    assertEquals(result.valid, false);
  } finally {
    await client.close();
  }
});

// ===== LOGOUT TESTS =====

Deno.test("Action: logout - success case", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const registerResult = await sessioning.register({
      email: "logout@example.com",
      password: "password123",
      name: "Logout",
    });
    const { session } = registerResult as { user: any; session: any };

    const result = await sessioning.logout({ session });
    assertEquals(result, {});
  } finally {
    await client.close();
  }
});

Deno.test("Action: logout - invalid session", async () => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  try {
    const result = await sessioning.logout({ session: "invalid" as any });
    assertExists((result as { error: string }).error);
  } finally {
    await client.close();
  }
});

