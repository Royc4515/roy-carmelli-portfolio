/** Quest tier: drives card size and placement in the Projects zone. */
export type ProjectTier = 'main' | 'side' | 'research';

export interface Project {
  id: string;
  title: string;
  /** One-line value proposition shown on the card (≤ 140 characters). */
  tagline: string;
  /** Full story, shown in the expandable quest log. */
  description: string;
  longDescription?: string;
  /** Short "loot" highlights (main quests only). */
  highlights?: string[];
  /** What kind of thing this is, e.g. "Chrome extension". */
  kind: string;
  tech: string[];
  github?: string;
  live?: string;
  tier: ProjectTier;
  status?: 'in-development';
  year: number;
}

export interface Skill {
  category: string;
  items: string[];
}
