# Synchronizations for Amimi

This document describes how the independent concepts compose together through synchronizations to create Amimi's features.

## Sync 1: Auto-Capture During Communication

```
sync AutoCaptureCommunication
when
    CommunicationInteraction.startInteraction(participants) creates interaction i
where
    in Pairing: participants form a pair p
then
    ContentCapture.startCapture(i.id, "communication", p.user1)
```

**Purpose**: Automatically start capturing content when a communication interaction begins between paired users.

```
sync StopCaptureWhenCommunicationEnds
when
    CommunicationInteraction.endInteraction(interaction i)
then
    ContentCapture.stopCapture(i.id)
```

**Purpose**: Stop capturing content when the communication interaction ends.

---

## Sync 2: Generate Memory After Communication

```
sync CreateMemoryAfterCommunication
when
    CommunicationInteraction.endInteraction(interaction i)
where
    in ContentCapture: capture c exists for i.id
    in Pairing: interaction participants form pair p
then
    VisualGeneration.generateVisual(c.capturedText, "comic", p.user1)
```

**Purpose**: After a communication interaction ends, use the captured content to generate a visual memory (storyboard) for the pair.

---

## Sync 3: Contextualize Agent Responses

```
sync ContextualizeAgent
when
    ConversationalAgent.getAgentResponse(conversation c, message m)
where
    in Pairing: conversation.user is in pair p
    in ContentCapture: recent captures for p exist
then
    ConversationalAgent.updateContext(c, captures.text)
    [then generate response with this context]
```

**Purpose**: When generating agent responses, pull in context from recent captures to provide personalized, contextual advice based on the couple's actual conversations.

---

## Sync 4: Initialize Pair Resources

```
sync InitializePairResources
when
    Pairing.acceptPairing(user, code) creates pair p
then
    ConversationalAgent.createConversation(p.user1, "paired_context")
    ConversationalAgent.createConversation(p.user2, "paired_context")
```

**Purpose**: When users pair up, automatically create conversational agent instances for both users so they can chat with Amimi about their relationship.

---

## Feature Composition

These syncs compose the concepts to create Amimi's main features:

### Feature: Call Listener
- `CommunicationInteraction` provides the communication session
- `ContentCapture` listens and transcribes
- Syncs 1 coordinate the automatic capture

### Feature: Memory Storyboard
- `CommunicationInteraction` provides the session
- `ContentCapture` provides transcribed text
- `VisualGeneration` creates the visual storyboard
- Sync 2 coordinates the generation after communication

### Feature: Chat with Amimi
- `ConversationalAgent` provides the chatbot
- `ContentCapture` provides relationship context
- `Pairing` identifies the couple
- Syncs 3 & 4 coordinate context and initialization

