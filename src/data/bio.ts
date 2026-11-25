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
    meta: "PDF · 1 page · updated Nov 2026",
  },
  institution: "Bar-Ilan University",
  /** The research practicum in one line, for the chat (the About text tells it in full). */
  research: "Research practicum (from Oct 2026): an MEG study in Prof. Mina Teicher's lab, Gonda Multidisciplinary Brain Research Center, Bar-Ilan",
  location: "Israel",
  /** "Bar-\u2060Ilan": a word joiner after the hyphen, so the name never breaks across lines. */
  tagline: "Third-year CS & Neuroscience honors student at Bar-\u2060Ilan. I build AI agents and full-stack apps in React, TypeScript, Node.js and Python, and I ship them tested and live.",
  about: `I'm a third-year student in the honors program at Bar-Ilan University, in a dual major in Computer Science and Neuroscience, graduating in February 2028. Most of my building happens on the CS side. Neuroscience taught me to work with messy real data, from voltage-imaging recordings to an OpenNeuro study of 56 children, and from October 2026 I'm doing a research practicum on an MEG study in Prof. Mina Teicher's lab at the Gonda Multidisciplinary Brain Research Center.

I build tools I actually use, and I ship them tested and deployed, not as demos. I work with AI coding agents every day: I make the architecture calls, review what they write, and debug it myself.

Alongside the degree, I'm an IDF senior battalion medic and medical officer coordinator in the Gaza Division, an operational support role: regular service from 2021 to August 2024, then 400+ days of reserve duty since, alongside full-time studies. I led a medical unit as it grew from 12 to 30+ people and led the medical response in mass-casualty events. What I took from it: stay calm and make the call.

I've also taught, tutored and run trainings in Israel and abroad, led people and projects through StandWithUs, and I'm a native speaker of both English and Hebrew.`,
  email: "Roy.y.carmelli@gmail.com",
  github: "https://github.com/Royc4515",
  linkedin: "https://linkedin.com/in/roy-carmelli",
  phone: "+972547287807",
  photo: null as string | null,
};

/** `slot` is the equipment-screen slot each category maps to. */
export const skills = [
  { slot: "Weapons", category: "Languages",          items: ["Python", "TypeScript", "JavaScript", "Java", "C/C++"] },
  { slot: "Armor", category: "Web & Full-Stack",     items: ["React", "Node.js", "Supabase", "MongoDB", "Docker"] },
  { slot: "Magic", category: "AI & Agents",          items: ["Claude Code", "AI agents", "MCP", "Claude API", "Gemini API", "OpenAI API"] },
  { slot: "Potions", category: "Data & Analysis",    items: ["NumPy", "Pandas", "SciPy", "Matplotlib", "Jupyter"] },
  { slot: "Tomes", category: "CS Foundations",       items: ["OOP", "Data Structures", "Design Patterns", "Systems Programming"] },
  { slot: "Trinkets", category: "Testing & Tools",   items: ["Vitest", "Playwright", "GitHub Actions", "Git", "Vercel"] },
  { slot: "Achievements", category: "Certifications", items: ["Claude Code in Action", "Claude Code 101", "Claude 101", "AI Fluency"] },
];
