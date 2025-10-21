# GroupConversation Concept Implementation

## Background Documents

- [[../background/concept-design-brief.md]]
- [[../background/concept-design-overview.md]]
- [[../background/concept-specifications.md]]
- [[../background/implementing-concepts.md]]
- [[../background/testing-concepts.md]]

## Concept Specification

- [[GroupConversation.md]]

## Implementation Instructions

Please implement the GroupConversation concept following the established patterns in the codebase. Key requirements:

1. **File Location**: `src/concepts/GroupConversation/GroupConversationConcept.ts`

2. **Patterns to Follow**:
   - Use `npm:mongodb` for imports (`Collection`, `Db`, `ObjectId`)
   - Constructor takes `Db` instance
   - Object parameter pattern for all methods
   - Return union types: `{ status: 'success'; data } | { status: 'error'; error: string }`
   - Two collections: `groupConversations` and `groupMessages`
   - Pre-generate ObjectIds before insert
   - Validate participants array is non-empty
   - Store participants as array of IDs

3. **Type Definitions**:
   - `GroupConversation` interface for public API
   - `GroupMessage` interface for public API
   - Internal document interfaces for MongoDB storage
   - Parameter and result types for each action

4. **Key Methods**:
   - `createGroupConversation({ participants, context })`
   - `addParticipant({ conversationId, user })`
   - `sendMessage({ conversationId, sender, content })`
   - `getAgentResponse({ conversationId, contextPrompt })`
   - `getHistory({ conversationId })`
   - `updateContext({ conversationId, newContext })`
   - `deleteConversation({ conversationId })`

5. **Error Handling**:
   - Validate input parameters
   - Check conversation existence
   - Verify sender is participant for sendMessage
   - Handle MongoDB errors gracefully

6. **MongoDB Collections**:
   - `groupConversations`: stores conversation metadata
   - `groupMessages`: stores individual messages
   - Use ObjectId for primary keys
   - Index on conversationId for messages

Please provide a complete, production-ready implementation following the established codebase patterns.
