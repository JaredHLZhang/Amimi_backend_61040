# Amimi Backend

AI-powered relationship companion backend built with Deno, MongoDB, and Gemini AI.

## 🚀 Features

- **Concept-Based Architecture**: Modular, reusable concepts that compose to create application features
- **AI-Powered Chat**: Real-time conversational AI using Google's Gemini API
- **User Pairing**: Code-based pairing system for connecting partners
- **Content Capture**: Multi-modal content capture (audio, image, text)
- **Visual Generation**: AI-generated visual content from text descriptions
- **Communication Tracking**: Real-time communication interaction management
- **Group Conversations**: Multi-user chat functionality

## 🏗️ Architecture

### Core Concepts

1. **Pairing**: User pairing and relationship management
2. **CommunicationInteraction**: Real-time communication tracking
3. **ContentCapture**: Multi-modal content capture and processing
4. **VisualGeneration**: AI-powered visual content creation
5. **ConversationalAgent**: Gemini AI-powered chat functionality
6. **GroupConversation**: Multi-user conversation management

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

3. **Install dependencies and start the server**
   ```bash
   deno task concepts
   ```

The server will start on `http://localhost:8000` with API endpoints at `/api/*`.

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

### VisualGeneration
- `POST /api/VisualGeneration/generateVisual` - Generate visual content
- `POST /api/VisualGeneration/getVisual` - Get visual details
- `POST /api/VisualGeneration/regenerateVisual` - Regenerate visual
- `POST /api/VisualGeneration/deleteVisual` - Delete visual
- `POST /api/VisualGeneration/getUserVisuals` - Get user's visuals

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