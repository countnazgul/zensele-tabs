<script>
  import { onMount } from "svelte";
  import { createEventDispatcher } from "svelte";
  //   import { writable } from "svelte/store";
  import TabList from "./TabList.svelte";
  import { selectedTab } from "./store";

  const dispatch = createEventDispatcher();

  export let tabs = [];
  export let selectedTabIndex = 0;
  export let color = "#4f81e5";
  export let property;

  let originalTabs = [];

  $: {
    let data = {
      index: $selectedTab,
      data: tabs[$selectedTab],
    };

    if (property) {
      data = {
        index: $selectedTab,
        data: originalTabs[$selectedTab],
      };
    }

    dispatch("tabIndexChange", data);
  }

  onMount(() => {
    selectedTab.set(selectedTabIndex);
    if (property) {
      originalTabs = [...tabs];
      tabs = tabs.map(function (t) {
        return t[property];
      });
    }
  });

  function selectTab(tab) {
    if (tab < 0) return selectedTab.set(tabs.length - 1);
    if (tab > tabs.length - 1) return selectedTab.set(0);
    return selectedTab.set(tab);
  }
</script>

<style>
  .zenzele-tabs {
    height: 42px;
    width: 100%;
  }
</style>

<div class="zenzele-tabs">
  <TabList
    {tabs}
    {color}
    on:tabIndexChange={(event) => selectTab(event.detail)} />
</div>
