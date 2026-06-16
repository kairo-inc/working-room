import { ChatEvent } from "../types/event"

type EventHandler = (event: ChatEvent) => Promise<void>

export class EventBus {
  private handlers: EventHandler[] = []

  register(handler: EventHandler) {
    this.handlers.push(handler)
  }

  async emit(event: ChatEvent) {
    for (const handler of this.handlers) {
      try {
        await handler(event)
      } catch (e) {
        console.error("Error in event handler:", e)
      }
    }
  }
}
