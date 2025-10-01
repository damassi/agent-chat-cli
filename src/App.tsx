import React from "react";
import { AgentStore } from "./store";
import { AgentChat } from "./AgentChat";

export function App() {
  return (
    <AgentStore.Provider>
      <AgentChat />
    </AgentStore.Provider>
  );
}
