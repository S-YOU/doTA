(function (A) {
  'use strict';

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

            function compile(template){
              if(a.debug) {
                console.log([a.encode], [template]);
              }

              console.log(a.dotaRender,'before compile');
              //compile the template html text to function like doT does
              var r = d.compile(template, a);
              if (a.dotaRender) {
                d.cache[a.dotaRender] = r;
              }
              console.log(a.dotaRender,'after compile(no-cache)');

              return r;
            }

            function render(func){
              console.log(a.dotaRender,'before render');

              //execute the function by passing s(data basically), and f
              var v = func(s, f);
              console.log(a.dotaRender,'after render');

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
                })
              }

              //execute s functions
              if(a.dotaOnloadScope) {
                setTimeout(function() {
                  s.$eval(a.dotaOnloadScope);
                  console.log(a.dotaRender, 'after s eval');
                });
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