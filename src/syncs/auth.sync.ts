/**
 * Authentication synchronizations
 * These syncs validate user sessions before allowing access to protected endpoints.
 */

import { Sessioning, Requesting, Pairing, ConversationalAgent, GroupConversation } from "@concepts";
import { actions, Sync, Frames } from "@engine";

// ===== PAIRING AUTHENTICATION =====

export const AuthenticatedGenerateCode: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Pairing/generateCode", session },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([Pairing.generateCode, { user }])
});

export const GenerateCodeResponse: Sync = ({ request, code }) => ({
  when: actions(
    [Requesting.request, { path: "/Pairing/generateCode" }, { request }],
    [Pairing.generateCode, {}, { code }]
  ),
  then: actions([Requesting.respond, { request, code }])
});

export const GenerateCodeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Pairing/generateCode" }, { request }],
    [Pairing.generateCode, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }])
});

export const AuthenticatedAcceptPairing: Sync = ({ request, session, user, code }) => ({
  when: actions([
    Requesting.request,
    { path: "/Pairing/acceptPairing", session, code },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([Pairing.acceptPairing, { user, code }])
});

export const AcceptPairingResponse: Sync = ({ request, pair }) => ({
  when: actions(
    [Requesting.request, { path: "/Pairing/acceptPairing" }, { request }],
    [Pairing.acceptPairing, {}, { pair }]
  ),
  then: actions([Requesting.respond, { request, pair }])
});

export const AcceptPairingError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Pairing/acceptPairing" }, { request }],
    [Pairing.acceptPairing, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }])
});

export const AuthenticatedDissolvePair: Sync = ({ request, session, user, pair }) => ({
  when: actions([
    Requesting.request,
    { path: "/Pairing/dissolvePair", session, pair },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([Pairing.dissolvePair, { pair }])
});

export const DissolvePairResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Pairing/dissolvePair" }, { request }],
    [Pairing.dissolvePair, {}, {}]
  ),
  then: actions([Requesting.respond, { request }])
});

export const AuthenticatedGetPair: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Pairing/getPair", session },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([Pairing.getPair, { user }])
});

export const GetPairResponse: Sync = ({ request, pair, sharedConversationId, partner }) => ({
  when: actions(
    [Requesting.request, { path: "/Pairing/getPair" }, { request }],
    [Pairing.getPair, {}, { pair, sharedConversationId, partner }]
  ),
  then: actions([Requesting.respond, { request, pair, sharedConversationId, partner }])
});

export const GetPairError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Pairing/getPair" }, { request }],
    [Pairing.getPair, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }])
});

export const AuthenticatedIsPaired: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Pairing/isPaired", session },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([Pairing.isPaired, { user }])
});

export const IsPairedResponse: Sync = ({ request, isPaired }) => ({
  when: actions(
    [Requesting.request, { path: "/Pairing/isPaired" }, { request }],
    [Pairing.isPaired, {}, { isPaired }]
  ),
  then: actions([Requesting.respond, { request, isPaired }])
});

// ===== CONVERSATIONAL AGENT AUTHENTICATION =====

export const AuthenticatedCreateConversation: Sync = ({ request, session, user, userId, context }) => ({
  when: actions([
    Requesting.request,
    { path: "/ConversationalAgent/createConversation", session, userId, context },
    { request }
  ]),
  where: async (frames) => {
    const authFrames = await frames.query(Sessioning._getUserBySession, { session }, { user });
    if (authFrames.length === 0) {
      // Authentication failed - return error frame to trigger error response sync
      const originalFrame = frames[0];
      return new Frames({ ...originalFrame, error: "Invalid or expired session", status: "error" });
    }
    // Auth succeeded - filter out any error frames and return only success frames with user
    return authFrames.filter(($) => !$.status || $.status !== "error");
  },
  then: actions([ConversationalAgent.createConversation, { userId: user, context }])
});

// Separate response syncs for createConversation success and error
export const CreateConversationSuccessResponse: Sync = ({ request, status, conversation }) => ({
  when: actions(
    [Requesting.request, { path: "/ConversationalAgent/createConversation" }, { request }],
    [ConversationalAgent.createConversation, {}, { status, conversation }] // Match success case
  ),
  then: actions([Requesting.respond, { request, status, conversation }])
});

