// src/data/bio.ts

export const bio = {
  name: "Roy Carmelli",
  nameHe: "רועי כרמלי",
  title: "CS & Neuroscience · Bar-Ilan University",
  role: "Full-Stack & AI Developer",
  availability: "Open to student & intern roles · Israel",
  contactBlurb: "I'm looking for a student or intern role in full-stack, frontend or AI development in Israel. Email works best.",
  resume: {
    href: "/Roy_Carmelli_CV.pdf",
    fileName: "Roy_Carmelli_CV.pdf",
    meta: "PDF · 1 page · updated Sep 2026",
  },
  institution: "Bar-Ilan University",
  location: "Israel",
  tagline: "Third-year CS & Neuroscience student at Bar-Ilan. I build web apps, Chrome extensions and AI tools, and I ship them.",
  about: `I'm a third-year student at Bar-Ilan University, doing a dual major in Computer Science and Neuroscience. Most of my building happens on the CS side. The neuroscience side is where I learned to work with messy real data, from voltage-imaging recordings to an OpenNeuro study of 56 children.

I build things I end up using. Aside puts six AI providers in a sidebar next to whatever I'm reading, and a Telegram bot keeps track of my wine cellar. I work with AI coding tools every day: I make the architecture calls, review what they write, and debug it myself.

Alongside the degree, I'm an IDF combat medic and medical coordinator in the Gaza Division: regular service from 2021, and an active reservist since August 2024. During high-intensity operations I led a medical unit as it grew from 12 to 30+ people, ran coordination and logistics in the division's war room, and handled triage and evacuation in mass-casualty events. What I took from it: stay calm and make the call.`,
  email: "Roy.y.carmelli@gmail.com",
  github: "https://github.com/Royc4515",
  linkedin: "https://linkedin.com/in/roy-carmelli",
  phone: "+972547287807",
  photo: null as string | null,
};

/** `slot` is the equipment-screen slot each category maps to. */
export const skills = [
  { slot: "Weapons", category: "Languages",        items: ["Java 17", "Python", "C", "JavaScript", "TypeScript", "x86 Assembly"] },
  { slot: "Armor", category: "Web & Full Stack", items: ["React", "Vite", "Node.js", "Express", "Tailwind CSS", "SQLite", "Google OAuth"] },
  { slot: "Magic", category: "AI & Agents",      items: ["Claude API", "Gemini API", "Groq API", "MCP", "Agentic Workflows", "Prompt Engineering", "Serverless Functions", "Telegram Bot API"] },
  { slot: "Potions", category: "Data & Neuro",     items: ["NumPy", "Pandas", "SciPy", "Matplotlib", "Jupyter"] },
  { slot: "Tomes", category: "CS Foundations",   items: ["OOP", "Data Structures", "Algorithms", "Design Patterns", "Systems Programming"] },
  { slot: "Trinkets", category: "Tools",            items: ["Git", "VS Code", "IntelliJ", "PyCharm", "CLion", "Vercel", "Render", "GitHub Pages"] },
  { slot: "Achievements", category: "Certifications",   items: ["Claude Code in Action", "Claude Code 101", "Claude 101"] },
];
