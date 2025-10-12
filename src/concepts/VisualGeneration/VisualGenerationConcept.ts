// src/concepts/VisualGeneration/VisualGenerationConcept.ts

import { Collection, Db, ObjectId } from 'npm:mongodb';
import { ID } from '@utils/types.ts';

// --- Type Definitions ---

/**
 * Defines the allowed visual styles.
 */
const ALLOWED_VISUAL_STYLES = [
  "comic",
  "photo",
  "abstract",
  "sketch",
  "watercolor",
] as const;

/**
 * Type representing a valid visual style.
 */
export type VisualStyle = typeof ALLOWED_VISUAL_STYLES[number];

/**
 * Interface for a Visual document as stored in MongoDB.
 * The `_id` field is a MongoDB ObjectId.
 */
export interface VisualDocument {
  _id: ObjectId; // MongoDB's primary key, used as visualId
  promptText: string;
  visualUrl: string;
  style: VisualStyle;
  owner: ID;
  createdAt: Date;
}

/**
 * Public interface for a Visual object returned by the concept.
 */
export interface Visual {
  visualId: string;
  promptText: string;
  visualUrl: string;
  style: VisualStyle;
  owner: ID;
  createdAt: Date;
}

// --- Action Input/Output Types ---

/** Parameters for the `generateVisual` action. */
export type GenerateVisualParams = {
  text: string;
  style: string; // Input style can be any string, validated internally
  owner: ID;
};
/** Result for the `generateVisual` action. */
export type GenerateVisualResult =
  | { status: "success"; visual: Visual }
  | { status: "error"; error: string };

/** Parameters for the `getVisual` action. */
export type GetVisualParams = {
  visualId: string;
};
/** Result for the `getVisual` action. */
export type GetVisualResult =
  | { status: "success"; visual: Visual }
  | { status: "error"; error: string };

/** Parameters for the `regenerateVisual` action. */
export type RegenerateVisualParams = {
  visualId: string;
};
/** Result for the `regenerateVisual` action. */
export type RegenerateVisualResult =
  | { status: "success"; visual: Visual }
  | { status: "error"; error: string };

/** Parameters for the `deleteVisual` action. */
export type DeleteVisualParams = {
  visualId: string;
};
/** Result for the `deleteVisual` action. */
export type DeleteVisualResult =
  | { status: "success"; message: string }
  | { status: "error"; error: string };

/** Parameters for the `getUserVisuals` action. */
export type GetUserVisualsParams = {
  userId: ID;
};
/** Result for the `getUserVisuals` action. */
export type GetUserVisualsResult =
  | { status: "success"; visuals: Visual[] }
  | { status: "error"; error: string };

// --- VisualGenerationConcept Class ---

/**
 * Implements the VisualGeneration concept, managing the creation, retrieval,
 * regeneration, and deletion of visuals stored in MongoDB.
 */
export default class VisualGenerationConcept {
  private collection: Collection<VisualDocument>;
  private readonly collectionName = 'visuals';

  /**
   * Initializes the VisualGenerationConcept with a MongoDB database instance.
   * @param db The MongoDB `Db` instance to use for operations.
   */
  constructor(db: Db) {
    this.collection = db.collection<VisualDocument>(this.collectionName);
    // Note: Indexes are not created in constructor to avoid hanging promises.
    // Recommended indexes:
    // - { owner: 1 } for getUserVisuals
    // - { owner: 1, createdAt: -1 } for sorted user queries
  }

