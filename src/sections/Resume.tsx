import { bio } from '../data/bio';
import PixelPanel from '../components/PixelPanel';
import PixelIcon from '../components/PixelIcon';
import { Button } from '../components/ui/Button';
import { ZoneHeader } from '../components/ui/ZoneHeader';
import { Reveal } from '../components/ui/Reveal';
import { useToast } from '../components/ui/Toast';

/**
 * Zone 04 · Resume Scroll (SPEC §4 Resume): one wide parchment band with the
 * scroll icon, what the PDF contains, its meta line, and Download / View.
 * Downloading pops the "Loot acquired" toast.
 *
 * Layout: ≥ 1024 icon · text · buttons in one row; 768-1023 the buttons drop
 * under the text (a third column would squeeze the sentence to ~5 lines);
 * < 768 everything stacks and the buttons go full width.
 */
export default function Resume() {
  const toast = useToast();
  const { href, fileName, meta } = bio.resume;

  const onDownload = () => {
    toast.show(`Loot acquired: ${fileName}`, { icon: <PixelIcon name="trophy" size={24} /> });
  };

  return (
    <section id="resume" aria-labelledby="resume-title" className="relative bg-bg-alt px-dots py-12 md:py-16 min-[100rem]:py-20 short:py-6 low:py-6">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6 lg:px-8">
        <Reveal>
          <ZoneHeader
            zone={4}
            name="Resume Scroll"
            title="Resume"
            icon={<PixelIcon name="scroll" size={36} />}
            id="resume-title"
          />
        </Reveal>

        <Reveal index={1}>
          <PixelPanel
            variant="paper"
            elevation={2}
            padding="lg"
            className="grid grid-cols-1 gap-6 md:grid-cols-[48px_minmax(0,1fr)] lg:grid-cols-[48px_minmax(0,1fr)_auto] lg:items-center"
          >
            <PixelIcon name="scroll" size={48} className="text-ink" />

            <div className="min-w-0">
              <p className="max-w-[60ch] text-body text-pretty text-ink">
                Full breakdown: coursework with grades, project{' '}
                <span className="whitespace-nowrap">deep-dives</span>, IDF reserve service, certifications.
              </p>
              <p className="mt-2 text-hud text-ink-muted">{meta}</p>
            </div>

            {/* 24px between stacked buttons clears the 8px drop and the 15px focus ring. */}
            <div className="flex flex-col gap-6 md:col-start-2 md:flex-row md:gap-4 lg:col-start-3">
              <Button
                href={href}
                download={fileName}
                size="lg"
                leadingIcon={<PixelIcon name="download" size={24} />}
                onClick={onDownload}
                aria-label="Download resume (PDF)"
              >
                Download
              </Button>
              <Button
                href={href}
                external
                variant="secondary"
                size="lg"
                leadingIcon={<PixelIcon name="external" size={24} />}
                aria-label="View resume (PDF, opens in a new tab)"
              >
                View
              </Button>
            </div>
          </PixelPanel>
        </Reveal>
      </div>
    </section>
  );
}
