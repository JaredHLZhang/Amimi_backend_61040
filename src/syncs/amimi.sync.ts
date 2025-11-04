/**
 * Amimi mention synchronizations
 * These syncs automatically trigger AI responses when users mention @Amimi in shared chat.
 */

import { GroupConversation, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

// When message contains @Amimi, auto-trigger agent response
export const TriggerAmimiResponseInSharedChat: Sync = ({ request, status, message, content, conversationId, contextPrompt }) => ({
  when: actions(
    [Requesting.request, { path: "/GroupConversation/sendMessage", content, conversationId }, { request }],
    [GroupConversation.sendMessage, {}, { status, message }]
  ),
  where: (frames) => {
    return frames.filter(($) => {
      const msgStatus = $[status];
      const rawContent = $[content] as string | undefined;
      const includesMention = typeof rawContent === "string" && rawContent.includes("@Amimi");

      if (msgStatus === "success" && includesMention) {
        console.log(`[Amimi Sync] Detected @Amimi mention in shared chat message: "${rawContent}"`);
        return true;
      }

      return false;
    }).map(($) => {
      const rawContent = String($[content] ?? "");
      const cleanedPrompt = rawContent.replace("@Amimi", "").trim() || "General conversation";
      const convId = String($[conversationId]);

      console.log(`[Amimi Sync] Triggering shared AI response for conversation ${convId} with prompt: "${cleanedPrompt}"`);

      return {
        ...$,
        [contextPrompt]: cleanedPrompt,
        [conversationId]: convId,
      };
    });
  },
  then: actions([
    GroupConversation.getAgentResponse,
    { conversationId, contextPrompt }
  ])
});

