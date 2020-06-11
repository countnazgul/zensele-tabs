[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/T6T0148ZP)

# zenSele Tabs

`Svelte` tab bar component.

### Demo

Check out this [repl](https://svelte.dev/repl/b3842886317b4e4e93986c629de007e7?version=3.21.0)

### Install

    npm install --save zensele-tabs

### Usage

- Arrays

  ```javascript
  <script>
      import { Tabs } from "zensele-tabs";

      let tabs = ["One", "Two", "Three"];
  </script>

  <div>
      <Tabs {tabs}/>
  </div>
  ```

- Object Arrays - when passing object arrays then we need to specify which property of the object to be used as label

  ```javascript
  <script>
      import { Tabs } from "zensele-tabs";

      let tabs = [
          { name: "One 1", blah: 123 },
          { name: "Two 2", blah: 123 },
          { name: "Three 3", blah: 123 },
      ];
  </script>

  <div>
      <Tabs {tabs} property={'name'}/>
  </div>
  ```

## Properties

- `tabs` - array (or objects array) with the values that should be displayed as labels
- `color` - what color to be the active tab text and bottom border
- `property` - when object array is passed, as `tabs`, specify which object property to be used as label
- `showNavigation` - (default `true`) When its set to `false` the navigation arrows will be shown only when there is no enough space for all the tabs to be shown at the same time
- `enableDelete` - (default `true`) show/hide delete icon
- `enableAdd` - (default `true`) show/hide add icon

## Events

- `tabIndexChange` - when tab index is changed then this event will be dispatched. The data in the event will return the index and the data of the selected tab.

  Having the code below:

  ```javascript
  <script>
      import { Tabs } from "zensele-tabs";

      let tabs = [
          { name: "One 1", blah: 123 },
          { name: "Two 2", blah: 123 },
          { name: "Three 3", blah: 123 },
      ];
  </script>

  <div>
      <Tabs
          {tabs}
          property={'name'}
          on:tabIndexChange={(event) => console.log(event.detail)/>
  </div>
  ```

  And if we select the second element (`{ name: "Two 2", blah: 123 }`) will output the following data in the console:

  ```javascript
  {
      index: 1,
      data: {
          name: "Two 2"
          blah: 123
      }
  }
  ```

  - `addTab` - when add tab button is pressed. Apart from the event iteself no other details are passed
  - `removeTab` - each tab have a remove button when the tab is active). The event returns the index of the tab that triggered it

## Setting active tab

The component expose `selectedTabIndex` function which is used to set the active tab. Just pass the required tab index that need to be "activated"

```javascript
<script>
    import { Tabs } from "zensele-tabs";

    let tabBar;
    function changedType(type) {
        tabBar.selectedTabIndex(0)
    }

    let tabs = [
        { name: "One 1", blah: 123 },
        { name: "Two 2", blah: 123 },
        { name: "Three 3", blah: 123 },
    ];

</script>

<div>
    <Tabs {tabs} bind:this="{tabBar}"/>
</div>
```