export const CreateConversationErrorResponse: Sync = ({ request, status, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ConversationalAgent/createConversation" }, { request }],
    [ConversationalAgent.createConversation, {}, { status, error }] // Match error case
  ),
  then: actions([Requesting.respond, { request, status, error }])
});

export const CreateConversationAuthError: Sync = ({ request, error, status }) => ({
  when: actions([
    Requesting.request,
    { path: "/ConversationalAgent/createConversation" },
    { request }
  ]),
  where: (frames) => frames.filter(($) => $.status === "error" && $.error),
  then: actions([Requesting.respond, { request, status, error }])
});

export const AuthenticatedSendUserMessage: Sync = ({ request, session, user, conversationId, content }) => ({
  when: actions([
    Requesting.request,
    { path: "/ConversationalAgent/sendUserMessage", session, conversationId, content },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([ConversationalAgent.sendUserMessage, { conversationId, content }])
});

// Separate response syncs for sendUserMessage
export const SendUserMessageSuccessResponse: Sync = ({ request, status, message }) => ({
  when: actions(
    [Requesting.request, { path: "/ConversationalAgent/sendUserMessage" }, { request }],
    [ConversationalAgent.sendUserMessage, {}, { status, message }] // Match success case
  ),
  then: actions([Requesting.respond, { request, status, message }])
});

export const SendUserMessageErrorResponse: Sync = ({ request, status, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ConversationalAgent/sendUserMessage" }, { request }],
    [ConversationalAgent.sendUserMessage, {}, { status, error }] // Match error case
  ),
  then: actions([Requesting.respond, { request, status, error }])
});

export const AuthenticatedGetAgentResponse: Sync = ({ request, session, user, conversationId, userMessageContent }) => ({
  when: actions([
    Requesting.request,
    { path: "/ConversationalAgent/getAgentResponse", session, conversationId, userMessageContent },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([ConversationalAgent.getAgentResponse, { conversationId, userMessageContent }])
});

// Separate response syncs for getAgentResponse
export const GetAgentResponseSuccessResponse: Sync = ({ request, status, message }) => ({
  when: actions(
    [Requesting.request, { path: "/ConversationalAgent/getAgentResponse" }, { request }],
    [ConversationalAgent.getAgentResponse, {}, { status, message }] // Match success case
  ),
  then: actions([Requesting.respond, { request, status, message }])
});

export const GetAgentResponseErrorResponse: Sync = ({ request, status, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ConversationalAgent/getAgentResponse" }, { request }],
    [ConversationalAgent.getAgentResponse, {}, { status, error }] // Match error case
  ),
  then: actions([Requesting.respond, { request, status, error }])
});

export const AuthenticatedGetHistory: Sync = ({ request, session, user, conversationId }) => ({
  when: actions([
    Requesting.request,
    { path: "/ConversationalAgent/getHistory", session, conversationId },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([ConversationalAgent.getHistory, { conversationId }])
});

// Response sync for getHistory - separate syncs for success and error
export const GetHistorySuccessResponse: Sync = ({ request, status, messages }) => ({
  when: actions(
    [Requesting.request, { path: "/ConversationalAgent/getHistory" }, { request }],
    [ConversationalAgent.getHistory, {}, { status, messages }] // Match success case
  ),
  then: actions([Requesting.respond, { request, status, messages }])
});

export const GetHistoryErrorResponse: Sync = ({ request, status, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ConversationalAgent/getHistory" }, { request }],
    [ConversationalAgent.getHistory, {}, { status, error }] // Match error case
  ),
  then: actions([Requesting.respond, { request, status, error }])
});

// ===== GROUP CONVERSATION AUTHENTICATION =====

export const AuthenticatedCreateGroupConversation: Sync = ({ request, session, user, participants, context }) => ({
  when: actions([
    Requesting.request,
    { path: "/GroupConversation/createGroupConversation", session, participants, context },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([GroupConversation.createGroupConversation, { participants, context }])
});

// Separate response syncs for createGroupConversation
export const CreateGroupConversationSuccessResponse: Sync = ({ request, status, conversation }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/createGroupConversation" }, { request }],
    [GroupConversation.createGroupConversation, {}, { status, conversation }] // Match success case
  ),
  then: actions([Requesting.respond, { request, status, conversation }])
});

export const CreateGroupConversationErrorResponse: Sync = ({ request, status, error }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/createGroupConversation" }, { request }],
    [GroupConversation.createGroupConversation, {}, { status, error }] // Match error case
  ),
  then: actions([Requesting.respond, { request, status, error }])
});

export const AuthenticatedGroupSendMessage: Sync = ({ request, session, user, conversationId, sender, content }) => ({
  when: actions([
    Requesting.request,
    { path: "/GroupConversation/sendMessage", session, conversationId, sender, content },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([GroupConversation.sendMessage, { conversationId, sender, content }])
});

// Separate response syncs for Group sendMessage
export const GroupSendMessageSuccessResponse: Sync = ({ request, status, message }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/sendMessage" }, { request }],
    [GroupConversation.sendMessage, {}, { status, message }] // Match success case
  ),
  then: actions([Requesting.respond, { request, status, message }])
});

export const GroupSendMessageErrorResponse: Sync = ({ request, status, error }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/sendMessage" }, { request }],
    [GroupConversation.sendMessage, {}, { status, error }] // Match error case
  ),
  then: actions([Requesting.respond, { request, status, error }])
});

