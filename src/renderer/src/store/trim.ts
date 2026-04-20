import type { AiMessage } from '../types'

export function trimHistory(messages: AiMessage[], cap: number): AiMessage[] {
  if (cap <= 0) return []
  return messages.length > cap ? messages.slice(-cap) : messages
}
