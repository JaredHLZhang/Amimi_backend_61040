# CommunicationInteraction Concept Implementation

## Background Context

Please review the following documents to understand the concept design principles and implementation approach:

* [[design/background/concept-design-brief]]
* [[design/background/concept-design-overview]]
* [[design/background/implementing-concepts]]

## Concept Specification

* [[design/concepts/CommunicationInteraction/CommunicationInteraction]]

## Reference Implementation

For implementation patterns, please review this example:
* [[src/concepts/LikertSurvey/LikertSurveyConcept]]

## Task

Please implement the `CommunicationInteraction` concept in TypeScript following these guidelines:

1. **File Structure**: Create the implementation in `src/concepts/CommunicationInteraction/CommunicationInteractionConcept.ts`

2. **Implementation Requirements**:
   - Use MongoDB collections for persistent storage
   - Follow the state model defined in the specification
   - Implement all actions as specified
   - Use proper TypeScript types (use the `ID` type from `utils/types.ts` for user identifiers)
   - Return `Result` types for actions that can fail (success/error pattern)
   - Throw errors only for programming mistakes, not user errors
   - DO NOT create indexes in the constructor (this causes async issues)
   - Indexes should be managed separately or enforced through application logic

3. **MongoDB Schema**:
   - Store interactions with participants as an array of user IDs
   - Include `active` boolean flag
   - Store `startTime` and `endTime` as Date objects
   - Consider adding an `_id` field for interaction identification

4. **Action Implementation**:
   - `startInteraction`: Create new interaction document, validate participants exist
   - `endInteraction`: Update interaction to set active=false and endTime
   - `getActiveInteraction`: Query for active interaction containing the user
   - `getInteractionDuration`: Calculate duration from startTime and endTime
   - `getInteractionHistory`: Query all interactions (active or not) containing the user

5. **Error Handling**:
   - Return error results for user errors (e.g., interaction not found, not active, user not in interaction)
   - Use descriptive error messages
   - Follow the Result type pattern: `{ status: "success", value: ... }` or `{ status: "error", msg: "..." }`

6. **Important Notes**:
   - The `participants` state should be stored as an array in MongoDB (not a Set)
   - Convert to/from Set as needed in the application logic
   - User IDs should be of type `ID` (branded string type from utils/types)
   - Duration should be calculated in minutes
   - Consider edge cases: empty participants, duplicate participants, concurrent interactions

Please provide a complete, production-ready implementation.


# response:

The `CommunicationInteraction` concept is implemented below in TypeScript, adhering to the specified guidelines. This implementation uses MongoDB for persistence, follows the defined state model and actions, and incorporates robust error handling with the `Result` type pattern.

### `src/concepts/CommunicationInteraction/CommunicationInteractionConcept.ts`

