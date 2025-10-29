# Design Changes Summary

This document summarizes major changes made to the Amimi backend design during implementation.

## Overview

The backend has been successfully implemented with all core concepts and several enhancements beyond the original design. This document outlines the key additions and modifications.

## Major Changes

### 1. Addition of GroupConversation Concept

**Original Design**: The initial design focused on individual user interactions with Amimi through the ConversationalAgent concept.

**Change**: Added a new `GroupConversation` concept to support multi-user conversations, enabling couples to chat together with Amimi's assistance.

**Implementation Details**:
- Created `GroupConversationConcept.ts` with full CRUD operations for group conversations
- Supports multiple participants in a single conversation
- Tracks messages with sender identification
- Integrates with Gemini AI for shared response generation
- Located in: `src/concepts/GroupConversation/`

**Design Rationale**: 
This addition was essential to support the user journey where couples interact together with Amimi, as described in the user journey document. It enables the shared chat functionality demonstrated in the prototype.

### 2. Gemini AI Integration

**Original Design**: The ConversationalAgent concept was designed with a placeholder for AI responses.

**Change**: Integrated Google's Gemini AI API for generating natural, empathetic responses in both private and shared conversations.

**Implementation Details**:
- Created `src/utils/gemini.ts` service for Gemini API interactions
- Two separate prompt systems:
  - **Private Chat**: Empathetic, friend-like responses focused on individual reflection
  - **Shared Chat**: Couple-focused responses with activity suggestions and relationship guidance
- Improved prompts to create natural, warm conversations (2-3 sentences typically)
- Response generation uses conversation history for context

**Design Rationale**:
This integration was necessary to fulfill the core value proposition of Amimi as an AI companion that provides meaningful support and guidance. The dual prompt system allows Amimi to adapt its tone appropriately based on conversation context.

### 3. Shared Conversation Synchronization with Pairing

**Original Design**: Pairing concept focused solely on connecting two users.

**Change**: Enhanced the Pairing concept to automatically create a GroupConversation when two users successfully pair.

**Implementation Details**:
- Modified `PairingConcept.acceptPairing()` to create a shared conversation automatically
- Added `sharedConversationId` field to `PairDocument` interface
- Updated `getPair()` query to return shared conversation ID
- Synchronization logic located in: `src/concepts/Pairing/PairingConcept.ts` (lines ~160-175)

**Design Rationale**:
This synchronization ensures that once users are paired, they immediately have access to shared chat functionality. It provides a seamless user experience where pairing and shared conversation are integrated rather than requiring separate setup steps.

### 4. Enhanced AI Prompt Engineering

**Original Design**: Basic system prompts focused on providing relationship advice.

**Change**: Completely redesigned prompts to create a more natural, empathetic, friend-like AI personality.

**Key Improvements**:
- **Tone**: Shifted from therapist/coach to warm friend who understands psychology
- **Length**: Explicitly requested shorter responses (2-3 sentences)
- **Style**: Conversational, using emotional vocabulary
- **Approach**: Empathy → Question → Reflection guidance rather than direct advice
- **Adaptation**: Different tones for different emotional states (hurt, confused, angry, happy)

**Implementation Details**:
- Updated `buildSystemPrompt()` for private conversations
- Updated `buildSharedSystemPrompt()` for shared conversations
- Added example responses in prompts to guide tone
- Located in: `src/utils/gemini.ts`

**Design Rationale**:
User testing and feedback indicated that initial AI responses felt too formal and machine-like. The new prompts create a more authentic, supportive companion experience that aligns with Amimi's brand as a gentle friend rather than a clinical tool.

### 5. API Changes

**Additions**:
- `/GroupConversation/*` endpoints for all group conversation operations
  - `createGroupConversation`
  - `addParticipant`
  - `sendMessage`
  - `getAgentResponse`
  - `getHistory`
  - `updateContext`
  - `deleteConversation`

**Modifications**:
- `/Pairing/getPair` now returns `sharedConversationId` and `partner` ID in addition to `pair` ID
- `/Pairing/acceptPairing` now automatically creates shared conversation (synchronization)

**No Breaking Changes**: All existing endpoints maintain their original signatures. New fields are additive only.

## Testing

All concepts have comprehensive test suites:
- Unit tests for each concept's core functionality
- Integration tests for synchronizations
- Test files located in: `src/concepts/*/Concept.test.ts`

To run tests:
```bash
deno test --allow-net --allow-env
```

## Backwards Compatibility

All changes maintain backwards compatibility:
- Existing API endpoints unchanged
- New fields are optional (use of `sharedConversationId` is optional)
- No breaking changes to concept interfaces

## Future Considerations

While not implemented in this version, the design supports:
- Rich media message types (currently supports text)
- Message reactions and interactions
- Conversation analytics and insights
- Advanced context management for AI responses

## Related Files

- Full API specification: `design/api-spec.md`
- Concept designs: `design/concepts/*/`
- Implementation code: `src/concepts/*/`
- Synchronization definitions: `design/synchronizations.md`

