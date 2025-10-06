import { test, expect, describe } from "bun:test"
import { MessageQueue } from "../MessageQueue"

describe("MessageQueue", () => {
  test("should create an empty queue", () => {
    const queue = new MessageQueue()

    expect(queue.hasPendingRequests()).toBe(false)
  })

  test("should send and receive messages", () => {
    const queue = new MessageQueue()

    queue.sendMessage("hello")
    const promise = queue.waitForMessage()

    expect(promise).toBeInstanceOf(Promise)
  })

  test("should dequeue messages in FIFO order", async () => {
    const queue = new MessageQueue()

    queue.sendMessage("first")
    queue.sendMessage("second")
    queue.sendMessage("third")

    const first = await queue.waitForMessage()
    const second = await queue.waitForMessage()
    const third = await queue.waitForMessage()

    expect(first).toBe("first")
    expect(second).toBe("second")
    expect(third).toBe("third")
  })

  test("should wait for messages when queue is empty", async () => {
    const queue = new MessageQueue()

    const promise = queue.waitForMessage()
    queue.sendMessage("delayed")

    const message = await promise

    expect(message).toBe("delayed")
  })

  test("should handle hasPendingRequests correctly", async () => {
    const queue = new MessageQueue()

    expect(queue.hasPendingRequests()).toBe(false)

    const promise = queue.waitForMessage()
    expect(queue.hasPendingRequests()).toBe(true)

    queue.sendMessage("message")
    await promise

    expect(queue.hasPendingRequests()).toBe(false)
  })

  test("should clear queue and listeners", async () => {
    const queue = new MessageQueue()

    queue.sendMessage("first")
    queue.sendMessage("second")
    queue.waitForMessage()

    queue.clear()

    expect(queue.hasPendingRequests()).toBe(false)

    queue.sendMessage("after-clear")
    const message = await queue.waitForMessage()
    expect(message).toBe("after-clear")
  })

  test("should handle multiple waiting consumers", async () => {
    const queue = new MessageQueue()

    const promise1 = queue.waitForMessage()

    queue.sendMessage("first")
    const msg1 = await promise1

    const promise2 = queue.waitForMessage()
    queue.sendMessage("second")
    const msg2 = await promise2

    expect(msg1).toBe("first")
    expect(msg2).toBe("second")
  })

  test("should buffer messages when no listeners", async () => {
    const queue = new MessageQueue()

    queue.sendMessage("buffered1")
    queue.sendMessage("buffered2")

    const msg1 = await queue.waitForMessage()
    const msg2 = await queue.waitForMessage()

    expect(msg1).toBe("buffered1")
    expect(msg2).toBe("buffered2")
  })

  test("should emit directly when listeners exist", async () => {
    const queue = new MessageQueue()

    const promise = queue.waitForMessage()
    queue.sendMessage("direct")

    const message = await promise

    expect(message).toBe("direct")
  })
})
