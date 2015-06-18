doTA, doT for Angular
=================

Experimental Micro Templating engine inspired from doT.
doTA is not actually [doT](https://github.com/olado/doT), but produce similar function that generate template like doT does.

Here is few steps how doTA works.

- doTA load html as string or from `$http` with `$templateCache` or directly from DOM,
- doTA compile html to function called `render` (this is where doTA do same way as doT)
- running `render(scope, $filter)` output raw html in ngDoTA
- ngDoTA use jqLite's `elem.html` to write raw html to DOM
(or you can use compile attribute to use `$compile` with angular attributes)

This also include experimental extremely stripped down micro html parser similar to htmlparser2, because to compile angular template you need to parse htmls. xD

Supported or Partially supported following features :)

Htmlparser part similar to htmlparser2:

 - **onopentag**,
 - **onclosetag**,
 - **ontext**,
 - **oncomment**

If you don't know about above, checkout [htmlparser2](https://github.com/fb55/htmlparser2)

Some Limitations on parser

 - html must be valid, and must use html entities to attributes, NO `<, >, &, ', "` in html text nodes or inside attributes)
 - `'` in text nodes must be encoded like `&#x27;` or `&#39;` or parser will throw error.
 - self closing syntax like `<div />` is not supported, must use `<div></div>`
 - img, input, br, hr tag must be `<img>`, `<hr>`, `<br>`, `<hr>`, NO self closing tag like `<img />`  

For Angular templates:

 - **ng-repeat** (convert to for loop, only '`x in data`' for array supported, no "as", "track by", or no dict loop)
 - **ng-if** (to plain `if`, must be valid javascript expression)
 - **ng-class** (partially supported, expression must be valid javascript expressions, and still having problem with single quote/double quote issue inside)
 - supported most of interpolations
 - supported filters inside interpolations inside text nodes

supported `ng-src,ng-alt,ng-title,ng-href`. they simply removed ng- xD, after interpolate of course.

Speed is like 1,2 ms for normal small template to parse html, and 1-2 ms for compiling to html (as text) too (in my machine of course). But actual writing to DOM back using jqLite take few more ms, and if you use $compile like for ng-model, or some pass-trough to angular, it will take more time.

But at least I feel faster than `ngInclude` or any other that involve `$digest` cycles, and I believe less memory usage with doTA.

####Usage/Example:

Add doTA to your module

```javascript
angular.module('yourApp', ['doTA']);
```

doTA provides a provider called doTA that you can inject, or just use `doTA`, since it is global variable *for now*.

```javascript
myapp.controller('myctrl', ['$scope', 'doTA', function($scope, doTA){
  
}])
```
 
doTA provide a directive called `dota-render`, to use with templates, with various attributes.

```html
<div dota-render='path/to/tpl.html'></div>
```

```html
<div dota-render='something_unique' inline=1>
	<div>some more html</div>
</div>
```

(doTA does not add any watchers, so data must be available before this call, so you have to wrap with `ng-if` before this.)

Some more usages

```html
<div dota-render='name1' compile=1 encode=1 dota-onload='$(".lazy").lazyload()' dota-onload-scope="scopeFunc()">
	<div>some more html</div>
</div>
```

- **compile=1** - $compile only `dota-pass` attribute and it's childs, normally faster than `compile-all=1`, unless you have many `dota-pass`.
- **compile-all=1** - use `$compile(elem.contents())(scope)` after appending html. you can use when you want the whole template render by angular, this is much slower, and won't get much performance gain.
- **dota-onload=some_js** - `eval` javascript after element append
- **dota-onload-scope=some_scope_function** - eval using `scope.$eval`
- **encode=1** - encoding `<,>,&` in attributes to `&lt; &gt; &amp;` just for some html that not using html entities (partial support).
- **loose=1** - when object property is falsy, use '', instead of showing undefined.
- **debug=1** - you have to include non minified version of `ngDoTA.js`, because minified version stripped that down too xD
- **watch="scope_vars"** - adding to watch for angular, it will passed to `scope.$watchCollection(scope_vars, ...` and template to auto re-render on data change. (new data must be non-falsy, *for now*);
- **cache-dom=1** - cached rendered dom in hidden tag, and move or copy(on IE) DOM back upon reuse, only for static contents
- **scope=1** - create new scope, use only when compile=1 or compile-all=1, when parent scope is destroy this will get destroy too or $watchers will leak
- **loaded=false** - just to hide template with css, once render it will be loaded=true

If you want to exclude rendering inside `dota-render`, you might want to use `dota-pass=1` with `compile=1`,

```html
<div dota-pass=1 ng-if='something'>
   <input ng-model='item.something'>
</div>
```

And, if you want to continue rendering inside `dota-pass`, you can use `dota-continue`

Please note that `ng-repeat="item in data"`, `item` will not available for `ng-model`, even you do `dota-pass`, because, item is not passed to angular, so you have to use like `data[$index].something` in some cases. `$index` will be converted to array index like `data[2].something`.

### Performance Comparison with Angular, Angular + ReactJs, doTA

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

- jsperf ([doT vs doTA vs Handlebar](http://jsperf.com/dot-dota-handlebar)) - similar speed as doT now. 
([Test results](http://imgur.com/iE0ZoQG) as image)

- added doTA to [ng-include rendering slowness](https://github.com/angular/angular.js/issues/9559)  - [plunk](http://plnkr.co/edit/be2h0vgxvgmkOjfafHoD?p=preview)

Of course, one reason is because of doTA itself is one way binding, but there is a lot of case you don't need two way bindings, and doTA is easy to use it. (please note that this is not production ready, use at your own risk!)

All you need is just make sure you have data ready by wrapping with **ng-if** and wrap **dota-render='some_unique_name'** and **inline=1** attribute, you don't need to change every existing angular components with bind-this, bind-that or once-once-once :))))))

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

To enable template automatic updating, you can use `watch` attribute. You don't need to wrap with `ng-if` for that case, since `render` won't trigger if data is falsy.

```html
<div ng-controller="mycontroller">
	<table dota-render=1 inline=1 watch="data">
		<tr ng-repeat="line in data">
		....
```

By the way, doTA works on IE8, but you probably won't need it unless you need to care about 19-20% users. :D
 http://imgur.com/2U03BS1 ([browser market share](https://www.netmarketshare.com/browser-market-share.aspx?qprid=2&qpcustomd=0&qpstick=1&qpsp=2014&qpnp=2&qptimeframe=Y))
 
