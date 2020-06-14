<script>
  import { onMount, tick, createEventDispatcher } from "svelte";
  import { writable } from "svelte/store";
  import TabList from "./TabList.svelte";

  const selectedTab = writable(null);

  const dispatch = createEventDispatcher();

  export let tabs = [];
  export let color = "#4f81e5";
  export let property = null;
  export let showNavigation = true;
  export let enableDelete = true;
  export let enableAdd = true;

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
    {showNavigation}
    {enableDelete}
    {enableAdd}
    {selectedTab}
    on:tabIndexChange={event => selectTab(event.detail)}
    on:addTab={() => dispatch('addTab')}
    on:removeTab={event => dispatch('removeTab', event.detail)} />

</div>
