<script>
  import { onMount, tick, createEventDispatcher } from "svelte";
  // import { selectedTab } from "./store";
  import { images } from "./images";

  const dispatch = createEventDispatcher();

  export let index;
  export let label;
  export let color;
  export let enableDelete;
  export let selectedTab;

  let element;
  let isSelected;

  $: isSelected = $selectedTab === index;
  $: {
    if (isSelected === true && element) {
      element.scrollIntoView();
    }
  }

  onMount(async () => {});
</script>

<style>
  .zenzele-tabs__tab {
    border: none;
    border-bottom: 2px solid transparent;
    color: #000000;
    cursor: pointer;
    /* max-width: 300px; */
    padding: 0.5em 0.75em;
    flex: 1;
  }

  .zenzele-tabs__tab:focus {
    outline: thin dotted;
  }

  .zenzele-tabs__selected {
    border-bottom: 2px solid;
    color: var(--theme-color);
  }

  .zenzele-tabs__remove-container {
    padding-left: 10px;
    align-items: center;
  }
  .zenzele-tabs__remove {
    width: 7px;
    height: 7px;
    margin: 0px;
    padding: 0px;
    border: 0px;
  }

  input:focus {
    outline: none;
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
    if ($selectedTab != index) selectedTab.set(index);
  }}
  class="zenzele-tabs__tab"
  class:zenzele-tabs__selected={isSelected}
  style="--theme-color: {color}">
  <div style="display: flex; justify-content: center">
    <div bind:this={element} class="titleContent" title={label}>{label}</div>
    {#if isSelected}
      {#if enableDelete}
        <div class="zenzele-tabs__remove-container">
          <input
            on:click={() => dispatch('removeTab', index)}
            class="zenzele-tabs__remove"
            type="image"
            alt="Remove tab"
            src={images.remove} />
        </div>
      {/if}
    {/if}
  </div>

</div>
