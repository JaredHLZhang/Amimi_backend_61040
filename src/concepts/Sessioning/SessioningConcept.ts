import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { v4 as uuidv4 } from "npm:uuid";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

/**
 * concept: Sessioning [User, Session]
 *
 * purpose: Manage user authentication, sessions, and authorization
 *
 * principle: Users register with email/password, can login to get session tokens,
 * and their sessions can be validated to check authentication status
 */
const PREFIX = "Sessioning" + ".";

// Type definitions
type User = ID;
type Session = ID;
type Email = string;
type Password = string;
type Name = string;

/**
 * Represents a registered user account
 */
interface UserDocument {
  _id: User;
  email: Email;
  passwordHash: string; // bcrypt hashed password
  name: Name;
  createdAt: Date;
}

/**
 * Represents an active user session
 */
interface SessionDocument {
  _id: Session;
  userId: User;
  createdAt: Date;
  expiresAt: Date; // Sessions expire after 30 days
}

export default class SessioningConcept {
  private users: Collection<UserDocument>;
  private sessions: Collection<SessionDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * register (email: Email, password: Password, name: Name): (user: User, session: Session) | (error: String)
   *
   * **requires**:
   *   - Email is valid format and not already registered
   *   - Password is not empty
   *   - Name is not empty
   *
   * **effects**: Creates a new user account with hashed password, creates a session, and returns both
   */
  async register({
    email,
    password,
    name,
  }: {
    email: Email;
    password: Password;
    name: Name;
  }): Promise<
    | { user: User; session: Session }
    | { error: string }
  > {
    // Validate inputs
    if (!email || !email.trim()) {
      return { error: "Email is required" };
    }

    if (!email.includes("@")) {
      return { error: "Invalid email format" };
    }

    if (!password || password.length < 6) {
      return { error: "Password must be at least 6 characters" };
    }

    if (!name || !name.trim()) {
      return { error: "Name is required" };
    }

    // Check if email already exists
    const existingUser = await this.users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return { error: "Email already registered" };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const userId = freshID() as User;
    const userDoc: UserDocument = {
      _id: userId,
      email: email.toLowerCase(),
      passwordHash,
      name: name.trim(),
      createdAt: new Date(),
    };

    try {
      await this.users.insertOne(userDoc);

      // Create session
      const session = await this.createSession(userId);

      return { user: userId, session };
    } catch (e: any) {
      if (e.code === 11000) {
        // Duplicate key (shouldn't happen due to our check, but handle anyway)
        return { error: "Email already registered" };
      }
      return { error: `Registration failed: ${e.message}` };
    }
  }

  /**
   * login (email: Email, password: Password): (user: User, session: Session) | (error: String)
   *
   * **requires**:
   *   - Email and password match an existing user
   *
   * **effects**: Validates credentials and returns new session if valid
   */
  async login({
    email,
    password,
  }: {
    email: Email;
    password: Password;
  }): Promise<
    | { user: User; session: Session }
    | { error: string }
  > {
    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    // Find user by email
    const user = await this.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { error: "Invalid email or password" };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return { error: "Invalid email or password" };
    }

    // Create new session
    const session = await this.createSession(user._id);

    return { user: user._id, session };
  }

  /**
   * logout (session: Session): () | (error: String)
   *
   * **requires**:
   *   - Session exists and is valid
   *
   * **effects**: Deletes the session, effectively logging out the user
   */
  async logout({ session }: { session: Session }): Promise<Empty | { error: string }> {
    const result = await this.sessions.deleteOne({ _id: session });
    if (result.deletedCount === 0) {
      return { error: "Session not found or already expired" };
    }
    return {};
  }

  /**
   * _getUserBySession (session: Session): (user: User)
   *
   * Query that returns the user associated with a session if valid.
   * Returns empty array if session invalid or expired.
   */
  async _getUserBySession({ session }: { session: Session }): Promise<{ user: User }[]> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    
    if (!sessionDoc) {
      return [];
    }

    // Check if session expired
    if (sessionDoc.expiresAt < new Date()) {
      // Clean up expired session
      await this.sessions.deleteOne({ _id: session });
      return [];
    }

    return [{ user: sessionDoc.userId }];
  }

  /**
   * getUser (session: Session): (user: User) | (error: String)
   *
   * **requires**:
   *   - Session exists and is not expired
   *
   * **effects**: Returns the user associated with this session if valid
   */
  async getUser({ session }: { session: Session }): Promise<{ user: User } | { error: string }> {
    const result = await this._getUserBySession({ session });
    if (result.length === 0) {
      return { error: "Invalid or expired session" };
    }
    return result[0];
  }

  /**
   * getUserInfo (session: Session): (user: User, name: Name) | (error: String)
   *
   * **requires**:
   *   - Session exists and is not expired
   *
   * **effects**: Returns the user and name associated with this session if valid
   */
  async getUserInfo({ session }: { session: Session }): Promise<{ user: User; name: Name } | { error: string }> {
    const result = await this._getUserBySession({ session });
    if (result.length === 0) {
      return { error: "Invalid or expired session" };
    }
    const userDoc = await this.users.findOne({ _id: result[0].user });
    if (!userDoc) {
      return { error: "User not found" };
    }
    return { user: result[0].user, name: userDoc.name };
  }

  /**
   * validateSession (session: Session): (valid: Boolean, user?: User)
   *
   * **effects**: Checks if a session is valid without throwing error
   */
  async validateSession({
    session,
  }: {
    session: Session;
  }): Promise<{ valid: boolean; user?: User }> {
    const result = await this._getUserBySession({ session });
    if (result.length === 0) {
      return { valid: false };
    }
    return { valid: true, user: result[0].user };
  }

  /**
   * Helper method to create a session for a user
   */
  private async createSession(userId: User): Promise<Session> {
    const sessionToken = uuidv4() as Session;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const sessionDoc: SessionDocument = {
      _id: sessionToken,
      userId,
      createdAt: now,
      expiresAt,
    };

    await this.sessions.insertOne(sessionDoc);
    return sessionToken;
  }

  /**
   * Clean up expired sessions (can be called periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessions.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}

