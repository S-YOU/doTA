/* for ie8? */
if(!String.prototype.trim){
  String.prototype.trim = function(){
    return this.replace(/^\s+|\s+$/g,'');
  };
}
var doTA = {
  valid_chr: (function(){
    var ret = {};
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$_";
    for (var i = 0; i < chars.length; i++) {
      ret[chars[i]] = 1;
    }
    return ret;
  })(),
  parse: function(html, func){'use strict';
    if (!html) {return;}
    var chunks = html.match(/([<>]|[^<>]+)/g), x=0;
    var html_decode = function(text) {
      return text.indexOf('&') !== -1 ? text.replace(/&gt;|&lt;|&amp;|&quot;/g, function($0){
        return {'&gt;': '>', '&lt;': '<', '&amp;': '&', '&quot;': '"'}[$0];
      }) : text;
    };
    do {
      // console.log("X", [chunks[x]]);
      if(chunks[x] === '<') {
        x++;
        // console.log("X", [chunks[x]]);
        if(chunks[x][0] === '/') {
          func.onclosetag(chunks[x].slice(1));
        } else if (chunks[x][0] === '!') {
          func.oncomment(chunks[x]);
        } else {
          // console.log(11, [chunks[x]])
          var attr = {}, name, cx = chunks[x];
          var pos = cx.indexOf(' ');
          if (pos === -1) {
            name = cx;
          } else {
            //cx = cx.replace(/&gt;|&lt;|&amp;|&quot;/g, function($0){
            //  return {'&gt;': '>', '&lt;': '<', '&amp;': '&', '&quot;': '"'}[$0];
            //});
            name = cx.slice(0, pos);
            var len = cx.length;
            //console.log(222, [pos, cx]);
            while(++pos < len) {
              var eq_pos = cx.indexOf('=', pos);
              //console.log(33, [eq_pos]);
              //two spaces between attributes are not supported, clean up them first
              var attr_name = cx.slice(pos, eq_pos), attr_val;
              //console.log(331, [attr_name]);
              
              var val_st = cx[eq_pos + 1], val_end_pos;
              //console.log(332, [val_st]);
              
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
                  //this can effect performance issues, 
                  //but can cause infinite loop without with no value attributes
                  //currently only support those at end of attributes, 
                  //and only one like required
                  if (eq_pos < 0) { 
                    attr[attr_name] = "";
                    break;
                  }
                  attr_val =  cx.slice(eq_pos + 1, val_end_pos);
                  attr[attr_name] = html_decode(attr_val);
                  //console.log(313, [eq_pos, val_end_pos, attr_val]);
                  pos = val_end_pos;
                }
              }
            }

            //var m = cx.slice(pos+1).match(/\b[\w-]+\s*=\s*('[^']+'|"[^"]+"|\S+)/g);
            ////console.log(1111, name, m);
            //for(var i = 0; i < m.length; i++){
            //  var apos = m[i].indexOf('=');
            //  attr[m[i].slice(0, apos)] = m[i].slice(apos+1).replace(/^["']|['"]$/g,'')
            //    .replace(/&gt;|&lt;|&amp;|&quot;/g, function($0){
            //      return {'&gt;': '>', '&lt;': '<', '&amp;': '&', '&quot;': '"'}[$0];
            //    });
            //}
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
  },
  compile: function(E, O){'use strict';
    O = O || {};
    var val_mod = O.loose ? "||''" : '';
    var self = this;
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
        //ToDo: Buggy, this need to improve
        var m = v.match(/'[^']+'|"[^"]+"|[\w$]+|[^\w$'"]+/g), vv = "";
        //logg && console.log(12, m);
        for(var i = 0; i < m.length; i++) {
          if (self.valid_chr[m[i][0]] && !V[m[i]] && (!i || m[i-1][m[i-1].length-1] !== '.')) {
            vv += 'A.' + m[i];
          } else {
            if (m[i].indexOf('$index') !== -1) {
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
//        v = v.replace(/(?:^|\s*|[^\w.'"])([$\w]+(?:\.[$\w]+|\[[^\]]+\])*)/g, function($0,$1){
//          logg && console.log(22, [$0, $1]);
//          if(v[0] === '"' || v[0] === "'" || (v[0] >= "0" && v[0] <= "9")) {
//            return $0;
//          }
//          var v0 = /([$A-Za-z_][$\w]*)/.test($1) && RegExp.$1; //\s*
//          logg && console.log(33, [v0]);
//          if(v0 && !V[v0]) {
//            return $0.replace($1, 'A.' + $1);
//          }
//          return $0;
//        });
//        logg && console.log(55, v);
      }
      return v;
    };
    var N = function(str){
      if (str.indexOf('{{') >= 0) {
        var CV = C(V);
        var Z = str.split(/\{\{|\}\}/);
        for (var i = 0; i < Z.length; i+= 2) {
          if (Z[i].indexOf("'") >= 0) {
            Z[i] = Z[i].replace(/'/g, "\\'");
          }
        }
        for (var i = 1; i < Z.length - 1; i+= 2) {
          Z[i] = CV(null, Z[i]);
        }
        return Z.join('');
      } else {
        if (str.indexOf("'") >= 0) {
          return str.replace(/'/g, "\\'");
        }
        return str;
      }
    };
    var M = function(str) {
      return str.replace(/\{\{([^}]+)\}\}/g, C(V));
    };
    var C = function(V){
      return function ($0, $1){
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
    };
    var D = function(n, x){
      var ret = new Array(n + 2).join('    ');
      return x ? ret.slice(0,-2) : ret;
    };
    //console.log(E);
    var L = 0, T = {}, I = {}, V = {}, P, Q;
    var R = D(L) + "var R='';\n";
    this.parse(E, {
      onopentag: function(name, attr){
        //if(debug)
        //  console.log('onopentag', [name, attr]);
        var a = {}, n;

        //pass through ng-xx attributes,
        // to be use with "compile" attribute in dotaRender directive
        // need to run first since IE8 have reorder html attributes
        for(var x in attr){
          if(x === 'dota-pass'){
            P = L; Q = 0;
            break;
          } else if (x === 'dota-continue') {
            Q = L;
          }
        }

        if(!P) {
          //sometimes ng-repeat variable are use in same tag,
          // and ie8 change order of attributes, so this need to run first
          for (var x in attr) {
            if (x === 'ng-repeat') {
              //console.log(21,[x], [val]);
              T[L] = T[L] ? T[L] + 1 : 1;
              var i = 'i' + L, l = 'l'+ L, v = attr[x].split(' in '), _v = Y(V, v[1]);

              //store variable name to use as $index, later
              I[L] = i;

              //make ng-repeat as javascript loop
              if (v[0].indexOf(",") !== -1) {
                var v01 = v[0].split(',');
                R += D(L, 1) + 'var D' + L + '=' + _v + ';\n';
                R += D(L, 1) + 'for(var ' + v01[0] + ' in D' + L + '){\n';
                R += D(L, 1) + 'var ' + v01[1] + ' = ' + 'D' + L + '[' + v01[0] + ']; \n'; //"; " - space is needed for manual uglify
                V[v01[0]] = V[v01[1]] = 1;
              } else {
                R += D(L, 1) + 'var D' + L + '=' + _v + ',' + i + '=-1,' + l + '=D' + L + '.length;\n';
                R += D(L, 1) + 'while(++' + i + '<' + l + '){\n';
                R += D(L) + 'var ' + v[0] + '=D' + L + '[' + i + ']; \n'; //"; " - space is needed for manual uglify
                V[v[0]] = 1;
                //,$index=' + i +'
                V['$index'] = 1;
              }

              delete attr[x];
              break;
            }
          }
        }
        
        if (!P || Q) {
          //run ng- attributes first
          for(var x in attr) {
            if(x[2] !== '-') { continue; }
            //some ng-attr are just don't need it here.
            if (/^ng-(?:src|alt|title|href)/.test(x)) {
              //overwrite non ng-
              attr[x.replace('ng-', '')] = attr[x];
              //delete ng- attribute
              delete attr[x];

            } else if (x === 'ng-if') {
              T[L] = T[L] ? T[L] + 1 : 1;
              R += D(L,1) + 'if('+ Y(V, attr[x]) +'){\n';
              // console.log('ng-if starts here', L);

              delete attr[x];

            } else if (x === 'ng-class') {
              //console.log(222, attr[x]);

              //ToDO: ng-class is complicated, this need some more work!
              R += D(L) + 'var s=[],n=' + Y(V, attr[x]) + ';\n';
              R += D(L) + 'for(var c in n){n[c]&&s.push(c);}\n';
              n=1;

              delete attr[x];
            }
          }
        }

        for(var x in attr){
          //console.log(20,[x],[attr],[attr[x]])
          var val = attr[x];

          if(n && x === 'class'){ //when both ng-class and class exists
            R += D(L) + 's.push("' + val + '");\n';

          } else {
            a[x] = '="' + N(val) + '"';
            //ng-repeat loop variables are not available!
            // only way to acccess is to use $index like "data[$index]"
            // instead of "item" as in "item in data"
            if(a[x].indexOf('$index') !== -1) {
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

        R += D(L) + "R+='<" + name + (n ? " class=\"'+s.join(' ')+'\"" : '');
        for(var k in a) {
          R += " " + k + a[k];
        }
        R += ">';\n";

        //some tag dont have close tag
        if(!/^(?:input|img|br|hr)/i.test(name)) {
          //there is more, but most not used or can't use with doTA, so excluding them
          //http://webdesign.about.com/od/htmltags/qt/html-void-elements.htm
          L++;

        //ng-repeat or ng-if on self closing tag
        } else if (T[L] > 0) {
          R += D(L,1) + '}\n';
          T[L]--;
          I[L] = 0;
        }
      },
      onclosetag: function(name){
        R += D(L-1) + "R+='</" + name + ">';\n";
        L--;
        while (T[L] > 0) {
          //console.log(T[L], 'ends here at L', L);
          R += D(L,1) + '}\n';
          T[L]--;
          I[L] = 0;
        }
        //console.log('/L',[L,P]);
        if(P && P >= L) {
          P = 0;
        }
      },
      ontext: function(text){
        if (text.indexOf('{{') !== -1){
          //console.log(22, 'start');
          text = M(text);
        }
        R += D(L) + ('R+=\'' + text.replace(/\s{2,}|\n/g,' ') + '\';\n').replace(/\+''|''\+/g,'');
        //console.log(111, R.slice(-50));
      },
      oncomment: function(data){
        //console.log(111,[data]);
        R += D(L) + "R+='<" + data.replace(/'/g,"\\'") + ">';\n";
      }
    });
    R += D(0) +'return R;\n';
    if(O.optimize){
      //longer compile time, but faster rendering time
      R = R.replace(/;R\+=/g,'+').replace(/'\+'/g,'');
//      var R2 = R.replace(/,\$index=i\d+/g,'');
//      if (R2.indexOf('$index') === -1) {
//        R = R2;
//      }
    }
    if(O.debug) {
      console.log(R);
    }
    try {
      var F = new Function('A', 'F', R);
    } catch (e) {
			if (typeof console !== "undefined") {
        window["console"].log("doTA compile error:\n" + R);
      }
			throw e;
		}
    R = L = T = I = V = P = null; /* just for less array usage on heap profiling */
    return F;
  },
  cache: {}
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = doTA;
  if (typeof window === "undefined") {
    window = {console: console};
  }
} else if (typeof console === "undefined") {
  window.console = {log: function(){}};
}

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