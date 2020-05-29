<script>
  import { onMount, tick } from "svelte";
  import { selectedTab } from "./store";

  export let index;
  export let label;
  export let color;

  let element;
  let isSelected;

  $: isSelected = $selectedTab === index;
  $: {
    if (isSelected === true && element) {
      element.scrollIntoView();
    }
  }

  onMount(async () => {
    await tick();
  });
</script>

<style>
  .zenzele-tabs__tab {
    border: none;
    border-bottom: 2px solid transparent;
    color: #000000;
    cursor: pointer;
    max-width: 300px;
    padding: 0.5em 0.75em;
  }

  .zenzele-tabs__tab:focus {
    outline: thin dotted;
  }

  .zenzele-tabs__selected {
    border-bottom: 2px solid;
    color: var(--theme-color);
  }

  .titleContent {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

<div
  on:click={() => {
    element.focus();
    selectedTab.set(index);
  }}
  class="zenzele-tabs__tab"
  class:zenzele-tabs__selected={isSelected}
  style="--theme-color: {color}">
  <div bind:this={element} class="titleContent" title={label}>{label}</div>
</div>
