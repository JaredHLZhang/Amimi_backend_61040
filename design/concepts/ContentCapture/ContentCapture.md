# concept: ContentCapture

* **concept**: ContentCapture [Source]
* **purpose**: Capture and convert various content types (audio, images, text) into structured text format
* **principle**: When capturing starts for a source, content is recorded and processed; when capturing stops, the processed text is saved and can be retrieved
* **state**:
  * A set of `Captures` with
    * a `sourceId` of type `String`
    * a `capturedText` of type `String`
    * a `captureType` of type `String`
    * a `timestamp` of type `Time`
    * an `owner` of type `User`
* **actions**:
  * `startCapture (sourceId: String, type: String, owner: User): (captureId: String)`
    * **requires**: sourceId is valid, type is supported (audio/image/text)
    * **effects**: Begins capturing content from source and returns capture identifier
  * `stopCapture (captureId: String): (capture: Capture)`
    * **requires**: capture with captureId exists and is active
    * **effects**: Stops capturing, processes content to text, and saves as capture
  * `getCapture (captureId: String): (capture: Capture)`
    * **requires**: capture exists
    * **effects**: Returns the capture object with all its data
  * `getCapturesBySource (sourceId: String): (Set<Capture>)`
    * **effects**: Returns all captures associated with the given source
  * `deleteCapture (captureId: String)`
    * **requires**: capture exists
    * **effects**: Removes capture from the system

