import { OptionShell } from '../shared/OptionShell';
import { bio } from '../shared/content';

/** Placeholder until the option is built. */
export default function OptionD() {
  return (
    <OptionShell optionKey="d">
      <main id="main">
        <h1>{bio.name}</h1>
      </main>
    </OptionShell>
  );
}