  /**
   * Converts a MongoDB VisualDocument into the public Visual interface.
   * @param doc The VisualDocument retrieved from MongoDB.
   * @returns The public Visual object.
   */
  private static toVisual(doc: VisualDocument): Visual {
    return {
      visualId: doc._id.toHexString(),
      promptText: doc.promptText,
      visualUrl: doc.visualUrl,
      style: doc.style,
      owner: doc.owner,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Generates a placeholder URL for a visual based on its ID.
   * In a real system, this would involve calling an external visual generation API.
   * @param visualId The ObjectId of the visual.
   * @returns A placeholder URL string.
   */
  private static generatePlaceholderUrl(visualId: ObjectId): string {
    return `https://api.visualgen.example.com/visuals/${visualId.toHexString()}`;
  }

  /**
   * Validates if a given style string is one of the `ALLOWED_VISUAL_STYLES`.
   * @param style The style string to validate.
   * @returns True if the style is valid, false otherwise.
   */
  private static isValidStyle(style: string): style is VisualStyle {
    return (ALLOWED_VISUAL_STYLES as readonly string[]).includes(style);
  }

  /**
   * Generates a new visual based on a text prompt, desired style, and owner.
   * Stores the visual in MongoDB with a unique ID and a placeholder URL.
   *
   * @param params - Object containing `text`, `style`, and `owner`.
   * @returns A success result with the newly created visual, or an error if the style is invalid.
   */
  public async generateVisual({
    text,
    style,
    owner,
  }: GenerateVisualParams): Promise<GenerateVisualResult> {
    // Validate text is non-empty
    if (!text || text.trim().length === 0) {
      return { status: "error", error: "Text prompt cannot be empty." };
    }

    // Validate style
    if (!VisualGenerationConcept.isValidStyle(style)) {
      return {
        status: "error",
        error: `Invalid visual style: "${style}". Allowed styles are: ${ALLOWED_VISUAL_STYLES.join(", ")}.`,
      };
    }

    const visualId = new ObjectId(); // Pre-generate ObjectId for _id
    const visualUrl = VisualGenerationConcept.generatePlaceholderUrl(visualId);
    const createdAt = new Date();

    const newVisualDocument: VisualDocument = {
      _id: visualId,
      promptText: text,
      visualUrl,
      style,
      owner,
      createdAt,
    };

    try {
      const result = await this.collection.insertOne(newVisualDocument);
      if (!result.acknowledged) {
        return { status: "error", error: "Failed to insert visual into the database." };
      }
      return { status: "success", visual: VisualGenerationConcept.toVisual(newVisualDocument) };
    } catch (error: unknown) {
      console.error("VisualGenerationConcept: Failed to insert visual:", error);
      return { status: "error", error: `Database error during generateVisual: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Retrieves a visual by its unique `visualId`.
   *
   * @param params - Object containing the `visualId` to retrieve.
   * @returns A success result with the visual, or an error if the ID is invalid or not found.
   */
  public async getVisual({ visualId }: GetVisualParams): Promise<GetVisualResult> {
    if (!ObjectId.isValid(visualId)) {
      return { status: "error", error: "Invalid visual ID format." };
    }

    try {
      const doc = await this.collection.findOne({ _id: new ObjectId(visualId) });

      if (!doc) {
        return { status: "error", error: `Visual with ID "${visualId}" not found.` };
      }
      return { status: "success", visual: VisualGenerationConcept.toVisual(doc) };
    } catch (error: unknown) {
      console.error("VisualGenerationConcept: Failed to retrieve visual:", error);
      return { status: "error", error: `Database error during getVisual: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Regenerates the `visualUrl` for an existing visual. The prompt text and style
   * of the visual remain unchanged. This simulates generating a new image
   * based on the same parameters.
   *
   * @param params - Object containing the `visualId` of the visual to regenerate.
   * @returns A success result with the updated visual, or an error if the visual is not found.
   */
  public async regenerateVisual({
    visualId,
  }: RegenerateVisualParams): Promise<RegenerateVisualResult> {
    if (!ObjectId.isValid(visualId)) {
      return { status: "error", error: "Invalid visual ID format." };
    }

    const objectId = new ObjectId(visualId);
    // Generate a new URL, simulating a new generation with timestamp
    const timestamp = Date.now();
    const newVisualUrl = `https://api.visualgen.example.com/visuals/${objectId.toHexString()}?v=${timestamp}`;

    try {
      // Use updateOne + findOne pattern (following established patterns)
      const updateResult = await this.collection.updateOne(
        { _id: objectId },
        { $set: { visualUrl: newVisualUrl } }
      );

      if (updateResult.modifiedCount === 0) {
        // Check if visual exists
        const existingVisual = await this.collection.findOne({ _id: objectId });
        if (!existingVisual) {
          return { status: "error", error: `Visual with ID "${visualId}" not found for regeneration.` };
        }
      }

      // Fetch the updated document
      const updatedDoc = await this.collection.findOne({ _id: objectId });
      if (!updatedDoc) {
        return { status: "error", error: "Failed to retrieve regenerated visual." };
      }

      return { status: "success", visual: VisualGenerationConcept.toVisual(updatedDoc) };
    } catch (error: unknown) {
      console.error("VisualGenerationConcept: Failed to regenerate visual:", error);
      return { status: "error", error: `Database error during regenerateVisual: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Deletes a visual by its unique `visualId`.
   *
   * @param params - Object containing the `visualId` of the visual to delete.
   * @returns A success result, or an error if the visual was not found.
   */
  public async deleteVisual({ visualId }: DeleteVisualParams): Promise<DeleteVisualResult> {
    if (!ObjectId.isValid(visualId)) {
      return { status: "error", error: "Invalid visual ID format." };
    }

    try {
      const result = await this.collection.deleteOne({ _id: new ObjectId(visualId) });

      if (result.deletedCount === 0) {
        return { status: "error", error: `Visual with ID "${visualId}" not found for deletion.` };
      }
      return { status: "success", message: `Visual with ID "${visualId}" deleted successfully.` };
    } catch (error: unknown) {
      console.error("VisualGenerationConcept: Failed to delete visual:", error);
      return { status: "error", error: `Database error during deleteVisual: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Retrieves all visuals generated by a specific user.
   *
   * @param params - Object containing the `userId`.
   * @returns A success result with an array of visuals.
   */
  public async getUserVisuals({ userId }: GetUserVisualsParams): Promise<GetUserVisualsResult> {
    try {
      const docs = await this.collection.find({ owner: userId }).toArray();
      const visuals = docs.map(VisualGenerationConcept.toVisual);
      return { status: "success", visuals };
    } catch (error: unknown) {
      console.error("VisualGenerationConcept: Failed to retrieve user visuals:", error);
      return { status: "error", error: `Database error during getUserVisuals: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

