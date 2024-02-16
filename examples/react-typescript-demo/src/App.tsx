import React, { useEffect, useRef } from 'react';
import GCodePreview from './components/GCodePreview';
import './styles.css';

type GCodePreviewHandle = React.ElementRef<typeof GCodePreview>;

const chunkSize = 250;

function App(): JSX.Element {
  const gcodePreviewRef1 = useRef<GCodePreviewHandle | null>(null);
  const gcodePreviewRef2 = useRef<GCodePreviewHandle | null>(null);
  // const [layersLoaded, setLayerLoaded] = useState<number>();

  const fetchGcode = async (url: string) => {
    const response = await fetch(url);
    if (response.status >= 200 && response.status <= 299) {
      const file = await response.text();
      return file.split('\n');
    } else {
      const errorMessage = `status code: ${response.status}, status text: ${response.statusText}`;
      throw new Error(errorMessage);
    }
  };

  const loadPreviewChunked = (
    target: GCodePreviewHandle,
    lines: string[],
    delay: number
  ) => {
    let c = 0;

    // replace substr with substring because it is not part of the main ECMAScript specification
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr
    const id =
      '__animationTimer__' + Math.random().toString(36).substring(2, 10);
    const loadProgressive = () => {
      const start = c * chunkSize;
      const end = (c + 1) * chunkSize;
      const chunk = lines.slice(start, end);

      target.processGCode(chunk);
      // setLayerLoaded(target.getLayerCount());
      c++;
      if (c * chunkSize < lines.length) {
        window[id] = setTimeout(loadProgressive, delay);
      }
    };

    // cancel loading process if one is still in progress
    // mostly when hot reloading
    window.clearTimeout(window[id]);
    loadProgressive();
  };

  useEffect(() => {
    async function init() {
      const lines1 = await fetchGcode('/benchy.gcode');
      loadPreviewChunked(
        gcodePreviewRef1.current as GCodePreviewHandle,
        lines1,
        50
      );

      const lines2 = await fetchGcode('/duplo_tracks.gcode');
      loadPreviewChunked(
        gcodePreviewRef2.current as GCodePreviewHandle,
        lines2,
        50
      );
    }
    init();
  }, []);

  return (
    <div className="app">
      <h1>GCode Preview React & TypeScript Demo</h1>

      <GCodePreview
        ref={gcodePreviewRef1}
        topLayerColor="lime"
        lastSegmentColor="red"
        startLayer={20}
        endLayer={150}
      />

      <GCodePreview
        ref={gcodePreviewRef2}
        topLayerColor="purple"
        lastSegmentColor="cyan"
      />

      {/* <div># layers loaded: {layersLoaded}</div> */}
    </div>
  );
}

export default App;
