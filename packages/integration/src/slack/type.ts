import { CursorArg, CursorResult } from "@wr/shared"

// Slack types.
export type SlackTeam = {
  id: string
  name: string
}

export type SlackChannel = {
  id: string
  name: string
  isPrivate: boolean
}

// Slack client interface.
export type SlackClientDescribeTeamArgs = {
  teamId: string
}

export type SlackClientListChannelsArgs = CursorArg & {}

export abstract class SlackClient {
  abstract describeTeam(args: SlackClientDescribeTeamArgs): Promise<SlackTeam>
  abstract listChannels(args: SlackClientListChannelsArgs): Promise<CursorResult<SlackChannel>>
}
