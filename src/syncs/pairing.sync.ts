/**
 * Pairing synchronizations
 * These syncs coordinate pairing with shared group conversation creation.
 */

import { Pairing, GroupConversation } from "@concepts";
import { actions, Sync } from "@engine";

// When pairing succeeds, auto-create shared conversation
// This sync will execute when acceptPairing succeeds
// The actual logic will be in the Pairing concept itself for now since we need access to both users
// TODO: Refactor to extract both users from pair document in sync

