/** Shared shapes for the chat agent (POST /api/chat). */

export type ChatRole = 'user' | 'assistant';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/** One retrievable piece of what pixel Roy knows. */
export interface KnowledgeChunk {
  id: string;
  source: 'site' | 'github' | 'linkedin';
  title: string;
  /** Where a visitor can check it; shown as a source chip. */
  url: string | null;
  text: string;
  /** Names and aliases that should pull this chunk in (project ids, repo names, tech). */
  keywords: string[];
}

/** Everything the agent may say, generated from src/data (see src/lib/chatKnowledge.ts). */
export interface Knowledge {
  /** Always in the prompt: who Roy is, what he is looking for, how to reach him. */
  core: string;
  chunks: KnowledgeChunk[];
  /** The only email the answer may contain. */
  email: string;
  /** Links the answer may contain; anything else is stripped. */
  allowedUrlPrefixes: string[];
}
