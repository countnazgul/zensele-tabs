<script>
  import { images } from "./images";
  import Tab from "./Tab.svelte";
  // import { selectedTab } from "./store";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let tabs;
  export let color;
  export let showNavigation;
  export let enableDelete;
  export let enableAdd;
  export let selectedTab;
  export let maxWidth;

  let tabsContainer;
  let w;

  $: visibleArrows = true;
  $: {
    if (!showNavigation) {
      if (tabsContainer) {
        if (w < tabsContainer.scrollWidth) {
          visibleArrows = true;
        } else {
          visibleArrows = false;
        }
      }
    }
  }

  function addTab() {
    dispatch("addTab");
  }

  function nextTab() {
    dispatch("tabIndexChange", $selectedTab + 1);
  }

  function prevTab() {
    dispatch("tabIndexChange", $selectedTab - 1);
  }
</script>

<style>
  .zenzele-tabs__tab-list {
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: row;
  }

  .zenzele-tabs__navigation {
    width: 30px;
    border: 0;
    margin: 0px;
  }
  .zenzele-tabs__center {
    display: flex;
    align-items: center;
    justify-items: center;
  }

  .zenzele-tabs__list {
    overflow: hidden;
    flex-grow: 2;
    display: flex;
  }
  input:focus {
    outline: none;
  }

  .zenzele-tabs__add {
    font-size: 30px;
    display: flex;
    align-self: center;
    justify-content: center;
    min-width: 30px;
    border-right: 2px solid var(--theme-color);
    border-bottom: 2px solid var(--theme-color);
    cursor: pointer;
  }
</style>

<div class="zenzele-tabs__tab-list">
  {#if enableAdd}
    <div
      on:click={addTab}
      class="zenzele-tabs__add"
      style="--theme-color: {color}"
      title="Add tab">
      +
    </div>
  {/if}
  {#if visibleArrows}
    <div on:click={prevTab} class="zenzele-tabs__center" title="Previous tab">
      <input
        class="zenzele-tabs__navigation"
        type="image"
        alt="Previous tab"
        src={images.arrowLeft} />
    </div>
  {/if}

  <div
    class="zenzele-tabs__list"
    bind:this={tabsContainer}
    bind:clientWidth={w}>
    {#each tabs as tab, index}
      <Tab
        {index}
        {color}
        {enableDelete}
        {selectedTab}
        label={tab}
        {maxWidth}
        on:removeTab={event => dispatch('removeTab', event.detail)} />
    {/each}

  </div>

  {#if visibleArrows}
    <div on:click={nextTab} class="zenzele-tabs__center" title="Next tab">
      <input
        class="zenzele-tabs__navigation"
        type="image"
        alt="Next tab"
        src={images.arrowRight} />
    </div>
  {/if}
</div>
