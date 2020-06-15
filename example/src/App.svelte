<script>
  import { Tabs } from "../../build/index.js";
  // import { Tabs } from "zensele-tabs";

  let tabs = [
    { name: "One 1", blah: 123 },
    { name: "Two 2", blah: 123 },
    { name: "Three 3", blah: 123 },
    { name: "Four 4", blah: 123 },
    { name: "Five 5", blah: 123 },
    { name: "Six 6", blah: 123 },
    { name: "Seven 7", blah: 123 },
    { name: "Eight 8", blah: 123 },
    { name: "Nine 9", blah: 123 },
    { name: "Ten 10", blah: 123 },
    { name: "Eleven 11", blah: 123 },
    { name: "Twelve 12", blah: 123 },
    { name: "Thirteen 13", blah: 123 },
    { name: "Fourteen 14", blah: 123 },
    { name: "Fifteen 15", blah: 123 },
    { name: "And avery very very very very very long one", blah: 123 }
  ];

  let tabs1 = [
    { name: "One 1", blah: 123 },
    { name: "Two 2", blah: 123 },
    { name: "Three 3", blah: 123 },
    { name: "Four 4", blah: 123 },
    { name: "Five 5", blah: 123 }
  ];

  let show = true;
  let tabBar1;
  $: active = 0;
  // $: console.log(active);
</script>

<style>
  main {
    width: 100%;
    height: 100%;
  }
</style>

<main>
  {#if show}
    <div>
      <Tabs
        {tabs}
        enableDelete={false}
        enableAdd={false}
        showNavigation={false}
        on:tabIndexChange={event => console.log(event.detail)}
        on:addTab={() => console.log('Add tab event')}
        on:removeTab={event => console.log(`Remove tab --> ${event.detail}`)}
        selectedTabIndex={active}
        color={'red'}
        property={'name'} />

      <button
        on:click={() => {
          tabBar1.selectedTabIndex(active);
          active++;
        }}>
        TEST
      </button>
      <Tabs
        bind:this={tabBar1}
        tabs={tabs1}
        enableDelete={false}
        enableAdd={false}
        showNavigation={false}
        maxWidth={100}
        on:tabIndexChange={event => console.log(event.detail)}
        on:addTab={() => console.log('Add tab event')}
        on:removeTab={event => console.log(`Remove tab --> ${event.detail}`)}
        selectedTabIndex={active}
        color={'red'}
        property={'name'} />
    </div>
  {/if}

</main>
