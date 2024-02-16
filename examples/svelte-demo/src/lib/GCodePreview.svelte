<script lang="ts">
import * as GCodePreview from 'gcode-preview';
import { onMount } from 'svelte';

export let src;
export let chunkSize = Infinity;

let canvas;
let preview;
let __animationTimer__;

$: {
    load(src);
}

onMount(() => {
    window['preview'] = preview = GCodePreview.init({
        canvas,
        allowDragNDrop: true,
        extrusionColor: 'lime'
    });

    load(src);
});

async function load(src) {
    preview && loadChuncked(preview, await fetchGcode(src),50);
}

async function fetchGcode(url) {
    const response = await fetch(url);

    if (response.status !== 200) {
        throw new Error(`status code: ${response.status}`);
    }

    const file = await response.text();
    return file.split('\n');
}

function loadChuncked(preview,lines,delay) {
    let c = 0;
    
    preview.clear();
    if (__animationTimer__)
        window.clearTimeout(__animationTimer__);

    const loadProgressive = () => {
        const _chunkSize = chunkSize ?? Infinity;
        const start = c * _chunkSize;
        const end = (c + 1) * _chunkSize;
        const chunk = lines.slice(start, end);

        preview.processGCode(chunk);
        c++;
        if (c * _chunkSize < lines.length) {
            __animationTimer__ = setTimeout(loadProgressive, delay);
        }
    };

    // cancel loading process if one is still in progress
    // mostly when hot reloading
    window.clearTimeout(__animationTimer__);
    loadProgressive();
};

</script>

<canvas
    bind:this={canvas}
    width={300}
    height={200}>
</canvas>


<style>
    canvas {
        cursor: grab;
    }
</style>
