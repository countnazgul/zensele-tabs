<script>
  // import { Tabs } from "../../build/index.js";
  import { Tabs } from "zensele-tabs";

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
    { name: "And avery very very very very very long one", blah: 123 },
  ];

  // let tabs1 = [
  //   "One 1",
  //   "Two 2",
  //   "Three 3",
  //   "Four 4",
  //   "Five 5",
  //   "Six 6",
  //   "Seven 7",
  //   "Eight 8",
  //   "Nine 9",
  //   "Ten 10",
  //   "Eleven 11",
  //   "Twelve 12",
  //   "Thirteen 13",
  //   "Fourteen 14",
  //   "Fifteen 15",
  //   "And avery very very very very very long one",
  // ];

  let show = true;
</script>

<style>
  main {
    width: 100%;
    height: 100%;
  }
</style>

<main>
  <button on:click={() => (show = !show)}>TEST</button>
  {#if show}
    <Tabs
      {tabs}
      on:tabIndexChange={(event) => console.log(event.detail)}
      selectedTabIndex={1}
      color={'red'}
      property={'name'} />
  {/if}

</main>
