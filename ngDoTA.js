(function (A) {
  'use strict';
  
  var hiddenDIV = document.getElementById('dota-cache');
  if (!hiddenDIV) {
    hiddenDIV = document.createElement('div');
    hiddenDIV.id = 'dota-cache';
    hiddenDIV.style.display = 'none';
    document.body.appendChild(hiddenDIV);
  }
  var cachedDOM = {};

  A.module('doTA', [])
    .config(['$provide',function(p) {
      p.factory('doTA', function(){return doTA});
    }])
    .directive('dotaRender', ['doTA', '$http', '$filter', '$templateCache', '$compile', function(d, h, f, t, c) {
      return {
        restrict: 'A',
        priority: 1000,
        terminal: true,
        controller: A.noop,
        link: A.noop,
        compile: function() {

          return function(s, e, a) {
            a.loose = 1; //not to show "undefined" in templates
            
            if (a.cacheDom && cachedDOM[a.dotaRender]) {
              console.log('cacheDOM: just moved cached DOM', cachedDOM[a.dotaRender]);
              return e.replaceWith(cachedDOM[a.dotaRender]);
            }
            
            function cacheDOM(){
              console.log('cacheDOM()', a)
              s.$on("$destroy", function(){
                console.log('$destroy', e);
                cachedDOM[a.dotaRender] = e[0];
                hiddenDIV.appendChild(e[0]);
              });
            }

            function compile(template){
              if(a.debug) {
                console.log([a.encode], [template]);
              }

              console.log(a.dotaRender,'before compile');
              //compile the template html text to function like doT does
              try {
                var r = d.compile(template, a);
                console.log(a.dotaRender,'after compile(no-cache)');
              } catch (x) {
                window['console'].log('compile error', a, template);
                throw x;
                return;
              }
              
              //compiled func into cache for later use
              if (a.dotaRender) {
                d.cache[a.dotaRender] = r;
              }

              return r;
            }

            function render(func){
              console.log(a.dotaRender,'before render');

              //execute the function by passing s(data basically), and f
              try {
                var v = func(s, f);
                console.log(a.dotaRender,'after render');
              } catch (x) {
                window['console'].log('render error', func);
                throw x;
                return;
              }

              if(a.debug) {
                console.log(v);
              }

              //directly write raw html to element
              e.html(v);
              console.log(a.dotaRender,'after put e.html(content)');
              
              if (a.scope) {
                console.log('scope', a.scope);
                if (a.newScope) {
                  console.log('oldScope $destroy');
                  a.newScope.$destroy();
                }
                a.newScope = s.$new();
                console.log('newScope created', a.newScope);
              }

              //c html if you need ng-model or ng-something
              if(a.compile){
                //partially compile each dota-pass and its childs,
                // not sure this is suitable if you have so many dota-passes
                A.forEach(e[0].querySelectorAll('[dota-pass]'), function(partial){
                  c(partial)(a.newScope || s);
                });
                console.log(a.dotaRender,'after c partial');

              } else if(a.compileAll){
                //just compile the whole template with c
                c(e.contents())(a.newScope || s);
                console.log(a.dotaRender,'after c all');
              }

              //execute raw functions, like jQuery
              if(a.dotaOnload){
                setTimeout(function(){
                  eval(a.dotaOnload);
                  console.log(a.dotaRender,'after eval');
                });
              }

              //execute s functions
              if(a.dotaOnloadScope) {
                setTimeout(function() {
                  s.$evalAsync(a.dotaOnloadScope);
                  console.log(a.dotaRender, 'after scope $evalAsync scheduled');
                });
              }
              
              if (a.cacheDom) {
                cacheDOM();
              }
              
              //you can now hide raw html before rendering done 
              // with loaded=false attribute and following css
              /*
              [dota-render][loaded]:not([loaded=true]) {
                display: none;
              }
              */
              if (a.loaded) {
                e.attr("loaded",true);
              }
            }

            //when using same template with multiple data on same s
            if(a.data) {
              s.data = s[a.data]; //may be there is better way?
            }
 
            //map data-* attributes into scope
            for (var x in a.$attr) {
              if (!a.$attr[x].indexOf('data-')) {
                s[x] = a[x];
                // console.log('aa', s[x], a[x]);
              }
            }

            if(a.watch) {
              console.log(a.dotaRender, 'registering watch for', a.watch);
              s.$watchCollection(a.watch, function(newValue, oldValue){
                if(newValue !== oldValue && d.cache.hasOwnProperty(a.dotaRender)) {
                  console.log(a.dotaRender, 'watch before render');
                  loader();
                  console.log(a.dotaRender, 'watch after render');
                }
              });
            }
            
            function loader(){
              if(d.cache[a.dotaRender]){
                console.log(a.dotaRender,'get compile function from cache');
                render(d.cache[a.dotaRender]);
  
              } else if (a.inline) { //render by template name
                // render inline by loading inner html tags,
                // html entities encoding sometimes need for htmlparser here or you can use htmlparser2
                console.log(a.dotaRender,'before get elem.html()');
                var v = e.html();
                console.log(a.dotaRender,'after get elem.html()');
                render(compile(v, a));
  
              } else if (a.dotaRender) { //load real template
                console.log('before h', a.dotaRender);
                h.get(a.dotaRender, {cache: t}).success(function (v) {
                  console.log('after h response', a.dotaRender);
                  render(compile(v, a));
                });
              }
            }
            
            loader();

          };
        }
      };
    }])
    .directive('dotaInclude', ['$http', '$templateCache', '$compile', function($http, $templateCache, $compile) {
      return {
        restrict: 'A',
        priority: 1000,
        terminal: true,
        compile: function() {
          return function(scope, elem, attr) {
            console.log('dotaInclude', attr.dotaInclude)
            $http.get(attr.dotaInclude, {cache: $templateCache}).success(function (data) {
              elem.html(data);
              if (attr.compile !== 'false') {
                $compile(elem.contents())(scope);
              }
            });
          };
        }
      };
    }])
    .directive('dotaTemplate', ['$http', '$templateCache', '$compile', function($http, $templateCache, $compile) {
      return {
        restrict: 'A',
        priority: 1000,
        terminal: true,
        compile: function() {
          return function(scope, elem, attr) {
            scope.$watch(attr.dotaTemplate, function(newVal, oldVal) {
              if (newVal) {
                console.log('dotaTemplate', newVal);
                $http.get(newVal, {cache: $templateCache}).success(function (data) {
                  elem.html(data);
                  if (attr.compile !== 'false') {
                    $compile(elem.contents())(scope);
                  }
                });
              }
            });
          };
        }
      };
    }]);

})(window.angular);