import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Resume from './Resume';
import { ToastProvider } from '../components/ui/Toast';
import { bio } from '../data/bio';

function renderResume() {
  return render(
    <ToastProvider>
      <Resume />
    </ToastProvider>,
  );
}

describe('Resume', () => {
  it('is a region labelled by its zone title', () => {
    renderResume();
    const region = screen.getByRole('region', { name: 'Resume' });
    expect(region).toHaveAttribute('id', 'resume');
    expect(screen.getByText('Zone 04 · Resume Scroll')).toBeInTheDocument();
  });

  it('keeps the description sentence verbatim and shows the PDF meta', () => {
    renderResume();
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === 'P' &&
          el.textContent ===
            'Full breakdown: coursework with grades, project deep-dives, IDF reserve service, certifications.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(bio.resume.meta)).toBeInTheDocument();
  });

  it('downloads the PDF: href plus a download attribute with the file name', () => {
    renderResume();
    const link = screen.getByRole('link', { name: /download resume/i });
    expect(link).toHaveAttribute('href', bio.resume.href);
    expect(link).toHaveAttribute('download', bio.resume.fileName);
    expect(link).toHaveTextContent('Download');
  });

  it('views the PDF in a new tab', () => {
    renderResume();
    const link = screen.getByRole('link', { name: /view resume/i });
    expect(link).toHaveAttribute('href', bio.resume.href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link).not.toHaveAttribute('download');
    expect(link).toHaveTextContent('View');
  });

  it('shows the "Loot acquired" toast with a trophy when Download is clicked', () => {
    renderResume();
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    const link = screen.getByRole('link', { name: /download resume/i });
    // jsdom can't navigate or download; cancel the default so only the handlers run.
    link.addEventListener('click', e => e.preventDefault());
    fireEvent.click(link);

    expect(status).toHaveTextContent(`Loot acquired: ${bio.resume.fileName}`);
    expect(status.querySelector('[data-icon="trophy"]')).not.toBeNull();
  });
});
