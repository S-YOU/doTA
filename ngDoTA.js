(function (A) {
  'use strict';

  var hiddenDIV;
  setTimeout(function(){
    if (document.getElementById) {
      hiddenDIV = document.getElementById('dota-cache');
      //add ngDoTA.min.js at the end body
      if (!hiddenDIV && document.body) {
        hiddenDIV = document.createElement('div');
        hiddenDIV.id = 'dota-cache';
        hiddenDIV.style.display = 'none';
        document.body.appendChild(hiddenDIV);
      }
    }
  });
  var isIE = typeof navigator !== 'undefined' && /MSIE|Trident/.test(navigator.userAgent);
  var B = {0: 0, 'false': 0};

  /* global doTA: true */
  A.module('doTA', [])
    .config(['$provide',function(P) {
      P.factory('doTA', function(){return doTA;});
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
            //not to show "undefined" in templates
            a.loose = a.loose in B ? B[a.loose] : a.loose || 1;
            //concat continuous append into one
            a.optimize = a.optimize in B ? B[a.optimize] : a.optimize || 1;
            var p = {};

            if (a.cacheDom && d.D[a.dotaRender]) {
              // alert( d.D[a.dotaRender].innerHTML);
              console.log('cacheDOM: just moved cached DOM', d.D[a.dotaRender]);
              var elem;
              if (isIE) {
                elem = d.D[a.dotaRender].cloneNode(true);
              } else {
                elem = d.D[a.dotaRender];
              }
              e[0].parentNode.replaceChild(elem, e[0]);
              return;
            }

            function cacheDOM(){
              // console.log('cacheDOM()', a)
              s.$on("$destroy", function(){
                console.log('$destroy', e);
                // alert(['$destroy', e[0], hiddenDIV]);
                if (hiddenDIV) {
                  d.D[a.dotaRender] = e[0];
                  hiddenDIV.appendChild(e[0]);
                }
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
                /**/console.log('compile error', a, template);
                throw x;
                return;
              }

              //compiled func into cache for later use
              if (a.dotaRender) {
                d.C[a.dotaRender] = r;
              }

              return r;
            }

            function render(func){

              //unless prerender
              if (func) {
                console.log(a.dotaRender,'before render');
                //execute the function by passing s(data basically), and f
                try {
                  var v = func(s, f, p);
                  console.log(a.dotaRender,'after render');
                } catch (x) {
                  /**/console.log('render error', func);
                  throw x;
                  return;
                }

                if(a.debug) {
                  console.log(v);
                }

                //directly write raw html to element
                //we shouldn't have jqLite cached nodes here, 
                // so no deallocation by jqLite needed
                e[0].innerHTML = v;
                console.log(a.dotaRender,'after innerHTML set to content');
              }

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
              
              if (func && func.W) {
                console.log('func.W watch', a.dotaRender, func.W);
                var scopes = {}, watches = {};
                for(var i = 0; i < func.W.length; i++) {
                  var w = func.W[i];
                  // console.log('watch', w);

                  watches[w.I] = s.$watch(w.W, (function(w) {
                    return function(newValue, oldValue){
                      console.log(a.dotaRender, w.W, 'partial watch before render');
                      var oldTag = document.getElementById(w.I);
                      if (!oldTag) { return console.log('tag not found'); }
                      var content = w.F(s, f, p);
                      if (!content) { return console.log('no contents'); }
                      var tag = /^<(\w+)/.test(content) && RegExp.$1;
                      console.log('watch tag', tag, content);
                      var newTag = document.createElement(tag);
                      newTag.id = w.I;
                      newTag.innerHTML = content;
                      //scope management
                      if (scopes[w.I]) {
                        scopes[w.I].$destroy();
                      }
                      scopes[w.I] = s.$new();
                      //compile contents
                      if (a.compile || a.compileAll) {
                        c(newTag)(scopes[w.I]);
                      }
                      //
                      oldTag.parentNode.replaceChild(newTag, oldTag);
                      // angular.element(oldTag).replaceWith(angular.element(newTag));
                      // console.log('watch contents', content);
                      // console.log('watch', s, w.I, w);
                      // console.log('watch newVal', newValue, s[w.W])
                      console.log(a.dotaRender, w.W, 'partial watch content written');
                      //unregister watch if wait once
                      if (w.O) {
                        console.log(a.dotaRender, w.W, 'partial watch unregistered');
                        watches[w.I]();
                      }
                      console.log(a.dotaRender, w.W, 'partial watch after render');
                    };
                  })(w));
                }
              }
            }

            for (var x in a.$attr) {
              var z = a.$attr[x];
              //map data-* attributes into $attr (inline text)
              if (!z.indexOf('data-')) {
                p[x] = a[x];
              //map scope-* attributes into $attr (first level var from scope)
              } else if (!z.indexOf('scope-')) {
                p[z.slice(6)] = s[a[x]];
              }
            }
            // console.log('$attr', p, a);

            if(a.watch) {
              console.log(a.dotaRender, 'registering watch for', a.watch);
              s.$watchCollection(a.watch, function(newValue, oldValue){
                if(newValue !== oldValue && d.C[a.dotaRender]) {
                  console.log(a.dotaRender, 'watch before render');
                  loader(true);
                  console.log(a.dotaRender, 'watch after render');
                }
              });
            }

            function loader(force){
              if(d.C[a.dotaRender]){
                console.log(a.dotaRender,'get compile function from cache');
                //watch need to redraw, also inline, because inline always hasChildNodes
                if (e[0].hasChildNodes() && !a.inline && !force) {
                  console.log('hasChildNodes', a.dotaRender);
                  render();
                } else {
                  render(d.C[a.dotaRender]);
                }
              } else if (a.inline) {
                // render inline by loading inner html tags,
                // html entities encoding sometimes need for htmlparser here or you may use htmlparser2 (untested)
                console.log(a.dotaRender,'before get innerHTML');
                var v = e[0].innerHTML;
                console.log(a.dotaRender,'after get innerHTML');
                render(compile(v, a));
              } else if (a.dotaRender) { //load real template
                console.log('before h', a.dotaRender);
                //server side rendering or miss to use inline attr?
                if (e[0].hasChildNodes()) {
                  console.log('hasChildNodes', a.dotaRender);
                  render();
                } else {
                  h.get(a.dotaRender, {cache: t}).success(function (v) {
                    console.log('after h response', a.dotaRender);
                    render(compile(v, a));
                  });
                }
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
            console.log('dotaInclude', attr.dotaInclude);
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
    }])
    .factory('dotaHttp', ['$compile', '$http', '$templateCache', '$filter', 'doTA', function($compile, $http, $templateCache, $filter, doTA) {
      return function (name, scope, callback, options){
        options = options || {};
        options.loose = 1;
        // options.debug = 1;
        // /**/console.log('options')

        if (doTA.C[name]) {
          // /**/console.log('dotaHttp doTA cache', name);
          callback(doTA.C[name](scope, $filter));
        } else {
          // /**/console.log('dotaHttp $http', name);
          $http.get(name, {cache: $templateCache}).success(function(data) {
            // /**/console.log('dotaHttp response', data);
            doTA.C[name] = doTA.compile(data, options);
            callback(doTA.C[name](scope, $filter));
          });
        }
      };
    }]);

})(window.angular);
