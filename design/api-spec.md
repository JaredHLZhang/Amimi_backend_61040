# Amimi Backend API Specification

Base URL: http://localhost:8000/api

## Pairing Concept

### generateCode
- **Endpoint:** `POST /api/Pairing/generateCode`
- **Description:** Generate a unique pairing code for a user
- **Request Body:**
  ```json
  {
    "userId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "code": "string"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### acceptPairing
- **Endpoint:** `POST /api/Pairing/acceptPairing`
- **Description:** Accept a pairing code to create a pair
- **Request Body:**
  ```json
  {
    "userId": "string",
    "code": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "pairId": "string"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### dissolvePair
- **Endpoint:** `POST /api/Pairing/dissolvePair`
- **Description:** Dissolve an active pair
- **Request Body:**
  ```json
  {
    "pairId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": "string"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getPair
- **Endpoint:** `POST /api/Pairing/getPair`
- **Description:** Get pair information for a user
- **Request Body:**
  ```json
  {
    "userId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "pair": {
      "pairId": "string",
      "user1": "string",
      "user2": "string",
      "active": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### isPaired
- **Endpoint:** `POST /api/Pairing/isPaired`
- **Description:** Check if a user is currently paired
- **Request Body:**
  ```json
  {
    "userId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "isPaired": true
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

---

## CommunicationInteraction Concept

### startInteraction
- **Endpoint:** `POST /api/CommunicationInteraction/startInteraction`
- **Description:** Start a communication interaction between participants
- **Request Body:**
  ```json
  {
    "participants": ["string"],
    "initiatorId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "interactionId": "string"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### endInteraction
- **Endpoint:** `POST /api/CommunicationInteraction/endInteraction`
- **Description:** End an active communication interaction
- **Request Body:**
  ```json
  {
    "interactionId": "string",
    "participantId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "interaction": {
      "interactionId": "string",
      "participants": ["string"],
      "active": false,
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-01-01T00:30:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getActiveInteraction
- **Endpoint:** `POST /api/CommunicationInteraction/getActiveInteraction`
- **Description:** Get active interaction for a user
- **Request Body:**
  ```json
  {
    "userId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "interaction": {
      "interactionId": "string",
      "participants": ["string"],
      "active": true,
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": null
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getInteractionDuration
- **Endpoint:** `POST /api/CommunicationInteraction/getInteractionDuration`
- **Description:** Get duration of a completed interaction
- **Request Body:**
  ```json
  {
    "interactionId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "durationMs": 1800000
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getInteractionHistory
- **Endpoint:** `POST /api/CommunicationInteraction/getInteractionHistory`
- **Description:** Get interaction history for a user
- **Request Body:**
  ```json
  {
    "userId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "interactions": [
      {
        "interactionId": "string",
        "participants": ["string"],
        "active": false,
        "startTime": "2024-01-01T00:00:00.000Z",
        "endTime": "2024-01-01T00:30:00.000Z"
      }
    ]
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

---

## ContentCapture Concept

### startCapture
- **Endpoint:** `POST /api/ContentCapture/startCapture`
- **Description:** Start capturing content from a source
- **Request Body:**
  ```json
  {
    "sourceId": "string",
    "type": "audio|image|text",
    "owner": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "captureId": "string"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### stopCapture
- **Endpoint:** `POST /api/ContentCapture/stopCapture`
- **Description:** Stop capturing and process content
- **Request Body:**
  ```json
  {
    "captureId": "string",
    "capturedText": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "capture": {
      "captureId": "string",
      "sourceId": "string",
      "capturedText": "string",
      "captureType": "audio|image|text",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "owner": "string",
      "status": "completed"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getCapture
- **Endpoint:** `POST /api/ContentCapture/getCapture`
- **Description:** Get capture information by ID
- **Request Body:**
  ```json
  {
    "captureId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "capture": {
      "captureId": "string",
      "sourceId": "string",
      "capturedText": "string",
      "captureType": "audio|image|text",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "owner": "string",
      "status": "completed"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getCapturesBySource
- **Endpoint:** `POST /api/ContentCapture/getCapturesBySource`
- **Description:** Get all captures for a source
- **Request Body:**
  ```json
  {
    "sourceId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "captures": [
      {
        "captureId": "string",
        "sourceId": "string",
        "capturedText": "string",
        "captureType": "audio|image|text",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "owner": "string",
        "status": "completed"
      }
    ]
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### deleteCapture
- **Endpoint:** `POST /api/ContentCapture/deleteCapture`
- **Description:** Delete a capture
- **Request Body:**
  ```json
  {
    "captureId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": "string"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

---

## VisualGeneration Concept

### generateVisual
- **Endpoint:** `POST /api/VisualGeneration/generateVisual`
- **Description:** Generate visual content from text prompt
- **Request Body:**
  ```json
  {
    "promptText": "string",
    "style": "comic|photo|abstract|sketch|watercolor",
    "owner": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "visual": {
      "visualId": "string",
      "promptText": "string",
      "visualUrl": "string",
      "style": "comic|photo|abstract|sketch|watercolor",
      "owner": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getVisual
- **Endpoint:** `POST /api/VisualGeneration/getVisual`
- **Description:** Get visual by ID
- **Request Body:**
  ```json
  {
    "visualId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "visual": {
      "visualId": "string",
      "promptText": "string",
      "visualUrl": "string",
      "style": "comic|photo|abstract|sketch|watercolor",
      "owner": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### regenerateVisual
- **Endpoint:** `POST /api/VisualGeneration/regenerateVisual`
- **Description:** Regenerate visual with same prompt
- **Request Body:**
  ```json
  {
    "visualId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "visual": {
      "visualId": "string",
      "promptText": "string",
      "visualUrl": "string",
      "style": "comic|photo|abstract|sketch|watercolor",
      "owner": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### deleteVisual
- **Endpoint:** `POST /api/VisualGeneration/deleteVisual`
- **Description:** Delete a visual
- **Request Body:**
  ```json
  {
    "visualId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getUserVisuals
- **Endpoint:** `POST /api/VisualGeneration/getUserVisuals`
- **Description:** Get all visuals for a user
- **Request Body:**
  ```json
  {
    "owner": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "visuals": [
      {
        "visualId": "string",
        "promptText": "string",
        "visualUrl": "string",
        "style": "comic|photo|abstract|sketch|watercolor",
        "owner": "string",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

---

## ConversationalAgent Concept

### createConversation
- **Endpoint:** `POST /api/ConversationalAgent/createConversation`
- **Description:** Create a new conversation with the agent
- **Request Body:**
  ```json
  {
    "userId": "string",
    "context": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "conversation": {
      "conversationId": "string",
      "userId": "string",
      "context": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### sendUserMessage
- **Endpoint:** `POST /api/ConversationalAgent/sendUserMessage`
- **Description:** Send a message in a conversation
- **Request Body:**
  ```json
  {
    "conversationId": "string",
    "content": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": {
      "messageId": "string",
      "conversationId": "string",
      "isFromUser": true,
      "content": "string",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getAgentResponse
- **Endpoint:** `POST /api/ConversationalAgent/getAgentResponse`
- **Description:** Get agent response to a user message
- **Request Body:**
  ```json
  {
    "conversationId": "string",
    "userMessageContent": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "response": {
      "messageId": "string",
      "conversationId": "string",
      "isFromUser": false,
      "content": "string",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getHistory
- **Endpoint:** `POST /api/ConversationalAgent/getHistory`
- **Description:** Get conversation history
- **Request Body:**
  ```json
  {
    "conversationId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "messages": [
      {
        "messageId": "string",
        "conversationId": "string",
        "isFromUser": true,
        "content": "string",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### updateContext
- **Endpoint:** `POST /api/ConversationalAgent/updateContext`
- **Description:** Update conversation context
- **Request Body:**
  ```json
  {
    "conversationId": "string",
    "newContext": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "conversation": {
      "conversationId": "string",
      "userId": "string",
      "context": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### deleteConversation
- **Endpoint:** `POST /api/ConversationalAgent/deleteConversation`
- **Description:** Delete a conversation
- **Request Body:**
  ```json
  {
    "conversationId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": "string"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

---

## GroupConversation Concept

### createGroupConversation
- **Endpoint:** `POST /api/GroupConversation/createGroupConversation`
- **Description:** Create a new group conversation
- **Request Body:**
  ```json
  {
    "participants": ["string"],
    "context": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "conversation": {
      "conversationId": "string",
      "participants": ["string"],
      "context": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### addParticipant
- **Endpoint:** `POST /api/GroupConversation/addParticipant`
- **Description:** Add a participant to a group conversation
- **Request Body:**
  ```json
  {
    "conversationId": "string",
    "user": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "conversation": {
      "conversationId": "string",
      "participants": ["string"],
      "context": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### sendMessage
- **Endpoint:** `POST /api/GroupConversation/sendMessage`
- **Description:** Send a message in a group conversation
- **Request Body:**
  ```json
  {
    "conversationId": "string",
    "sender": "string",
    "content": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": {
      "messageId": "string",
      "conversationId": "string",
      "sender": "string",
      "isFromAgent": false,
      "content": "string",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getAgentResponse
- **Endpoint:** `POST /api/GroupConversation/getAgentResponse`
- **Description:** Get agent response in a group conversation
- **Request Body:**
  ```json
  {
    "conversationId": "string",
    "contextPrompt": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": {
      "messageId": "string",
      "conversationId": "string",
      "sender": "amimi-agent",
      "isFromAgent": true,
      "content": "string",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### getHistory
- **Endpoint:** `POST /api/GroupConversation/getHistory`
- **Description:** Get conversation history
- **Request Body:**
  ```json
  {
    "conversationId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "messages": [
      {
        "messageId": "string",
        "conversationId": "string",
        "sender": "string",
        "isFromAgent": false,
        "content": "string",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### updateContext
- **Endpoint:** `POST /api/GroupConversation/updateContext`
- **Description:** Update conversation context
- **Request Body:**
  ```json
  {
    "conversationId": "string",
    "newContext": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "conversation": {
      "conversationId": "string",
      "participants": ["string"],
      "context": "string",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```

### deleteConversation
- **Endpoint:** `POST /api/GroupConversation/deleteConversation`
- **Description:** Delete a group conversation
- **Request Body:**
  ```json
  {
    "conversationId": "string"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": "string"
  }
  ```
- **Error Response:**
  ```json
  {
    "status": "error",
    "error": "string"
  }
  ```
