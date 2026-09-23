import { projects as allProjects } from '../data/projects';
import type { Project, ProjectTier } from '../types/index';
import PixelIcon from '../components/PixelIcon';
import PixelPanel from '../components/PixelPanel';
import QuestCard, { ResearchLogItem } from '../components/QuestCard';
import { Reveal } from '../components/ui/Reveal';
import { ZoneHeader } from '../components/ui/ZoneHeader';

const TITLE_ID = 'projects-title';

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
 */
export default function Projects({ projects = allProjects }: ProjectsProps) {
  const main = byTier(projects, 'main');
  const side = byTier(projects, 'side');
  const research = byTier(projects, 'research');

  return (
    <section id="projects" aria-labelledby={TITLE_ID} className="relative bg-bg px-dots py-16 md:py-24">
      <div className="relative mx-auto max-w-[1120px] px-4 md:px-6 lg:px-8">
        <Reveal>
          <ZoneHeader
            zone={1}
            name="The Library"
            title="Things I've Built"
            subtitle="Three main quests, three side quests and three research logs."
            icon={<PixelIcon name="book" size={36} />}
            id={TITLE_ID}
          />
        </Reveal>

        {main.length > 0 && (
          <ul role="list" aria-label="Main quests" className="quest-list quest-list--main">
            {main.map((project, i) => (
              <Reveal as="li" key={project.id} index={i}>
                <QuestCard project={project} layout={i === 0 ? 'feature' : 'standard'} />
              </Reveal>
            ))}
          </ul>
        )}

        {side.length > 0 && (
          <ul role="list" aria-label="Side quests" className="quest-list quest-list--side mt-12">
            {side.map((project, i) => (
              <Reveal as="li" key={project.id} index={i}>
                <QuestCard project={project} />
              </Reveal>
            ))}
          </ul>
        )}

        {research.length > 0 && (
          <Reveal className="mt-16">
            <PixelPanel
              variant="wood"
              elevation={1}
              tab={
                <>
                  <PixelIcon name="scroll" size={12} />
                  Research logs
                </>
              }
            >
              <ul role="list" aria-label="Research logs" className="research-list">
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
