import { CursorArg, CursorResult } from "@wr/shared"

// Slack types.
export type SlackChannel = {
  id: string
  name: string
  isPrivate: boolean
  // True when this "channel" is actually a direct-message conversation (1:1 or group) rather than a
  // named channel. When true, `name` is the participant(s)' display name(s) (resolved via
  // SlackClient.getUser), comma-joined for a group DM, not a channel name.
  isIm: boolean
}

export type SlackUser = {
  id: string
  name: string
}

// Slack client interface.
export type SlackClientListChannelsArgs = CursorArg & {}

export type SlackClientListUsersArgs = CursorArg & {}

export type SlackClientGetChannelArgs = {
  channelId: string
}

export type SlackClientGetUserArgs = {
  userId: string
}

export type SlackClientListMessagesArgs = CursorArg & {
  channelId: string
}

export type SlackClientGetMessageArgs = {
  channelId: string
  timestamp: string
}

export type SlackClientAddReactionArgs = {
  channelId: string
  timestamp: string
  emojiName: string
}

export type SlackClientRemoveReactionArgs = {
  channelId: string
  timestamp: string
  emojiName: string
}

export type SlackClientSendMessageArgs = {
  // The ID of a channel, or of an existing direct-message conversation (as returned by
  // listChannels/getChannel with isIm: true). A raw user ID is not accepted here — Slack's
  // chat.postMessage requires the conversation's own channel ID (e.g. "D0123456789"), not the
  // ID of the person you're messaging.
  channelId: string
  text: string
}

export type SlackMessage = {
  channel: string
  ts: string
}

// A single message returned from a conversation's history. `userId` is null for messages with no
// associated Slack user (for example some bot or system messages), in which case it is not resolved
// to a name.
export type SlackConversationMessage = {
  ts: string
  text: string
  userId: string | null
}

export abstract class SlackClient {
  abstract describeSelf(): Promise<SlackUser>
  abstract listChannels(args: SlackClientListChannelsArgs): Promise<CursorResult<SlackChannel>>
  abstract listUsers(args: SlackClientListUsersArgs): Promise<CursorResult<SlackUser>>
  abstract getChannel(args: SlackClientGetChannelArgs): Promise<SlackChannel>
  abstract getUser(args: SlackClientGetUserArgs): Promise<SlackUser>
  abstract sendMessage(args: SlackClientSendMessageArgs): Promise<SlackMessage>
  abstract listMessages(args: SlackClientListMessagesArgs): Promise<CursorResult<SlackConversationMessage>>
  abstract getMessage(args: SlackClientGetMessageArgs): Promise<SlackConversationMessage | null>
  abstract addReaction(args: SlackClientAddReactionArgs): Promise<void>
  abstract removeReaction(args: SlackClientRemoveReactionArgs): Promise<void>
}
