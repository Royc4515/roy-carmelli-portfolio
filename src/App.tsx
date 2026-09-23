import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './sections/Hero';
import About from './sections/About';
import Projects from './sections/Projects';
import Skills from './sections/Skills';
import Resume from './sections/Resume';
import Contact from './sections/Contact';
import { Button } from './components/ui/Button';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [theme, toggleTheme] = useTheme();
  return (
    <>
      {/* First focusable element: parked above the viewport until it takes focus. */}
      <Button
        href="#projects"
        className="fixed left-4 top-4 z-[200] -translate-y-[200%] focus:translate-y-0"
      >
        Skip to projects
      </Button>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero />
        <Projects />
        <About />
        <Skills />
        <Resume />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
