// src/data/linkedin.ts
//
// Roy's public LinkedIn profile (from its "Save to PDF" export, Oct 2026), curated for the chat
// agent's knowledge. Not rendered on the page. Where LinkedIn and the site disagree, the site
// wins (Roy's call): the IDF role uses the site's wording, the team size follows the CV ("30+"), and the
// location stays at "central Israel" rather than the city. Contact lines are left out on purpose.

export const linkedin = {
  url: "https://linkedin.com/in/roy-carmelli",
  headline: "Computer Science & Neuroscience Student at Bar-Ilan | AI & Software Development",
  summary:
    "Third-year Computer Science & Neuroscience student at Bar-Ilan. I build AI tools I use every day, like Aside (a Chrome extension that puts six AI models next to any page) and a Telegram sommelier that runs my wine cellar. Looking for a student position in AI or software development.",
  topSkills: ["Git", "React.js", "TypeScript"],
  certifications: [
    "Claude Code in Action",
    "AI Fluency: Framework & Foundations",
    "Claude 101",
    "Introduction to Claude Cowork",
    "Claude Code 101",
  ],
  education: {
    school: "Bar-Ilan University",
    degree: "B.Sc., Computer Science and Neuroscience",
    period: "October 2024 - February 2028 (expected)",
  },
  service: {
    org: "Israel Defense Forces",
    /** don't touch / repo rule: describe the role this way, never as "combat medic". */
    role: 'Senior battalion medic (חוג"ד) and medical officer coordinator in the Gaza Division, an operational support role',
    /** LinkedIn's own title; the chat uses it only when someone asks about his title. */
    linkedinTitle: "Senior Medical Operations Commander",
    period: "Regular service 2021 - August 2024; reservist since, with 400+ days of reserve duty alongside full-time studies",
    points: [
      "Led a medical unit as it grew from 12 to 30+ people at the start of the war, during high-intensity operations.",
      "Ran real-time medical logistics and evacuation coordination in the Gaza Division war room, between field units and senior command.",
      "Led the medical response in mass-casualty events, making time-critical triage and evacuation calls.",
      "As clinic commander, ran routine clinic operations and staff to keep the division ready.",
    ],
  },
};