export const AuthenticatedGroupGetAgentResponse: Sync = ({ request, session, user, conversationId, contextPrompt }) => ({
  when: actions([
    Requesting.request,
    { path: "/GroupConversation/getAgentResponse", session, conversationId, contextPrompt },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([GroupConversation.getAgentResponse, { conversationId, contextPrompt }])
});

// Separate response syncs for Group getAgentResponse
export const GroupGetAgentResponseSuccessResponse: Sync = ({ request, status, message }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/getAgentResponse" }, { request }],
    [GroupConversation.getAgentResponse, {}, { status, message }] // Match success case
  ),
  then: actions([Requesting.respond, { request, status, message }])
});

export const GroupGetAgentResponseErrorResponse: Sync = ({ request, status, error }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/getAgentResponse" }, { request }],
    [GroupConversation.getAgentResponse, {}, { status, error }] // Match error case
  ),
  then: actions([Requesting.respond, { request, status, error }])
});

export const AuthenticatedGetUserInfo: Sync = ({ request, session, user, name }) => ({
  when: actions([
    Requesting.request,
    { path: "/Sessioning/getUserInfo", session },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([Sessioning.getUserInfo, { session }, { name }])
});

export const GetUserInfoResponse: Sync = ({ request, user, name }) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/getUserInfo" }, { request }],
    [Sessioning.getUserInfo, {}, { user, name }]
  ),
  then: actions([Requesting.respond, { request, user, name }])
});

export const GetUserInfoErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/getUserInfo" }, { request }],
    [Sessioning.getUserInfo, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }])
});

export const AuthenticatedGroupGetHistory: Sync = ({ request, session, user, conversationId }) => ({
  when: actions([
    Requesting.request,
    { path: "/GroupConversation/getHistory", session, conversationId },
    { request }
  ]),
  where: async (frames) => {
    return frames.query(Sessioning._getUserBySession, { session }, { user });
  },
  then: actions([GroupConversation.getHistory, { conversationId }])
});

// Response sync for getHistory - create separate syncs for success (with messages) and error (with error)
// This works around the sync engine requiring all output pattern fields to exist
export const GroupGetHistorySuccessResponse: Sync = ({ request, status, messages }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/getHistory" }, { request }],
    [GroupConversation.getHistory, {}, { status, messages }] // Match success case with messages
  ),
  then: actions([Requesting.respond, { request, status, messages }])
});

export const GroupGetHistoryErrorResponse: Sync = ({ request, status, error }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/getHistory" }, { request }],
    [GroupConversation.getHistory, {}, { status, error }] // Match error case with error
  ),
  then: actions([Requesting.respond, { request, status, error }])
});

