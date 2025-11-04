# Amimi Backend

## Backend Console Trace For Assignment 4C

**Backend Console Trace** - [backend-trace.txt](backend-trace.txt)
- Complete trace of incoming actions to the backend during video demonstration
- Captured from Render dashboard console logs
- Shows all API requests, synchronizations, and responses
- Demonstrates authentication, pairing, conversation creation, message sending, and @Amimi mention triggering
- Includes timestamps and full action traces showing the sync engine in action

AI-powered relationship companion backend built with Deno, MongoDB, and Gemini AI.

## 🚀 Features

- **Concept-Based Architecture**: Modular, reusable concepts that compose to create application features
- **AI-Powered Chat**: Real-time conversational AI using Google's Gemini API
- **User Pairing**: Code-based pairing system for connecting partners
- **Content Capture**: Multi-modal content capture (audio, image, text)
- **Communication Tracking**: Real-time communication interaction management
- **Group Conversations**: Multi-user chat functionality

## 🏗️ Architecture

### Core Concepts

1. **Pairing**: User pairing and relationship management
2. **CommunicationInteraction**: Real-time communication tracking
3. **ContentCapture**: Multi-modal content capture and processing
4. **ConversationalAgent**: Gemini AI-powered chat functionality
5. **GroupConversation**: Multi-user conversation management

### Synchronizations

Concepts compose through synchronizations to create application features:
- Auto-capture during communication
- Generate memory after communication
- Contextualize agent responses
- Initialize pair resources
- Create shared group conversations

## 🛠️ Tech Stack

- **Runtime**: Deno
- **Database**: MongoDB Atlas
- **AI**: Google Gemini API
- **Framework**: Custom concept-based architecture
- **HTTP Server**: Hono
- **Testing**: Deno Test

## 📋 Prerequisites

