// src/data/chatPersona.ts
//
// Everything pixel Roy says in the UI itself (the model's own voice lives server-side in
// api/_lib/chat/prompt.ts). Kept apart from the components so tone and design change separately.
import { bio } from './bio';
import type { ChatErrorCode } from '../hooks/useChat';

export const chatPersona = {
  name: 'Pixel Roy',
  badge: 'AI',
  launcherLabel: 'Chat with Pixel Roy, an AI version of Roy',
  /** Pixel font, uppercase, at most 24 characters (SPEC 2.2). */
  bubble: 'Ask me about my work',
  /** The visitor's label above their own lines. */
  you: 'You',
  closeLabel: 'Close chat',
  greeting:
    "Hey, I'm Pixel Roy: an AI version of Roy that lives in this portfolio. Ask me about my projects, skills, studies or the role I'm looking for. I only know what's on this site, my GitHub and my LinkedIn, and I can get things wrong.",
  suggestions: ['What have you built with AI?', 'What role are you looking for?', 'Tell me about your IDF service'],
  inputLabel: 'Your question',
  placeholder: 'Ask about my work...',
  send: 'Send',
  thinking: 'Pixel Roy is thinking...',
  retry: 'Try again',
  /** One line at the panel's width: the details live on the privacy page. */
  disclaimer: 'AI via Groq · can be wrong · not stored ·',
  privacyLabel: 'Privacy',
  loadFailed: "Couldn't load the chat. Check your connection and reload the page.",
  errors: {
    rate_limited: `That's all the questions I can take from you today. For anything else, email the real me at ${bio.email}.`,
    daily_cap: `I've answered a lot of visitors today and need to rest until tomorrow. The real me is at ${bio.email}.`,
    unavailable: `My AI side is offline right now. You can still reach the real me at ${bio.email} or through the Contact section.`,
    network: "Couldn't reach me. Check your connection and try again.",
    invalid: 'I could not read that message. Try rephrasing it in up to 500 characters.',
  } satisfies Record<ChatErrorCode, string>,
} as const;
