# concept: Pairing

* **concept**: Pairing [User]
* **purpose**: Enable users to form exclusive partnerships through a code-based pairing mechanism
* **principle**: When one user generates a pairing code and shares it with another user, and that user enters the code, the two users become paired; the pair can be dissolved later if needed
* **state**:
  * A set of `Pairs` with
    * a `user1` of type `User`
    * a `user2` of type `User`
    * a `code` of type `String`
    * an `active` of type `Boolean`
    * a `createdAt` of type `Time`
* **actions**:
  * `generateCode (user: User): (code: String)`
    * **requires**: user is valid
    * **effects**: Creates a new unique pairing code linked to this user and returns it
  * `acceptPairing (user: User, code: String): (pair: Pair)`
    * **requires**: code is valid and unused, user is not already paired
    * **effects**: Creates a new pair linking the two users and marks it active
  * `dissolvePair (pair: Pair)`
    * **requires**: pair exists and is active
    * **effects**: Sets active to false
  * `getPair (user: User): (pair: Pair)`
    * **requires**: user is in an active pair
    * **effects**: Returns the pair containing this user
  * `isPaired (user: User): (Boolean)`
    * **effects**: Returns whether user is in an active pair

