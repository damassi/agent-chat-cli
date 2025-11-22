import { EventEmitter } from "events"

export class MessageQueue extends EventEmitter {
  private messageBuffer: string[] = []
  private permissionBuffer: string[] = []

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

  async waitForPermissionResponse(): Promise<string> {
    if (this.permissionBuffer.length > 0) {
      return this.permissionBuffer.shift()!
    }

    return new Promise<string>((resolve) => {
      this.once("permissionResponse", resolve)
    })
  }

  sendPermissionResponse(value: string): void {
    if (this.listenerCount("permissionResponse") > 0) {
      this.emit("permissionResponse", value)
    } else {
      this.permissionBuffer.push(value)
    }
  }

  clear(): void {
    this.removeAllListeners("message")
    this.removeAllListeners("permissionResponse")
    this.messageBuffer = []
    this.permissionBuffer = []
  }

  hasPendingRequests(): boolean {
    return this.listenerCount("message") > 0
  }

  hasPendingPermissionRequest(): boolean {
    return this.listenerCount("permissionResponse") > 0
  }

  subscribe(callback: (message: string) => void): () => void {
    this.on("message", callback)
    return () => {
      this.off("message", callback)
    }
  }
}
