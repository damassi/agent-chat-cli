import { test, expect, describe } from "bun:test"
import { createAgent, createSDKAgents } from "utils/createAgent"

describe("createAgent", () => {
  test("should return agent config as-is", () => {
    const config = {
      description: "Test agent",
      prompt: async () => "Test prompt",
      mcpServers: ["server1", "server2"],
    }

    const result = createAgent(config)

    expect(result).toEqual(config)
  })

  test("should work without mcpServers", () => {
    const config = {
      description: "Test agent",
      prompt: async () => "Test prompt",
    }

    const result = createAgent(config)

    expect(result).toEqual(config)
    expect(result.mcpServers).toBeUndefined()
  })

  test("should preserve function reference", () => {
    const promptFn = async () => "Test prompt"
    const config = {
      description: "Test agent",
      prompt: promptFn,
    }

    const result = createAgent(config)

    expect(result.prompt).toBe(promptFn)
  })
})

describe("createSDKAgents", () => {
  test("should convert agents to SDK format", async () => {
    const agents = {
      agent1: createAgent({
        description: "First agent",
        prompt: async () => "Prompt 1",
        mcpServers: ["server1"],
      }),
      agent2: createAgent({
        description: "Second agent",
        prompt: async () => "Prompt 2",
        mcpServers: ["server2"],
      }),
    }

    const result = await createSDKAgents(agents)

    expect(result).toEqual({
      agent1: {
        description: "First agent",
        prompt: "Prompt 1",
      },
      agent2: {
        description: "Second agent",
        prompt: "Prompt 2",
      },
    })
  })

  test("should return undefined when no agents provided", async () => {
    const result = await createSDKAgents(undefined)

    expect(result).toBeUndefined()
  })

  test("should handle empty agents object", async () => {
    const result = await createSDKAgents({})

    expect(result).toEqual({})
  })

  test("should await lazy prompt functions", async () => {
    let callCount = 0
    const agents = {
      agent1: createAgent({
        description: "Test agent",
        prompt: async () => {
          callCount++
          return "Lazy prompt"
        },
      }),
    }

    expect(callCount).toBe(0)

    const result = await createSDKAgents(agents)

    expect(callCount).toBe(1)
    expect(result?.agent1?.prompt).toBe("Lazy prompt")
  })

  test("should fetch all prompts in parallel", async () => {
    const timestamps: number[] = []

    const agents = {
      agent1: createAgent({
        description: "Agent 1",
        prompt: async () => {
          timestamps.push(Date.now())
          await new Promise((resolve) => setTimeout(resolve, 10))
          return "Prompt 1"
        },
      }),
      agent2: createAgent({
        description: "Agent 2",
        prompt: async () => {
          timestamps.push(Date.now())
          await new Promise((resolve) => setTimeout(resolve, 10))
          return "Prompt 2"
        },
      }),
      agent3: createAgent({
        description: "Agent 3",
        prompt: async () => {
          timestamps.push(Date.now())
          await new Promise((resolve) => setTimeout(resolve, 10))
          return "Prompt 3"
        },
      }),
    }

    await createSDKAgents(agents)

    // All prompts should start roughly at the same time (within 5ms)
    const maxDiff = Math.max(...timestamps) - Math.min(...timestamps)
    expect(maxDiff).toBeLessThan(5)
  })

  test("should handle agents without mcpServers", async () => {
    const agents = {
      agent1: createAgent({
        description: "Test agent",
        prompt: async () => "Test prompt",
      }),
    }

    const result = await createSDKAgents(agents)

    expect(result).toEqual({
      agent1: {
        description: "Test agent",
        prompt: "Test prompt",
      },
    })
  })

  test("should preserve agent order", async () => {
    const agents = {
      zebra: createAgent({
        description: "Z agent",
        prompt: async () => "Z prompt",
      }),
      alpha: createAgent({
        description: "A agent",
        prompt: async () => "A prompt",
      }),
      beta: createAgent({
        description: "B agent",
        prompt: async () => "B prompt",
      }),
    }

    const result = await createSDKAgents(agents)

    expect(Object.keys(result!)).toEqual(["zebra", "alpha", "beta"])
  })

  test("should handle errors in prompt functions", async () => {
    const agents = {
      failingAgent: createAgent({
        description: "Failing agent",
        prompt: async () => {
          throw new Error("Prompt fetch failed")
        },
      }),
    }

    await expect(createSDKAgents(agents)).rejects.toThrow("Prompt fetch failed")
  })

  test("should work with single agent", async () => {
    const agents = {
      solo: createAgent({
        description: "Solo agent",
        prompt: async () => "Solo prompt",
      }),
    }

    const result = await createSDKAgents(agents)

    expect(result).toEqual({
      solo: {
        description: "Solo agent",
        prompt: "Solo prompt",
      },
    })
  })

  test("should handle complex prompt strings", async () => {
    const complexPrompt = `
      # System Instructions

      You are a specialized agent.

      ## Guidelines
      - Be helpful
      - Be concise
    `

    const agents = {
      agent1: createAgent({
        description: "Complex agent",
        prompt: async () => complexPrompt,
      }),
    }

    const result = await createSDKAgents(agents)

    expect(result?.agent1?.prompt).toBe(complexPrompt)
  })
})
