doTA, doT for Angular
=================

Experimental Micro Templating engine inspired from doT.

doTA is not actually [doT](https://github.com/olado/doT), but produce similar function that generate template like doT does.

---

This project has two libraries, doTA, and ngDoTA.

### doTA
  - no dependencies
  - can run on both server and client
  - parse html from string and convert them into javascript function, which use to render with data (any objects)
  - checkout this jsperf for quick look ([doT vs doTA vs Handlebar](http://jsperf.com/dot-dota-handlebar))

### ngDoTA
  - included doTA
  - included angular directive called dota-render
  - accept templateName or inline and render html with doTA by binding to $scope and $filter, without involving $digest cycle (0 watchers), unless you explicitly set compile or watch options
  - checkout [examples](https://github.com/S-YOU/doTA/tree/master/examples) from github, which based on various online benchmarks or blogs.

---

### Some limitations on HTML Parser

 - must be valid html
 - must be used html entities to attributes, NO `<, >, &`
 - usage of `'` or `"` in text nodes or inside attributes may work or may not works.
 - you need dedicated control on html, shouldn't be used on user-defined templates or security will suffer.

### Supported Angular or similar syntax

- loop
  - `ng-repeat="x in data"` - array
    - `ng-repeat="x in data | filter:y | orderBy:x"` - filters inside ng-repeat
    - `$index` - can be used on attributes
      - to bind like `ng-model="data[$index]"`, normal `ng-model="x"` won't work
  - `ng-repeat="k,v in data"` - dict (angular syntax (k,v) in data)
  - `ng-repeat="i in 1:10:2"` - range

- conditionals
  - `ng-if="expression"` - (must be valid javascript expression)
    - extra `elif` and `else` support (must follow by previous `ng-if` or `elif` - no middle text nodes allowed)
  - `ng-class="{a:x>y,b:z}"` - (must be valid javascript object)
  - `ng-show` - when false, add `ng-hide` class
  - `ng-hide` - when true, add `ng-hide` class

- interpolations
  - `{{ ... }}` - interpolations
  - `{{ ... | filter1:x:y | filter2:a }}` - filters inside interpolations

- events
  - enabled by default
    - can be disabled by using event=0 on dota-render directive
  - supported 'change click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste'
    - all the events and its expressions are lazy. angular won't involve until event fired.
    - change event may be different behavior with angular, untested

- ng-init
  - `ng-init="expression"` - evaluate the expression as javascript

- ng-controller
  - `ng-controller="ctrl"` - should be same as angular
    - will create new scope with scope.$new()
    - may be used `"ctrl as vm"` or `controller-as="vm"` - untested

- aliases
  - `ng-value="value"` - set value attribute without expanding
  - `ng-src="{{base}}/image/{{size}}.jpg"` - expand and set src attribute
  - `ng-alt` - expand and set alt attribute
  - `ng-title` - expand and set title attribute
  - `ng-href` - expand and set href attribute

- ng-model
  - experimental, disabled by default
  - enabled by using `model=1` on dota-render directive
  - `ng-model="scope_var"` - only accept dot notation or without, does not use angular $parse
    - one $watchCollection will be added

- ng-bind
  - experimental, disabled by default
  - enabled by using `bind=1` on dota-render directive
  - `ng-bind="scope_var"` - apply scope_var to textContent or innerText
    - one $watchCollection will be added

---

### dota-render directive attributes

- inline
  - get template string from innerHTML instead of from template
  - this will ignore if template is once compiled

- cache-dom
  - before $scope is destroyed, relocate dom to safer place, and reuse it as is
  - for static dom, without dynamic binding

- dota-onload
  - evalulate javascript when done, `this` is bind to current DOM

- dota-onload-scope
  - evaluate $scope function when done, with $event object injectable like angular

- compile
  - use angular $compile on nodes with dota-pass or its children

- compile-all
  - use angular $compile with elem.contents() - not much performance gain from dota with this option.

- encode
  - use when attributes have `<,>,&` characters, or may get into infinite loop or will throw errors.
  - when using with jade templates, I never need this.

- loose
  - set by default - undefined, 0, false will be blank
  - use `loose=0` if you don't want `0` as blank

- scope
  - will create new scope

- watch
  - will add $watchCollection and will re-render the the whole template when watch triggered.

- watch-diff
  - will add $watchCollection and will partially patch DOM, when changed
  - only attributes or first text node changes allowed

- diff-level
  - `diff-level=2` - use experimental **FlatDOM**, which diff html as text and patch DOM while parsing

- event
  - set by default
  - convert ng-events into de-events - which is dom events, that evalutes scope fn when triggered.

- model
  - experimental
  - convert ng-model into internal approach,
    - which bind input event on text box and change event on others input, checkbox, radio, select
    - update to model value when data changed

- bind
  - experimental
  - set textContent or innerText when data change

- loaded
  - once loaded, this attribute will be set to true

- optimize
  - additional optimization on output - currently size, which strip unnessary quotes

- data-XX
  - all data-XX attributes on directive will be available as $attr.XX on templates

- scope-XX
  - all scope-XX attibutes on directive will be avaialble as $attr.XX on templates
  - attr without `.` or `[` will be $scope[attr] or it will $scope.$eval

- debug
  - some debugging output - use with non-minified version

### limitations on dota-render directive

  - data must be available before directive called, so wrap dota-render directive with `ng-if="data"` if data is not ready
  - `ng-repeat` is transformed in to javascript loop, so internal variables not available to angular, use `$index` to get access to them.

---

### doTA - attributes inside HTML templates

- dota-pass
  - will skip parsing ng-* attributes
  - interpolations with {{ ... }} will still be expanded, or use `ng-bind` without bind=1 option

- dota-continue
  - will continue parsing ng-* attributes, when inside dota-pass

- watch - `watch="expression"`
  - will create sub functions, and will add watch or one-time watch with `::`
  - will re-render when watch triggers

### extra directives
  - dota-include - like `ng-include="tpl/name"` but usign doTA - static
  - dota-template - like `ng-include src="tpl/name"` - dynamic - one $watcher
  - dota-http - return compiled template as string

---

### Usage:

- Module

  ```javascript
  angular.module('yourApp', ['doTA']);
  ```

- Provider

  ```javascript
  myapp.controller('myctrl', ['$scope', 'doTA', function($scope, doTA){
    ...
  }])
  ```

- Template
  ```html
  <div dota-render='path/to/tpl.html'></div>
  ```

- Inline
  ```html
  <div dota-render='something_unique' inline=1>
    <div>some more html</div>
  </div>
  ```

- ng-repeat example
  ```html
  <div ng-controller="mycontroller">
      <div ng-if="data">
        <table dota-render=1 inline=1>
          <tr ng-repeat="line in data">
            <td>{{line[0]}}</td>
            <td>{{line[1]}}</td>
            <td>{{line[2]}}</td>
            <td>{{line[3]}}</td>
            <td>{{line[4]}}</td>
          </tr>
        </table>
      </div>
  </div>
  ```

- watch example
  ```html
  <div ng-controller="mycontroller">
    <table dota-render=1 inline=1 watch="data">
      <tr ng-repeat="line in data">
      ....
  ```

---

### Real world usage

- [www.giveucar.com](http://www.giveucar.com) - as Universal (Isomorphic) Javascript

---

### Performance Comparisons

- jsperf - [doT vs doTA vs Handlebar](http://jsperf.com/dot-dota-handlebar)

- ng-include/dota perf - [ng-include rendering slowness](https://github.com/angular/angular.js/issues/9559)  - [plunk](http://plnkr.co/edit/be2h0vgxvgmkOjfafHoD?p=preview)

- fork of inductjs's benchmark - [angular/inductjs/react/doTA](http://rawgit.com/S-YOU/inductjs/master/examples/changing-list-nested/dota.html)

- fork of Ben Nadel's benchmark - [Rendering Large Datasets With AngularJS](https://rawgit.com/S-YOU/JavaScript-Demos/master/demos/render-large-datasets-angularjs-reactjs/angular-dota.htm)

---

### Some Plunks or Examples

Base on scripts on [this blog](http://www.williambrownstreet.net/blog/2014/04/faster-angularjs-rendering-angularjs-and-reactjs/)

- Pure Angular - http://plnkr.co/edit/YnF7Vn?p=info
- Angular + ReactJs - http://plnkr.co/edit/6zfFXU?p=info
- doTA - http://plnkr.co/edit/1JIQPY8zK4CEwB9gNjfK
- doTA (with watch) - http://plnkr.co/edit/cwpWViYYQCuFGDr2IBc4
- doTA (with watch, compile=1, dota-pass and ng-binding/ng-model) - http://plnkr.co/edit/CFu0ZijRnc8uVSVGt9w3

I have downloaded each plunks and tested on Chrome Timeline JS Profiler

- Pure Angular - http://imgur.com/TXi5Ky3 - 1.08s
- Angular + ReactJs - http://imgur.com/2lO8Frb - 465ms
- doTA - http://imgur.com/JxBxO7C - 164ms
- doTA (with watch) - http://imgur.com/IyotTaL - 166ms initial
(I have tried 15 times refresh data button, its 165ms to 265ms, sometimes GC got triggered and used like 80ms)
- doTA (with watch, compile=1, dota-pass and ng-binding/ng-model) - 172ms, not much difference as above.
(but with compile-all=1, its 365ms, since it pass the whole html to angular to $compile)
