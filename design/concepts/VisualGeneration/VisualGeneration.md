# concept: VisualGeneration

* **concept**: VisualGeneration [User]
* **purpose**: Generate visual content (images, comics, storyboards) from text descriptions
* **principle**: When a user submits text with a desired visual style, the system generates corresponding visual content that can be retrieved and managed
* **state**:
  * A set of `Visuals` with
    * a `promptText` of type `String`
    * a `visualUrl` of type `String`
    * a `style` of type `String`
    * an `owner` of type `User`
    * a `createdAt` of type `Time`
* **actions**:
  * `generateVisual (text: String, style: String, owner: User): (visual: Visual)`
    * **requires**: text is non-empty, style is supported (comic/photo/abstract/etc)
    * **effects**: Creates visual content from text prompt and returns visual object
  * `getVisual (visualId: String): (visual: Visual)`
    * **requires**: visual exists
    * **effects**: Returns the visual object with its URL and metadata
  * `regenerateVisual (visualId: String): (visual: Visual)`
    * **requires**: visual exists
    * **effects**: Generates new visual using same prompt and style, updates URL
  * `deleteVisual (visualId: String)`
    * **requires**: visual exists
    * **effects**: Removes visual from the system
  * `getUserVisuals (user: User): (Set<Visual>)`
    * **effects**: Returns all visuals owned by the user