- [Deno](https://deno.land/) installed
- MongoDB Atlas cluster
- Google Gemini API key

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/JaredHLZhang/Amimi_backend_61040.git
   cd Amimi_backend_61040
   ```

2. **Set up environment variables**
   Create a `.env` file in the root directory:
```env
   GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
   GEMINI_CONFIG=./geminiConfig.json
   MONGODB_URL=your_mongodb_connection_string
   DB_NAME=amimi_backend
   ```

3. **Build and start the server**
   ```bash
   deno task build  # Generate concept and sync imports
   deno task start  # Start server with sync engine
   ```

The server will start on `http://localhost:8000` with API endpoints at `/api/*`.

**Note**: Use `deno task concepts` to start the old concept server without sync engine.

## 🎯 Assignment 4C: Synchronization Engine

### Authentication

Added email/password authentication using the Sessioning concept:

- `POST /api/Sessioning/register` - Register new user
- `POST /api/Sessioning/login` - Login with email/password
- `POST /api/Sessioning/logout` - Logout and invalidate session
- `POST /api/Sessioning/getUser` - Get user from session (protected)
- `POST /api/Sessioning/validateSession` - Validate session (protected)

All protected endpoints require a valid session token in the request body.

### Synchronizations

Backend uses the sync engine for declarative orchestration:

- **auth.sync.ts**: Session validation for all protected endpoints
- **amimi.sync.ts**: Auto-trigger AI responses when users mention @Amimi
- **pairing.sync.ts**: Auto-create shared conversations on pairing

### Design Changes

See [design/assignment4c-changes.md](design/assignment4c-changes.md) for complete documentation of Assignment 4C changes.

## 📚 API Endpoints

### Pairing
- `POST /api/Pairing/generateCode` - Generate pairing code
- `POST /api/Pairing/acceptPairing` - Accept pairing code
- `POST /api/Pairing/dissolvePair` - Dissolve pair
- `POST /api/Pairing/getPair` - Get pair information
- `POST /api/Pairing/isPaired` - Check if user is paired

### ConversationalAgent
- `POST /api/ConversationalAgent/createConversation` - Create new conversation
- `POST /api/ConversationalAgent/sendUserMessage` - Send user message
- `POST /api/ConversationalAgent/getAgentResponse` - Get AI response
- `POST /api/ConversationalAgent/getHistory` - Get conversation history
- `POST /api/ConversationalAgent/updateContext` - Update conversation context
- `POST /api/ConversationalAgent/deleteConversation` - Delete conversation

### ContentCapture
- `POST /api/ContentCapture/startCapture` - Start content capture
- `POST /api/ContentCapture/stopCapture` - Stop content capture
- `POST /api/ContentCapture/getCapture` - Get capture details
- `POST /api/ContentCapture/getCapturesBySource` - Get captures by source
- `POST /api/ContentCapture/deleteCapture` - Delete capture

### CommunicationInteraction
- `POST /api/CommunicationInteraction/startInteraction` - Start communication
- `POST /api/CommunicationInteraction/endInteraction` - End communication
- `POST /api/CommunicationInteraction/getActiveInteraction` - Get active interaction
- `POST /api/CommunicationInteraction/getInteractionDuration` - Get duration
- `POST /api/CommunicationInteraction/getInteractionHistory` - Get history

### GroupConversation
- `POST /api/GroupConversation/createGroupConversation` - Create group chat
- `POST /api/GroupConversation/addParticipant` - Add participant
- `POST /api/GroupConversation/sendMessage` - Send group message
- `POST /api/GroupConversation/getAgentResponse` - Get AI response
- `POST /api/GroupConversation/getHistory` - Get group history
- `POST /api/GroupConversation/updateContext` - Update context
- `POST /api/GroupConversation/deleteConversation` - Delete group chat

## 🧪 Testing

Run the test suite:
```bash
deno test --allow-net --allow-read --allow-sys --allow-env
```

## 📖 Documentation

- [Concept Design Brief](design/background/concept-design-brief.md)
- [API Specification](design/api-spec.md)
- [Synchronizations](design/synchronizations.md)
- [Implementation Summary](design/implementation-summary.md)
- [**Design Changes Summary**](design/changes-summary.md) - Summary of major changes during implementation

## 📋 Assignment 2 Submission Files

All required files for Assignment 2 submission are located in the following locations:

### Required Documents

1. **Design Changes Summary** - [design/changes-summary.md](design/changes-summary.md)
   - Documents major changes from original design
   - Describes GroupConversation addition
   - Explains Gemini AI integration
   - Notes synchronization changes

2. **API Specification** - [design/api-spec.md](design/api-spec.md)
   - Complete API documentation for all endpoints
   - Request/response formats
   - Error handling specifications

3. **Concept Designs** - [design/concepts/](design/concepts/)
   - [Pairing](design/concepts/Pairing/Pairing.md)
   - [ConversationalAgent](design/concepts/ConversationalAgent/ConversationalAgent.md)
   - [GroupConversation](design/concepts/GroupConversation/GroupConversation.md)
   - [CommunicationInteraction](design/concepts/CommunicationInteraction/CommunicationInteraction.md)
   - [ContentCapture](design/concepts/ContentCapture/ContentCapture.md)
   - Note: VisualGeneration and LikertSurvey exist in design documents but were not implemented in the MVP

4. **Synchronizations** - [design/synchronizations.md](design/synchronizations.md)
   - Rules for how concepts interact
   - Composition patterns

5. **Background Documentation** - [design/background/](design/background/)
   - [Concept Design Brief](design/background/concept-design-brief.md)
   - [Concept Design Overview](design/background/concept-design-overview.md)
   - [Concept Specifications](design/background/concept-specifications.md)
   - [Implementing Concepts](design/background/implementing-concepts.md)
   - [Testing Concepts](design/background/testing-concepts.md)

### Implementation Files

- **Source Code**: [src/concepts/](src/concepts/)
- **Concept Server**: [src/concept_server.ts](src/concept_server.ts)
- **Utilities**: [src/utils/](src/utils/)
  - [database.ts](src/utils/database.ts)
  - [gemini.ts](src/utils/gemini.ts) - Gemini AI integration
  - [types.ts](src/utils/types.ts)

### Testing

- All test files: [src/concepts/*/Concept.test.ts](src/concepts/)
- Run tests: `deno test --allow-net --allow-read --allow-sys --allow-env`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Related Projects

- [Amimi Frontend](https://github.com/JaredHLZhang/Amimi-frontend_61040) - Vue.js frontend application