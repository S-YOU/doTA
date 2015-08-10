var doTA = (function() {'use strict';
  /* for ie8 */
  if (!String.prototype.trim) {
    String.prototype.trim = function() {
      return this.replace(/^\s+|\s+$/g,'');
    };
  }

  /* for firefox */
  if (Object.prototype.watch) {
    delete Object.prototype.watch;
    delete Object.prototype.unwatch;
  }

  //Pretty Indent for debuging
  function Indent(n, x) {
    var ret = new Array(n + 2).join('    ');
    return x ? ret.slice(0, -2 * x) : ret;
  }

  //obj forEach, not currently used
  // function forEach(obj, fn) {
  //  for (var x in obj) {
  //    fn.call(obj[x], x);
  //  }
  // }

  //decode html entities
  function decodeEntities(text) {
    return text.indexOf('&') === -1 ? text : text
      .replace(/&gt;/g, '>').replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }

  //parse attributes from html open tag and make dict object
  function parseAttrs(chunk, func) {
    var attrs = {}, tagName;
    var pos = chunk.indexOf(' ');
    var len, attrName, attrVal;
    var valStart, valEndPos;

    if (pos !== -1) {
      tagName = chunk.slice(0, pos);
      len = chunk.length;

      //console.log(222, [pos, chunk]);
      while (++pos < len) {
        var eqPos = chunk.indexOf('=', pos);

        // ** attribute without value (last attribute) **
        if (eqPos === -1) {
          attrName = chunk.slice(pos);
          if (attrName !== '/') {
            attrs[attrName] = "";
          }
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
        attrName = chunk.slice(pos, eqPos);
        //console.log(331, [attrName]);

        valStart = chunk[eqPos + 1];
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

      func.onopentag(tagName, attrs);

      tagName = tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'img') {
        //http://www.w3.org/TR/html-markup/syntax.html
        //area, base, br, col, command, embed, hr, img, input, keygen, link, meta, param, source, track, wbr
        func.onvoidtag();
      } else if (attrName === '/') {
        func.onclosetag(tagName);
      }

    //no attributes
    } else {

      //self closing, explicit
      if (chunk.charAt(chunk.length - 1) === '/') {
        tagName = chunk.slice(0, -1);
        func.onopentag(tagName, attrs);

        tagName = tagName.toLowerCase();
        if (tagName === 'br' || tagName === 'hr') {
          func.onvoidtag();
        } else {
          func.onclosetag(tagName);
        }
      } else {
        tagName = chunk;
        func.onopentag(chunk, attrs);

        //self closing, implicit
        tagName = tagName.toLowerCase();
        if (tagName === 'br' || tagName === 'hr') {
          func.onvoidtag();
        }
      }
    }

  }

  var events = ' change click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste ';
  var valid_chr = '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  //minimal stripped down html parser
  function parseHTML(html, func) {
    if (!html) { return; }
    var prevPos = 0, pos = html.indexOf('<');
    do {
      if (html.charAt(pos) === '<') {
        pos++;
        if (html.charAt(pos) === '/') {
          prevPos = ++pos;
          pos = html.indexOf('>', prevPos);
          //close tag must be like </div>, but not <div />
          // console.log(['closetag', prevPos, pos, html.substring(prevPos, pos)])
          func.onclosetag(html.substring(prevPos, pos));
        } else if (html.charAt(pos) === '!') {
          prevPos = pos;
          pos = html.indexOf('>', prevPos);
          // console.log(['comment', prevPos, pos, html.substring(prevPos, pos)])
          func.oncomment(html.substring(prevPos, pos));
        } else {
          prevPos = pos;
          pos = html.indexOf('>', prevPos);
          // console.log(['opentag', prevPos, pos, html.substring(prevPos, pos), parseAttrs(html.substring(prevPos, pos))])
          // func.onopentag.apply(this, parseAttrs(html.substring(prevPos, pos)));
          parseAttrs(html.substring(prevPos, pos), func);
        }
      } else if (html.charAt(pos) === '>') { //&& html.charAt(pos + 1) !== '<'
        prevPos = ++pos;
        pos = html.indexOf('<', prevPos);
        if (pos > prevPos) {
          // console.log(['text', prevPos, pos, html.substring(prevPos, pos)])
          func.ontext(html.substring(prevPos, pos));
        }
      } else {
        console.error('Parse ERR?', [prevPos, pos, html.substring(prevPos, pos), html.slice(pos)]);
        break;
      }

    } while (pos > 0);
  }

  function diffPatchHTML(prevKey, html2) {
    var html1 = doTA.H[prevKey];
    var prevPos1 = 0, pos1 = html1.indexOf('<');
    var prevPos2 = 0, pos2 = html2.indexOf('<');
    var tagId, elem, part1, part2;

    do {
      if (html1.charAt(pos1) === "<") {
        pos1++;
        pos2++;
        if (html1.charAt(pos1) === "/" || html1.charAt(pos1) === "!") {
          //don't patch comment node and close tag.
          pos1 = html1.indexOf('>', pos1);
          pos2 = html2.indexOf('>', pos2);
        } else {
          prevPos1 = pos1;
          prevPos2 = pos2;
          pos1 = html1.indexOf('>', prevPos1);
          pos2 = html2.indexOf('>', prevPos2);
          part1 = html1.substring(prevPos1, pos1);
          part2 = html2.substring(prevPos2, pos2);
          //attributes
          if (part1 !== part2) {
            // console.log('opentag', [part1, part2])
            tagId = parsePatchAttrs(part1, part2);
          } else {
            //record id
            tagId = getId(part1);
          }
        }

      //text node
      } else if (html1.charAt(pos1) === '>') {
        prevPos1 = ++pos1;
        prevPos2 = ++pos2;

        pos1 = html1.indexOf('<', prevPos1);
        pos2 = html2.indexOf('<', prevPos2);
        //textNode, only support firstChild here
        if (pos2 > prevPos2) {
          var text1 = html1.substring(prevPos1, pos1);
          var text2 = html2.substring(prevPos2, pos2);
          if (text1 !== text2) {
            elem = document.getElementById(tagId);
            if (elem) {
              if (elem.firstChild && elem.firstChild.nodeType === 3) {
                // console.log('textApplied', [text1, text2]);
                elem.firstChild.nodeValue = text2;
              } //else to log something?
            } else {
              console.log('tag not found', [tagId]);
            }
          }
        }

      }

    } while(pos1 > 0);
  }

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

  function splitFilters(input) {
    var pos = input.indexOf('|');
    if (pos === -1) {
      return [input];
    }
    var prevPos = 0;
    var ret = [];
    while (pos !== -1) {
      if (input.charAt(pos + 1) === '|') {
        pos += 2;
      } else {
        ret.push(input.substring(prevPos, pos));
        prevPos = ++pos;
      }
      pos = input.indexOf('|', pos);
    }
    if (prevPos < input.length) {
      ret.push(input.substring(prevPos));
    }
    return ret;
  }

  //ToDo: check compile perf with regexes
  var ngClassRegex = /('[^']+'|"[^"]+"|[\w$]+)\s*:\s*((?:[$.\w]+|\([^)]+\)|[^},])+)/g;
  var varOrStringRegex = /'[^']*'|"[^"]*"|[\w$]+|[^\w$'"]+/g;
  var quotedStringRegex = /"[^"]*"|'[^']*'/g;
  var whiteSpaceRegex = /\s{2,}|\n/g;
  var removeUnneededQuotesRegex = /\b([\w_-]+=)"([^"'\s]+)"(?=[\s>])/g;
  // var XHTMLRegex = /^(?:input|img|br|hr)/i;
  var lazyNgAttrRegex = /^(?:src|alt|title|href)/;

  // https://github.com/kangax/html-minifier/issues/63
  var noValAttrRegex = /^(?:checked|selected|disabled|readonly|multiple|required|hidden|nowrap)/;
  var $indexRegex = /\$index/g;

  function compileHTML(template, options) {
    options = options || {};
    var val_mod = options.loose ? "||''" : '';
    var isPatch = options.watchDiff;
    var VarMap = {$index: 1, undefined: 1, $attr:1};
    var level = 0, LevelMap = {}, LevelVarMap = {}, WatchMap = {}, Watched, doTAPass, doTAContinue, compiledFn;
    var uniqId = this.getId(options.dotaRender);
    var idHash = {};

    var FnText = Indent(level) + "'use strict';var " +
      (isPatch ? 'N=0,J=' + uniqId + ',' : '') +
      "R='';\n"; //ToDO: check perf on var declaration

    //clean up extra white spaces and line break
    template = template.replace(whiteSpaceRegex, ' ');
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
                  vv += matches[i].replace($indexRegex, LevelVarMap[j]);
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
    }

    // Escape single quotes with backslash
    function escapeSingleQuote(str) {
      var quotePos = str.indexOf("'");
      if (quotePos >= 0) {
        var ret = '';
        var prevQuotePos = 0;
        do {
          ret += str.substring(prevQuotePos, quotePos);
          //escaped quote
          if (str.charAt(quotePos - 1) !== '\\') {
            ret += "\\";
          }
          prevQuotePos = quotePos;
          quotePos = str.indexOf("'", prevQuotePos + 1);
        } while (quotePos > 0);
        ret += str.substr(prevQuotePos);
        return ret;
      } else {
        return str;
      }
    }

    // Interpolation
    function Interpolate(str) {
      var pos = str.indexOf('{{');
      if (pos >= 0) {
        var prevPos = 0;
        var ret = '';
        var outsideStr, insideStr;
        do {
          outsideStr = str.substring(prevPos, pos);
          ret += escapeSingleQuote(outsideStr);

          //skip {{
          prevPos = pos + 2;
          pos = str.indexOf('}}', prevPos);

          insideStr = str.substring(prevPos, pos);
          ret += "'+(" + AttachFilter(insideStr) + val_mod + ")+'";

          //skip }} for next
          prevPos = pos + 2;
          pos = str.indexOf('{{', prevPos);
        } while (pos > 0);

        //remaing text outside interpolation
        ret += escapeSingleQuote(str.substr(prevPos));
        return ret;
      } else {
        return escapeSingleQuote(str);
      }
    }

    // Attach $filters
    function AttachFilter($1) {
      //console.log(333,$1);
      var pos = $1.indexOf('|');
      if (pos === -1) {
        return AttachScope($1);
      } else {
        //ToDo: check this line later
        var v = splitFilters($1);
        var val = AttachScope(v[0]);
        var prevColonPos = 0, colonPos;
        var filter;

        //parse each filters
        for(var i = 1; i < v.length; i++) {
          filter = v[i];

          colonPos = filter.indexOf(':');
          //filter with params
          if (colonPos > 0) {
            val = "F('" + filter.slice(prevColonPos, colonPos).trim() + "')(" + val;
            prevColonPos = ++colonPos;
            colonPos = filter.indexOf(':', prevColonPos);
            while (colonPos > 0) {
              val += ',' + AttachScope(filter.slice(prevColonPos, colonPos));
              prevColonPos = ++colonPos;
              colonPos = filter.indexOf(':', prevColonPos);
            }
            val += ',' + AttachScope(filter.substr(prevColonPos)) + ')';

          //filter without params
          } else {
            val = "F('" + filter.trim() + "')(" + val + ')';
          }

        }
        return val;
      }
    }

    //parse the element
    parseHTML(template, {
      //open tag with attributes
      onopentag: function(tagName, attrs) {
        // debug && console.log('onopentag', [tagName, attrs]);
        var interpolatedAttrs = {}, customId, tagId, noValAttrs = '', attrName, attrVal;

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
            var i = 'i' + level, l = 'l'+ level;
            var NG_REPEAT = attrs['ng-repeat'];
            var inPos = NG_REPEAT.indexOf(' in ');
            var repeatVar = NG_REPEAT.substr(0, inPos), repeatSrc = NG_REPEAT.substr(inPos + 4);
            var commaPos = repeatVar.indexOf(',');
            var pipePos = repeatSrc.indexOf('|'), repeatSrcNew;
            var colonPos;

            //store variable name to use for $index later
            //this is ng-repeat specific, LevelMap[level] is same for ng-if too
            LevelVarMap[level] = i;

            if (pipePos > 0) {
              repeatSrcNew = AttachFilter(repeatSrc);
            } else {
              colonPos = repeatSrc.indexOf(':');
              if (colonPos < 0) {
                repeatSrcNew = AttachScope(repeatSrc);
              }
            }

            // Range: "i in 1:10" ==> (for i = 1; i < 10; i++)
            if (colonPos > 0) {
              var start = repeatSrc.substr(0, colonPos), end, step;
              var anotherColon = repeatSrc.indexOf(':', ++colonPos);
              if (anotherColon > 0) {
                end = repeatSrc.substring(colonPos, anotherColon);
                step = repeatSrc.substr(anotherColon + 1);
              } else {
                end = repeatSrc.substr(colonPos);
                step = 1;
              }
              // console.log([start, end, step])

              FnText += Indent(level, 1) + 'for(var ' + repeatVar + '=' + start + ';' +
                repeatVar + (step > 0 ? '<' : '>') + end + ';' + repeatVar + '+=' + step + '){\n';
              VarMap[repeatVar] = 1;

            // Object: "k, v in {}" ==> (for in {})
            } else if (commaPos > 0) {
              var key = repeatVar.substr(0, commaPos);
              var value = repeatVar.substr(commaPos + 1);
              FnText += Indent(level, 1) + 'var ' + value + ',D' + level + '=' + repeatSrcNew + ';\n';
              FnText += Indent(level, 1) + 'for(var ' + key + ' in D' + level + '){\n';
              //                                      space is needed for manual uglify  ->  vvv
              FnText += Indent(level) + value + ' = ' + 'D' + level + '[' + key + ']; \n';
              VarMap[key] = VarMap[value] = 1;

            // Array: "k in []" ==> while loop
            } else {
              FnText += Indent(level, 1) + 'var ' + repeatVar + ',D' + level + '=' + repeatSrcNew + ','
                + i + '=-1,' + l + '=D' + level + '.length;\n';
              FnText += Indent(level, 1) + 'while(++' + i + '<' + l + '){\n';
              //                                 space is needed for manual uglify  ->  vvv
              FnText += Indent(level) + repeatVar + '=D' + level + '[' + i + ']; \n';
              VarMap[repeatVar] = 1;
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
              FnText += Indent(level, 2) + 'W.F=function(S,F,$attr,X){var R="";\n';
              delete attrs.watch; delete attrs.wait;
            }
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            FnText += Indent(level, 1) + 'if('+ AttachScope(attrs['ng-if']) +'){\n';
            // console.log('ng-if starts here', level);
            delete attrs['ng-if'];
          }

          if (attrs['elif'] !== undefined) {
            FnText += Indent(level, 1) + 'else if('+ AttachScope(attrs['elif']) +'){\n';
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            delete attrs['elif'];
          }

          if (attrs['else'] !== undefined) {
            FnText += Indent(level, 1) + 'else{\n';
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            delete attrs['else'];
          }

          if (attrs['ng-init']) {
            FnText += Indent(level) + AttachScope(attrs["ng-init"]) + '; \n';
            delete attrs['ng-init'];
          }

          if (attrs['ng-class']) {
            var ngScopedClass = AttachScope(attrs['ng-class']), match;
            interpolatedAttrs.class = (attrs.class ? Interpolate(attrs.class) : '');
            while((match = ngClassRegex.exec(ngScopedClass)) !== null) {
              interpolatedAttrs.class +=
                ("'+(" + match[2] + '?' +
                  "'" + (interpolatedAttrs.class ? ' ' : '') + match[1].replace(/['"]/g, '') +
                  "':'')+'");
            }
            delete attrs['ng-class'];
          }

          if (attrs['ng-show']) {
            interpolatedAttrs.class = (interpolatedAttrs.class || attrs.class || '');
            interpolatedAttrs.class += "'+(" + AttachScope(attrs['ng-show']) +
              "?'':'" + (interpolatedAttrs.class ? ' ' : '') + "ng-hide')+'";
            delete attrs['ng-show'];
          }

          if (attrs['ng-hide']) {
            interpolatedAttrs.class = (interpolatedAttrs.class || attrs.class || '');
            interpolatedAttrs.class += "'+(" + AttachScope(attrs['ng-hide']) +
              "?'" + (interpolatedAttrs.class ? ' ' : '') + "ng-hide':'')+'";
            delete attrs['ng-hide'];
          }

          //remove +''+ from class, for unnecessary string concat
          if (interpolatedAttrs.class) {
            interpolatedAttrs.class = interpolatedAttrs.class.replace(/\+''\+/g, '+')
            delete attrs.class;
          }

          // expand interpolations on attributes, and some more
          for (var x in attrs) {
            attrVal = attrs[x];

            // some ng- attributes
            if (x.substr(0, 3) === 'ng-') {
              //some ng-attrs are just don't need it here.
              attrName = x.substr(3);
              //something like ng-src, ng-href, etc.
              if (lazyNgAttrRegex.test(attrName)) {
                x = attrName;

              //convert ng-events to dota-events, to be bind later with native events
              } else if (options.event && events.indexOf(' ' + attrName + ' ') >= 0) {
                //adding attr "de" for querySelectorAll in ngDoTA
                interpolatedAttrs.de = '1'; //dota-event
                x = 'de-' + attrName;

              } else if (noValAttrRegex.test(attrName)) {
                noValAttrs += "'+(" + AttachScope(attrVal) + "?' " + attrName + "=\"\"':'')+'";
                //noValAttrs will attach later
                continue;

              //ng-value
              } else if (attrName === 'value') {
                interpolatedAttrs.value = "'+(" + AttachScope(attrVal) + ")+'";
                continue;
              }
            }

            //ng-repeat loop variables are not available!
            // only way to acccess is to use $index like "data[$index]"
            // instead of "item" as in "item in data"
            if (attrVal.indexOf('$index') >= 0) {
              //console.log([val], LevelMap[level]);
              for(var j = level; j >= 0; j--) {
                if (LevelVarMap[j]) {
                  interpolatedAttrs[x] = Interpolate(attrVal).replace($indexRegex, "'+" + LevelVarMap[j] + "+'");
                  break;
                }
              }
            } else {
              interpolatedAttrs[x] = Interpolate(attrVal);
            }
          }

        // pass all attributes to angular, except interpolation and $index
        } else {
          for (x in attrs) {
            //or just do use escapeSingleQuote

            if (attrs[x].indexOf('$index') >= 0) {
              //console.log([val], LevelMap[level]);
              for(var j = level; j >= 0; j--) {
                if (LevelVarMap[j]) {
                  interpolatedAttrs[x] = Interpolate(attrs[x]).replace($indexRegex, "'+" + LevelVarMap[j] + "+'");
                  break;
                }
              }
            } else {
              interpolatedAttrs[x] = Interpolate(attrs[x]);
            }
          }
        }

        //write tag back as string
        FnText += Indent(level) + "R+='<" + tagName;

        //make id attr come before anything
        if (isPatch) {
          tagId = idHash[uniqId + '.' + level] = interpolatedAttrs.id || uniqId + ".'+" + 'N' + "+'";
          FnText += ' id="' + tagId + '"';
          if (interpolatedAttrs.id) {
            delete interpolatedAttrs.id;
          }
        } else if (customId) {
          tagId = idHash[uniqId + '.' + level] = interpolatedAttrs.id || "'+this.I+'";
          FnText += ' id="' + tagId + '"';
          if (interpolatedAttrs.id) {
            delete interpolatedAttrs.id;
          }
        }

        //write back attibutes
        for(var k in interpolatedAttrs) {
          FnText += " " + k + '="' + interpolatedAttrs[k] + '"';
        }

        //attach boolean attributes at last
        FnText += noValAttrs + ">';\n";

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

        level++;
      },

      //void tag no need to write closing tag
      onvoidtag: function() {
        level--;
        while (LevelMap[level] > 0) {
          //console.log(LevelMap[level], 'ends here at level', level);
          FnText += Indent(level, 1) + '}\n';
          LevelMap[level]--;
          LevelVarMap[level] = 0;
        }
        if (doTAPass && doTAPass >= level) {
          doTAPass = 0;
        }
      },

      //close tag
      onclosetag: function(tagName) {
        level--;

        //just write closing tag back
        FnText += Indent(level) + "R+='</" + tagName + ">';\n";

        //just write hidden tag, so we can replace later, if ng-if evalulate falsy
        if (WatchMap[level]) {
          FnText += Indent(level, 1) + '} else {\n';
          FnText += Indent(level) + "R+='<" + tagName + ' id=' + idHash[uniqId + '.' + level] +
            ' style=display:none></' + tagName + '>\'; \n';
        }

        //close "if", "for", "while" blocks
        while (LevelMap[level] > 0) {
          //console.log(LevelMap[level], 'ends here at level', level);
          FnText += Indent(level, 1) + '}\n';
          LevelMap[level]--;
          LevelVarMap[level] = 0;
        }
        //console.log('/level', [level, doTAPass]);

        //finish block for sub functions
        if (WatchMap[level]) {
          FnText += Indent(level, 2) + 'return R;}; \n';
          FnText += Indent(level, 2) + 'R+=W.F(S,F,$attr,X); \n';
          WatchMap[level] = 0;
        }

        //reset dota-pass when out of scope
        if (doTAPass && doTAPass >= level) {
          doTAPass = 0;
        }
      },

      //text node
      ontext: function(text) {
        //console.log([text]);
        FnText += Indent(level) + ('R+=\'' + Interpolate(text) + '\';\n')
          .replace(/\+''|''\+/g,'');
      },

      //comment node
      oncomment: function(data) {
        //console.log(111,[data]);
        FnText += Indent(level) + "R+='<" + Interpolate(data) + ">';\n";
      }
    });

    if (isPatch) {
      FnText += Indent(0) + 'if(X&&J in doTA.H){doTA.diff(J,R)}' +
        'doTA.H[J]=R;\n';
    }

    FnText += Indent(0) +'return R;\n';

    //Default Optimization
    // - concat possible lines for performance
    FnText = FnText.replace(/;R\+=/g,'+').replace(/'\+'/g,'');

    //extra optimization, which might take some more CPU
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

  var compiledHash = {};
  var lastId = 0;

  function initCompileHash(obj) {
    for (var x in obj) {
      compiledHash[x] = obj[x];
      if (obj[x] > lastId) {
        lastId = obj[x];
      }
    }
  }

  function getUniqId(key) {
    if (key) {
      if (compiledHash[key]) {
        return compiledHash[key];
      } else {
        compiledHash[key] = lastId;
        return lastId++;
      }
    } else {
      return lastId++;
    }
  }

  var doTAObj = {
    // nc: ngClassToClass,
    diff: diffPatchHTML,
    getId: getUniqId,
    initCH: initCompileHash,
    compile: compileHTML,
    C: {}, //Cached compiled functions
    D: {}, //Cached DOM to be used by ngDoTA, needed here to prevent unneccessary rendering
    H: {} //HashMap for TextDiff
  };

  //warmup most used functions
  doTAObj.compile('<div class="x {{x}}" ng-class="{x:1}" ng-repeat="x in y" ng-if="x">x{{x}}</div><!--x-->', {watchDiff: 1});

  return doTAObj;
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = doTA;
//IE8
} else if (typeof console === "undefined") {
  var noop = function() {};
  console = {log: noop, time: noop, timeEnd: noop};
}
