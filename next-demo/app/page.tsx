import styles from './page.module.css';
import { GCodePreview } from './GCodePreview';
import { Sidebar } from './sidebar';

export default function Home() {
  const gcode = 'G21';

  return (
    <main className={styles.main}>
      <Sidebar />
      <GCodePreview />
    </main>
  );
}
