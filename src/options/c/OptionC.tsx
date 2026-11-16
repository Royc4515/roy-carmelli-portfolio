import { OptionShell } from '../shared/OptionShell';
import { bio } from '../shared/content';

/** Placeholder until the option is built. */
export default function OptionC() {
  return (
    <OptionShell optionKey="c">
      <main id="main">
        <h1>{bio.name}</h1>
      </main>
    </OptionShell>
  );
}
