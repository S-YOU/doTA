/* for ie8? */
if(!String.prototype.trim){
  String.prototype.trim = function(){
    return this.replace(/^\s+|\s+$/g,'');
  };
}
var doTA = {
  parse: function(html, func){'use strict';
    var chunks = html.match(/([<>]|[^<>]+)/g), x=0;
    var html_decode = function(text) {
      return text.replace(/&gt;|&lt;|&amp;|&quot;/g, function($0){
        return {'&gt;': '>', '&lt;': '<', '&amp;': '&', '&quot;': '"'}[$0];
      });
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
              var attr_name = cx.slice(pos, eq_pos), attr_val;
              var val_st = cx[eq_pos + 1], val_end_pos;

              if(val_st === '"' || val_st === "'") {
                val_end_pos = cx.indexOf(val_st, eq_pos + 2);
                attr_val =  cx.slice(eq_pos + 2, val_end_pos);
                //console.log(311, [eq_pos, val_end_pos, attr_val]);
                attr[attr_name] = html_decode(attr_val);
                pos = val_end_pos + 1;
              } else {
                val_end_pos = cx.indexOf(' ', eq_pos + 2);
                if(val_end_pos === -1) {
                  attr_val =  cx.slice(eq_pos + 1);
                  attr[attr_name] = html_decode(attr_val);
                  //console.log(312, [attr_val]);
                  break;
                } else {
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
        //var logg = /active/.test(v);
        //logg && console.log(11, [v]);
        //ToDo: Buggy, this need to improve
        v = v.replace(/'[^']+'|"[^"]+"|(?:^|\s*|[^\w.'"])([$\w]+(?:\.[$\w]+|\[[^\]]+\])*)/g, function($0,$1){
          //logg && console.log(22, [$0, $1]);
          if(v[0] === '"' || v[0] === "'") {
            return $0;
          }
          var v0 = /([$A-Za-z_][$\w]*)/.test($1) && RegExp.$1; //\s*
          //logg && console.log(33, [v0]);
          if(v0 && !V[v0]) {
            return $0.replace($1, 'A.' + $1);
          }
          return $0;
        });
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
            val = 'F(\'' + p.shift().trim() + '\')('+ val + (p.length ? ',"' + p.join('","') + '"' : '') +')';
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
    var L = 0, T = {}, I = {}, V = {}, P;
    var R = '[(function(A,F){\n';
    R += D(L) + "var R='';\n";
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
            P = L;
            break;
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
              //if need to check array is valid, add -> if(' + _v + '){\n
              R += D(L, 1) + 'var D' + L + '=' + _v + ',' + i + '=-1,' + l + '=D' + L + '.length;\n';
              R += D(L, 1) + 'while(++' + i + '<' + l + '){\n';
              R += D(L) + 'var ' + v[0] + '=D' + L + '[' + i + '];\n';

              //remember this as local variable, so no need to attach args to it.
              V[v[0]] = 1;

              delete attr[x];
              break;
            }
          }

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
                  a[x] = a[x].replace('$index', "'+" + I[j] + "+'");
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
        if(!/^input|img|br$/i.test(name)) {
          L++;
        }
      },
      onclosetag: function(name){
        R += D(L-1) + "R+='</" + name + ">';\n";
        L--;
        while(T[L]>0){
          //console.log(T[L], 'ends here at L', L);
          R += D(L,1) + '}\n';
          T[L]--;
          I[L]=0;
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
    R += D(0) +'return R;\n})][0]\n';
    if(O.optimize){
      //longer compile time, but faster rendering time
      R = R.replace(/;R\+=/g,'+').replace(/'\+'/g,'');
    }
    if(O.debug) {
      console.log(R);
    }
    var F = eval(R); // evil?
    R = L = T = I = V = P = null; /* just for less array usage on heap profiling */
    return F;
  },
  cache: {}
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = doTA;
}

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

              //c html if you need ng-model or ng-something
              if(a.compile){
                //partially compile each dota-pass and its childs,
                // not sure this is suitable if you have so many dota-passes
                A.forEach(e[0].querySelectorAll('[dota-pass]'), function(partial){
                  c(partial)(s);
                });
                console.log(a.dotaRender,'after c partial');

              } else if(a.compileAll){
                //just compile the whole template with c
                c(e.contents())(s);
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
    }]);

})(window.angular);
