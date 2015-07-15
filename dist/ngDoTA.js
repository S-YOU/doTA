var doTA = (function(){'use strict';
  /* for ie8? */
  if(!String.prototype.trim){
    String.prototype.trim = function(){
      return this.replace(/^\s+|\s+$/g,'');
    };
  }
  var events = ' click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste ';
  var valid_chr = '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var parse = function (html, func){
    if (!html) {return;}
    var chunks = html.match(/([<>]|[^<>]+)/g), x=0;
    var html_decode = function(text) {
      return text.indexOf('&') === -1 ? text : text
        .replace(/&gt;/g,'>').replace(/&lt;/g,'<')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    };
    do {
      // console.log("X", [chunks[x]]);
      if(chunks[x] === '<') {
        x++;
        // console.log("X", [chunks[x]]);
        if(chunks[x][0] === '/') {
          //close tag must be like </div>
          // short hand tag like <div /> are NOT supported
          func.onclosetag(chunks[x].slice(1));
        } else if (chunks[x][0] === '!') {
          func.oncomment(chunks[x]);
        } else {
          // console.log(11, [chunks[x]])
          var attr = {}, name, cx = chunks[x];
          var pos = cx.indexOf(' ');

          //no attributes
          if (pos === -1) {
            name = cx;
          } else {
            name = cx.slice(0, pos);
            var len = cx.length;
            //console.log(222, [pos, cx]);
            while(++pos < len) {
              var eq_pos = cx.indexOf('=', pos);

              // ** attribute without value (last attribute) **
              if (eq_pos === -1) {
                attr[cx.slice(pos)] = "";
                //attr required will be required="", while is valid syntax
                //http://www.w3.org/TR/html-markup/syntax.html#syntax-attr-empty
                break;
              }

              // uncomment this if you need no value attribute in the middle
              // ** attribute without value (middle attribute) **
              // var sp_pos = cx.indexOf(' ', pos);
              // if (sp_pos > 0 && sp_pos < eq_pos) {
              //   attr[cx.slice(pos, sp_pos)] = "";
              //   pos = sp_pos;
              //   continue;
              // }

              //console.log(33, [eq_pos]);
              var attr_name = cx.slice(pos, eq_pos), attr_val;
              //console.log(331, [attr_name]);

              var val_st = cx[eq_pos + 1], val_end_pos;
              //console.log(332, [val_st]);

              //if attribute value is start with quote
              if(val_st === '"' || val_st === "'") {
                val_end_pos = cx.indexOf(val_st, eq_pos + 2);
                attr_val =  cx.slice(eq_pos + 2, val_end_pos);
                //console.log(311, [eq_pos, val_end_pos, attr_val]);
                attr[attr_name] = html_decode(attr_val);
                pos = val_end_pos + 1;
              } else {

                val_end_pos = cx.indexOf(' ', eq_pos + 2);
                //console.log(44, [val_end_pos]);
                if(val_end_pos === -1) {
                  attr_val =  cx.slice(eq_pos + 1);
                  attr[attr_name] = html_decode(attr_val);
                  //console.log(442, [attr_val]);
                  break;

                } else {
                  attr_val =  cx.slice(eq_pos + 1, val_end_pos);
                  attr[attr_name] = html_decode(attr_val);
                  //console.log(313, [eq_pos, val_end_pos, attr_val]);
                  pos = val_end_pos;
                }
              }
            }
          }
          //console.log(111,attr);
          //console.log(1111,name, attr, [attr ? 1: 2]);
          func.onopentag(name, attr);
        }
      } else if (chunks[x] === '>' && chunks[x+1] !== '<') {
        x++;
        if(chunks[x]) {
          // console.log(222,chunks[x])
          func.ontext(chunks[x]);
        }
      }

    } while(++x < chunks.length);
  };

  var w = 0; //module level id counter

  return {
    compile: function(E, O){
      O = O || {};
      var val_mod = O.loose ? "||''" : '';

      //clean up extra white spaces and line break
      E = E.replace(/\s{2,}|\n/g,' ');

      //debug = 1;
      if(O.encode) {
        E = E.replace(/"[^"]*"|'[^']*'/g, function($0){
          return $0.replace(/[<>]/g, function($00){
            return {'>': '&gt;', '<': '&lt;'}[$00];
          });
        });
      }
      var Y = function(V, v){
        //console.log(V, [v]);
        if(v) {
          //var logg = /error/.test(v);
          //logg && console.log(11, [v]);

          //ToDo: still buggy, this need to improve
          var m = v.match(/'[^']+'|"[^"]+"|[\w$]+|[^\w$'"]+/g), vv = "";
          //logg && console.log(12, m);
          for(var i = 0; i < m.length; i++) {
            if (valid_chr.indexOf(m[i].charAt(0)) >= 0 && !V[m[i]] && (!i || m[i-1][m[i-1].length-1] !== '.')) {
              vv += 'S.' + m[i];
            } else {
              if (m[i].indexOf('$index') >= 0) {
                //console.log([val], T[L]);
                for(var j = L; j >= 0; j--){
                  if (I[j]) {
                    vv += m[i].replace(/\$index/g, I[j]);
                    break;
                  }
                }
              } else {
                vv += m[i];
              }
            }
          }
          //logg && console.log(55,vv);
          return vv;
        }
        return v;
      };

      //variable cache
      var V = {$index: 1, undefined: 1, $attr:1};

      //interpolation without $filter
      var N = function(str){
        if (str.indexOf('{{') >= 0) {
          var Z = str.split(/\{\{|\}\}/);
          //outside interpolation
          for (var i = 0; i < Z.length; i+= 2) {
            if (Z[i].indexOf("'") >= 0) {
              Z[i] = Z[i].replace(/'/g, "\\'");
            }
          }
          //inside {{ }}
          for (var i = 1; i < Z.length - 1; i+= 2) {
            Z[i] = C(null, Z[i]);
          }
          return Z.join('');
        } else {
          if (str.indexOf("'") >= 0) {
            return str.replace(/'/g, "\\'");
          }
          return str;
        }
      };
      //interpolate regex replace
      var M = function(str) {
        return str.replace(/\{\{([^}]+)\}\}/g, C);
      };
      //interpolation with $filter
      var C = function ($0, $1){
        //console.log(333,$1);
        var pos = $1.indexOf('|');
        if(pos === -1) {
          return "'+(" + Y(V, $1) + val_mod + ")+'";
        } else {
          var v = $1[pos+1] === '|' ? $1.match(/([^|]+(?:\|\|)?)+/g) : $1.split('|');
          var val = Y(V, v[0]);
          for(var i=1; i < v.length; i++){
            var p = v[i].split(':');
            // console.log(2121,v[i], val, p)
            val = 'F(\'' + p.shift().trim() + '\')('+ val;
            if (p.length) {
              var pr = [];
              for(var j=0; j<p.length; j++) {
                pr.push(Y(V, p[j]));
              }
              val += ',' + pr.join(',');
            }
            val += ')';
            break; //implicitly ignore multiple instance of multiple filters that are not supported now
          }
          return "'+(" + val + val_mod +  ")+'";
        }
      };
      //Pretty Indent for debuging
      var D = function(n, x){
        var ret = new Array(n + 2).join('    ');
        return x ? ret.slice(0,-2 * x) : ret;
      };
      //console.log(E);
      var L = 0, T = {}, I = {}, W = {}, X, P, Q, F;
      var R = D(L) + "'use strict';var R='';\n";
      //parse the element
      parse(E, {
        onopentag: function(name, attr){
          // debug && console.log('onopentag', [name, attr]);
          var a = {}, n;

          //skip parsing ng-if, ng-repeat, ng-class with, dota
          // but interpolation will still be evaluated (by-design)
          // to avoid this behavior, use ng-bind instead of {{}}
          //  and create new scope with scope=1 in dota-render, or $watchers will never destroy.
          if(attr['dota-pass']){
            P = L; Q = 0;
          //re-enable dota parsing
          } else if (attr['dota-continue']) {
            Q = L;
          }

          //unless dota-pass or with dota-continue
          if(!P || Q) {
            //ng-repeat to while/for loop
            if (attr['ng-repeat']) {
              //console.log(21,[x], [val]);
              T[L] = T[L] ? T[L] + 1 : 1;
              var i = 'i' + L, l = 'l'+ L, v = attr['ng-repeat'].split(' in '), _v = Y(V, v[1]);

              //store variable name to use as $index later
              //this is ng-repeat specific, T[L] is same for ng-if too
              I[L] = i;

              //make ng-repeat as javascript loop
              //array loop
              if (v[0].indexOf(",") >= 0) {
                var v01 = v[0].split(',');
                R += D(L, 1) + 'var D' + L + '=' + _v + ';\n';
                R += D(L, 1) + 'for(var ' + v01[0] + ' in D' + L + '){\n';
                R += D(L, 1) + 'var ' + v01[1] + ' = ' + 'D' + L + '[' + v01[0] + ']; \n'; //"; " - space is needed for manual uglify
                V[v01[0]] = V[v01[1]] = 1;

              //dict loop, "k, v in items" syntax,
              // without brackets as in (k, v) in angular
              } else {
                R += D(L, 1) + 'var D' + L + '=' + _v + ',' + i + '=-1,' + l + '=D' + L + '.length;\n';
                R += D(L, 1) + 'while(++' + i + '<' + l + '){\n';
                R += D(L) + 'var ' + v[0] + '=D' + L + '[' + i + ']; \n'; //"; " - space is needed for manual uglify
                V[v[0]] = 1;
                //,$index=' + i +'
                // V['$index'] = 1;
              }
              //remote attribute not to get forwarded to angular
              delete attr['ng-repeat'];
            }

            //ng-if to javascript if
            if (attr['ng-if']) {
              if (attr.wait || attr.watch) {
                ++w;
                R += D(L,2) + (!X ? 'var T=this;T.W=[];' : '') + 'var W={I:"D' + w + '",W:"' + attr['ng-if'] + '"' + (attr.wait ? ',O:1' : '') + '};T.W.push(W);\n';
                W[L] = X = 1; //'"D' + ++w + '"' + (attr.once ? ',1' : '');
                R += D(L,2) + 'W.F=function(S,F){"use strict";var R="";\n';
                attr['id'] = 'D' + w;
                delete attr.watch; delete attr.wait;
              }
              T[L] = T[L] ? T[L] + 1 : 1;
              R += D(L,1) + 'if('+ Y(V, attr['ng-if']) +'){\n';
              // console.log('ng-if starts here', L);
              delete attr['ng-if'];
            }
            //ToDO: ng-class is complicated, this need some more work!
            if (attr['ng-class']) {
              R += D(L) + 'var s=[],n=' + Y(V, attr['ng-class']) + ';\n';
              R += D(L) + 'for(var c in n){n[c]&&s.push(c);}\n';
              n=1;
              delete attr['ng-class'];
            }

            //run others ng- attributes first
            for(var x in attr) {
              if (x.substr(0,3) !== 'ng-') { continue; }
              // if(x.charAt(2) !== '-') { continue; }
              //some ng-attr are just don't need it here.
              var aname = x.substr(3);
              if (/^(?:src|alt|title|href)/.test(aname)) {
                //overwrite non ng-
                attr[aname] = attr[x];
                //delete ng- attribute, so angular won't come in even if you $compile
                delete attr[x];

              //convert ng-events to dota-events, to be bind later with native events
              } else if (O.event && events.indexOf(' ' + aname + ' ') >= 0) {
                attr['de'] = '1'; //dota-event
                attr['de-' + aname] = attr[x];
                delete attr[x];
              }
            }
          }

          //other attributes, expand interpolations
          for(var x in attr){
            //console.log(20,[x],[attr],[attr[x]])
            var val = attr[x];

            if(n && x === 'class'){ //when both ng-class and class exists
              R += D(L) + 's.push("' + val + '"); \n';

            } else {
              a[x] = '="' + N(val) + '"';

              //ng-repeat loop variables are not available!
              // only way to acccess is to use $index like "data[$index]"
              // instead of "item" as in "item in data"
              if(a[x].indexOf('$index') >= 0) {
                //console.log([val], T[L]);
                for(var j = L; j >= 0; j--){
                  if (I[j]) {
                    a[x] = a[x].replace(/\$index/g, "'+" + I[j] + "+'");
                    break;
                  }
                }
              }
            }
          }

          //write tag back as string
          R += D(L) + "R+='<" + name + (n ? " class=\"'+s.join(' ')+'\"" : '');
          //other attibutes
          for(var k in a) {
            R += " " + k + a[k];
          }
          R += ">';\n";

          //expand doTA templates with expand=1 option
          if (attr['dota-render'] && attr.expand) {
            var r = [];
            for(var x in attr){
              if (!x.indexOf('data-')) {
                r.push('"' + x.slice(5) + '":"' + attr[x] + '"');
              } else if (!x.indexOf('scope-')) {
                r.push('"' + x.slice(6) + '":S["' + attr[x] + '"]');
              }
            }
            R += D(L) + 'var P={' + r.join(',') + '},U="' + attr['dota-render'] + '";\n';
            R += D(L) + 'doTA.C[U]&&!doTA.D[U]&&(R+=doTA.C[U](S,F,P)); \n';
          }

          //some tag dont have close tag
          if(!/^(?:input|img|br|hr)/i.test(name)) {
            //there is more, but most not used or can't use with doTA, so excluding them
            //http://webdesign.about.com/od/htmltags/qt/html-void-elements.htm
            //Note: self closing syntax is NOT supported. Eg. <img /> or even <div />
            L++;

          //ng-repeat or ng-if on self closing tag
          } else if (T[L] > 0) {
            R += D(L,1) + '}\n';
            T[L]--;
            I[L] = 0;
          }
        },
        onclosetag: function(name){
          //just write closing tag back
          R += D(L-1) + "R+='</" + name + ">';\n";
          L--;

          if (W[L]) {
            R += D(L, 1) + '} else {\n';
            R += D(L) + 'R+=\'<' + name + ' id="D' + w + '" style="display:none"></' + name + '>\'; \n';
          }

          //close "if", "for", "while" blocks
          while (T[L] > 0) {
            //console.log(T[L], 'ends here at L', L);
            R += D(L,1) + '}\n';
            T[L]--;
            I[L] = 0;
          }
          //console.log('/L',[L,P]);

          if (W[L]) {
            R += D(L, 2) + 'return R;}; \n';
            R += D(L, 2) + 'R+=W.F(S,F); \n';
            W[L] = 0;
          }

          //end dota-pass if it is out of scope
          if(P && P >= L) {
            P = 0;
          }
        },
        ontext: function(text){
          //just expand interpolation on text nodes
          if (text.indexOf('{{') >= 0){
            //console.log(22, 'start');
            text = M(text);
          }
          //remove extra spacing, and line breaks
          R += D(L) + ('R+=\'' + text + '\';\n').replace(/\+''|''\+/g,'');
          //console.log(111, R.slice(-50));
        },
        oncomment: function(data){
          //console.log(111,[data]);
          //just encode single code on comment tag
          R += D(L) + "R+='<" + data.replace(/'/g,"\\'") + ">';\n";
        }
      });
      R += D(0) +'return R;\n';

      //concat some lines by default for performance
      R = R.replace(/;R\+=/g,'+').replace(/'\+'/g,'');
      if (O.optimize) {
        R = R.replace(/\b([\w_-]+=)"([^"'\s]+)"(?=[\s>])/g,'$1$2');
      }

      //print the whole function if debug
      if(O.debug) {
        /**/console.log(R);
      }
      try {
        //$scope, $filter
        F = new Function('S', 'F', '$attr', R);
        if (X) {
          F = {W:[], F: F};
        }
      } catch (e) {
        if (typeof console !== "undefined") {
          /**/console.log("doTA compile error:\n" + R);
        }
        throw e;
      }
      // just for less array usage on heap profiling
      // but this may trigger GC more
      R = L = T = I = V = P = null;
      return F;
    },
    C: {}, //cache compiled functions
    D: {} //cache DOM to be used by ngDoTA, needed here to prevent unneccessary rendering
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = doTA;
} else if (typeof console === "undefined") {
  console = {log: function(){}};
}

/* global angular, doTA */
(function (A) {'use strict';
  var msie = document.documentMode;
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
  var B = {0: 0, 'false': 0};

  function forEachArray(src, iter, ctx) {
    if (src.forEach) {
      return src.forEach(iter);
    }
    for (var key = 0, length = src.length; key < length; key++) {
      if (key in src) {
        iter.call(ctx, src[key], key);
      }
    }
    return src;
  }

  A.module('doTA', [])
    .config(['$provide',function(P) {
      P.factory('doTA', function(){return doTA;});
    }])

    .directive('dotaRender', ['doTA', '$http', '$filter', '$templateCache', '$compile', '$controller', function(d, h, f, t, c, r) {
      return {
        restrict: 'A',
        priority: 1000,
        terminal: true,
        controller: A.noop,
        link: A.noop,
        compile: function() {
          var N,S; //New scope flag, new Scope

          return function(s, e, a) {
            S = s;
            //not to show "undefined" in templates
            a.loose = a.loose in B ? B[a.loose] : a.loose || 1;
            //concat continuous append into one
            a.optimize = a.optimize in B ? B[a.optimize] : a.optimize || 1;
            a.event = a.event in B ? B[a.event] : a.event || 1;
            a.watch = typeof a.watch === 'string' ? a.watch : 0; //Firefox throw error if does not exists
            var p = {};

            if (a.cacheDom && d.D[a.dotaRender]) {
              // alert( d.D[a.dotaRender].innerHTML);
              console.log('cacheDOM: just moved cached DOM', d.D[a.dotaRender]);
              var elem;
              if (msie) {
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
                var f = d.compile(template, a);
                console.log(a.dotaRender,'after compile(no-cache)');
              } catch (x) {
                /**/console.log('compile error', a, template);
                throw x;
                return;
              }

              //compiled func into cache for later use
              if (a.dotaRender) {
                d.C[a.dotaRender] = f;
              }

              return f;
            }

            function render(func){

              if (a.scope || a.ngController) {
                console.log('scope', a.scope);
                if (N) {
                  console.log('oldScope $destroy');
                  S.$destroy();
                }
                S = s.$new();
                N = 1; //new scope created flag
                console.log('newScope created', a.dotaRender, S);

                if (a.ngController) {
                  console.log('new controller', a.ngController);
                  var l = {$scope: S}, ct = r(a.ngController, l);
                  // if (a.controllerAs) {
                  //   S[a.controllerAs] = controller;
                  // }
                  e.data('$ngControllerController', ct);
                  // e.children().data('$ngControllerController', ct);
                  console.log('new controller created', a.dotaRender);
                }
              }

              //unless prerender
              if (func) {
                console.log(a.dotaRender,'before render');
                //execute the function by passing scope(data basically), and f
                try {
                  var v = func.F ? func.F(S, f, p) : func(S, f, p);
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

              if(a.event) {
                forEachArray(e[0].querySelectorAll('[de]'), function(partial){
                  var attrs = partial.attributes;
                  //ie8
                  if (!partial.addEventListener) {
                    partial.addEventListener = partial.attachEvent;
                  }
                  console.log('attrs', a.dotaRender, attrs);
                  for(var i = 0, l = attrs.length; i < l; i++){
                    if (attrs[i].name.substr(0,3) === 'de-') {
                      partial.addEventListener(attrs[i].name.substr(3), (function(target, attr){
                        return function(evt){
                          // var target = evt.target || evt.srcElement;
                          // console.log('event', partial, partial.getAttribute('dota-click'));
                          S.$applyAsync(attr.value);
                        };
                      })(partial, attrs[i]));
                      console.log('event added', a.dotaRender, attrs[i].name);
                    }
                  }
                });
              }
              //c html if you need ng-model or ng-something
              if(a.compile){

                //partially compile each dota-pass and its childs,
                // not sure this is suitable if you have so many dota-passes
                forEachArray(e[0].querySelectorAll('[dota-pass]'), function(partial){
                  c(partial)(S);
                });
                console.log(a.dotaRender,'after c partial');

              } else if(a.compileAll){
                //just compile the whole template with c
                c(e.contents())(S);
                console.log(a.dotaRender,'after c all');
              }

              //execute raw functions, like jQuery
              if(a.dotaOnload){
                setTimeout(function(){
                  eval(a.dotaOnload);
                  console.log(a.dotaRender,'after eval');
                });
              }

              //execute scope functions
              if(a.dotaOnloadScope) {
                setTimeout(function() {
                  S.$evalAsync(a.dotaOnloadScope);
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

                  watches[w.I] = S.$watch(w.W, (function(w) {
                    return function(newValue, oldValue){
                      console.log(a.dotaRender, w.W, 'partial watch before render');
                      var oldTag = document.getElementById(w.I);
                      if (!oldTag) { return console.log('tag not found'); }
                      var content = w.F(S, f, p);
                      if (!content) { return console.log('no contents'); }
                      console.log('watch new content', content);
                      var newTag = angular.element(content);
                      //scope management
                      if (scopes[w.I]) {
                        scopes[w.I].$destroy();
                      }
                      scopes[w.I] = S.$new();
                      //compile contents
                      if (a.compile || a.compileAll) {
                        c(newTag)(scopes[w.I]);
                      }
                      angular.element(oldTag).replaceWith(newTag);
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
                p[z.slice(6)] = S[a[x]];
              }
            }
            // console.log('$attr', p, a);

            if(a.watch) {
              console.log(a.dotaRender, 'registering watch for', a.watch);
              S.$watchCollection(a.watch, function(newValue, oldValue){
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
