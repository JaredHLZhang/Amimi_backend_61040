// src/concepts/ContentCapture/ContentCaptureConcept.ts

import { Collection, Db, ObjectId } from 'npm:mongodb';
import { ID } from '@utils/types.ts';

// 1. Type Definitions

/**
 * Defines the possible types of content captures.
 */
export type CaptureType = 'audio' | 'image' | 'text';

/**
 * Defines the possible states of a content capture.
 */
export type CaptureStatus = 'capturing' | 'completed' | 'failed';

/**
 * Interface representing a ContentCapture document stored in MongoDB.
 */
export interface ContentCapture {
    _id: ObjectId; // MongoDB's primary key, used as the unique captureId
    sourceId: ID;
    capturedText?: string; // Optional: Present only after capture is completed
    captureType: CaptureType;
    timestamp: Date;
    owner: ID;
    status: CaptureStatus;
}

// Helper type for consistent error results
type ErrorResult = { status: 'error'; error: string };

// 2. Action Parameter Types and Return Types

/** Parameters for starting a new content capture. */
export type StartCaptureParams = {
    sourceId: ID;
    type: CaptureType;
    owner: ID;
};
/** Result of the `startCapture` action. */
export type StartCaptureResult =
    | { status: 'success'; capture: ContentCapture }
    | ErrorResult;

/** Parameters for stopping an ongoing content capture. */
export type StopCaptureParams = {
    captureId: string; // String representation of ObjectId
    capturedText: string;
};
/** Result of the `stopCapture` action. */
export type StopCaptureResult =
    | { status: 'success'; capture: ContentCapture }
    | ErrorResult;

/** Parameters for retrieving a content capture by ID. */
export type GetCaptureParams = {
    captureId: string; // String representation of ObjectId
};
/** Result of the `getCapture` action. */
export type GetCaptureResult =
    | { status: 'success'; capture: ContentCapture }
    | ErrorResult;

/** Parameters for retrieving all content captures for a given source. */
export type GetCapturesBySourceParams = {
    sourceId: ID;
};
/** Result of the `getCapturesBySource` action. */
export type GetCapturesBySourceResult =
    | { status: 'success'; captures: ContentCapture[] }
    | ErrorResult;

/** Parameters for deleting a content capture by ID. */
export type DeleteCaptureParams = {
    captureId: string; // String representation of ObjectId
};
/** Result of the `deleteCapture` action. */
export type DeleteCaptureResult =
    | { status: 'success'; message: string }
    | ErrorResult;


/**
 * Implements the ContentCapture concept for managing content capture lifecycles
 * using MongoDB for persistent storage.
 */
export default class ContentCaptureConcept {
    private collection: Collection<ContentCapture>;
    private readonly collectionName = 'contentCaptures';

    /**
     * Initializes the ContentCaptureConcept with a MongoDB database instance.
     * @param db The MongoDB `Db` instance to use for operations.
     */
    constructor(db: Db) {
        this.collection = db.collection<ContentCapture>(this.collectionName);
        // Note: Indexes are not created in constructor to avoid hanging promises.
        // Recommended indexes:
        // - { sourceId: 1 } for getCapturesBySource
        // - { owner: 1 } for owner-based queries
        // - { sourceId: 1, status: 1 } for filtered queries
    }

    /**
     * Validates if a given string is a recognized `CaptureType`.
     * @param type The string to validate.
     * @returns True if the type is valid, false otherwise.
     */
    private isValidCaptureType(type: string): type is CaptureType {
        const validTypes: CaptureType[] = ['audio', 'image', 'text'];
        return (validTypes as string[]).includes(type);
    }

