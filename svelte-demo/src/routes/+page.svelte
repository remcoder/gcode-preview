<script lang="ts">
  import GCode from '../lib/gcode.svelte';
  
  import { Badge, Drawer, Button, ButtonGroup, CloseButton, Range, Checkbox } from 'flowbite-svelte';
  import { sineIn } from 'svelte/easing';
  import { Select, Label } from 'flowbite-svelte';
  import { InfoCircleSolid } from 'flowbite-svelte-icons';
  let panel = 'extrusion';
  let selected = '';
  let presets = [
    { value: 'us', name: 'Vase mode' },
    { value: 'ca', name: 'Multi color' },
    { value: 'fr', name: 'CNC' }
  ];
  let selectedFile = '';
  let files = [
    { value: 'us', name: 'Screw' },
    { value: 'ca', name: 'Benchy' },
    { value: 'fr', name: 'Vase' }
  ];

  let hidden1 = true;
  let transitionParams = {
    x: -320,
    duration: 200,
    easing: sineIn
  };
</script>
<div class="text-center absolute">
  <Button on:click={() => (hidden1 = false)}>Show drawer</Button>
</div>
<GCode src="benchy.gcode" />

<Drawer activateClickOutside={false} transitionType="fly" {transitionParams} bind:hidden={hidden1} backdrop={false} id="sidebar1">
  <div class="flex items-center">
    <h5 id="drawer-label" class="inline-flex items-center mb-4 text-base font-semibold text-gray-500 dark:text-gray-400">
      <InfoCircleSolid class="w-5 h-5 me-2.5" />GCode Preview
    </h5>
    <CloseButton on:click={() => (hidden1 = true)} class="mb-4 dark:text-white" />
  </div>
  
  <!-- <Label>
    Select a preset
    <Select class="mt-2" items={presets} bind:value={selected} />
  </Label>

  <Label>
    Select a file
    <Select class="mt-2" items={files} bind:value={selectedFile} />
  </Label> -->
<br>
  <ButtonGroup class="*:!ring-primary-700">
    <Button on:click={() => panel = "extrusion"}>Extrusion</Button>
    <Button on:click={() => panel = "travel"}>Travel</Button>
    <Button on:click={() => panel = "build_plate"}>Build plate</Button>
  </ButtonGroup>
  <br>
  
  {#if panel === 'extrusion'}
  <Label>Enable</Label>
  <Checkbox id="range1"  value={50} /> 

  <Label>Width</Label>
  <Range id="range1"  value={50} /> 

  <Label>Render as tubes</Label>
  <Checkbox /> 

  <Label>Color 1</Label>
  <input type="color" value="#ff0000" />

  <Label>Color 2</Label>
  <input type="color" value="#00ff00" />

  <Label>Color 3</Label>
  <input type="color" value="#0000ff" />

  <Label>Color 4</Label>
  <input type="color" value="#ffff00" />
  {/if}

  {#if panel === 'travel'}
  <Label>Enable</Label>
  {/if}

  {#if panel === 'build_plate'}
  <Label>Enable</Label>
  <Checkbox />
  <Label>X</Label>
  <Range value={20} />
  <Label>Y</Label>
  <Range value={20} />

  {/if}
</Drawer>