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
- `selectedTabIndex` - index of the initial selected label
- `color` - what color to be the active tab text and bottom border
- `property` - when object array is passed, as `tabs`, specify which object property to be used as label

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
