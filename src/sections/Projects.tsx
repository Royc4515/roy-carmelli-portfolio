import { projects as allProjects } from '../data/projects';
import type { Project, ProjectTier } from '../types/index';
import PixelIcon from '../components/PixelIcon';
import PixelPanel from '../components/PixelPanel';
import QuestCard, { ResearchLogItem } from '../components/QuestCard';
import { Reveal } from '../components/ui/Reveal';
import { ZoneHeader } from '../components/ui/ZoneHeader';

const TITLE_ID = 'projects-title';
const MAIN_ID = 'projects-main-title';
const SIDE_ID = 'projects-side-title';
const RESEARCH_ID = 'projects-research-title';

/** Projects of one tier, in data order. */
export function byTier(list: readonly Project[], tier: ProjectTier): Project[] {
  return list.filter(p => p.tier === tier);
}

export interface ProjectsProps {
  /** Defaults to the site data; tests pass fixtures. */
  projects?: readonly Project[];
}

/**
 * Zone 01 · The Library (SPEC §4 Projects). Main quests first (the lead one full width),
 * then side quests in a grid, then research logs as a compact list.
 *
 * Headings: H2 zone title · H3 per tier · H4 per project. The main and side H3s are visually
 * hidden because every card already wears its tier tag (star + MAIN QUEST / SIDE QUEST), so a
 * visible label would repeat it right above the cards; research logs have no per-row tag, so
 * their brass tab plate is the visible H3.
 */
export default function Projects({ projects = allProjects }: ProjectsProps) {
  const main = byTier(projects, 'main');
  const side = byTier(projects, 'side');
  const research = byTier(projects, 'research');

  return (
    <section id="projects" aria-labelledby={TITLE_ID} className="relative bg-bg px-dots py-12 md:py-16 min-[100rem]:py-20">
      <div className="relative mx-auto max-w-[1120px] px-4 md:px-6 lg:px-8">
        <Reveal>
          <ZoneHeader
            zone={1}
            name="The Library"
            title="Things I've Built"
            subtitle="What I've shipped, from a Chrome extension to AI pipelines. Start with the main quests."
            icon={<PixelIcon name="book" size={36} />}
            id={TITLE_ID}
          />
        </Reveal>

        {main.length > 0 && (
          <>
            <h3 id={MAIN_ID} className="sr-only">
              Main quests
            </h3>
            <ul role="list" aria-labelledby={MAIN_ID} className="quest-list quest-list--main">
              {main.map((project, i) => (
                <Reveal as="li" key={project.id} index={i}>
                  <QuestCard project={project} layout={i === 0 ? 'feature' : 'standard'} />
                </Reveal>
              ))}
            </ul>
          </>
        )}

        {side.length > 0 && (
          <>
            <h3 id={SIDE_ID} className="sr-only">
              Side quests
            </h3>
            <ul role="list" aria-labelledby={SIDE_ID} className="quest-list quest-list--side mt-12">
              {side.map((project, i) => (
                <Reveal as="li" key={project.id} index={i}>
                  <QuestCard project={project} />
                </Reveal>
              ))}
            </ul>
          </>
        )}

        {research.length > 0 && (
          <Reveal className="mt-16">
            <PixelPanel
              variant="wood"
              elevation={1}
              tab={
                <h3 id={RESEARCH_ID} className="research-heading">
                  <PixelIcon name="scroll" size={12} />
                  Research logs
                </h3>
              }
            >
              <ul role="list" aria-labelledby={RESEARCH_ID} className="research-list">
                {research.map(project => (
                  <ResearchLogItem key={project.id} project={project} />
                ))}
              </ul>
            </PixelPanel>
          </Reveal>
        )}
      </div>
    </section>
  );
}
