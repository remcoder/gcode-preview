<script lang="ts">
	import { onMount } from 'svelte';
	import * as GCodePreview from 'gcode-preview';

	let canvas: HTMLCanvasElement;
	let preview: GCodePreview.WebGLPreview;
	export let src: string;

	onMount(() => {
		preview = GCodePreview.init({
			canvas,
			devMode: false,
			renderTubes: true,
			buildVolume: {
				x: 200,
				y: 200,
				z: 0
			}
		});

		load(src);
	});

	async function load(src: string) {
		const response = await fetch(src);
		const gcode = await response.text();
		preview.processGCode(gcode);
	}
</script>

<canvas class="w-full h-full" bind:this={canvas}></canvas>
