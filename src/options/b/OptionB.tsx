import { OptionShell } from '../shared/OptionShell';
import { bio } from '../shared/content';

/** Placeholder until the option is built. */
export default function OptionB() {
  return (
    <OptionShell optionKey="b">
      <main id="main">
        <h1>{bio.name}</h1>
      </main>
    </OptionShell>
  );
}
