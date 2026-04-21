// src/data/projects.ts
import { Project } from '../types/index';

export const projects: Project[] = [
  {
    id: "ai-sidebar",
    title: "AI Sidebar",
    description: "Chrome MV3 extension that injects a context-aware AI assistant into any webpage. Architecture is the point: BaseProvider abstract class + Factory pattern for runtime provider selection + Strategy pattern for swappable AI backends + Template Method for streaming flow. Concrete providers for Claude, Gemini, OpenAI, Grok, Groq, and Ollama — Grok/Groq reuse OpenAI's implementation via inheritance, passing different endpoints to the parent constructor. Custom Markdown renderer and DOM sanitizer.",
    tech: ["JavaScript", "Chrome MV3", "OOP", "Factory Pattern", "Strategy Pattern", "Claude API", "Gemini API", "OpenAI API"],
    github: "https://github.com/Royc4515/ai-sidebar",
    featured: true,
    year: 2026,
  },
  {
    id: "career-predictor",
    title: "CareerPredict AI",
    description: "Full-stack web app: Google OAuth login → 5-question quiz → AI-generated career portrait with 100+ unique outcomes. Built to learn OAuth flows, session management, and client-server architecture from scratch. React/Vite/Tailwind frontend, Node/Express + Passport.js backend, SQLite persistence — production-deployed on Railway.",
    tech: ["React 19", "Vite", "Tailwind CSS", "Node.js", "Express", "Passport.js", "SQLite", "Google OAuth"],
    github: "https://github.com/Royc4515/career-predictor",
    live: "https://career-predictor-production-a8bd.up.railway.app/",
    featured: true,
    year: 2026,
  },
  {
    id: "sommelier-bot",
    title: "Sommelier Bot",
    description: "Serverless Telegram bot: Hebrew-speaking AI wine sommelier. Webhook-driven Python on Vercel — stateless by design. Dual-layer memory: 30-message short-term context + AI-compressed long-term summaries persisted to Google Sheets, surviving session resets for multi-day continuity. Includes a pytest suite for the memory compression logic. Zero external dependencies beyond the Gemini SDK.",
    tech: ["Python", "Gemini API", "Telegram Bot API", "Vercel", "Google Sheets", "pytest"],
    github: "https://github.com/Royc4515/gemini-wine-sommelier",
    featured: true,
    year: 2026,
  },
  {
    id: "arkanoid-game",
    title: "Arkanoid Game",
    description: "Arkanoid clone in Java 17 built around the design patterns Wix tests for: OOP inheritance hierarchy (GameObject → Ball/Paddle/Brick), polymorphism throughout, Factory for level construction, Strategy for collision response, Template Method for the game loop. Clean encapsulation — no public fields. Documented and refactored.",
    tech: ["Java 17", "OOP", "Factory Pattern", "Strategy Pattern", "Template Method"],
    github: "https://github.com/Royc4515/ArkanoidGame",
    featured: true,
    year: 2025,
  },
  {
    id: "portfolio",
    title: "This Portfolio",
    description: "Built from scratch in TypeScript + React + Vite + Tailwind + Framer Motion. Includes a mini canvas game engine (OOP: Entity base class, collision system, game loop) for the interactive homepage character. Dark/light theme with system preference detection. Deployed on Vercel.",
    tech: ["React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion"],
    github: "https://github.com/Royc4515/roy-carmelli-portfolio",
    featured: true,
    year: 2026,
  },
];
