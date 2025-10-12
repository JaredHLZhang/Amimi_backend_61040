// src/concepts/CommunicationInteraction/CommunicationInteractionConcept.ts

import { Collection, Db, ObjectId } from 'npm:mongodb';
import { ID } from '@utils/types.ts';

// --- Type Definitions ---

/**
 * Type for the unique identifier of a CommunicationInteraction document in MongoDB.
 * This typically maps to MongoDB's ObjectId.
 */
export type InteractionID = ObjectId;

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
export default class CommunicationInteractionConcept {
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
     * @param params Object containing participants array and initiator ID
     * @returns On success, returns {status: "success", interactionId}; on error, returns {status: "error", error: string}
     */
    public async startInteraction(
        { participants, initiatorId }: { participants: ID[]; initiatorId: ID }
    ): Promise<{ status: "success"; interactionId: InteractionID } | { status: "error"; error: string }> {
        if (!participants || participants.length === 0) {
            return { status: "error", error: "Participants array cannot be empty." };
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
            const participantId = uniqueParticipants.find(p => concurrentActiveInteraction.participants.includes(p));
            return {
                status: "error",
                error: `Participant ${participantId} is already in an active communication interaction.`,
            };
        }

        const now = new Date();
        const interactionId = new ObjectId() as InteractionID;
        const newInteractionData: CommunicationInteractionState = {
            _id: interactionId,
            participants: uniqueParticipants,
            active: true,
            startTime: now,
            endTime: null, // Interaction is active, so endTime is null
        };

        try {
            const result = await this.collection.insertOne(newInteractionData);
            if (!result.acknowledged) {
                return { status: "error", error: "Failed to create new interaction in the database." };
            }
            return { status: "success", interactionId };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error starting interaction:", error);
            return { status: "error", error: `An unexpected database error occurred while starting interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Concludes an active communication interaction identified by its ID.
     * Only a participant of the interaction is authorized to end it.
     *
     * @param params Object containing interactionId and participantId
     * @returns On success, returns {status: "success", interaction}; on error, returns {status: "error", error: string}
     */
    public async endInteraction(
        { interactionId, participantId }: { interactionId: InteractionID; participantId: ID }
    ): Promise<{ status: "success"; interaction: CommunicationInteractionState } | { status: "error"; error: string }> {
        try {
            const interaction = await this.collection.findOne({ _id: interactionId });

            if (!interaction) {
                return { status: "error", error: `Interaction with ID ${interactionId.toHexString()} not found.` };
            }
            if (!interaction.active) {
                return { status: "error", error: `Interaction with ID ${interactionId.toHexString()} is already inactive.` };
            }
            if (!interaction.participants.includes(participantId)) {
                return {
                    status: "error",
                    error: `Participant ${participantId} is not part of interaction ${interactionId.toHexString()}.`,
                };
            }

            const now = new Date();
            const updateResult = await this.collection.updateOne(
                { _id: interactionId, active: true, participants: participantId },
                { $set: { active: false, endTime: now } }
            );

            if (updateResult.acknowledged && updateResult.modifiedCount > 0) {
                // Fetch the updated document
                const updatedInteraction = await this.collection.findOne({ _id: interactionId });
                if (updatedInteraction) {
                    return { status: "success", interaction: updatedInteraction };
                }
            }
            return { status: "error", error: `Failed to update interaction ${interactionId.toHexString()}. It might have been ended already or conditions changed.` };
        } catch (error) {
            // Handle invalid ObjectId error specifically
            if (error instanceof Error && error.message.includes("BSON ObjectId")) {
                return { status: "error", error: `Error: invalid BSON ObjectId format` };
            }
            console.error("[CommunicationInteractionConcept] Database error ending interaction:", error);
            return { status: "error", error: `An unexpected database error occurred while ending interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Retrieves the currently active communication interaction for a specific user.
     * This assumes a user can only be part of one active interaction at a time.
     *
     * @param params Object containing userId
     * @returns On success, returns {status: "success", interaction} (null if no active interaction); on error, returns {status: "error", error: string}
     */
    public async getActiveInteraction(
        { userId }: { userId: ID }
    ): Promise<{ status: "success"; interaction: CommunicationInteractionState | null } | { status: "error"; error: string }> {
        if (!userId) {
            return { status: "error", error: "User ID cannot be empty." };
        }

        try {
            const interaction = await this.collection.findOne({
                participants: userId,
                active: true,
            });
            return { status: "success", interaction };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error getting active interaction:", error);
            return { status: "error", error: `An unexpected database error occurred while getting active interaction: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Calculates the total duration of a *completed* communication interaction in milliseconds.
     * An interaction must have both a `startTime` and an `endTime` to calculate duration.
     *
     * @param params Object containing interactionId
     * @returns On success, returns {status: "success", durationMs}; on error, returns {status: "error", error: string}
     */
    public async getInteractionDuration(
        { interactionId }: { interactionId: InteractionID }
    ): Promise<{ status: "success"; durationMs: number } | { status: "error"; error: string }> {
        try {
            const interaction = await this.collection.findOne({ _id: interactionId });

            if (!interaction) {
                return { status: "error", error: `Interaction with ID ${interactionId.toHexString()} not found.` };
            }
            if (interaction.active || !interaction.endTime) {
                return {
                    status: "error",
                    error: `Interaction with ID ${interactionId.toHexString()} is still active, duration cannot be calculated.`,
                };
            }

            // Calculate duration in milliseconds
            const durationMs = interaction.endTime.getTime() - interaction.startTime.getTime();

            return { status: "success", durationMs };
        } catch (error) {
            // Handle invalid ObjectId error specifically
            if (error instanceof Error && error.message.includes("BSON ObjectId")) {
                return { status: "error", error: `Error: invalid BSON ObjectId format` };
            }
            console.error("[CommunicationInteractionConcept] Database error getting duration:", error);
            return { status: "error", error: `An unexpected database error occurred: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Retrieves a complete history of all communication interactions (active or inactive)
     * that a specific user has participated in.
     *
     * @param params Object containing userId
     * @returns On success, returns {status: "success", interactions}; on error, returns {status: "error", error: string}
     */
    public async getInteractionHistory(
        { userId }: { userId: ID }
    ): Promise<{ status: "success"; interactions: CommunicationInteractionState[] } | { status: "error"; error: string }> {
        if (!userId) {
            return { status: "error", error: "User ID cannot be empty." };
        }

        try {
            const interactions = await this.collection.find({
                participants: userId,
            }).toArray();
            return { status: "success", interactions };
        } catch (error) {
            console.error("[CommunicationInteractionConcept] Database error getting interaction history:", error);
            return { status: "error", error: `An unexpected database error occurred while getting interaction history: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
}

