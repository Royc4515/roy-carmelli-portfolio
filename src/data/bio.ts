// src/data/bio.ts

export const bio = {
  name: "Roy Carmelli",
  nameHe: "רועי כרמלי",
  title: "CS & Neuroscience · Bar-Ilan University",
  role: "Full-Stack & AI Developer",
  availability: "Open to student roles · 2-3 days a week · Israel",
  contactBlurb: "I'm looking for a student position in full-stack or AI development in Israel, part-time at first (2-3 days a week) alongside my studies. Email works best.",
  resume: {
    href: "/Roy_Carmelli_CV.pdf",
    fileName: "Roy_Carmelli_CV.pdf",
    meta: "PDF · 1 page · updated Oct 2026",
  },
  institution: "Bar-Ilan University",
  location: "Israel",
  /** "Bar-\u2060Ilan": a word joiner after the hyphen, so the name never breaks across lines. */
  tagline: "Third-year CS & Neuroscience honors student at Bar-\u2060Ilan. I build AI agents and full-stack apps in React, TypeScript, Node.js and Python, and I ship them tested and live.",
  about: `I'm a third-year honors student at Bar-Ilan University, in a dual major in Computer Science and Neuroscience. Most of my building happens on the CS side. Neuroscience taught me to work with messy real data, from voltage-imaging recordings to an OpenNeuro study of 56 children.

I build tools I actually use, and I ship them tested and deployed, not as demos. I work with AI coding agents every day: I make the architecture calls, review what they write, and debug it myself.

Alongside the degree, I'm an IDF battalion medic and medical coordinator in the Gaza Division, an operational support role: regular service from 2021, then 400+ days of reserve duty since August 2024 alongside full-time studies. I led a medical unit as it grew from 12 to 30+ people and coordinated medical logistics from the division's war room. What I took from it: stay calm and make the call.

I've also taught, tutored and run trainings in Israel and abroad, led people and projects through StandWithUs, and I'm a native speaker of both English and Hebrew.`,
  email: "Roy.y.carmelli@gmail.com",
  github: "https://github.com/Royc4515",
  linkedin: "https://linkedin.com/in/roy-carmelli",
  phone: "+972547287807",
  photo: null as string | null,
};

/** `slot` is the equipment-screen slot each category maps to. */
export const skills = [
  { slot: "Weapons", category: "Languages",          items: ["Java 17", "Python", "C", "C++", "JavaScript", "TypeScript", "x86 Assembly"] },
  { slot: "Armor", category: "Web & Full-Stack",     items: ["React", "Node.js", "Express", "MongoDB", "Supabase", "React Native", "Tailwind CSS", "Vite"] },
  { slot: "Magic", category: "AI & Agents",          items: ["Claude API", "Gemini API", "OpenAI API", "Groq API", "MCP", "Claude Code", "Telegram Bot API"] },
  { slot: "Potions", category: "Data & Analysis",    items: ["NumPy", "Pandas", "SciPy", "Matplotlib", "Jupyter"] },
  { slot: "Tomes", category: "CS Foundations",       items: ["OOP", "Data Structures", "Design Patterns", "Systems Programming"] },
  { slot: "Trinkets", category: "Tools & Platforms", items: ["Git", "GitHub Actions", "Docker", "Vercel", "Render", "GitHub Pages"] },
  { slot: "Achievements", category: "Certifications", items: ["Claude Code in Action", "Claude Code 101", "Claude 101", "AI Fluency"] },
];
