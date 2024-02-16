import * as GCodePreview from 'gcode-preview';
import {
  forwardRef,
  Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import * as THREE from 'three';

interface GCodePreviewProps {
  topLayerColor?: string;
  lastSegmentColor?: string;
  startLayer?: number;
  endLayer?: number;
  lineWidth?: number;
}

interface GCodePreviewHandle {
  getLayerCount: () => number;
  processGCode: (gcode: string | string[]) => void;
}

function GCodePreviewUI(
  props: GCodePreviewProps,
  ref: Ref<GCodePreviewHandle>
): JSX.Element {
  const {
    topLayerColor = '',
    lastSegmentColor = '',
    startLayer,
    endLayer,
    lineWidth
  } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState<GCodePreview.WebGLPreview>();

  const resizePreview = () => {
    preview?.resize();
  };

  useImperativeHandle(ref, () => ({
    getLayerCount() {
      return preview?.layers.length as number;
    },
    processGCode(gcode) {
      preview?.processGCode(gcode);
    }
  }));

  useEffect(() => {
    setPreview(
      GCodePreview.init({
        canvas: canvasRef.current as HTMLCanvasElement,
        startLayer,
        endLayer,
        lineWidth,
        topLayerColor: new THREE.Color(topLayerColor).getHex(),
        lastSegmentColor: new THREE.Color(lastSegmentColor).getHex(),
        buildVolume: { x: 250, y: 220, z: 150, r: 0, i: 0, j: 0 },
        initialCameraPosition: [0, 400, 450],
        allowDragNDrop: false
      })
    );

    window.addEventListener('resize', resizePreview);

    return () => {
      window.removeEventListener('resize', resizePreview);
    };
  }, []);

  return (
    <div className="gcode-preview">
      <canvas ref={canvasRef}></canvas>

      <div>
        <div>topLayerColor: {topLayerColor}</div>
        <div>lastSegmentColor: {lastSegmentColor}</div>
        <div>startLayer: {startLayer}</div>
        <div>endLayer: {endLayer}</div>
        <div>lineWidth: {lineWidth}</div>
      </div>
    </div>
  );
}

export default forwardRef(GCodePreviewUI);
