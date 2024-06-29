<script lang="ts">
	import { onMount } from 'svelte';
	import * as GCodePreview from 'gcode-preview';

	let canvas: HTMLCanvasElement;
	let preview: GCodePreview.WebGLPreview;

	onMount(() => {
		let preview = GCodePreview.init({
			canvas,
			devMode: false,
			buildVolume: {
				x: 200,
				y: 200,
				z: 0
			}
		});

		preview.processGCode('G0 X0 Y0 Z0\nG1 X10 Y10 Z10 E10');
	});
</script>

<h1>GCode Preview</h1>
<canvas bind:this={canvas}></canvas>
