var doTA = (function() {'use strict';
  /* for ie8 */
  if (!String.prototype.trim) {
    String.prototype.trim = function() {
      return this.replace(/^\s+|\s+$/g,'');
    };
  }

  //Pretty Indent for debuging
  function Indent(n, x) {
    var ret = new Array(n + 2).join('    ');
    return x ? ret.slice(0,-2 * x) : ret;
  };

  //obj forEach, not currently used
  // function forEach(obj, fn) {
  //  for (var x in obj) {
  //    fn.call(obj[x], x);
  //  }
  // }

  //decode html entities
  function decodeEntities(text) {
    return text.indexOf('&') === -1 ? text : text
      .replace(/&gt;/g,'>').replace(/&lt;/g,'<')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }

  //parse attributes from html open tag and make dict object
  function parseAttrs(chunk) {
    var attrs = {}, tagName;
    var pos = chunk.indexOf(' ');

    if (pos !== -1) {
      tagName = chunk.slice(0, pos);
      var len = chunk.length;
      //console.log(222, [pos, chunk]);
      while (++pos < len) {
        var eqPos = chunk.indexOf('=', pos);

        // ** attribute without value (last attribute) **
        if (eqPos === -1) {
          attrs[chunk.slice(pos)] = "";
          //attrs required will be required="", while is valid syntax
          //http://www.w3.org/TR/html-markup/syntax.html#syntax-attrs-empty
          break;
        }

        // uncomment this if you need no value attribute in the middle
        // ** attribute without value (middle attribute) **
        // var sp_pos = chunk.indexOf(' ', pos);
        // if (sp_pos > 0 && sp_pos < eqPos) {
        //   attrs[chunk.slice(pos, sp_pos)] = "";
        //   pos = sp_pos;
        //   continue;
        // }

        //console.log(33, [eqPos]);
        var attrName = chunk.slice(pos, eqPos), attrVal;
        //console.log(331, [attrName]);

        var valStart = chunk[eqPos + 1], valEndPos;
        //console.log(332, [valStart]);

        //if attribute value is start with quote
        if (valStart === '"' || valStart === "'") {
          valEndPos = chunk.indexOf(valStart, eqPos + 2);
          attrVal =  chunk.slice(eqPos + 2, valEndPos);
          //console.log(311, [eqPos, valEndPos, attrVal]);
          attrs[attrName] = decodeEntities(attrVal);
          pos = valEndPos + 1;
        } else {

          valEndPos = chunk.indexOf(' ', eqPos + 2);

          //when no more attributes
          if (valEndPos === -1) {
            attrVal =  chunk.slice(eqPos + 1);
            attrs[attrName] = decodeEntities(attrVal);
            //console.log(442, [attrVal]);
            break;

          } else {
            attrVal =  chunk.slice(eqPos + 1, valEndPos);
            attrs[attrName] = decodeEntities(attrVal);
            //console.log(313, [eqPos, valEndPos, attrVal]);
            pos = valEndPos;
          }
        }
      }
    } else {
      tagName = chunk;
    }

    //console.log(1111, tagName, attrs, [attrs ? 1: 2]);
    return [tagName, attrs, pos];
  }

  var events = ' change click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste ';
  var valid_chr = '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  //minimal stripped down html parser
  function parseHTML(html, func) {
    if (!html) {return;}
    var chunks = html.match(/([<>]|[^<>]+)/g), idx = 0, chunksLen = chunks.length;
    do {
      // console.log("chunks", [chunks[x]]);
      if (chunks[idx] === '<') {
        idx++;
        // console.log("chunks", [chunks[x]]);
        if (chunks[idx][0] === '/') {
          //close tag must be like </div>
          // short hand tag like <div /> are NOT supported
          func.onclosetag(chunks[idx].slice(1));
        } else if (chunks[idx][0] === '!') {
          func.oncomment(chunks[idx]);
        } else {
          // console.log(11, [chunks[x]])
          func.onopentag.apply(this, parseAttrs(chunks[idx]));
        }
      } else if (chunks[idx] === '>' && chunks[idx+1] !== '<') {
        idx++;
        if (chunks[idx]) {
          // console.log(222, chunks[x])
          func.ontext(chunks[idx]);
        }
      }

    } while(++idx < chunksLen);
  };

  //parse attributes from html open tag and make dict object
  function parsePatchAttrs(chunk1, chunk2) {
    var tagId, elem;
    var pos1 = chunk1.indexOf(' ');
    var eqPos1, eqPos2;
    var valStart, valEndPos1, valEndPos2, posDiff = 0;
    var attrName, attrVal1, attrVal2;
    var len1 = chunk1.length;
    // console.log('chunks', [chunk1, chunk2]);
    if (pos1 !== -1) {
      while (++pos1 < len1) {
        eqPos1 = chunk1.indexOf('=', pos1);
        if (eqPos1 === -1) {
          console.log('single attr: diff not supported?', [chunk1, chunk2]);
          break;
        }

        attrName = chunk1.slice(pos1, eqPos1);

        valStart = chunk1[eqPos1 + 1];

        //if attribute value is start with quote
        if (valStart === '"' || valStart === "'") {
          valEndPos1 = chunk1.indexOf(valStart, eqPos1 + 2);
          attrVal1 =  chunk1.slice(eqPos1 + 2, valEndPos1);
          if (attrName === 'id') {
            tagId = attrVal1;
          } else {
            eqPos2 = eqPos1 + posDiff;
            valEndPos2 = chunk2.indexOf(valStart, eqPos2 + 2);
            attrVal2 =  chunk2.slice(eqPos2 + 2, valEndPos2);
            posDiff = valEndPos2 - valEndPos1;
            if (attrVal1 !== attrVal2) {
              // console.log('posDiff', [valEndPos2 - valEndPos1,
              //   valStart, valStart2,
              //   eqPos1, eqPos2,
              //   attrVal1, attrVal2])
              if (!elem) {
                elem = document.getElementById(tagId);
                if (!elem) {
                  console.log('tag not found', [tagId]);
                  return;
                }
              }
              elem.setAttribute(attrName, attrVal2);
            }
          }
          pos1 = valEndPos1 + 1;
        } else {

          valEndPos1 = chunk1.indexOf(' ', eqPos1 + 2);

          //when no more attribute
          if (valEndPos1 === -1) {
            if (!tagId) {
              attrVal1 =  chunk1.slice(eqPos1 + 1);
              if (attrName === 'id') {
                tagId = attrVal1;
              } else {
                console.log('not supported?', [attrName, attrVal1]);
              }
            }
            break;

          } else {
            if (!tagId) {
              attrVal1 =  chunk1.slice(eqPos1 + 1, valEndPos1);
              if (attrName === 'id') {
                tagId = attrVal1;
              } else {
                console.log('not supported?', [attrName, attrVal1]);
              }
            }
            pos1 = valEndPos1;
          }
        }
      }
    }
    return tagId;
  }

  //extract value of id from part of html open tag
  //equivalent of /id="?([^\s">]+)"?/.test(C1[idx]) && RegExp.$1;
  function getId(partial) {
    var pos = partial.indexOf(" id="), endPos;
    if (pos >= 0) {
      pos += 4;
      var quoted = partial.charAt(pos);
      if (quoted === "'" || quoted === '"') {
        pos++;
        endPos = partial.indexOf(quoted, pos + 1);
      } else {
        endPos = partial.indexOf(' ', pos);
        if (endPos === -1) {
          endPos = partial.indexOf('>', pos);
          if (endPos === -1) {
            endPos = partial.length;
          }
        }
      }
    }
    return partial.substring(pos, endPos);
  }

  function diffPatchHTML(prevKey, next) {
    var prev = doTA.H[prevKey];
    var textAttr = "textContent" in document.body ? "textContent" : "innerText";
    var C1 = prev.match(/([<>]|[^<>]+)/g), C1L = C1.length;
    var C2 = next.match(/([<>]|[^<>]+)/g), C2L = C2.length;
    var idx = 0, tagId, elem;
    if (C1L !== C2L) {
      console.log("len not match, not supported now");
      return;
    }
    do {
      // console.log(C1[x], C2[x]);
      if (C1[idx] === "<") {
        idx++;
        if (C1[idx][0] === "/" || C1[idx][0] === "!") {
          continue;
        } else {
          //attributes
          if (C1[idx] !== C2[idx]) {
            tagId = parsePatchAttrs(C1[idx], C2[idx]);
          } else {
            //record id
            tagId = getId(C1[idx]);
          }
        }
      } else if (C1[idx] === ">" && C1[idx+1] !== "<") {
        idx++;
        //textNode, only support firstChild here
        if (C1[idx] !== C2[idx]) {
          // console.log(C1[idx], C2[idx]);
          elem = document.getElementById(tagId);
          if (elem) {
            if (elem.firstChild && elem.firstChild.nodeType === 3) {
              // console.log('textApplied', [tagId, C2[idx]]);
              elem.firstChild[textAttr] = C2[idx];
            } //else to log something?
          } else {
            console.log('tag not found', [tagId, C1[idx], C2[idx]]);
          }
        }
      }
    } while(idx++ < C1L);
  }

  function ngClassToClass(classObj, className) {
    className = className || '';
    for (var name in classObj) {
      if (classObj[name]) {
        className += (className ? ' ' : '') + name;
      }
    }
    return className
  }

  //ToDo: check compile perf with regex
  var ngClassRegex = /('[^']+'|"[^"]+"|[\w$]+)\s*:\s*((?:[$.\w]+|\([^)]+\)|[^},])+)/g;
  var varOrStringRegex = /'[^']+'|"[^"]+"|[\w$]+|[^\w$'"]+/g;
  var quotedStringRegex = /"[^"]*"|'[^']*'/g;
  var whiteSpaceRegex = /\s{2,}|\n/g;
  var interpolationRegex = /\{\{|\}\}/;
  var capturedInterpolationRegex = /\{\{([^}]+)\}\}/g;
  var filterMatchRegex = /([^|]+(?:\|\|)?)+/g;
  var removeUnneededQuotesRegex = /\b([\w_-]+=)"([^"'\s]+)"(?=[\s>])/g;
  var XHTMLRegex = /^(?:input|img|br|hr)/i;
  var lazyNgAttrRegex = /^(?:src|alt|title|href)/;
  var compiledCount = 0;

  function compileHTML(template, options) {
    options = options || {};
    var val_mod = options.loose ? "||''" : '';
    var isPatch = options.watchDiff;
    var VarMap = {$index: 1, undefined: 1, $attr:1};
    var level = 0, LevelMap = {}, LevelVarMap = {}, WatchMap = {}, Watched, doTAPass, doTAContinue, compiledFn;
    var uniqId = this.CH[options.dotaRender] || compiledCount++;
    var idHash = {};
    this.CH[options.dotaRender] = uniqId;

    var FnText = Indent(level) + "'use strict';var " +
      (isPatch ?
        'N=0,J=' + uniqId +
        ',' :
      '') +
    "R='';\n"; //ToDO: check perf on var declaration

    //clean up extra white spaces and line break
    template = template.replace(whiteSpaceRegex,' ');
    //console.log(template);

    //debug = 1;
    if (options.encode) {
      template = template.replace(quotedStringRegex, function($0) {
        return $0.replace(/[<>]/g, function($00) {
          return {'>': '&gt;', '<': '&lt;'}[$00];
        });
      });
    }

    //attach plain variables to Scope.Variable
    function AttachScope(v) {
      //console.log(VarMap, [v]);
      if (v) {
        //var logg = /error/.test(v);
        //logg && console.log(11, [v]);

        //ToDo: still buggy, this need to improve
        var matches = v.match(varOrStringRegex), vv = "";
        //logg && console.log(12, matches);
        for(var i = 0; i < matches.length; i++) {
          if (valid_chr.indexOf(matches[i].charAt(0)) >= 0 && !VarMap[matches[i]] &&
            (!i || matches[i-1][matches[i-1].length-1] !== '.')) {
            vv += 'S.' + matches[i];
          } else {
            if (matches[i].indexOf('$index') >= 0) {
              //console.log([val], LevelMap[level]);
              for(var j = level; j >= 0; j--) {
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
        //logg && console.log(55, vv);
        return vv;
      }
      return v;
    };

    //interpolation without $filter
    function Interpolate(str) {
      if (str.indexOf('{{') >= 0) {
        var Z = str.split(interpolationRegex);
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
      return str.replace(capturedInterpolationRegex, InterpolateWithFilter);
    };

    //interpolation with $filter
    function InterpolateWithFilter($0, $1) {
      //console.log(333,$1);
      var pos = $1.indexOf('|');
      if (pos === -1) {
        return "'+(" + AttachScope($1) + val_mod + ")+'";
      } else {
        var v = $1[pos+1] === '|' ? $1.match(filterMatchRegex) : $1.split('|');
        var val = AttachScope(v[0]);
        // for(var i = 1; i < v.length; i++) {
        if (v[1]) {
          var p = v[1].split(':');
          // console.log(2121, v[i], val, p)
          val = 'F(\'' + p.shift().trim() + '\')('+ val;
          if (p.length) {
            var pr = [];
            for(var j = 0; j < p.length; j++) {
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

    //parse the element
    parseHTML(template, {
      //open tag with attributes
      onopentag: function(tagName, attrs) {
        // debug && console.log('onopentag', [tagName, attrs]);
        var interpolatedAttrs = {}, customId, tagId, hasNgClass;

        //skip parsing ng-if, ng-repeat, ng-class with, dota
        // but interpolation will still be evaluated (by-design)
        // to avoid this behavior, use ng-bind instead of {{}}
        //  and create new scope with scope=1 in dota-render, or $watchers will never destroy.
        if (attrs['dota-pass']) {
          doTAPass = level; doTAContinue = 0;
        //re-enable dota parsing
        } else if (attrs['dota-continue']) {
          doTAContinue = level;
        }


        //unless dota-pass or with dota-continue
        if (!doTAPass || doTAContinue) {
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
              customId = 1;
              FnText += Indent(level, 2) + (!Watched ? 'var ' + (isPatch ? '': 'N=0,') + 'T=this;T.W=[];' : '') + 'var W={I:"' + uniqId + '.' + '"+ ++N,W:"' + attrs['ng-if'] + '"' + (attrs.wait ? ',O:1' : '') + '};T.W.push(W);\n';
              WatchMap[level] = Watched = 1;
              FnText += Indent(level, 2) + 'W.F=function(S,F,$attr,X){var R="";\n'; //jshint said "use strict"; is not needed
              delete attrs.watch; delete attrs.wait;
            }
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            FnText += Indent(level, 1) + 'if('+ AttachScope(attrs['ng-if']) +'){\n';
            // console.log('ng-if starts here', level);
            delete attrs['ng-if'];
          }

          if (attrs['ng-class']) {
            var ngScopedClass = AttachScope(attrs['ng-class']), match;
            attrs.class = (attrs.class || '');
            while((match = ngClassRegex.exec(ngScopedClass)) !== null) {
              attrs.class +=
                ("'+(" + match[2] + '?' +
                  "'" + (attrs.class ? ' ' : '') + match[1].replace(/['"]/g, '') +
                  "':'')+'");
            }
            attrs.class = attrs.class.replace(/\+''\+/g, '+');
            //ToDo: Find way to remove this flag
            hasNgClass = 1;
            delete attrs['ng-class'];
          }

          //run others ng- attributes first
          for(var x in attrs) {
            if (x.substr(0, 3) !== 'ng-') { continue; }

            //some ng-attrs are just don't need it here.
            var attrName = x.substr(3);
            if (lazyNgAttrRegex.test(attrName)) {
              //overwrite non ng-
              attrs[attrName] = attrs[x];
              //delete above ng- attribute, so angular won't come in even if you $compile
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
        for(var x in attrs) {
          interpolatedAttrs[x] = ((hasNgClass && x === 'class') ? attrs[x] : Interpolate(attrs[x]));

          //ng-repeat loop variables are not available!
          // only way to acccess is to use $index like "data[$index]"
          // instead of "item" as in "item in data"
          if (interpolatedAttrs[x].indexOf('$index') >= 0) {
            //console.log([val], LevelMap[level]);
            for(var j = level; j >= 0; j--) {
              if (LevelVarMap[j]) {
                interpolatedAttrs[x] = interpolatedAttrs[x].replace(/\$index/g, "'+" + LevelVarMap[j] + "+'");
                break;
              }
            }
          }
        }

        //write tag back as string
        FnText += Indent(level) + "R+='<" + tagName;

        //make id attr come before anything
        if (isPatch || customId) {
          tagId = idHash[uniqId + '.' + level] = interpolatedAttrs.id || uniqId + ".'+N+'"
          FnText += ' id="' + tagId + '"';
          if (interpolatedAttrs.id) {
            delete interpolatedAttrs.id;
          }
        }

        //other attibutes
        for(var k in interpolatedAttrs) {
          FnText += " " + k + '="' + interpolatedAttrs[k] + '"';
        }
        FnText += ">';\n";

        if (isPatch) {
          FnText += Indent(level) + "N++; \n";
        }

        //expand doTA templates with expand=1 option
        if (attrs['dota-render'] && attrs.expand) {
          var attrArray = [];
          for(var x in attrs) {
            if (!x.indexOf('data-')) {
              attrArray.push('"' + x.slice(5) + '":"' + attrs[x] + '"');
            } else if (!x.indexOf('scope-')) {
              attrArray.push('"' + x.slice(6) + '":S["' + attrs[x] + '"]');
            }
          }
          FnText += Indent(level) + 'var P={' + attrArray.join(',') + '},U="' + attrs['dota-render'] + '";\n';
          FnText += Indent(level) + 'doTA.C[U]&&!doTA.D[U]&&(R+=doTA.C[U](S,F,P,X)); \n';
        }

        //some tag dont have close tag
        if (!XHTMLRegex.test(tagName)) {
          //there is more, but most not used or can't use with doTA, so excluding them
          //http://webdesign.about.com/od/htmltags/qt/html-void-elements.htm
          //Note: self closing syntax is NOT supported. Eg. <img /> or even <div />
          level++;

        //ng-repeat or ng-if on self closing tag
        } else if (LevelMap[level] > 0) {
          FnText += Indent(level, 1) + '}\n';
          LevelMap[level]--;
          LevelVarMap[level] = 0;
        }
      },

      //close tag
      onclosetag: function(tagName) {
        level--;

        //just write closing tag back
        FnText += Indent(level) + "R+='</" + tagName + ">';\n";

        if (WatchMap[level]) {
          FnText += Indent(level, 1) + '} else {\n';
          FnText += Indent(level) + 'R+=\'<' + tagName + ' id=' + idHash[uniqId + '.' + level] + ' style=display:none></' + tagName + '>\'; \n';
        }

        //close "if", "for", "while" blocks
        while (LevelMap[level] > 0) {
          //console.log(LevelMap[level], 'ends here at level', level);
          FnText += Indent(level, 1) + '}\n';
          LevelMap[level]--;
          LevelVarMap[level] = 0;
        }
        //console.log('/level', [level, doTAPass]);

        if (WatchMap[level]) {
          FnText += Indent(level, 2) + 'return R;}; \n';
          FnText += Indent(level, 2) + 'R+=W.F(S,F,$attr,X); \n';
          WatchMap[level] = 0;
        }

        //end dota-pass if it is out of scope
        if (doTAPass && doTAPass >= level) {
          doTAPass = 0;
        }
      },

      //text node
      ontext: function(text) {

        //just expand interpolation on text nodes
        if (text.indexOf('{{') >= 0) {
          //console.log(22, 'start');
          text = TextInterpolate(text);
        }

        //remove extra spacing, and line breaks
        FnText += Indent(level) + ('R+=\'' + text + '\';\n')
          .replace(/\+''|''\+/g,'');
      },

      //comment node
      oncomment: function(data) {
        //console.log(111,[data]);
        //just encode single code on comment tag
        FnText += Indent(level) + "R+='<" + data.replace(/'/g,"\\'") + ">';\n";
      }
    });

    if (isPatch) {
      FnText += Indent(0) + 'if(X&&J in doTA.H){doTA.diff(J,R)}' +
        'doTA.H[J]=R;\n';
    }

    FnText += Indent(0) +'return R;\n';

    //concat some lines by default for performance
    FnText = FnText.replace(/;R\+=/g,'+').replace(/'\+'/g,'');

    if (options.optimize) {
      FnText = FnText.replace(removeUnneededQuotesRegex,'$1$2');
    }

    //print the whole function if debug
    if (options.debug) {
      /**/console.log(FnText);
    }
    // console.log(FnText);

    try {
      //$scope, $filter
      compiledFn = new Function('S', 'F', '$attr', 'X', FnText);
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
  }

  return {
    nc: ngClassToClass,
    diff: diffPatchHTML,
    CH: {},
    initCH: function(x){this.CH=x},
    compile: compileHTML,
    C: {}, //Cached compiled functions
    D: {}, //Cached DOM to be used by ngDoTA, needed here to prevent unneccessary rendering
    H: {} //HashMap for TextDiff
  };

})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = doTA;
//IE8
} else if (typeof console === "undefined") {
  var noop = function() {};
  console = {log: noop, time: noop, timeEnd: noop};
}
