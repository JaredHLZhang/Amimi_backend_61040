# Assignment 2: Functional Design (Improved Version Based on Feedback)

## Problem Statement

The domain I have chosen is long-distance relationships (LDR) and the challenge of sustaining love across physical separation. LDRs are often created by circumstances such as pursuing higher education, work relocation, or job requirements. I am drawn to this domain because of its strong social and emotional impact on young adults, particularly college students and early career professionals. According to 2023 statistics, over 14 million couples in the U.S. about 28 million individuals are in long-distance relationships. Moreover, 75% of engaged couples report having experienced long-distance at some stage, with 40% of these relationships ending in breakups, highlighting their fragility. More than 90% of these LDRs occur among people aged 18 to 30, an age group where individuals are forming identities, careers, and long-term commitments. This makes LDRs an important domain that intersects with both emotional well-being and future planning.

While falling in love can feel effortless, staying in love requires effort and consistent shared experiences. A key problem faced by couples in LDRs is the difficulty of maintaining "companionate love," a psychological concept describing love grounded in daily physical interaction, companionship, and shared routines. Companionate love helps couples develop trust, communication patterns, and shared long-term goals. In long-distance contexts, the absence of physical presence—such as touch, face-to-face interaction, and shared activities—creates barriers to building this foundation. In the short term, couples often experience misunderstandings, anxiety, and a lack of attention to each other's needs. For example, partners may feel uncertain about what the other is truly thinking after a call or may exchange photos of daily life that create parallel narratives rather than shared experiences. These short-term gaps weaken long-term relationship stability, leading to doubts about the future, difficulty making joint decisions, and increased emotional distress.

## Stakeholders List

- **Couples in LDRs**: The primary stakeholders who directly experience the emotional, psychological, and relational challenges of distance.
- **College Students and Young Professionals**: A high-risk group for LDRs, as relocation for school or work is common.
- **Mental Health Counselors and Therapists**: Professionals who often support individuals coping with LDR-related stress, loneliness, and depression.
- **Friends and Family Members**: Secondary stakeholders who provide emotional support or advice and may be indirectly affected by the struggles of someone in an LDR.

## Evidence and Comparables

