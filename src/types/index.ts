export interface Project {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  tech: string[];
  github?: string;
  live?: string;
  featured: boolean;
  year: number;
}

export interface Skill {
  category: string;
  items: string[];
}

export interface NavLink {
  label: string;
  href: string;
}
