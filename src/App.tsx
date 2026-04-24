import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './sections/Hero';
import About from './sections/About';
import Projects from './sections/Projects';
import Skills from './sections/Skills';
import Resume from './sections/Resume';
import Contact from './sections/Contact';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [theme, toggleTheme] = useTheme();
  return (
    <>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Contact />
        <Resume />
      </main>
      <Footer />
    </>
  );
}
