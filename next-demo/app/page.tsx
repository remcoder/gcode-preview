import styles from './page.module.css';
import { GCodePreview } from './GCodePreview';
import { Sidebar } from './sidebar';
import { Pane } from './pane';

export default function Home() {
  const gcode = 'G21';

  return (
    <main className={styles.main}>
      <Sidebar />
      <Pane left right bottom>
        <input type="range" min={0} max={100} defaultValue={30} style={{ width: '100%' }} />
      </Pane>
      <Pane right top bottom>
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={10}
          orient="vertical"
          style={{
            height: '80vh'
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={80}
          orient="vertical"
          style={{
            height: '80vh'
          }}
        />
      </Pane>
      <GCodePreview />
    </main>
  );
}
