<script>
  import { onMount, tick } from "svelte";
  import { createEventDispatcher } from "svelte";
  import TabList from "./TabList.svelte";
  import { selectedTab } from "./store";

  const dispatch = createEventDispatcher();

  export let tabs = [];
  export let color = "#4f81e5";
  export let property = null;
  export function selectedTabIndex(data) {
    selectTab(data);
  }

  let originalTabs = [];

  $: {
    let data = {
      index: $selectedTab,
      data: tabs[$selectedTab]
    };

    if (property) {
      data = {
        index: $selectedTab,
        data: originalTabs[$selectedTab]
      };
    }

    dispatch("tabIndexChange", data);
  }

  onMount(async () => {
    // selectedTab.set(selectedTabIndex);
    await tick();
    if (property) {
      originalTabs = [...tabs];
      tabs = tabs.map(function(t) {
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
    on:tabIndexChange={event => selectTab(event.detail)} />

</div>
