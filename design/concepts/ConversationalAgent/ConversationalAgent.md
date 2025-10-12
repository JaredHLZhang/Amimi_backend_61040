# concept: ConversationalAgent

* **concept**: ConversationalAgent [User]
* **purpose**: Provide AI-powered conversational assistance and personalized guidance
* **principle**: When a user creates a conversation and sends messages, the agent responds with contextual advice; context can be updated with new information to personalize responses
* **state**:
  * A set of `Conversations` with
    * a `user` of type `User`
    * a `context` of type `String`
    * a `createdAt` of type `Time`
  * A set of `Messages` with
    * a `conversation` of type `Conversation`
    * an `isFromUser` of type `Boolean`
    * a `content` of type `String`
    * a `timestamp` of type `Time`
* **actions**:
  * `createConversation (user: User, context: String): (conversation: Conversation)`
    * **effects**: Creates a new conversation for user with optional initial context
  * `sendUserMessage (conversation: Conversation, text: String): (message: Message)`
    * **requires**: conversation exists, text is non-empty
    * **effects**: Creates and saves a user message in the conversation
  * `getAgentResponse (conversation: Conversation, userMessage: Message): (response: Message)`
    * **requires**: conversation and userMessage exist
    * **effects**: Generates AI response based on message and context, saves and returns it
  * `getHistory (conversation: Conversation): (Set<Message>)`
    * **requires**: conversation exists
    * **effects**: Returns all messages in chronological order
  * `updateContext (conversation: Conversation, newContext: String)`
    * **requires**: conversation exists
    * **effects**: Updates or appends context information for personalization
  * `deleteConversation (conversation: Conversation)`
    * **requires**: conversation exists
    * **effects**: Removes conversation and all its messages