- **Google Trends Report (2023)**: LDR was the top relationship problem searched in the U.S., demonstrating widespread concern.
- All the statistic mentioned above is cited from: [LDR 101](https://www.luvlink.com/blogs/news/surprising-long-distance-relationship-statistics-ldr-101?srsltid=AfmBOoq3ixXwUBPkOsm8MD0dPkRB-mo2dtPZZhdkmhJPGZMN8K0mT1U0)
- **Psychological Research on Companionate Love**: Relationship - Bridge to the Soul, Book by Christopher Moon, 2017
- **Psychological Research on Relationship**: Attached, Book by Amir Levine and Rachel S. F. Heller, 2010
- **College Counselor Interviews**: Silvia worked at The University of Melbourne and Julia worked at UCD
- **LDR Couples Interviews**: 4 couples in LDR right now or before, each interview about 20-30 mins
- **Comparable Applications**: Apps such as Between and Couple attempt to support intimacy in LDRs through private sharing spaces, while general tools like WhatsApp and Zoom provide communication infrastructure. However, these apps often lack features to recreate shared context and companionship, underlining the gap between existing solutions and the problem of sustaining companionate love.

## Application Pitch

**Amimi** is a companionship AI designed to help long-distance couples strengthen their connection by recreating the sense of shared presence that is often missing across distance. The motivation behind Amimi is simple: while falling in love is easy, staying in companionate love during long separations is difficult. Couples struggle with the absence of daily companionship, those small shared moments, conversations, and memories that build long-term trust and intimacy. Amimi aims to fill this gap by supporting couples with meaningful, context-aware interactions.

### Key Features

**1. Call Listener**  
Amimi joins couples' regular phone or video calls as a silent companion. By listening in, Amimi learns the context of conversations and dynamics between partners, ensuring that interactions afterward feel personalized. This helps mitigate misunderstandings and gives couples the sense that someone understands their relationship as a whole, not just as two individuals.

**2. Memory Storyboard**  
This feature transforms sweet moments from conversations into visualized storyboards after each call. Instead of letting important emotions fade, Amimi curates these memories into visual artifacts that couples can revisit together. This provides the missing "shared activities and memories" of companionate love, giving couples something tangible to celebrate and reflect on, which strengthens their emotional bond.

**3. Chat with Amimi**  
An AI chat function trained with professional relationship coaching data. Couples can turn to Amimi with questions about their future, worries about each other's situation, or conflicts that arise. Drawing on its contextual knowledge from listening and memory-making, Amimi provides tailored feedback and supportive suggestions, helping couples reduce anxiety about the future and feel more confident in their relationship journey.

Together, these features make Amimi more than a communication tool, it becomes a bridge for long-distance couples, helping them sustain love through companionship, memory, and guidance.

## Concept Designs for Amimi

> **Note on Refactoring:** The concepts below have been redesigned to be generic and reusable (following concept design principles), rather than app-specific features. They compose together through synchronizations to create Amimi's functionality.

### Concept 1: Pairing [User]

**Purpose:** Enable users to form exclusive partnerships through a code-based pairing mechanism

**Principle:** When one user generates a pairing code and shares it with another user, and that user enters the code, the two users become paired; the pair can be dissolved later if needed

#### State
```
a set of Pairs with
    user1: User
    user2: User
    code: String
    active: Boolean
    createdAt: Time
```

#### Actions
```
generateCode(user: User): (code: String)
    effects: create a new unique pairing code linked to this user

acceptPairing(user: User, code: String): (pair: Pair)
    requires: code is valid and unused
    effects: create a new pair linking the two users and mark it active

dissolvePair(pair: Pair)
    requires: pair exists and is active
    effects: set active to false

getPair(user: User): (pair: Pair)
    requires: user is in an active pair
    effects: return the pair containing this user

isPaired(user: User): (Boolean)
    effects: return whether user is in an active pair
```

---

### Concept 2: CommunicationInteraction [User]

**Purpose:** Manage real-time communication exchanges between users (flexible for calls, messages, or other communication forms)

**Principle:** When users initiate a communication interaction together, it becomes active; users can communicate during the active interaction; when they end it, the duration and details are recorded

#### State
```
a set of CommunicationInteractions with
    participants: Set<User>
    active: Boolean
    startTime: Time
    endTime: Time
```

#### Actions
```
startInteraction(participants: Set<User>): (interaction: CommunicationInteraction)
    requires: all participants are valid users
    effects: create a new active communication interaction with given participants and current timestamp

endInteraction(interaction: CommunicationInteraction)
    requires: interaction exists and is active
    effects: mark interaction as inactive and record end timestamp

getActiveInteraction(user: User): (interaction: CommunicationInteraction)
    requires: user has an active interaction
    effects: return the active interaction containing this user

getInteractionDuration(interaction: CommunicationInteraction): (duration: Number)
    requires: interaction exists and has ended
    effects: calculate and return duration in minutes

getInteractionHistory(user: User): (Set<CommunicationInteraction>)
    effects: return all past communication interactions involving this user
```

---

### Concept 3: ContentCapture [Source]

**Purpose:** Capture and convert various content types (audio, images, text) into structured text format

**Principle:** When capturing starts for a source, content is recorded and processed; when capturing stops, the processed text is saved and can be retrieved

#### State
```
a set of Captures with
    sourceId: String
    capturedText: String
    captureType: String
    timestamp: Time
    owner: User
```

#### Actions
```
startCapture(sourceId: String, type: String, owner: User): (captureId: String)
    requires: sourceId is valid, type is supported (audio/image/text)
    effects: begin capturing content from source and return capture identifier

stopCapture(captureId: String): (capture: Capture)
    requires: capture with captureId exists and is active
    effects: stop capturing, process content to text, and save as capture

getCapture(captureId: String): (capture: Capture)
    requires: capture exists
    effects: return the capture object with all its data

getCapturesBySource(sourceId: String): (Set<Capture>)
    effects: return all captures associated with the given source

deleteCapture(captureId: String)
    requires: capture exists
    effects: remove capture from the system
```

---

### Concept 4: VisualGeneration [User]

**Purpose:** Generate visual content (images, comics, storyboards) from text descriptions

**Principle:** When a user submits text with a desired visual style, the system generates corresponding visual content that can be retrieved and managed

#### State
```
a set of Visuals with
    promptText: String
    visualUrl: String
    style: String
    owner: User
    createdAt: Time
```

#### Actions
```
generateVisual(text: String, style: String, owner: User): (visual: Visual)
    requires: text is non-empty, style is supported (comic/photo/abstract/etc)
    effects: create visual content from text prompt and return visual object

getVisual(visualId: String): (visual: Visual)
    requires: visual exists
    effects: return the visual object with its URL and metadata

regenerateVisual(visualId: String): (visual: Visual)
    requires: visual exists
    effects: generate new visual using same prompt and style, update URL

deleteVisual(visualId: String)
    requires: visual exists
    effects: remove visual from the system

getUserVisuals(user: User): (Set<Visual>)
    effects: return all visuals owned by the user
```

---

### Concept 5: ConversationalAgent [User]

**Purpose:** Provide AI-powered conversational assistance and personalized guidance

**Principle:** When a user creates a conversation and sends messages, the agent responds with contextual advice; context can be updated with new information to personalize responses

#### State
```
a set of Conversations with
    user: User
    context: String
    createdAt: Time

a set of Messages with
    conversation: Conversation
    isFromUser: Boolean
    content: String
    timestamp: Time
```

#### Actions
```
createConversation(user: User, context: String): (conversation: Conversation)
    effects: create a new conversation for user with optional initial context

sendUserMessage(conversation: Conversation, text: String): (message: Message)
    requires: conversation exists, text is non-empty
    effects: create and save a user message in the conversation

getAgentResponse(conversation: Conversation, userMessage: Message): (response: Message)
    requires: conversation and userMessage exist
    effects: generate AI response based on message and context, save and return it

getHistory(conversation: Conversation): (Set<Message>)
    requires: conversation exists
    effects: return all messages in chronological order

updateContext(conversation: Conversation, newContext: String)
    requires: conversation exists
    effects: update or append context information for personalization

deleteConversation(conversation: Conversation)
    requires: conversation exists
    effects: remove conversation and all its messages
```

---

## Synchronizations

The concepts above compose through synchronizations to create Amimi's features:

### Sync 1: Auto-Capture During Communication
```
sync AutoCaptureCommunication
when
    CommunicationInteraction.startInteraction(participants) creates interaction i
where
    in Pairing: participants form a pair p
then
    ContentCapture.startCapture(i.id, "communication", p.user1)

sync StopCaptureWhenCommunicationEnds
when
    CommunicationInteraction.endInteraction(interaction i)
then
    ContentCapture.stopCapture(i.id)
```

### Sync 2: Generate Memory After Communication
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

### Sync 3: Contextualize Agent Responses
```
sync ContextualizeAgent
when
    ConversationalAgent.getAgentResponse(conversation c, message m)
where
    in Pairing: conversation.user is in pair p
    in ContentCapture: recent captures for p exist
then
    ConversationalAgent.updateContext(c, captures.text)
    [generate response with this context]
```

### Sync 4: Initialize Pair Resources
```
sync InitializePairResources
when
    Pairing.acceptPairing(user, code) creates pair p
then
    ConversationalAgent.createConversation(p.user1, "paired_context")
    ConversationalAgent.createConversation(p.user2, "paired_context")
```

## UI Sketch

![Amimi App UI Design](../assets/FuntionDesignDraft.png)

*Image above is a complete user flow showing the pairing process, call features with Amimi listening, memory storyboard generation, and chat functionality for the Amimi long-distance relationship app.*

## User Journey

Emma is a 24-year-old graduate student living in Boston, while her boyfriend Alex works in Seattle. The time difference and busy schedules make it difficult for them to feel connected. After a few weeks apart, Emma begins to notice that their daily calls feel repetitive. She misses the small moments of companionship—like cooking together or laughing in person—that once made her relationship feel grounded. The lack of shared experiences leaves her anxious about the future of their relationship.

### Step 1: Pairing with Partner
Emma downloads Amimi after hearing about it from a friend. She generates a pairing code and sends it to Alex. Within minutes, their accounts are linked, giving them a shared space where their relationship can live digitally. This simple step reassures Emma—they now have a "home base" to nurture their bond.

### Step 2: Calling with Amimi
That evening, Emma starts a video call with Alex through Amimi. They talk about their day as usual, but this time, Amimi quietly listens in the background using its Call Listener feature. The couple doesn't feel interrupted, but Emma likes knowing that Amimi is capturing the context of their conversation so it can be used meaningfully later.

### Step 3: Capturing Memories
After the call ends, Amimi generates a Memory Storyboard. It highlights the playful moment when Alex teased Emma about her new cooking attempt, and the supportive conversation they had about Emma's upcoming exam. The storyboard arrives in their shared mailbox as a visual comic-style panel. Emma smiles while looking at it—finally, something tangible she and Alex can revisit together, almost like a shared diary.

### Step 4: Chatting with Amimi
Later that week, Emma feels anxious. She wonders whether Alex is as serious about planning their future as she is. Instead of bottling up the worry, she opens the Chat with Amimi feature. Drawing on coaching knowledge and the context of their calls, Amimi reassures her and suggests gentle ways to raise the topic with Alex in their next conversation. Emma feels calmer and prepared.

### Outcome
Through these steps, Emma's relationship feels more balanced. Instead of anxiety after calls, she now has visual reminders of happy moments and a supportive AI to talk to when doubts arise. Amimi doesn't replace Alex, but it helps Emma feel that their love story continues to be written together—even across distance.
