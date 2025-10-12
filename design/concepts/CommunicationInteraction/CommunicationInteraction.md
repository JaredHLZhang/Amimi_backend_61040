# concept: CommunicationInteraction

* **concept**: CommunicationInteraction [User]
* **purpose**: Manage real-time communication exchanges between users (flexible for calls, messages, or other communication forms)
* **principle**: When users initiate a communication interaction together, it becomes active; users can communicate during the active interaction; when they end it, the duration and details are recorded
* **state**:
  * A set of `CommunicationInteractions` with
    * a `participants` of type `Set<User>`
    * an `active` of type `Boolean`
    * a `startTime` of type `Time`
    * an `endTime` of type `Time`
* **actions**:
  * `startInteraction (participants: Set<User>): (interaction: CommunicationInteraction)`
    * **requires**: all participants are valid users
    * **effects**: Creates a new active communication interaction with given participants and current timestamp
  * `endInteraction (interaction: CommunicationInteraction)`
    * **requires**: interaction exists and is active
    * **effects**: Marks interaction as inactive and records end timestamp
  * `getActiveInteraction (user: User): (interaction: CommunicationInteraction)`
    * **requires**: user has an active interaction
    * **effects**: Returns the active interaction containing this user
  * `getInteractionDuration (interaction: CommunicationInteraction): (duration: Number)`
    * **requires**: interaction exists and has ended
    * **effects**: Calculates and returns duration in minutes
  * `getInteractionHistory (user: User): (Set<CommunicationInteraction>)`
    * **effects**: Returns all past communication interactions involving this user

