import { bio } from '../data/bio';
import { OPTIONS } from './registry';
import { optionHref } from './route';
import { useOptionReady } from './shared/ready';
import './chooser.css';

/** "/?options": the list Roy opens on his phone to compare the designs. */
export default function Chooser() {
  useOptionReady();
  return (
    <div className="opt chooser">
      <main className="chooser__main">
        <p className="chooser__eyebrow">{bio.name} - portfolio</p>
        <h1 className="chooser__title">Design options</h1>
        <p className="chooser__lede">
          Each one is a working page built from the same content as the current site. Open them on a
          laptop and on a phone, in light and dark, then compare with the current design.
        </p>
        <ol className="chooser__list">
          {OPTIONS.map(option => (
            <li key={option.key}>
              <a className="chooser__card" href={optionHref(option.key)}>
                <span className="chooser__letter" aria-hidden="true">
                  {option.key.toUpperCase()}
                </span>
                <span className="chooser__text">
                  <span className="chooser__name">
                    <span className="opt-sr">Option {option.key.toUpperCase()}: </span>
                    {option.name}
                  </span>
                  <span className="chooser__summary">{option.summary}</span>
                  <span className="chooser__tech">{option.techniques}</span>
                </span>
                <span className="chooser__go" aria-hidden="true">
                  &rarr;
                </span>
              </a>
            </li>
          ))}
        </ol>
        <p className="chooser__foot">
          <a className="chooser__current" href="/">
            Open the current site (pixel RPG)
          </a>
          <span>These pages are previews: not indexed, and nothing on the live site changes.</span>
        </p>
      </main>
    </div>
  );
}