    /**
     * Initiates a new content capture process.
     * Creates a new capture document with a unique `_id`, sets its status to 'capturing',
     * and records the timestamp, source, type, and owner.
     * @param {StartCaptureParams} { sourceId, type, owner } - Parameters for the new capture.
     * @returns A `StartCaptureResult` indicating success with the new capture, or an error.
     */
    public async startCapture({ sourceId, type, owner }: StartCaptureParams): Promise<StartCaptureResult> {
        // Validate the provided capture type
        if (!this.isValidCaptureType(type)) {
            return { status: 'error', error: `Invalid capture type: '${type}'. Must be 'audio', 'image', or 'text'.` };
        }

        const captureId = new ObjectId();
        const newCapture: ContentCapture = {
            _id: captureId, // Pre-generate a unique ObjectId for the capture
            sourceId,
            captureType: type,
            timestamp: new Date(), // Record the start time of the capture
            owner,
            status: 'capturing', // Initial status
            // capturedText is intentionally omitted at this stage
        };

        try {
            const result = await this.collection.insertOne(newCapture);
            if (!result.acknowledged) {
                return { status: 'error', error: 'Failed to insert new capture into the database.' };
            }
            return { status: 'success', capture: newCapture };
        } catch (error: unknown) {
            console.error(`Error starting capture for source ${sourceId}:`, error);
            return { status: 'error', error: `Database error during startCapture: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Completes an ongoing content capture.
     * Locates the capture by `captureId`, updates its status to 'completed',
     * and saves the provided `capturedText`. The capture must be in 'capturing' status.
     * @param {StopCaptureParams} { captureId, capturedText } - Parameters for stopping the capture.
     * @returns A `StopCaptureResult` indicating success with the updated capture, or an error.
     */
    public async stopCapture({ captureId, capturedText }: StopCaptureParams): Promise<StopCaptureResult> {
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            // Use updateOne + findOne pattern (following established patterns)
            const updateResult = await this.collection.updateOne(
                { _id: objectId, status: 'capturing' },
                { $set: { status: 'completed', capturedText: capturedText } }
            );

            if (updateResult.modifiedCount === 0) {
                // Check if capture exists at all
                const existingCapture = await this.collection.findOne({ _id: objectId });
                if (!existingCapture) {
                    return { status: 'error', error: `Capture with ID '${captureId}' not found.` };
                } else {
                    return { status: 'error', error: `Capture with ID '${captureId}' is not in 'capturing' status. Current status: ${existingCapture.status}.` };
                }
            }

            // Fetch the updated document
            const updatedCapture = await this.collection.findOne({ _id: objectId });
            if (!updatedCapture) {
                return { status: 'error', error: `Failed to retrieve updated capture.` };
            }

            return { status: 'success', capture: updatedCapture };
        } catch (error: unknown) {
            console.error(`Error stopping capture ${captureId}:`, error);
            return { status: 'error', error: `Database error during stopCapture: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Retrieves a content capture by its unique identifier (`captureId`).
     * @param {GetCaptureParams} { captureId } - The ID of the capture to retrieve.
     * @returns A `GetCaptureResult` indicating success with the found capture, or an error.
     */
    public async getCapture({ captureId }: GetCaptureParams): Promise<GetCaptureResult> {
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            const capture = await this.collection.findOne({ _id: objectId });
            if (!capture) {
                return { status: 'error', error: `Capture with ID '${captureId}' not found.` };
            }
            return { status: 'success', capture };
        } catch (error: unknown) {
            console.error(`Error getting capture ${captureId}:`, error);
            return { status: 'error', error: `Database error during getCapture: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Retrieves all content captures associated with a specific source ID.
     * @param {GetCapturesBySourceParams} { sourceId } - The ID of the source to query captures for.
     * @returns A `GetCapturesBySourceResult` indicating success with an array of captures, or an error.
     */
    public async getCapturesBySource({ sourceId }: GetCapturesBySourceParams): Promise<GetCapturesBySourceResult> {
        try {
            const captures = await this.collection.find({ sourceId }).toArray();
            return { status: 'success', captures };
        } catch (error: unknown) {
            console.error(`Error getting captures for source ${sourceId}:`, error);
            return { status: 'error', error: `Database error during getCapturesBySource: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Deletes a content capture by its unique identifier (`captureId`).
     * @param {DeleteCaptureParams} { captureId } - The ID of the capture to delete.
     * @returns A `DeleteCaptureResult` indicating success, or an error if the capture was not found.
     */
    public async deleteCapture({ captureId }: DeleteCaptureParams): Promise<DeleteCaptureResult> {
        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            const result = await this.collection.deleteOne({ _id: objectId });
            if (result.deletedCount === 0) {
                return { status: 'error', error: `Capture with ID '${captureId}' not found for deletion.` };
            }
            return { status: 'success', message: `Capture with ID '${captureId}' deleted successfully.` };
        } catch (error: unknown) {
            console.error(`Error deleting capture ${captureId}:`, error);
            return { status: 'error', error: `Database error during deleteCapture: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
}

