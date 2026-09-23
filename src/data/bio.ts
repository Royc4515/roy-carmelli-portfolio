// src/data/bio.ts

export const bio = {
  name: "Roy Carmelli",
  nameHe: "רועי כרמלי",
  title: "CS × Neuroscience · Bar-Ilan University",
  role: "Full-Stack & AI Developer",
  availability: "Open to internships · Israel",
  contactBlurb: "Available now for software engineering and AI internships: part-time during the semester, full-time during breaks. Also open to research collaborations at the CS × neuroscience intersection.",
  resume: {
    href: "/Roy_Carmelli_CV.pdf",
    fileName: "Roy_Carmelli_CV.pdf",
    meta: "PDF · 1 page · updated Sep 2026",
  },
  institution: "Bar-Ilan University",
  location: "Israel",
  tagline: "I ship full-stack apps, Chrome extensions, and agentic AI tools. Third-year B.Sc. student exploring where software meets the brain.",
  about: `I'm a Computer Science and Neuroscience student at Bar-Ilan University - one of the few programs that puts software engineering depth and hands-on neuroscience research in the same degree.

I ship full-stack apps, data pipelines, and Chrome extensions. I use AI deliberately as part of how I work - not as a shortcut, but as a tool I understand and architect with. I'm drawn to problems that sit at the edge of CS and neuroscience: how software models cognition, how data reveals something real about the brain.

In parallel, I serve as a combat medic and medical operations coordinator in the IDF reserves (Gaza Division, since 2021). I scaled a medical unit from 12 to 30+ personnel during high-intensity conflict and ran real-time coordination from a divisional war room. It taught me ownership, triage, and shipping under pressure better than any course could.`,
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
