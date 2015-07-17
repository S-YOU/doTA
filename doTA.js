var doTA = (function(){'use strict';
  /* for ie8? */
  if(!String.prototype.trim){
    String.prototype.trim = function(){
      return this.replace(/^\s+|\s+$/g,'');
    };
  }
  function forEach(obj, fn){
   for (var x in obj) {
     // if (x in obj) {
       fn.call(obj[x], x);
     // }
   }
  }
  var events = ' change click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste ';
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
      // console.log("chunks", [chunks[x]]);
      if(chunks[x] === '<') {
        x++;
        // console.log("chunks", [chunks[x]]);
        if(chunks[x][0] === '/') {
          //close tag must be like </div>
          // short hand tag like <div /> are NOT supported
          func.onclosetag(chunks[x].slice(1));
        } else if (chunks[x][0] === '!') {
          func.oncomment(chunks[x]);
        } else {
          // console.log(11, [chunks[x]])
          var attrs = {}, tagName, chunk = chunks[x];
          var pos = chunk.indexOf(' ');

          //no attributes
          if (pos === -1) {
            tagName = chunk;
          } else {
            tagName = chunk.slice(0, pos);
            var len = chunk.length;
            //console.log(222, [pos, chunk]);
            while(++pos < len) {
              var eq_pos = chunk.indexOf('=', pos);

              // ** attribute without value (last attribute) **
              if (eq_pos === -1) {
                attrs[chunk.slice(pos)] = "";
                //attrs required will be required="", while is valid syntax
                //http://www.w3.org/TR/html-markup/syntax.html#syntax-attrs-empty
                break;
              }

              // uncomment this if you need no value attribute in the middle
              // ** attribute without value (middle attribute) **
              // var sp_pos = chunk.indexOf(' ', pos);
              // if (sp_pos > 0 && sp_pos < eq_pos) {
              //   attrs[chunk.slice(pos, sp_pos)] = "";
              //   pos = sp_pos;
              //   continue;
              // }

              //console.log(33, [eq_pos]);
              var attrName = chunk.slice(pos, eq_pos), attrVal;
              //console.log(331, [attrName]);

              var valStart = chunk[eq_pos + 1], valEndPos;
              //console.log(332, [valStart]);

              //if attribute value is start with quote
              if(valStart === '"' || valStart === "'") {
                valEndPos = chunk.indexOf(valStart, eq_pos + 2);
                attrVal =  chunk.slice(eq_pos + 2, valEndPos);
                //console.log(311, [eq_pos, valEndPos, attrVal]);
                attrs[attrName] = html_decode(attrVal);
                pos = valEndPos + 1;
              } else {

                valEndPos = chunk.indexOf(' ', eq_pos + 2);
                //console.log(44, [valEndPos]);
                if(valEndPos === -1) {
                  attrVal =  chunk.slice(eq_pos + 1);
                  attrs[attrName] = html_decode(attrVal);
                  //console.log(442, [attrVal]);
                  break;

                } else {
                  attrVal =  chunk.slice(eq_pos + 1, valEndPos);
                  attrs[attrName] = html_decode(attrVal);
                  //console.log(313, [eq_pos, valEndPos, attrVal]);
                  pos = valEndPos;
                }
              }
            }
          }
          //console.log(111,attrs);
          //console.log(1111,tagName, attrs, [attrs ? 1: 2]);
          func.onopentag(tagName, attrs);
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

  var compiledCount = 0;
  var compiledHash = {};

  return {
    compile: function(template, options){
      options = options || {};
      var val_mod = options.loose ? "||''" : '';
      //variable cache
      var VarMap = {$index: 1, undefined: 1, $attr:1};
      var level = 0, LevelMap = {}, LevelVarMap = {}, WatchMap = {}, Watched, doTAPass, doTAContinue, compiledFn;
      var uniqId = compiledHash[options.dotaRender] || compiledCount++;
      var idHash = {};
      compiledHash[uniqId] = uniqId;

      var FnText = Indent(level) + "'use strict';var " +
        (options.diff ? 'N=0,H=doTA.H['+ compiledHash[uniqId] +']=doTA.H['+ compiledHash[uniqId] +']||{},' : '') +
      "R='';\n"; //ToDO: check perf on var declaration

      //clean up extra white spaces and line break
      template = template.replace(/\s{2,}|\n/g,' ');
      //console.log(template);

      //debug = 1;
      if(options.encode) {
        template = template.replace(/"[^"]*"|'[^']*'/g, function($0){
          return $0.replace(/[<>]/g, function($00){
            return {'>': '&gt;', '<': '&lt;'}[$00];
          });
        });
      }

      //attach plain variables to Scope.Variable
      function AttachScope(v){
        //console.log(VarMap, [v]);
        if(v) {
          //var logg = /error/.test(v);
          //logg && console.log(11, [v]);

          //ToDo: still buggy, this need to improve
          var matches = v.match(/'[^']+'|"[^"]+"|[\w$]+|[^\w$'"]+/g), vv = "";
          //logg && console.log(12, matches);
          for(var i = 0; i < matches.length; i++) {
            if (valid_chr.indexOf(matches[i].charAt(0)) >= 0 && !VarMap[matches[i]] &&
              (!i || matches[i-1][matches[i-1].length-1] !== '.')) {
              vv += 'S.' + matches[i];
            } else {
              if (matches[i].indexOf('$index') >= 0) {
                //console.log([val], LevelMap[level]);
                for(var j = level; j >= 0; j--){
                  if (LevelVarMap[j]) {
                    vv += matches[i].replace(/\$index/g, LevelVarMap[j]);
                    break;
                  }
                }
              } else {
                vv += matches[i];
              }
            }
          }
          //logg && console.log(55,vv);
          return vv;
        }
        return v;
      };

      //interpolation without $filter
      function Interpolate(str){
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
            Z[i] = InterpolateWithFilter(null, Z[i]);
          }
          return Z.join('');
        } else {
          if (str.indexOf("'") >= 0) {
            return str.replace(/'/g, "\\'");
          }
          return str;
        }
      };

      //InterpolateWithFilter regex replace
      function TextInterpolate(str) {
        return str.replace(/\{\{([^}]+)\}\}/g, InterpolateWithFilter);
      };

      //interpolation with $filter
      function InterpolateWithFilter($0, $1){
        //console.log(333,$1);
        var pos = $1.indexOf('|');
        if(pos === -1) {
          return "'+(" + AttachScope($1) + val_mod + ")+'";
        } else {
          var v = $1[pos+1] === '|' ? $1.match(/([^|]+(?:\|\|)?)+/g) : $1.split('|');
          var val = AttachScope(v[0]);
          // for(var i = 1; i < v.length; i++){
          if (v[1]) {
            var p = v[1].split(':');
            // console.log(2121,v[i], val, p)
            val = 'F(\'' + p.shift().trim() + '\')('+ val;
            if (p.length) {
              var pr = [];
              for(var j=0; j<p.length; j++) {
                pr.push(AttachScope(p[j]));
              }
              val += ',' + pr.join(',');
            }
            val += ')';
            // break; //implicitly ignore multiple instance of multiple filters that are not supported now
          }
          return "'+(" + val + val_mod +  ")+'";
        }
      };

      //Pretty Indent for debuging
      function Indent(n, x){
        var ret = new Array(n + 2).join('    ');
        return x ? ret.slice(0,-2 * x) : ret;
      };

      //parse the element
      parse(template, {
        //open tag with attributes
        onopentag: function(tagName, attrs){
          // debug && console.log('onopentag', [tagName, attrs]);
          var parsedAttrs = {}, hasNgClass;

          //skip parsing ng-if, ng-repeat, ng-class with, dota
          // but interpolation will still be evaluated (by-design)
          // to avoid this behavior, use ng-bind instead of {{}}
          //  and create new scope with scope=1 in dota-render, or $watchers will never destroy.
          if(attrs['dota-pass']){
            doTAPass = level; doTAContinue = 0;
          //re-enable dota parsing
          } else if (attrs['dota-continue']) {
            doTAContinue = level;
          }

          //unless dota-pass or with dota-continue
          if(!doTAPass || doTAContinue) {
            //ng-repeat to while/for loop
            if (attrs['ng-repeat']) {
              //console.log(21,[x], [val]);
              LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
              var i = 'i' + level, l = 'l'+ level, v = attrs['ng-repeat'].split(' in '), _v = AttachScope(v[1]);

              //store variable tagName to use as $index later
              //this is ng-repeat specific, LevelMap[level] is same for ng-if too
              LevelVarMap[level] = i;

              //make ng-repeat as javascript loop
              //array loop
              if (v[0].indexOf(",") >= 0) {
                var v01 = v[0].split(',');
                FnText += Indent(level, 1) + 'var D' + level + '=' + _v + ';\n';
                FnText += Indent(level, 1) + 'for(var ' + v01[0] + ' in D' + level + '){\n';
                FnText += Indent(level, 1) + 'var ' + v01[1] + ' = ' + 'D' + level + '[' + v01[0] + ']; \n'; //"; " - space is needed for manual uglify
                VarMap[v01[0]] = VarMap[v01[1]] = 1;

              //dict loop, "k, v in items" syntax,
              // without brackets as in (k, v) in angular
              } else {
                FnText += Indent(level, 1) + 'var D' + level + '=' + _v + ',' + i + '=-1,' + l + '=D' + level + '.length;\n';
                FnText += Indent(level, 1) + 'while(++' + i + '<' + l + '){\n';
                FnText += Indent(level) + 'var ' + v[0] + '=D' + level + '[' + i + ']; \n'; //"; " - space is needed for manual uglify
                VarMap[v[0]] = 1;
                //,$index=' + i +'
                // VarMap['$index'] = 1;
              }
              //remote attribute not to get forwarded to angular
              delete attrs['ng-repeat'];
            }

            //ng-if to javascript if
            if (attrs['ng-if']) {
              if (attrs.wait || attrs.watch) {
                attrs['id'] = idHash[uniqId + '.' + level] = attrs['id'] || uniqId + ".'+N+'";
                FnText += Indent(level,2) + (!Watched ? 'var T=this;T.W=[];' : '') + 'var W={I:"' + uniqId + '.' + '"+ ++N,W:"' + attrs['ng-if'] + '"' + (attrs.wait ? ',O:1' : '') + '};T.W.push(W);\n';
                WatchMap[level] = Watched = 1;
                FnText += Indent(level,2) + 'W.F=function(S,F){var R="";\n'; //jshint said "use strict"; is not needed
                delete attrs.watch; delete attrs.wait;
              }
              LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
              FnText += Indent(level,1) + 'if('+ AttachScope(attrs['ng-if']) +'){\n';
              // console.log('ng-if starts here', level);
              delete attrs['ng-if'];
            }
            //ToDO: ng-class is complicated, this need some more work!
            if (attrs['ng-class']) {
              FnText += Indent(level) + 'var s=[],n=' + AttachScope(attrs['ng-class']) + ';\n';
              FnText += Indent(level) + 'for(var c in n){n[c]&&s.push(c);}\n';
              hasNgClass = 1;
              delete attrs['ng-class'];
            }

            //run others ng- attributes first
            for(var x in attrs) {
              if (x.substr(0,3) !== 'ng-') { continue; }
              // if(x.charAt(2) !== '-') { continue; }
              //some ng-attrs are just don't need it here.
              var attrName = x.substr(3);
              if (/^(?:src|alt|title|href)/.test(attrName)) {
                //overwrite non ng-
                attrs[attrName] = attrs[x];
                //delete ng- attribute, so angular won't come in even if you $compile
                delete attrs[x];

              //convert ng-events to dota-events, to be bind later with native events
              } else if (options.event && events.indexOf(' ' + attrName + ' ') >= 0) {
                attrs['de'] = '1'; //dota-event
                attrs['de-' + attrName] = attrs[x];
                delete attrs[x];
              }
            }
          }

          //other attributes, expand interpolations
          for(var x in attrs){
            //console.log(20,[x],[attrs],[attrs[x]])
            var val = attrs[x];

            if(hasNgClass && x === 'class'){ //when both ng-class and class exists
              FnText += Indent(level) + 's.push("' + val + '"); \n';

            } else {
              parsedAttrs[x] = (x === 'id' ? val : Interpolate(val));

              //ng-repeat loop variables are not available!
              // only way to acccess is to use $index like "data[$index]"
              // instead of "item" as in "item in data"
              if(parsedAttrs[x].indexOf('$index') >= 0) {
                //console.log([val], LevelMap[level]);
                for(var j = level; j >= 0; j--){
                  if (LevelVarMap[j]) {
                    parsedAttrs[x] = parsedAttrs[x].replace(/\$index/g, "'+" + LevelVarMap[j] + "+'");
                    break;
                  }
                }
              }
            }
          }

          if (options.diff) {
            FnText += Indent(level) + "if(H[N]){";
              // 'if(H[N])' +
            //   'console.log("exists")' +
            // for(var k in parsedAttrs) {
            //   FnText += ',' + k + ':"' + parsedAttrs[k] + '"';
            // }
            FnText += "}else{" + 'H[N]={tN:"'+tagName+'"';
            for(var k in parsedAttrs) {
              FnText += ',"' + k + '":"' + parsedAttrs[k] + '"';
            }
            FnText += '}}\n';

            parsedAttrs['id'] = parsedAttrs['id'] || uniqId + ".'+N+'";
          }

          //write tag back as string
          FnText += Indent(level) + "R+='<" + tagName + (hasNgClass ? " class=\"'+s.join(' ')+'\"" : '');
          //other attibutes
          for(var k in parsedAttrs) {
            FnText += " " + k + '="' + parsedAttrs[k] + '"';
          }
          FnText += ">';\n";

          if (options.diff) {
            FnText += Indent(level) + "N++; \n"
          }

          //expand doTA templates with expand=1 option
          if (attrs['dota-render'] && attrs.expand) {
            var attrArray = [];
            for(var x in attrs){
              if (!x.indexOf('data-')) {
                attrArray.push('"' + x.slice(5) + '":"' + attrs[x] + '"');
              } else if (!x.indexOf('scope-')) {
                attrArray.push('"' + x.slice(6) + '":S["' + attrs[x] + '"]');
              }
            }
            FnText += Indent(level) + 'var P={' + attrArray.join(',') + '},U="' + attrs['dota-render'] + '";\n';
            FnText += Indent(level) + 'doTA.C[U]&&!doTA.D[U]&&(R+=doTA.C[U](S,F,P)); \n';
          }

          //some tag dont have close tag
          if(!/^(?:input|img|br|hr)/i.test(tagName)) {
            //there is more, but most not used or can't use with doTA, so excluding them
            //http://webdesign.about.com/od/htmltags/qt/html-void-elements.htm
            //Note: self closing syntax is NOT supported. Eg. <img /> or even <div />
            level++;

          //ng-repeat or ng-if on self closing tag
          } else if (LevelMap[level] > 0) {
            FnText += Indent(level,1) + '}\n';
            LevelMap[level]--;
            LevelVarMap[level] = 0;
          }
        },

        //close tag
        onclosetag: function(tagName){
          //just write closing tag back
          FnText += Indent(level-1) + "R+='</" + tagName + ">';\n";
          level--;

          if (WatchMap[level]) {
            FnText += Indent(level, 1) + '} else {\n';
            FnText += Indent(level) + 'R+=\'<' + tagName + ' id="' + idHash[uniqId + '.' + level] + '" style="display:none"></' + tagName + '>\'; \n';
          }

          //close "if", "for", "while" blocks
          while (LevelMap[level] > 0) {
            //console.log(LevelMap[level], 'ends here at level', level);
            FnText += Indent(level,1) + '}\n';
            LevelMap[level]--;
            LevelVarMap[level] = 0;
          }
          //console.log('/level',[level,doTAPass]);

          if (WatchMap[level]) {
            FnText += Indent(level, 2) + 'return R;}; \n';
            FnText += Indent(level, 2) + 'R+=W.F(S,F); \n';
            WatchMap[level] = 0;
          }

          //end dota-pass if it is out of scope
          if(doTAPass && doTAPass >= level) {
            doTAPass = 0;
          }
        },

        //text node
        ontext: function(text){
          //just expand interpolation on text nodes
          if (text.indexOf('{{') >= 0){
            //console.log(22, 'start');
            text = TextInterpolate(text);
          }
          //remove extra spacing, and line breaks
          FnText += Indent(level) + ('R+=\'' + text + '\';\n').replace(/\+''|''\+/g,'');
          //console.log(111, FnText.slice(-50));
        },

        //comment node
        oncomment: function(data){
          //console.log(111,[data]);
          //just encode single code on comment tag
          FnText += Indent(level) + "R+='<" + data.replace(/'/g,"\\'") + ">';\n";
        }
      });
      FnText += Indent(0) +'return R;\n';

      //concat some lines by default for performance
      FnText = FnText.replace(/;R\+=/g,'+').replace(/'\+'/g,'');
      if (options.optimize) {
        FnText = FnText.replace(/\b([\w_-]+=)"([^"'\s]+)"(?=[\s>])/g,'$1$2');
      }

      //print the whole function if debug
      if(options.debug) {
        /**/console.log(FnText);
      }
      try {
        //$scope, $filter
        compiledFn = new Function('S', 'F', '$attr', FnText);
        if (Watched) {
          compiledFn = {W:[], F: compiledFn};
        }
      } catch (err) {
        if (typeof console !== "undefined") {
          /**/console.log("doTA compile error:\n" + FnText);
        }
        throw err;
      }
      // just for less array usage on heap profiling
      // but this may trigger GC more
      FnText = level = LevelMap = LevelVarMap = VarMap = doTAPass = null;
      return compiledFn;
    },
    C: {}, //Cached compiled functions
    D: {}, //Cached DOM to be used by ngDoTA, needed here to prevent unneccessary rendering
    H: {} //HashMap for TextDiff
  };

})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = doTA;
//IE8
} else if (typeof console === "undefined") {
  var noop = function(){};
  console = {log: noop, time: noop, timeEnd: noop};
}