```typescript
// src/concepts/CommunicationInteraction/CommunicationInteractionConcept.ts

import { Collection, Db, ObjectId } from 'mongodb';

// --- Type Definitions (would typically be in utils/types.ts or similar) ---

/**
 * Branded string type for user identifiers.
 * This helps distinguish plain strings from actual user IDs at compile time,
 * improving type safety.
 * Example usage: const userId: ID = "user-abc-123" as ID;
 */
export type ID = string & { __brand: 'ID' };

/**
 * Type for the unique identifier of a CommunicationInteraction document in MongoDB.
 * This typically maps to MongoDB's ObjectId.
 */
export type InteractionID = ObjectId;

/**
 * A generic Result type for operations that can either succeed or fail.
 * Success contains a value of type `T`, while error contains a message of type `E`.
 */
export type Result<T, E = string> =
    | { status: "success"; value: T }
    | { status: "error"; msg: E };

/**
 * Represents the state of a CommunicationInteraction as stored in MongoDB.
 * This interface defines the schema for the collection documents.
 */
export interface CommunicationInteractionState {
    _id: InteractionID;       // Unique identifier for the interaction document
    participants: ID[];       // Array of user IDs involved in this interaction
    active: boolean;          // True if the interaction is currently ongoing, false otherwise
    startTime: Date;          // Timestamp when the interaction began
    endTime: Date | null;     // Timestamp when the interaction ended (null if active)
}

// --- CommunicationInteractionConcept Implementation ---

/**
 * The `CommunicationInteractionConcept` class provides a set of methods
 * to manage the lifecycle and retrieval of communication interactions
 * between users, leveraging MongoDB for persistent storage.
 */
export class CommunicationInteractionConcept {
    private collection: Collection<CommunicationInteractionState>;
    private readonly collectionName = 'communicationInteractions'; // MongoDB collection name

    /**
     * Initializes the CommunicationInteractionConcept with a MongoDB database instance.
     * The constructor sets up the collection reference.
     *
     * @param db The MongoDB `Db` instance to use for operations.
     * @throws {Error} If the `db` instance is not provided.
     */
    constructor(db: Db) {
        if (!db) {
            throw new Error("MongoDB Db instance must be provided to CommunicationInteractionConcept.");
        }
        this.collection = db.collection<CommunicationInteractionState>(this.collectionName);
        // IMPORTANT: As per guidelines, indexes are NOT created in the constructor.
        // Index management should be handled externally (e.g., via a separate migration script,
        // application startup script, or an infrastructure-as-code tool).
        // Example indexes that might be needed:
        // - { participants: 1, active: 1 } for `startInteraction` and `getActiveInteraction`
        // - { _id: 1 } (default primary key index)
        // - { participants: 1 } for `getInteractionHistory`
    }

    /**
     * Initiates a new communication interaction among a list of participants.
     * This action will fail if any of the specified participants are already
     * involved in another active interaction.
     *
     * @param participants An array of `ID`s representing the users involved in the new interaction.
     * @returns A `Result` object: on success, contains the newly created `CommunicationInteractionState`;
     *          on error, contains a descriptive error message.
     */
    public async startInteraction(
        participants: ID[]
    ): Promise<Result<CommunicationInteractionState, string>> {
        if (!participants || participants.length === 0) {
            return { status: "error", msg: "Participants list cannot be empty for starting an interaction." };
        }

        // Normalize participants to ensure uniqueness, as per "convert to/from Set as needed" guideline.
        const uniqueParticipants = Array.from(new Set(participants));
        if (uniqueParticipants.length !== participants.length) {
            console.warn(`[CommunicationInteractionConcept] Duplicate participants removed for starting interaction. Original: ${participants.length}, Unique: ${uniqueParticipants.length}`);
        }

        // Check for concurrent active interactions: ensure no participant is currently active in another interaction.
        const concurrentActiveInteraction = await this.collection.findOne({
            participants: { $in: uniqueParticipants }, // Check if any proposed participant is in an active interaction
            active: true,
        });

        if (concurrentActiveInteraction) {
            return {
                status: "error",
                msg: `One or more participants (${uniqueParticipants.join(', ')}) are already in an active interaction (ID: ${concurrentActiveInteraction._id.toHexString()}). A user can only be in one active interaction at a time.`,
            };
        }

        const now = new Date();
        const newInteractionData: Omit<CommunicationInteractionState, '_id'> = {
            participants: uniqueParticipants,
            active: true,
            startTime: now,
            endTime: null, // Interaction is active, so endTime is null
        };

        try {
            const result = await this.collection.insertOne(newInteractionData);
            if (!result.acknowledged || !result.insertedId) {
                return { status: "error", msg: "Failed to create new interaction in the database." };
            }
            // Cast insertedId to InteractionID as it's a valid ObjectId
            const createdInteraction: CommunicationInteractionState = {
                ...newInteractionData,
                _id: result.insertedId as InteractionID,
            };
            return { status: "success", value: createdInteraction };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error starting interaction:", error);
            // Return specific error message, avoid throwing for anticipated user-level failures.
            return { status: "error", msg: `An unexpected database error occurred while starting interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Concludes an active communication interaction identified by its ID.
     * Only a participant of the interaction is authorized to end it.
     *
     * @param interactionId The `InteractionID` of the interaction to be ended.
     * @param userId The `ID` of the user requesting to end the interaction. This user must be a participant.
     * @returns A `Result` object: on success, contains the updated (inactive) `CommunicationInteractionState`;
     *          on error, contains a descriptive error message.
     */
    public async endInteraction(
        interactionId: InteractionID,
        userId: ID
    ): Promise<Result<CommunicationInteractionState, string>> {
        if (!ObjectId.isValid(interactionId)) {
            return { status: "error", msg: "Invalid interaction ID format provided." };
        }
        if (!userId) {
            return { status: "error", msg: "User ID cannot be empty when ending an interaction." };
        }

        const interaction = await this.collection.findOne({ _id: interactionId });

        if (!interaction) {
            return { status: "error", msg: `Interaction with ID '${interactionId.toHexString()}' not found.` };
        }
        if (!interaction.active) {
            return { status: "error", msg: `Interaction with ID '${interactionId.toHexString()}' is already inactive.` };
        }
        if (!interaction.participants.includes(userId)) {
            return {
                status: "error",
                msg: `User '${userId}' is not a participant of interaction '${interactionId.toHexString()}' and cannot end it.`,
            };
        }

        const now = new Date();
        try {
            const updateResult = await this.collection.findOneAndUpdate(
                { _id: interactionId, active: true, participants: userId }, // Ensure it's active and user is a participant
                { $set: { active: false, endTime: now } },
                { returnDocument: 'after' } // Return the updated document
            );

            if (updateResult.ok && updateResult.value) {
                return { status: "success", value: updateResult.value };
            } else {
                // This could happen if a race condition occurred or the previous checks failed for some reason
                return { status: "error", msg: `Failed to update interaction '${interactionId.toHexString()}'. It might have been ended already or conditions changed.` };
            }
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error ending interaction:", error);
            return { status: "error", msg: `An unexpected database error occurred while ending interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Retrieves the currently active communication interaction for a specific user.
     * This assumes a user can only be part of one active interaction at a time.
     *
     * @param userId The `ID` of the user whose active interaction is being sought.
     * @returns A `Result` object: on success, contains the active `CommunicationInteractionState`
     *          or `null` if no active interaction is found for the user;
     *          on error, contains a descriptive error message.
     */
    public async getActiveInteraction(
        userId: ID
    ): Promise<Result<CommunicationInteractionState | null, string>> {
        if (!userId) {
            return { status: "error", msg: "User ID cannot be empty when getting active interaction." };
        }

        try {
            // Find one interaction where the user is a participant and the interaction is active
            const interaction = await this.collection.findOne({
                participants: userId,
                active: true,
            });
            return { status: "success", value: interaction };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error getting active interaction:", error);
            return { status: "error", msg: `An unexpected database error occurred while getting active interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Calculates the total duration of a *completed* communication interaction in minutes.
     * An interaction must have both a `startTime` and an `endTime` to calculate duration.
     *
     * @param interactionId The `InteractionID` of the interaction to calculate duration for.
     * @returns A `Result` object: on success, contains the duration in minutes (rounded to nearest minute);
     *          on error, contains a descriptive error message (e.g., interaction not found or not ended).
     */
    public async getInteractionDuration(
        interactionId: InteractionID
    ): Promise<Result<number, string>> {
        if (!ObjectId.isValid(interactionId)) {
            return { status: "error", msg: "Invalid interaction ID format provided." };
        }

        const interaction = await this.collection.findOne({ _id: interactionId });

        if (!interaction) {
            return { status: "error", msg: `Interaction with ID '${interactionId.toHexString()}' not found.` };
        }
        if (interaction.active || !interaction.endTime) {
            return {
                status: "error",
                msg: `Interaction with ID '${interactionId.toHexString()}' is still active or has no end time recorded. Duration can only be calculated for completed interactions.`,
            };
        }

        // Calculate duration in milliseconds
        const durationMs = interaction.endTime.getTime() - interaction.startTime.getTime();
        // Convert to minutes and round to the nearest whole minute
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        return { status: "success", value: durationMinutes };
    }

    /**
     * Retrieves a complete history of all communication interactions (active or inactive)
     * that a specific user has participated in.
     *
     * @param userId The `ID` of the user whose interaction history is being sought.
     * @returns A `Result` object: on success, contains an array of `CommunicationInteractionState` objects;
     *          on error, contains a descriptive error message.
     */
    public async getInteractionHistory(
        userId: ID
    ): Promise<Result<CommunicationInteractionState[], string>> {
        if (!userId) {
            return { status: "error", msg: "User ID cannot be empty when getting interaction history." };
        }

        try {
            // Find all interactions where the user is a participant
            const history = await this.collection.find({
                participants: userId,
            }).toArray(); // Convert cursor to array
            return { status: "success", value: history };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error getting interaction history:", error);
            return { status: "error", msg: `An unexpected database error occurred while getting interaction history: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
}
```---
timestamp: 'Sat Oct 11 2025 16:09:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_160918.e5b79ab3.md]]'
content_id: c9bd5b1ae437ad741ec76a382a624984bb5199976ab335c39ef295e8a0f670c4
---

# response:

The `CommunicationInteraction` concept is implemented below in TypeScript, adhering to the specified guidelines. This implementation uses MongoDB for persistence, follows the defined state model and actions, and incorporates robust error handling with the `Result` type pattern.

### `src/concepts/CommunicationInteraction/CommunicationInteractionConcept.ts`

```typescript
// src/concepts/CommunicationInteraction/CommunicationInteractionConcept.ts

import { Collection, Db, ObjectId } from 'mongodb';

// --- Type Definitions (would typically be in utils/types.ts or similar) ---

/**
 * Branded string type for user identifiers.
 * This helps distinguish plain strings from actual user IDs at compile time,
 * improving type safety.
 * Example usage: const userId: ID = "user-abc-123" as ID;
 */
export type ID = string & { __brand: 'ID' };

/**
 * Type for the unique identifier of a CommunicationInteraction document in MongoDB.
 * This typically maps to MongoDB's ObjectId.
 */
export type InteractionID = ObjectId;

/**
 * A generic Result type for operations that can either succeed or fail.
 * Success contains a value of type `T`, while error contains a message of type `E`.
 */
export type Result<T, E = string> =
    | { status: "success"; value: T }
    | { status: "error"; msg: E };

/**
 * Represents the state of a CommunicationInteraction as stored in MongoDB.
 * This interface defines the schema for the collection documents.
 */
export interface CommunicationInteractionState {
    _id: InteractionID;       // Unique identifier for the interaction document
    participants: ID[];       // Array of user IDs involved in this interaction
    active: boolean;          // True if the interaction is currently ongoing, false otherwise
    startTime: Date;          // Timestamp when the interaction began
    endTime: Date | null;     // Timestamp when the interaction ended (null if active)
}

// --- CommunicationInteractionConcept Implementation ---

/**
 * The `CommunicationInteractionConcept` class provides a set of methods
 * to manage the lifecycle and retrieval of communication interactions
 * between users, leveraging MongoDB for persistent storage.
 */
export class CommunicationInteractionConcept {
    private collection: Collection<CommunicationInteractionState>;
    private readonly collectionName = 'communicationInteractions'; // MongoDB collection name

    /**
     * Initializes the CommunicationInteractionConcept with a MongoDB database instance.
     * The constructor sets up the collection reference.
     *
     * @param db The MongoDB `Db` instance to use for operations.
     * @throws {Error} If the `db` instance is not provided.
     */
    constructor(db: Db) {
        if (!db) {
            throw new Error("MongoDB Db instance must be provided to CommunicationInteractionConcept.");
        }
        this.collection = db.collection<CommunicationInteractionState>(this.collectionName);
        // IMPORTANT: As per guidelines, indexes are NOT created in the constructor.
        // Index management should be handled externally (e.g., via a separate migration script,
        // application startup script, or an infrastructure-as-code tool).
        // Example indexes that might be needed:
        // - { participants: 1, active: 1 } for `startInteraction` and `getActiveInteraction`
        // - { _id: 1 } (default primary key index)
        // - { participants: 1 } for `getInteractionHistory`
    }

    /**
     * Initiates a new communication interaction among a list of participants.
     * This action will fail if any of the specified participants are already
     * involved in another active interaction.
     *
     * @param participants An array of `ID`s representing the users involved in the new interaction.
     * @returns A `Result` object: on success, contains the newly created `CommunicationInteractionState`;
     *          on error, contains a descriptive error message.
     */
    public async startInteraction(
        participants: ID[]
    ): Promise<Result<CommunicationInteractionState, string>> {
        if (!participants || participants.length === 0) {
            return { status: "error", msg: "Participants list cannot be empty for starting an interaction." };
        }

        // Normalize participants to ensure uniqueness, as per "convert to/from Set as needed" guideline.
        const uniqueParticipants = Array.from(new Set(participants));
        if (uniqueParticipants.length !== participants.length) {
            console.warn(`[CommunicationInteractionConcept] Duplicate participants removed for starting interaction. Original: ${participants.length}, Unique: ${uniqueParticipants.length}`);
        }

        // Check for concurrent active interactions: ensure no participant is currently active in another interaction.
        const concurrentActiveInteraction = await this.collection.findOne({
            participants: { $in: uniqueParticipants }, // Check if any proposed participant is in an active interaction
            active: true,
        });

        if (concurrentActiveInteraction) {
            return {
                status: "error",
                msg: `One or more participants (${uniqueParticipants.join(', ')}) are already in an active interaction (ID: ${concurrentActiveInteraction._id.toHexString()}). A user can only be in one active interaction at a time.`,
            };
        }

        const now = new Date();
        const newInteractionData: Omit<CommunicationInteractionState, '_id'> = {
            participants: uniqueParticipants,
            active: true,
            startTime: now,
            endTime: null, // Interaction is active, so endTime is null
        };

        try {
            const result = await this.collection.insertOne(newInteractionData);
            if (!result.acknowledged || !result.insertedId) {
                return { status: "error", msg: "Failed to create new interaction in the database." };
            }
            // Cast insertedId to InteractionID as it's a valid ObjectId
            const createdInteraction: CommunicationInteractionState = {
                ...newInteractionData,
                _id: result.insertedId as InteractionID,
            };
            return { status: "success", value: createdInteraction };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error starting interaction:", error);
            // Return specific error message, avoid throwing for anticipated user-level failures.
            return { status: "error", msg: `An unexpected database error occurred while starting interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Concludes an active communication interaction identified by its ID.
     * Only a participant of the interaction is authorized to end it.
     *
     * @param interactionId The `InteractionID` of the interaction to be ended.
     * @param userId The `ID` of the user requesting to end the interaction. This user must be a participant.
     * @returns A `Result` object: on success, contains the updated (inactive) `CommunicationInteractionState`;
     *          on error, contains a descriptive error message.
     */
    public async endInteraction(
        interactionId: InteractionID,
        userId: ID
    ): Promise<Result<CommunicationInteractionState, string>> {
        if (!ObjectId.isValid(interactionId)) {
            return { status: "error", msg: "Invalid interaction ID format provided." };
        }
        if (!userId) {
            return { status: "error", msg: "User ID cannot be empty when ending an interaction." };
        }

        const interaction = await this.collection.findOne({ _id: interactionId });

        if (!interaction) {
            return { status: "error", msg: `Interaction with ID '${interactionId.toHexString()}' not found.` };
        }
        if (!interaction.active) {
            return { status: "error", msg: `Interaction with ID '${interactionId.toHexString()}' is already inactive.` };
        }
        if (!interaction.participants.includes(userId)) {
            return {
                status: "error",
                msg: `User '${userId}' is not a participant of interaction '${interactionId.toHexString()}' and cannot end it.`,
            };
        }

        const now = new Date();
        try {
            const updateResult = await this.collection.findOneAndUpdate(
                { _id: interactionId, active: true, participants: userId }, // Ensure it's active and user is a participant
                { $set: { active: false, endTime: now } },
                { returnDocument: 'after' } // Return the updated document
            );

            if (updateResult.ok && updateResult.value) {
                return { status: "success", value: updateResult.value };
            } else {
                // This could happen if a race condition occurred or the previous checks failed for some reason
                return { status: "error", msg: `Failed to update interaction '${interactionId.toHexString()}'. It might have been ended already or conditions changed.` };
            }
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error ending interaction:", error);
            return { status: "error", msg: `An unexpected database error occurred while ending interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Retrieves the currently active communication interaction for a specific user.
     * This assumes a user can only be part of one active interaction at a time.
     *
     * @param userId The `ID` of the user whose active interaction is being sought.
     * @returns A `Result` object: on success, contains the active `CommunicationInteractionState`
     *          or `null` if no active interaction is found for the user;
     *          on error, contains a descriptive error message.
     */
    public async getActiveInteraction(
        userId: ID
    ): Promise<Result<CommunicationInteractionState | null, string>> {
        if (!userId) {
            return { status: "error", msg: "User ID cannot be empty when getting active interaction." };
        }

        try {
            // Find one interaction where the user is a participant and the interaction is active
            const interaction = await this.collection.findOne({
                participants: userId,
                active: true,
            });
            return { status: "success", value: interaction };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error getting active interaction:", error);
            return { status: "error", msg: `An unexpected database error occurred while getting active interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Calculates the total duration of a *completed* communication interaction in minutes.
     * An interaction must have both a `startTime` and an `endTime` to calculate duration.
     *
     * @param interactionId The `InteractionID` of the interaction to calculate duration for.
     * @returns A `Result` object: on success, contains the duration in minutes (rounded to nearest minute);
     *          on error, contains a descriptive error message (e.g., interaction not found or not ended).
     */
    public async getInteractionDuration(
        interactionId: InteractionID
    ): Promise<Result<number, string>> {
        if (!ObjectId.isValid(interactionId)) {
            return { status: "error", msg: "Invalid interaction ID format provided." };
        }

        const interaction = await this.collection.findOne({ _id: interactionId });

        if (!interaction) {
            return { status: "error", msg: `Interaction with ID '${interactionId.toHexString()}' not found.` };
        }
        if (interaction.active || !interaction.endTime) {
            return {
                status: "error",
                msg: `Interaction with ID '${interactionId.toHexString()}' is still active or has no end time recorded. Duration can only be calculated for completed interactions.`,
            };
        }

        // Calculate duration in milliseconds
        const durationMs = interaction.endTime.getTime() - interaction.startTime.getTime();
        // Convert to minutes and round to the nearest whole minute
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        return { status: "success", value: durationMinutes };
    }

    /**
     * Retrieves a complete history of all communication interactions (active or inactive)
     * that a specific user has participated in.
     *
     * @param userId The `ID` of the user whose interaction history is being sought.
     * @returns A `Result` object: on success, contains an array of `CommunicationInteractionState` objects;
     *          on error, contains a descriptive error message.
     */
    public async getInteractionHistory(
        userId: ID
    ): Promise<Result<CommunicationInteractionState[], string>> {
        if (!userId) {
            return { status: "error", msg: "User ID cannot be empty when getting interaction history." };
        }

        try {
            // Find all interactions where the user is a participant
            const history = await this.collection.find({
                participants: userId,
            }).toArray(); // Convert cursor to array
            return { status: "success", value: history };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error getting interaction history:", error);
            return { status: "error", msg: `An unexpected database error occurred while getting interaction history: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
}
```
