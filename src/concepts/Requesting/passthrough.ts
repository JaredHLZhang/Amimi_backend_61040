/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Public registration and login endpoints - no authentication required
  "/api/Sessioning/register": "public registration endpoint",
  "/api/Sessioning/login": "public login endpoint",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Sessioning endpoints that require auth
  "/api/Sessioning/logout",
  "/api/Sessioning/getUser",
  "/api/Sessioning/validateSession",
  "/api/Sessioning/getUserInfo",
  "/api/Sessioning/createSession", // internal helper
  "/api/Sessioning/cleanupExpiredSessions", // internal helper
  "/api/Sessioning/_getUserBySession", // query for syncs
  
  // Pairing endpoints - all require authentication
  "/api/Pairing/generateCode",
  "/api/Pairing/acceptPairing",
  "/api/Pairing/dissolvePair",
  "/api/Pairing/getPair",
  "/api/Pairing/isPaired",
  "/api/Pairing/updateSharedConversation", // internal helper for syncs
  
  // ConversationalAgent endpoints - all require authentication
  "/api/ConversationalAgent/createConversation",
  "/api/ConversationalAgent/sendUserMessage",
  "/api/ConversationalAgent/getAgentResponse",
  "/api/ConversationalAgent/getHistory",
  "/api/ConversationalAgent/updateContext",
  "/api/ConversationalAgent/deleteConversation",
  "/api/ConversationalAgent/getConversationById", // internal helper
  
  // GroupConversation endpoints - all require authentication
  "/api/GroupConversation/createGroupConversation",
  "/api/GroupConversation/addParticipant",
  "/api/GroupConversation/sendMessage",
  "/api/GroupConversation/getAgentResponse",
  "/api/GroupConversation/getHistory",
  "/api/GroupConversation/updateContext",
  "/api/GroupConversation/deleteConversation",
  
  // ContentCapture endpoints - all require authentication
  "/api/ContentCapture/startCapture",
  "/api/ContentCapture/stopCapture",
  "/api/ContentCapture/getCapture",
  "/api/ContentCapture/getCapturesBySource",
  "/api/ContentCapture/deleteCapture",
  "/api/ContentCapture/isValidCaptureType", // internal helper
  
  // CommunicationInteraction endpoints - all require authentication
  "/api/CommunicationInteraction/startInteraction",
  "/api/CommunicationInteraction/endInteraction",
  "/api/CommunicationInteraction/getActiveInteraction",
  "/api/CommunicationInteraction/getInteractionDuration",
  "/api/CommunicationInteraction/getInteractionHistory",
];
