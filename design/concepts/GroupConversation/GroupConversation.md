# concept: GroupConversation [User]

**Purpose**: Enable multiple users to participate in shared conversations with an AI agent

**Principle**: When users create or join a group conversation, all participants can send messages and receive AI responses that consider the group context; messages are visible to all participants

## State

```
a set of GroupConversations with
    conversationId: String
    participants: Set<User>
    context: String
    createdAt: Time

a set of GroupMessages with
    messageId: String
    conversationId: String
    sender: User
    isFromAgent: Boolean
    content: String
    timestamp: Time
```

## Actions

```
createGroupConversation(participants: Set<User>, context: String): (conversation: GroupConversation)
    effects: create new group conversation with given participants and context

addParticipant(conversationId: String, user: User)
    requires: conversation exists
    effects: add user to participants set

sendMessage(conversationId: String, sender: User, content: String): (message: GroupMessage)
    requires: conversation exists, sender is participant, content non-empty
    effects: create and save message in the conversation

getAgentResponse(conversationId: String, contextPrompt: String): (message: GroupMessage)
    requires: conversation exists
    effects: generate AI response considering context and history, save as message

getHistory(conversationId: String): (messages: Set<GroupMessage>)
    requires: conversation exists
    effects: return all messages in chronological order

updateContext(conversationId: String, newContext: String)
    requires: conversation exists
    effects: update context for personalization

deleteConversation(conversationId: String)
    requires: conversation exists
    effects: remove conversation and all messages
```
