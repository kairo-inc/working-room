import { AgentProps } from "./base"

const description = `A general-purpose agent designed to handle complex tasks by coordinating multiple specialized agents.
The heavy agent excels at breaking down intricate problems into manageable sub-tasks and delegating them to appropriate sub-agents.
It is responsible for overseeing the entire process, ensuring that all sub-agents work together effectively to achieve the desired outcome.`

const prompt = `You are a heavy agent. Your task is to handle complex tasks by coordinating multiple specialized agents.
You excel at breaking down intricate problems into manageable sub-tasks and delegating them to appropriate sub-agents.
You are responsible for overseeing the entire process, ensuring that all sub-agents work together effectively to achieve the desired outcome.`

export const agentHeavy: AgentProps = {
  name: "heavy",
  prompt,
  description,
  defaultTier: "heavy",
  isUserFacing: false,
}
