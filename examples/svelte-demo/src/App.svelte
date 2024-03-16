<script lang="ts">
  import svelteLogo from './assets/svelte.svg'
  import GCodePreview from './lib/GCodePreview.svelte';
  
  let gcodeSrc = '/benchy.gcode';
  let gcodeChunkSize = 500;
</script>

<main>
  <div>
    <a href="https://vitejs.dev" target="_blank"> 
      <img src="/vite.svg" class="logo" alt="Vite Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank"> 
      <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>

  <h1>GCodePreview with Vite + Svelte</h1>

  <div>
    <GCodePreview src={gcodeSrc} chunkSize={gcodeChunkSize} />
  </div>
  <button on:click={() => { 
    gcodeSrc='/ripple_vase.gcode';
    gcodeChunkSize=null
  } }>ripple_vase.gcode</button>
  <button on:click={() => { 
    gcodeSrc='/benchy.gcode';
    gcodeChunkSize=500
  } }>benchy.gcode<br>chunk size = 500</button>
</main>

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
</style>
