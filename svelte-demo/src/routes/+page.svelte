<script lang="ts">
	import GCode from '../lib/gcode.svelte';

  import { Alert } from 'flowbite-svelte';</script>

<h1>GCode Preview</h1>
<div class="p-8">
  <Alert>
    <span class="font-medium">Info alert!</span>
    Change a few things up and try submitting again.
  </Alert>
</div>
<GCode src="benchy.gcode" />
