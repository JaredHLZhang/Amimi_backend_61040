# ContentCapture Concept Implementation

## Background Context

Please review the following documents to understand the concept design principles and implementation approach:

* [[design/background/concept-design-brief]]
* [[design/background/concept-design-overview]]
* [[design/background/implementing-concepts]]

## Concept Specification

* [[design/concepts/ContentCapture/ContentCapture]]

## Reference Implementation

For implementation patterns, please review this example:
* [[src/concepts/LikertSurvey/LikertSurveyConcept]]

## Task

Please implement the `ContentCapture` concept in TypeScript following these guidelines:

1. **File Structure**: Create the implementation in `src/concepts/ContentCapture/ContentCaptureConcept.ts`

2. **Implementation Requirements**:
   - Use MongoDB collections for persistent storage
   - Follow the state model defined in the specification
   - Implement all actions as specified
   - Use proper TypeScript types (use the `ID` type from `utils/types.ts` for owner identifiers)
   - Use **object parameter pattern** for all methods (e.g., `{ sourceId, type, owner }`)
   - Return specific union types for each action (not generic `Result<T>`)
   - Throw errors only for programming mistakes, not user errors
   - DO NOT create indexes in the constructor (this causes async issues)

3. **MongoDB Schema**:
   - Store captures with a unique captureId (pre-generate ObjectId)
   - Include sourceId, capturedText, captureType, timestamp, owner
   - captureType should be one of: "audio", "image", "text"
   - Use `Date` for timestamps

4. **Action Implementation**:
   - `startCapture`: Create new capture document with initial state (e.g., status: "capturing")
   - `stopCapture`: Update capture to set status: "completed" and save capturedText
   - `getCapture`: Retrieve capture by ID
   - `getCapturesBySource`: Query all captures for a given sourceId
   - `deleteCapture`: Remove capture document

5. **Error Handling**:
   - Return error results for user errors (e.g., capture not found, invalid type)
   - Use descriptive error messages
   - Follow the return type pattern: `{ status: "success"; capture: ... } | { status: "error"; error: string }`

6. **Important Notes**:
   - The concept should support three capture types: "audio", "image", "text"
   - For this implementation, `capturedText` can be a placeholder (actual processing would happen externally)
   - Consider that captures may be in progress ("capturing" status) or completed
   - Use proper type checking for captureType validation
   - Pre-generate ObjectId before insert (following LikertSurvey pattern)

7. **State Management**:
   - Captures should have a status field: "capturing" | "completed" | "failed"
   - startCapture creates with status "capturing"
   - stopCapture updates to "completed" and adds the processed text

Please provide a complete, production-ready implementation following the established codebase patterns.


# response:

To implement the `ContentCapture` concept, I'll create the `ContentCaptureConcept.ts` file within the `src/concepts/ContentCapture/` directory. This implementation will define the necessary types, the MongoDB schema, and the class methods for managing content captures, adhering to all specified requirements including error handling, object parameter patterns, and state management.

