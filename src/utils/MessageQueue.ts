import { EventEmitter } from "events"

export class MessageQueue extends EventEmitter {
  private messageBuffer: string[] = []

  constructor() {
    super()
  }

  async waitForMessage(): Promise<string> {
    if (this.messageBuffer.length > 0) {
      return this.messageBuffer.shift()!
    }

    return new Promise<string>((resolve) => {
      this.once("message", resolve)
    })
  }

  sendMessage(value: string): void {
    if (this.listenerCount("message") > 0) {
      this.emit("message", value)
    } else {
      this.messageBuffer.push(value)
    }
  }

  clear(): void {
    this.removeAllListeners("message")
    this.messageBuffer = []
  }

  hasPendingRequests(): boolean {
    return this.listenerCount("message") > 0
  }

  subscribe(callback: (message: string) => void): () => void {
    this.on("message", callback)
    return () => {
      this.off("message", callback)
    }
  }
}
