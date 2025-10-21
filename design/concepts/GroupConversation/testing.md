# GroupConversation Concept Testing

## Background Documents

- [[../background/concept-design-brief.md]]
- [[../background/concept-design-overview.md]]
- [[../background/concept-specifications.md]]
- [[../background/implementing-concepts.md]]
- [[../background/testing-concepts.md]]

## Concept Specification

- [[GroupConversation.md]]

## Implementation

- [[GroupConversationConcept.ts]]

## Testing Instructions

Please create comprehensive tests for the GroupConversation concept following the established patterns in the codebase. Key requirements:

1. **File Location**: `src/concepts/GroupConversation/GroupConversationConcept.test.ts`

2. **Test Structure**: Use separate `Deno.test()` calls instead of nested `t.step()`

3. **Test Coverage**:
   - 1 operational principle test (create → send → agent responds → history)
   - 3 createGroupConversation tests (success with 2 users, with 3+ users, error cases)
   - 4 sendMessage tests (success, not participant, empty content, not found)
   - 3 getAgentResponse tests (success, conversation not found, validates context)
   - 4 getHistory tests (chronological order, empty history, filters by conversation)
   - 3 updateContext tests (success, not found, persists)
   - 3 deleteConversation tests (success, cascade deletes messages, not found)

4. **Test Patterns**:
   - Use `testDb()` utility for clean database instances
   - Cast user IDs to `ID` type: `"user-alice" as ID`
   - Use `finally` blocks to close database connections
   - Test both success and error cases
   - Verify return types and data integrity

5. **Key Test Scenarios**:
   - Create group conversation with multiple participants
   - Send messages from different participants
   - Get agent responses with context
   - Retrieve message history in chronological order
   - Update conversation context
   - Delete conversation and verify cascade deletion of messages
   - Error handling for invalid IDs, missing conversations, etc.

Please provide a complete, production-ready test suite following the established codebase patterns.