```typescript
// src/concepts/ContentCapture/ContentCaptureConcept.ts

import { Collection, MongoClient, ObjectId } from 'mongodb';

// Mock ID type as per instruction, assuming utils/types.ts is not available directly
// In a real project, this would be: import { ID } from '../../utils/types';
type ID = string;

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
    captureId: ID; // String representation of ObjectId
    capturedText: string;
};
/** Result of the `stopCapture` action. */
export type StopCaptureResult =
    | { status: 'success'; capture: ContentCapture }
    | ErrorResult;

/** Parameters for retrieving a content capture by ID. */
export type GetCaptureParams = {
    captureId: ID; // String representation of ObjectId
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
    captureId: ID; // String representation of ObjectId
};
/** Result of the `deleteCapture` action. */
export type DeleteCaptureResult =
    | { status: 'success'; message: string }
    | ErrorResult;


/**
 * Implements the ContentCapture concept for managing content capture lifecycles
 * using MongoDB for persistent storage.
 */
export class ContentCaptureConcept {
    private collection: Collection<ContentCapture>;
    private readonly collectionName = 'contentCaptures';

    /**
     * Initializes the ContentCaptureConcept with a MongoDB client and database name.
     * @param dbClient The connected MongoDB client.
     * @param dbName The name of the database to use.
     * @throws Error if `dbClient` or `dbName` are not provided.
     */
    constructor(dbClient: MongoClient, dbName: string) {
        if (!dbClient || !dbName) {
            throw new Error('ContentCaptureConcept: MongoClient and database name must be provided.');
        }
        const db = dbClient.db(dbName);
        this.collection = db.collection<ContentCapture>(this.collectionName);
    }

    /**
     * Sets up necessary MongoDB indexes for the 'contentCaptures' collection.
     * This method should be called once during application startup, typically after
     * database connection, not within the constructor.
     * @param dbClient The connected MongoDB client.
     * @param dbName The name of the database where the collection resides.
     */
    public static async setupIndexes(dbClient: MongoClient, dbName: string): Promise<void> {
        const db = dbClient.db(dbName);
        const collection = db.collection<ContentCapture>('contentCaptures'); // Ensure collection name matches
        try {
            // Index for efficient lookup of captures by their source identifier
            await collection.createIndex({ sourceId: 1 });
            // Index for efficient lookup of captures by their owner
            await collection.createIndex({ owner: 1 });
            // Compound index for queries that filter by source and status
            await collection.createIndex({ sourceId: 1, status: 1 });
            console.log('ContentCaptureConcept indexes created successfully.');
        } catch (error: any) {
            console.error('Error creating ContentCaptureConcept indexes:', error);
            // Re-throw critical setup errors to ensure they are handled upstream
            throw new Error(`Failed to set up ContentCaptureConcept indexes: ${error.message}`);
        }
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
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async startCapture({ sourceId, type, owner }: StartCaptureParams): Promise<StartCaptureResult> {
        // Programming mistake check: ensure all required parameters are provided
        if (!sourceId || !type || !owner) {
            throw new Error('startCapture: sourceId, type, and owner are required parameters.');
        }

        // User error check: validate the provided capture type
        if (!this.isValidCaptureType(type)) {
            return { status: 'error', error: `Invalid capture type: '${type}'. Must be 'audio', 'image', or 'text'.` };
        }

        const newCapture: ContentCapture = {
            _id: new ObjectId(), // Pre-generate a unique ObjectId for the capture
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
                // Database system error: insert operation not acknowledged
                throw new Error('Failed to insert new capture into the database. Operation not acknowledged.');
            }
            return { status: 'success', capture: newCapture };
        } catch (error: any) {
            console.error(`Error starting capture for source ${sourceId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during startCapture: ${error.message}`);
        }
    }

    /**
     * Completes an ongoing content capture.
     * Locates the capture by `captureId`, updates its status to 'completed',
     * and saves the provided `capturedText`. The capture must be in 'capturing' status.
     * @param {StopCaptureParams} { captureId, capturedText } - Parameters for stopping the capture.
     * @returns A `StopCaptureResult` indicating success with the updated capture, or an error.
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async stopCapture({ captureId, capturedText }: StopCaptureParams): Promise<StopCaptureResult> {
        // Programming mistake check: ensure all required parameters are provided
        // capturedText specifically checks for undefined, allowing empty string as valid input
        if (!captureId || capturedText === undefined) {
            throw new Error('stopCapture: captureId and capturedText are required parameters.');
        }

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            // User error: Invalid format for the provided captureId
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            const result = await this.collection.findOneAndUpdate(
                { _id: objectId, status: 'capturing' }, // Find by ID and ensure it's currently 'capturing'
                { $set: { status: 'completed', capturedText: capturedText } }, // Update status and captured text
                { returnDocument: 'after' } // Return the updated document
            );

            if (!result.value) {
                // User error: Capture not found or not in 'capturing' status
                const existingCapture = await this.collection.findOne({ _id: objectId });
                if (!existingCapture) {
                    return { status: 'error', error: `Capture with ID '${captureId}' not found.` };
                } else {
                    return { status: 'error', error: `Capture with ID '${captureId}' is not in 'capturing' status. Current status: ${existingCapture.status}.` };
                }
            }

            return { status: 'success', capture: result.value };
        } catch (error: any) {
            console.error(`Error stopping capture ${captureId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during stopCapture: ${error.message}`);
        }
    }

    /**
     * Retrieves a content capture by its unique identifier (`captureId`).
     * @param {GetCaptureParams} { captureId } - The ID of the capture to retrieve.
     * @returns A `GetCaptureResult` indicating success with the found capture, or an error.
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async getCapture({ captureId }: GetCaptureParams): Promise<GetCaptureResult> {
        // Programming mistake check: ensure captureId is provided
        if (!captureId) {
            throw new Error('getCapture: captureId is a required parameter.');
        }

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            // User error: Invalid format for the provided captureId
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            const capture = await this.collection.findOne({ _id: objectId });
            if (!capture) {
                // User error: Capture not found
                return { status: 'error', error: `Capture with ID '${captureId}' not found.` };
            }
            return { status: 'success', capture };
        } catch (error: any) {
            console.error(`Error getting capture ${captureId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during getCapture: ${error.message}`);
        }
    }

    /**
     * Retrieves all content captures associated with a specific source ID.
     * @param {GetCapturesBySourceParams} { sourceId } - The ID of the source to query captures for.
     * @returns A `GetCapturesBySourceResult` indicating success with an array of captures, or an error.
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async getCapturesBySource({ sourceId }: GetCapturesBySourceParams): Promise<GetCapturesBySourceResult> {
        // Programming mistake check: ensure sourceId is provided
        if (!sourceId) {
            throw new Error('getCapturesBySource: sourceId is a required parameter.');
        }

        try {
            const captures = await this.collection.find({ sourceId }).toArray();
            return { status: 'success', captures };
        } catch (error: any) {
            console.error(`Error getting captures for source ${sourceId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during getCapturesBySource: ${error.message}`);
        }
    }

    /**
     * Deletes a content capture by its unique identifier (`captureId`).
     * @param {DeleteCaptureParams} { captureId } - The ID of the capture to delete.
     * @returns A `DeleteCaptureResult` indicating success, or an error if the capture was not found.
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async deleteCapture({ captureId }: DeleteCaptureParams): Promise<DeleteCaptureResult> {
        // Programming mistake check: ensure captureId is provided
        if (!captureId) {
            throw new Error('deleteCapture: captureId is a required parameter.');
        }

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            // User error: Invalid format for the provided captureId
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            const result = await this.collection.deleteOne({ _id: objectId });
            if (result.deletedCount === 0) {
                // User error: Capture not found for deletion
                return { status: 'error', error: `Capture with ID '${captureId}' not found for deletion.` };
            }
            return { status: 'success', message: `Capture with ID '${captureId}' deleted successfully.` };
        } catch (error: any) {
            console.error(`Error deleting capture ${captureId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during deleteCapture: ${error.message}`);
        }
    }
}
```---
timestamp: 'Sat Oct 11 2025 16:23:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251011_162311.ff08b773.md]]'
content_id: 8105813119c08c00b67fd673f66d1f258f5520e225ba8996940c93523c0de4aa
---

# response:

To implement the `ContentCapture` concept, I'll create the `ContentCaptureConcept.ts` file within the `src/concepts/ContentCapture/` directory. This implementation will define the necessary types, the MongoDB schema, and the class methods for managing content captures, adhering to all specified requirements including error handling, object parameter patterns, and state management.

```typescript
// src/concepts/ContentCapture/ContentCaptureConcept.ts

import { Collection, MongoClient, ObjectId } from 'mongodb';

// Mock ID type as per instruction, assuming utils/types.ts is not available directly
// In a real project, this would be: import { ID } from '../../utils/types';
type ID = string;

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
    captureId: ID; // String representation of ObjectId
    capturedText: string;
};
/** Result of the `stopCapture` action. */
export type StopCaptureResult =
    | { status: 'success'; capture: ContentCapture }
    | ErrorResult;

/** Parameters for retrieving a content capture by ID. */
export type GetCaptureParams = {
    captureId: ID; // String representation of ObjectId
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
    captureId: ID; // String representation of ObjectId
};
/** Result of the `deleteCapture` action. */
export type DeleteCaptureResult =
    | { status: 'success'; message: string }
    | ErrorResult;


/**
 * Implements the ContentCapture concept for managing content capture lifecycles
 * using MongoDB for persistent storage.
 */
export class ContentCaptureConcept {
    private collection: Collection<ContentCapture>;
    private readonly collectionName = 'contentCaptures';

    /**
     * Initializes the ContentCaptureConcept with a MongoDB client and database name.
     * @param dbClient The connected MongoDB client.
     * @param dbName The name of the database to use.
     * @throws Error if `dbClient` or `dbName` are not provided.
     */
    constructor(dbClient: MongoClient, dbName: string) {
        if (!dbClient || !dbName) {
            throw new Error('ContentCaptureConcept: MongoClient and database name must be provided.');
        }
        const db = dbClient.db(dbName);
        this.collection = db.collection<ContentCapture>(this.collectionName);
    }

    /**
     * Sets up necessary MongoDB indexes for the 'contentCaptures' collection.
     * This method should be called once during application startup, typically after
     * database connection, not within the constructor.
     * @param dbClient The connected MongoDB client.
     * @param dbName The name of the database where the collection resides.
     */
    public static async setupIndexes(dbClient: MongoClient, dbName: string): Promise<void> {
        const db = dbClient.db(dbName);
        const collection = db.collection<ContentCapture>('contentCaptures'); // Ensure collection name matches
        try {
            // Index for efficient lookup of captures by their source identifier
            await collection.createIndex({ sourceId: 1 });
            // Index for efficient lookup of captures by their owner
            await collection.createIndex({ owner: 1 });
            // Compound index for queries that filter by source and status
            await collection.createIndex({ sourceId: 1, status: 1 });
            console.log('ContentCaptureConcept indexes created successfully.');
        } catch (error: any) {
            console.error('Error creating ContentCaptureConcept indexes:', error);
            // Re-throw critical setup errors to ensure they are handled upstream
            throw new Error(`Failed to set up ContentCaptureConcept indexes: ${error.message}`);
        }
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
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async startCapture({ sourceId, type, owner }: StartCaptureParams): Promise<StartCaptureResult> {
        // Programming mistake check: ensure all required parameters are provided
        if (!sourceId || !type || !owner) {
            throw new Error('startCapture: sourceId, type, and owner are required parameters.');
        }

        // User error check: validate the provided capture type
        if (!this.isValidCaptureType(type)) {
            return { status: 'error', error: `Invalid capture type: '${type}'. Must be 'audio', 'image', or 'text'.` };
        }

        const newCapture: ContentCapture = {
            _id: new ObjectId(), // Pre-generate a unique ObjectId for the capture
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
                // Database system error: insert operation not acknowledged
                throw new Error('Failed to insert new capture into the database. Operation not acknowledged.');
            }
            return { status: 'success', capture: newCapture };
        } catch (error: any) {
            console.error(`Error starting capture for source ${sourceId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during startCapture: ${error.message}`);
        }
    }

    /**
     * Completes an ongoing content capture.
     * Locates the capture by `captureId`, updates its status to 'completed',
     * and saves the provided `capturedText`. The capture must be in 'capturing' status.
     * @param {StopCaptureParams} { captureId, capturedText } - Parameters for stopping the capture.
     * @returns A `StopCaptureResult` indicating success with the updated capture, or an error.
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async stopCapture({ captureId, capturedText }: StopCaptureParams): Promise<StopCaptureResult> {
        // Programming mistake check: ensure all required parameters are provided
        // capturedText specifically checks for undefined, allowing empty string as valid input
        if (!captureId || capturedText === undefined) {
            throw new Error('stopCapture: captureId and capturedText are required parameters.');
        }

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            // User error: Invalid format for the provided captureId
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            const result = await this.collection.findOneAndUpdate(
                { _id: objectId, status: 'capturing' }, // Find by ID and ensure it's currently 'capturing'
                { $set: { status: 'completed', capturedText: capturedText } }, // Update status and captured text
                { returnDocument: 'after' } // Return the updated document
            );

            if (!result.value) {
                // User error: Capture not found or not in 'capturing' status
                const existingCapture = await this.collection.findOne({ _id: objectId });
                if (!existingCapture) {
                    return { status: 'error', error: `Capture with ID '${captureId}' not found.` };
                } else {
                    return { status: 'error', error: `Capture with ID '${captureId}' is not in 'capturing' status. Current status: ${existingCapture.status}.` };
                }
            }

            return { status: 'success', capture: result.value };
        } catch (error: any) {
            console.error(`Error stopping capture ${captureId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during stopCapture: ${error.message}`);
        }
    }

    /**
     * Retrieves a content capture by its unique identifier (`captureId`).
     * @param {GetCaptureParams} { captureId } - The ID of the capture to retrieve.
     * @returns A `GetCaptureResult` indicating success with the found capture, or an error.
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async getCapture({ captureId }: GetCaptureParams): Promise<GetCaptureResult> {
        // Programming mistake check: ensure captureId is provided
        if (!captureId) {
            throw new Error('getCapture: captureId is a required parameter.');
        }

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            // User error: Invalid format for the provided captureId
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            const capture = await this.collection.findOne({ _id: objectId });
            if (!capture) {
                // User error: Capture not found
                return { status: 'error', error: `Capture with ID '${captureId}' not found.` };
            }
            return { status: 'success', capture };
        } catch (error: any) {
            console.error(`Error getting capture ${captureId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during getCapture: ${error.message}`);
        }
    }

    /**
     * Retrieves all content captures associated with a specific source ID.
     * @param {GetCapturesBySourceParams} { sourceId } - The ID of the source to query captures for.
     * @returns A `GetCapturesBySourceResult` indicating success with an array of captures, or an error.
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async getCapturesBySource({ sourceId }: GetCapturesBySourceParams): Promise<GetCapturesBySourceResult> {
        // Programming mistake check: ensure sourceId is provided
        if (!sourceId) {
            throw new Error('getCapturesBySource: sourceId is a required parameter.');
        }

        try {
            const captures = await this.collection.find({ sourceId }).toArray();
            return { status: 'success', captures };
        } catch (error: any) {
            console.error(`Error getting captures for source ${sourceId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during getCapturesBySource: ${error.message}`);
        }
    }

    /**
     * Deletes a content capture by its unique identifier (`captureId`).
     * @param {DeleteCaptureParams} { captureId } - The ID of the capture to delete.
     * @returns A `DeleteCaptureResult` indicating success, or an error if the capture was not found.
     * @throws Error for programming mistakes like missing required parameters.
     */
    public async deleteCapture({ captureId }: DeleteCaptureParams): Promise<DeleteCaptureResult> {
        // Programming mistake check: ensure captureId is provided
        if (!captureId) {
            throw new Error('deleteCapture: captureId is a required parameter.');
        }

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(captureId);
        } catch (e) {
            // User error: Invalid format for the provided captureId
            return { status: 'error', error: 'Invalid captureId format. Must be a valid MongoDB ObjectId string.' };
        }

        try {
            const result = await this.collection.deleteOne({ _id: objectId });
            if (result.deletedCount === 0) {
                // User error: Capture not found for deletion
                return { status: 'error', error: `Capture with ID '${captureId}' not found for deletion.` };
            }
            return { status: 'success', message: `Capture with ID '${captureId}' deleted successfully.` };
        } catch (error: any) {
            console.error(`Error deleting capture ${captureId}:`, error);
            // System error: Wrap and re-throw database errors
            throw new Error(`Database error during deleteCapture: ${error.message}`);
        }
    }
}
```
