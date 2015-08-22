var doTA = (function() {'use strict';
  /* for ie8 */
  if (!String.prototype.trim) {
    String.prototype.trim = function() {
      return this.replace(/^\s+|\s+$/g,'');
    };
  }

  /* no, thanks! firefox */
  if (Object.prototype.watch) {
    delete Object.prototype.watch;
    delete Object.prototype.unwatch;
  }

  // pretty indent for debugging
  function indent(n, x) {
    var ret = new Array(n + 2).join('    ');
    return x ? ret.slice(0, -2 * x) : ret;
  }

  // decode html entities
  function decodeEntities(text) {
    return text.indexOf('&') < 0 ? text : text
      .replace(/&gt;/g, '>').replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }

  // parse attributes from html open tag and make dict object
  function parseAttr(chunk, func) {
    var attr = {}, tagName;
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
          // console.log('eqPos === -1', [attrName, pos, chunk])
          if (attrName !== '/') {
            attr[attrName] = '';
          }
          //attr required will be required="", while is valid syntax
          //http://www.w3.org/TR/html-markup/syntax.html#syntax-attr-empty
          break;
        }

        // uncomment this if you need no value attribute in the middle
        // ** attribute without value (middle attribute) **
        // var sp_pos = chunk.indexOf(' ', pos);
        // if (sp_pos > 0 && sp_pos < eqPos) {
        //   attr[chunk.slice(pos, sp_pos)] = "";
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
          if (valEndPos < 0) { throw 'ERR:Invalid HTML: [' + chunk + ']'; }

          attrVal =  chunk.slice(eqPos + 2, valEndPos);
          attr[attrName] =0>attrVal.indexOf("&")?attrVal:attrVal.replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&").replace(/&quot;/g,'"'); //INLINE;
          pos = valEndPos + 1;
          //console.log(311, [valEndPos, attrName, attrVal]);
        } else {

          valEndPos = chunk.indexOf(' ', eqPos + 2);

          //when no more attributes
          if (valEndPos < 0) {
            attrVal =  chunk.slice(eqPos + 1);
            attr[attrName] =0>attrVal.indexOf("&")?attrVal:attrVal.replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&").replace(/&quot;/g,'"'); //INLINE;
            //console.log(442, [attrVal]);
            break;

          } else {
            attrVal =  chunk.slice(eqPos + 1, valEndPos);
            attr[attrName] =0>attrVal.indexOf("&")?attrVal:attrVal.replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&").replace(/&quot;/g,'"'); //INLINE;
            //console.log(313, [eqPos, valEndPos, attrVal]);
            pos = valEndPos;
          }
        }
      }

      tagName = tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'img') {
        //http://www.w3.org/TR/html-markup/syntax.html
        //area, base, br, col, command, embed, hr, img, input, keygen, link, meta, param, source, track, wbr
        func.openTag(tagName, attr, 1);
        func.voidTag();
      } else if (attrName === '/') {
        func.openTag(tagName, attr);
        func.closeTag(tagName);
      } else {
        func.openTag(tagName, attr);
      }

    // no attributes
    } else {

      // self closing, explicit
      if (chunk.charAt(chunk.length - 1) === '/') {
        tagName = chunk.slice(0, -1).toLowerCase();

        if (tagName === 'br' || tagName === 'hr') {
          func.openTag(tagName, attr, 1);
          func.voidTag();
        } else {
          func.openTag(tagName, attr);
          func.closeTag(tagName);
        }
      } else {
        tagName = chunk.toLowerCase();

        // self closing, implicit
        if (tagName === 'br' || tagName === 'hr') {
          func.openTag(tagName, attr, 1);
          func.voidTag();
        } else {
          func.openTag(tagName, attr);
        }
      }
    }

  }

  var events = ' change click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste ';
  var valid_chr = '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // minimal stripped down html parser
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
          func.closeTag(html.substring(prevPos, pos));
        } else if (html.charAt(pos) === '!') {
          prevPos = pos;
          pos = html.indexOf('>', prevPos);
          // console.log(['comment', prevPos, pos, html.substring(prevPos, pos)])
          func.comment(html.substring(prevPos, pos));
        } else {
          prevPos = pos;
          pos = html.indexOf('>', prevPos);
          // console.log(['opentag', prevPos, pos, html.substring(prevPos, pos), parseAttr(html.substring(prevPos, pos))])
          // func.openTag.apply(this, parseAttr(html.substring(prevPos, pos)));
          parseAttr(html.substring(prevPos, pos), func);
        }
      } else if (html.charAt(pos) === '>') { //&& html.charAt(pos + 1) !== '<'
        prevPos = ++pos;
        pos = html.indexOf('<', prevPos);
        if (pos > prevPos) {
          // console.log(['text', prevPos, pos, html.substring(prevPos, pos)])
          func.text(html.substring(prevPos, pos));
        }
      } else {
        console.error('Parse ERR?', [prevPos, pos, html.substring(prevPos, pos), html.slice(pos)]);
        break;
      }

    } while (pos > 0);
  }

  //diff and patch dom with exact same structure
  function diffPatchExact(prevKey, html2) {
    var html1 = doTA.H[prevKey];
    var prevPos1 = 0, pos1 = html1.indexOf('<');
    var prevPos2 = 0, pos2 = html2.indexOf('<');
    var tagId = '', elem, part1, part2;
    var posx, endPosx;

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
            // console.log('openTag', [part1, part2])
            tagId = parsePatchAttr(part1, part2);
          } else {
            //record id
            //tagId = getTagId(part1);
            posx = part1.indexOf(' id="');
            0 <= posx && (posx += 5, endPosx = part1.indexOf('"', posx), tagId = part1.substring(posx, endPosx));
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

  // find position of outerHTML end
  // this function will be inline during building
  function getOuterHTMLEnd(HTML, START_POS) {
    var LVL = 1, POS = START_POS;
    for(;;) {
      POS = HTML.indexOf('>', POS);
      if (HTML.charAt(POS - 1) === '/') { //self closing
        LVL--;
        if (LVL <= 0) break;
      }
      POS = HTML.indexOf('<', POS);
      if (HTML.charAt(POS + 1) === '/') {
        LVL--;
        if (LVL <= 0) {
          POS = HTML.indexOf('>', POS + 2);
          break;
        }
      } else if (HTML.charAt(POS + 1) !== '!') {
        LVL++;
      }
      // console.log('LVL', LVL);
    }

    // console.log('getOutHTML', tagName, [tagName, pos2, pos2, ])
    return ++POS;
  }

  // FlatDOM: diff html as text and patch dom nodes
  function diffPatchChildren(prevKey, html2) {
    var html1 = doTA.H[prevKey];
    var prevPos1 = 0, pos1 = html1.indexOf('<');
    var prevPos2 = 0, pos2 = html2.indexOf('<');
    var tagId1, tagId2, elem1, part1, part2;
    // var tagNo1 = 0, tagNo2 = 0;
    var newNode = document.createElement('div');
    var tagStartPos1, tagStartPos2;
    var LVL; //this is needed for fnInline
    // console.log(html1);
    // console.log(html2);

    for (;;) {
      // console.log('before', [dirty1, dirty2], [tagId1, tagId2], [html1.substr(pos1, 20), html2.substr(pos2, 20)]);

      if (pos1 >= 0) {
        pos1 = html1.indexOf(' id="', pos1);
        if (pos1 > 0) {
          prevPos1 = pos1 + 5;
          pos1 = html1.indexOf('"', prevPos1);
          tagId1 = html1.substring(prevPos1, pos1);
          // tagNo1 = tagId1^0;
        }
      }

      // console.log('middle', [tagId1, tagId2], [html1.substr(pos1, 20), html2.substr(pos2, 20)]);

      if (pos2 >= 0) {
        pos2 = html2.indexOf(' id="', pos2);
        if (pos2 > 0) {
          prevPos2 = pos2 + 5;
          pos2 = html2.indexOf('"', prevPos2);
          tagId2 = html2.substring(prevPos2, pos2);
          // tagNo2 = tagId2^0;
        }
      }

      // console.log('after', [dirty1, dirty2], [tagId1, tagId2],
      //   [pos1, pos2], [html1.substr(pos1, 20), html2.substr(pos2, 20)]);

      //exist inifite loop
      if (pos1 < 0 || pos2 < 0) break;

      //same node
      if (tagId1 === tagId2) {
        tagStartPos1 = ++pos1;
        pos1 = html1.indexOf('>', pos1);
        part1 = html1.substring(tagStartPos1, pos1);

        tagStartPos2 = ++pos2;
        pos2 = html2.indexOf('>', pos2);
        part2 = html2.substring(tagStartPos2, pos2);

        // console.log('same node', [part1, part2]);

        //attr really different
        if (part1 !== part2) {
          elem1 = document.getElementById(tagId1);
          //nodes to be inserted or deleted
          if ((part1.substr(1, 6) === 'hidden') !== (part2.substr(1, 6) === 'hidden')) {
            tagStartPos2 = html2.lastIndexOf('<', pos2 - 6);
            LVL=1,pos2=tagStartPos2;for(;;){pos2=html2.indexOf(">",pos2);if("/"===html2.charAt(pos2-1)&&(LVL--,0>=LVL))break;pos2=html2.indexOf("<",pos2);if("/"===html2.charAt(pos2+1)){if(LVL--,0>=LVL){pos2=html2.indexOf(">",pos2+2);break}}else"!"!==html2.charAt(pos2+1)&&LVL++} //INLINE
            newNode.innerHTML = html2.substring(tagStartPos2, pos2);

            // tagStartPos1 = html1.lastIndexOf('<', pos1 - 6);
            // console.warn('replaceChild', [tagId2, tagId1], [
            //   html2.substring(tagStartPos2, getOuterHTMLEnd(html2, tagStartPos2)),
            //   html1.substring(tagStartPos1, getOuterHTMLEnd(html1, pos1))]);

            elem1.parentNode.replaceChild(newNode.firstChild, elem1);

            LVL=1,pos1=pos1;for(;;){pos1=html1.indexOf(">",pos1);if("/"===html1.charAt(pos1-1)&&(LVL--,0>=LVL))break;pos1=html1.indexOf("<",pos1);if("/"===html1.charAt(pos1+1)){if(LVL--,0>=LVL){pos1=html1.indexOf(">",pos1+2);break}}else"!"!==html1.charAt(pos1+1)&&LVL++} //INLINE

          //only attribute changes
          } else {
            if (elem1) {
              parsePatchAttr(part1, part2, elem1);
              // console.warn('patch node', [tagId1, tagId2], [pos1, pos2], [tagStartPos1, tagStartPos2], [part1, part2])
            } else {
              /**/console.error('elem not found', [tagId1, tagId2], [part1, part2]);
              throw "no elem found";
            }
          }
        } else {
          //clear node for textNode
          elem1 = void 0;
        }

        //if blank text node, skip early
        if (html1.charAt(pos1 + 1) === '<' && html2.charAt(pos2 + 1) === '<') {
          pos1++, pos2++;
          continue;
        }

        prevPos1 = pos1;
        pos1 = html1.indexOf('<', prevPos1);
        part1 = html1.substring(prevPos1 + 1, pos1);
        prevPos2 = pos2;
        pos2 = html2.indexOf('<', prevPos2);
        part2 = html2.substring(prevPos2 + 1, pos2);

        //for text node really diff
        if (part1 !== part2) {
          // console.log('text diff', [tagId1, tagId2], [part1, part2]);
          if (!elem1) {
            elem1 = document.getElementById(tagId1);
            if (!elem1) {
              /** */console.error('node not found', [tagId1, tagId2], [part1, part2], [html1.substr(pos1, 15), html2.substr(pos2, 15)], [html1, html2]);
            }
          }
          // console.log('part1,2', [part1, part2]);
          if (elem1.firstChild) {
            //overwrite textNode value
            if (elem1.firstChild.nodeType === 3) {
              elem1.firstChild.nodeValue = part2;
              // console.warn('textNode overwritten', elem1, elem1.firstChild)

            //not textNode, so, insertBefore
            } else {
              elem1.insertBefore(document.createTextNode(part2), elem1.firstChild);
              // console.warn('textNode inserted', elem1, elem1.firstChild)
            }

          //no childNodes, so append one
          } else {
            elem1.appendChild(document.createTextNode(part2));
          }
        }
      } else {
        throw "different Id - not supported for now!";
      }

    } //infinite loop

  }

  // parse attributes from html open tag and patch DOM when different
  function parsePatchAttr(chunk1, chunk2, elem) {
    var tagId;
    var pos1 = chunk1.indexOf(' ');
    var eqPos1, eqPos2;
    var valEndPos1, valEndPos2, posDiff = 0;
    var attrName, attrVal1, attrVal2;
    var len1 = chunk1.length;
    // console.log('chunks', [chunk1, chunk2]);
    if (pos1 !== -1) {
      while (++pos1 < len1) {
        eqPos1 = chunk1.indexOf('="', pos1);
        if (eqPos1 < 0) break;
        attrName = chunk1.slice(pos1, eqPos1);

        valEndPos1 = chunk1.indexOf('"', eqPos1 + 2);
        attrVal1 =  chunk1.slice(eqPos1 + 2, valEndPos1);
        if (!elem && attrName === 'id') {
          tagId = attrVal1;
          elem = document.getElementById(tagId);
          if (!elem) {
            return console.log('tag not found', [tagId]);
          }
        } else {
          eqPos2 = eqPos1 + posDiff;
          valEndPos2 = chunk2.indexOf('"', eqPos2 + 2);
          attrVal2 =  chunk2.slice(eqPos2 + 2, valEndPos2);
          posDiff = valEndPos2 - valEndPos1;
          if (attrVal1 !== attrVal2) {
            // console.log('setAttribute', [attrName, attrVal1, attrVal2], [chunk1, chunk2])
            elem.setAttribute(attrName, attrVal2);
          }
        }
        pos1 = valEndPos1 + 1;

      } //while
    }
    return tagId;
  }

  // extract value of id from part of html open tag
  // only id="xxx" supported, this is internal use, so it's always double-quotes
  // this function is inlined during building
  function getTagId(partial, start) {
    var pos = partial.indexOf(' id="', start), endPos;
    if (pos >= 0) {
      pos += 5;
      endPos = partial.indexOf('"', pos);
      return partial.substring(pos, endPos);
    }
  }

  // split filters into array, take care of | and || as different
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
      ret.push(input.substr(prevPos));
    }
    return ret;
  }

  // ToDo: check compile performance with regex
  var ngClassRegex = /('[^']+'|"[^"]+"|[\w$]+)\s*:\s*((?:[$.\w]+|\([^)]+\)|[^},])+)/g;
  var varOrStringRegex = /'[^']*'|"[^"]*"|[\w$]+|[^\w$'"]+/g;
  var quotedStringRegex = /"[^"]*"|'[^']*'/g;
  var whiteSpaceRegex = /\s{2,}|\n/g;
  var removeUnneededQuotesRegex = /\b([\w_-]+=)"([^"'\s]+)"(?=[\s>])/g;
  var lazyNgAttrRegex = /^(?:src|alt|title|href)/;
  // https://github.com/kangax/html-minifier/issues/63
  var noValAttrRegex = /^(?:checked|selected|disabled|readonly|multiple|required|hidden|nowrap)/;
  var $indexRegex = /\$index/g;

  // exported as doTA.compile
  function compileHTML(template, options) {
    options = options || {};
    var val_mod = options.loose ? "||''" : '';
    var watchDiff = options.watchDiff;
    var diffLevel = +options.diffLevel;
    var VarMap = {$index: 1, undefined: 1, $attr: 1,
      Math: 1, Date: 1, String: 1, Object: 1, Array: 1, Infinity: 1, NaN: 1,
      // alert: 1, confirm: 1, prompt: 1,
      var: 1, in: 1,
      true: 1, false: 1, null: 1, void: 1};
    var level = 0, ngRepeatLevel;
    var ngIfLevel, skipLevel, ngIfCounterTmp, ngIfLevels = [], ngIfLevelMap = {};
    var LevelMap = {}, LevelVarMap = {};
    var WatchMap = {}, Watched;
    var doTAPass, doTAContinue;
    var compiledFn;
    var uniqueId = this.getId(options.dotaRender);
    var idHash = {};

    var FnText = indent(level) + "'use strict';var " +
      (watchDiff ? 'N=1,J=' + uniqueId + ',' : '') +
      "R='';\n"; //ToDO: check performance on var declaration

    //clean up extra white spaces and line break
    template = template.replace(whiteSpaceRegex, ' ');

    if (options.strip) {
      template = template.replace(/>\s+/g, '>').replace(/\s+</g, '<');
    }

    // when encode is set, find strings and encode < and >, or parser will throw error.
    if (options.encode) {
      template = template.replace(quotedStringRegex, function($0) {
        return $0.replace(/[<>]/g, function($00) {
          return {'>': '&gt;', '<': '&lt;'}[$00];
        });
      });
    }

    // attach plain variables to scope variables
    function attachScope(v) {
      //console.log(VarMap, [v]);
      if (v) {
        //var DEBUG = /error/.test(v);
        //DEBUG && console.log(11, [v]);

        //ToDo: still buggy, this need to improve
        var vv = '';
        var matches = v.match(varOrStringRegex);
        //DEBUG && console.log(12, matches);
        for(var i = 0; i < matches.length; i++) {

          if (valid_chr.indexOf(matches[i].charAt(0)) >= 0 && !VarMap[matches[i]] &&
            (!i || matches[i-1][matches[i-1].length-1] !== '.')) {
            vv += 'S.' + matches[i];
          } else {
            if (matches[i].indexOf('$index') >= 0) {
              //console.log([val], LevelMap[level]);
              //for(var j = level; j >= 0; j--) {
              //  if (LevelVarMap[j]) {
                  vv += matches[i].replace($indexRegex, LevelVarMap[ngRepeatLevel]);
                  //break;
                //}
              //}
            } else {
              vv += matches[i];
            }
          }
        }
        //DEBUG && console.log(55, vv);
        return vv;
      }
      return v;
    }

    // escape single quotes with backslash
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

    // interpolation
    function interpolate(str) {
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
          ret += "'+(" + attachFilter(insideStr) + val_mod + ")+'";

          //skip }} for next
          prevPos = pos + 2;
          pos = str.indexOf('{{', prevPos);
        } while (pos > 0);

        //remaining text outside interpolation
        ret += escapeSingleQuote(str.substr(prevPos));
        return ret;
      } else {
        return escapeSingleQuote(str);
      }
    }

    // attach $filters
    function attachFilter($1) {
      //console.log(333,$1);
      var pos = $1.indexOf('|');
      if (pos === -1) {
        return attachScope($1);
      } else {
        //ToDo: check this line later
        var v = splitFilters($1);
        var val = attachScope(v[0]);
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
              val += ',' + attachScope(filter.slice(prevColonPos, colonPos));
              prevColonPos = ++colonPos;
              colonPos = filter.indexOf(':', prevColonPos);
            }
            val += ',' + attachScope(filter.substr(prevColonPos)) + ')';

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
      openTag: function(tagName, attr, selfClosing) {
        // debug && console.log('openTag', [tagName, attr]);
        var interpolatedAttr = {}, customId, tagId, noValAttr = '';
        var attrName, attrVal, attrSkip, oneTimeBinding;

        //skip parsing ng-if, ng-repeat, ng-class with, dota
        // but interpolation will still be evaluated (by-design)
        // to avoid this behavior, use ng-bind instead of {{}}
        //  and create new scope with scope=1 in dota-render, or $watchers will never destroy.
        if (attr['dota-pass']) {
          doTAPass = level; doTAContinue = 0;
        //re-enable dota parsing
        } else if (attr['dota-continue']) {
          doTAContinue = level;
        }

        //unless dota-pass or with dota-continue
        if (!doTAPass || doTAContinue) {
          if (diffLevel && attr.skip) {
            skipLevel = level;
            attrSkip = attr.skip;
            attr.skip = void 0;
            FnText += indent(level, 1) + 'var O'+ level + '=N+' + attrSkip + '; \n';
          }

          //ng-repeat to while/for loop
          if (attr['ng-repeat']) {
            //console.log(21,[x], [val]);
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            var idx = 'i' + level, l = 'l'+ level;
            var NG_REPEAT = attr['ng-repeat'];
            var inPos = NG_REPEAT.indexOf(' in ');
            var repeatVar = NG_REPEAT.substr(0, inPos), repeatSrc = NG_REPEAT.substr(inPos + 4);
            var commaPos = repeatVar.indexOf(',');
            var pipePos = repeatSrc.indexOf('|'), repeatSrcNew;
            var colonPos, x;

            //store variable name to use for $index later
            //this is ng-repeat specific, LevelMap[level] is same for ng-if too
            LevelVarMap[level] = idx;
            ngRepeatLevel = level;

            if (pipePos > 0) {
              repeatSrcNew = attachFilter(repeatSrc);
            } else {
              colonPos = repeatSrc.indexOf(':');
              if (colonPos < 0) {
                repeatSrcNew = attachScope(repeatSrc);
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

              FnText += indent(level, 1) + 'for(var ' +
                repeatVar + '=' + start + ';' +
                repeatVar + (step > 0 ? '<' : '>') + end + ';' + repeatVar + '+=' + step + '){\n';
              VarMap[repeatVar] = 1;

            // Object: "k, v in {}" ==> (for in {})
            } else if (commaPos > 0) {
              var key = repeatVar.substr(0, commaPos);
              var value = repeatVar.substr(commaPos + 1);
              FnText += indent(level, 1) + 'var ' +
                value + ',D' + level + '=' + repeatSrcNew + ';\n';
              FnText += indent(level, 1) + 'for(var ' + key + ' in D' + level + '){\n';
              //                             space is needed for manual uglify  ->  vvv
              FnText += indent(level) + value + ' = ' + 'D' + level + '[' + key + ']; \n';
              VarMap[key] = VarMap[value] = 1;

            // Array: "k in []" ==> while loop
            } else {
              FnText += indent(level, 1) + 'var ' +
                repeatVar + ',D' + level + '=' + repeatSrcNew + ','
                + idx + '=-1,' + l + '=D' + level + '.length;\n';
              FnText += indent(level, 1) + 'while(++' + idx + '<' + l + '){\n';
              //                        space is needed for manual uglify  ->  vvv
              FnText += indent(level) + repeatVar + '=D' + level + '[' + idx + ']; \n';
              VarMap[repeatVar] = 1;
            }
            //remote attribute not to get forwarded to angular
            attr['ng-repeat'] = void 0;
          }

          //re-render sub template
          if (attr.refresh) {
            customId = 1;
            oneTimeBinding = attr.refresh.indexOf('::');
            FnText += indent(level, 2) +
              (!Watched ? 'var ' + (watchDiff ? '': 'N=1,') + 'T=this;T.W=[];' : '') +
              'var W={N:N,I:N+"' + '.' + uniqueId + '",W:"' +
              (oneTimeBinding >=0 ? attr.refresh.substr(oneTimeBinding + 2) + '",O:1': attr.refresh + '"') +
              (attr.compile ? ',C:1' : '') +
              '};T.W.push(W);\n';
            WatchMap[level] = Watched = 1;
            FnText += indent(level, 2) + 'W.F=function(S,F,$attr,X,N){var R="";\n';
            attr.refresh = void 0;
          }

          if (attr['ng-init']) {
            FnText += indent(level) + attachScope(attr["ng-init"]) + '; \n';
            attr['ng-init'] = void 0;
          }

          //ng-if to javascript if
          if (attr['ng-if']) {
            if (diffLevel) {
              ngIfLevel = level;
              ngIfLevels.push(level);
              ngIfLevelMap[level] = 0;
            }
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            FnText += indent(level, 1) + 'if('+ attachScope(attr['ng-if']) +'){\n';
            // console.log('ng-if starts here', level);
            attr['ng-if'] = void 0;
          }

          if (attr['elif'] !== void 0) {
            FnText += indent(level, 1) + 'else if('+ attachScope(attr['elif']) +'){\n';
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            attr['elif'] = void 0;
          }

          if (attr['else'] !== void 0 && !watchDiff) {
            FnText += indent(level, 1) + 'else{\n';
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            attr['else'] = void 0;
          }

          if (attr['ng-class']) {
            var ngScopedClass = attachScope(attr['ng-class']), match;
            interpolatedAttr.class = (attr.class ? interpolate(attr.class) : '');
            while((match = ngClassRegex.exec(ngScopedClass)) !== null) {
              interpolatedAttr.class +=
                ("'+(" + match[2] + '?' +
                  "'" + (interpolatedAttr.class ? ' ' : '') + match[1].replace(/['"]/g, '') +
                  "':'')+'");
            }
            attr['ng-class'] = void 0;
          }

          if (attr['ng-show']) {
            interpolatedAttr.class = (interpolatedAttr.class || attr.class || '');
            interpolatedAttr.class += "'+(" + attachScope(attr['ng-show']) +
              "?'':'" + (interpolatedAttr.class ? ' ' : '') + "ng-hide')+'";
            attr['ng-show'] = void 0;
          }

          if (attr['ng-hide']) {
            interpolatedAttr.class = (interpolatedAttr.class || attr.class || '');
            interpolatedAttr.class += "'+(" + attachScope(attr['ng-hide']) +
              "?'" + (interpolatedAttr.class ? ' ' : '') + "ng-hide':'')+'";
            attr['ng-hide'] = void 0;
          }

          //remove +''+ from class, for unnecessary string concat
          if (interpolatedAttr.class) {
            interpolatedAttr.class = interpolatedAttr.class.replace(/\+''\+/g, '+');
            attr.class = void 0;
          } else if (attr.class) {
            interpolatedAttr.class = interpolate(attr.class);
            attr.class = void 0;
          }

          // expand interpolations on attributes, and some more
          for (x in attr) {
            attrVal = attr[x];
            if (attrVal === void 0) { continue; }

            // some ng- attributes
            if (x.substr(0, 3) === 'ng-') {
              //some ng-attr are just don't need it here.
              attrName = x.substr(3);
              //something like ng-src, ng-href, etc.
              if (lazyNgAttrRegex.test(attrName)) {
                x = attrName;

              //convert ng-events to dota-events, to be bind later with native events
              } else if (options.event && events.indexOf(' ' + attrName + ' ') >= 0) {
                //adding attr "de" for querySelectorAll in ngDoTA
                interpolatedAttr.class = interpolatedAttr.class ? 'de ' + interpolatedAttr.class : 'de';
                // interpolatedAttr.de = 1;
                x = 'de-' + attrName;

              } else if (noValAttrRegex.test(attrName)) {
                noValAttr += "'+(" + attachScope(attrVal) + "?' " + attrName + "=\"\"':'')+'";
                //noValAttr will attach later
                continue;

              //ng-value
              } else if (attrName === 'value') {
                interpolatedAttr.value = "'+(" + attachScope(attrVal) + ")+'";
                continue;
              }
            }

            //ng-repeat loop variables are not available!
            // only way to acccess is to use $index like "data[$index]"
            // instead of "item" as in "item in data"
            if (attrVal.indexOf('$index') >= 0) {
              //console.log([val], LevelMap[level]);
              //for(var j = level; j >= 0; j--) {
              //  if (LevelVarMap[j]) {
                  interpolatedAttr[x] = interpolate(attrVal).replace($indexRegex, "'+" + LevelVarMap[ngRepeatLevel] + "+'");
              //    break;
              //  }
              //}
            } else {
              interpolatedAttr[x] = interpolate(attrVal);
            }
          }

        // pass all attributes to angular, except interpolation and $index
        } else {
          for (x in attr) {
            //or just do use escapeSingleQuote

            if (attr[x].indexOf('$index') >= 0) {
              //console.log([val], LevelMap[level]);
              //for(var j = level; j >= 0; j--) {
              //  if (LevelVarMap[j]) {
                  interpolatedAttr[x] = interpolate(attr[x]).replace($indexRegex, "'+" + LevelVarMap[ngRepeatLevel] + "+'");
              //    break;
              //  }
              //}
            } else {
              interpolatedAttr[x] = interpolate(attr[x]);
            }
          }
        }

        //write tag back as string
        FnText += indent(level) + "R+='<" + tagName;

        //make id attr come before anything
        if (customId || watchDiff) {
          tagId = idHash[uniqueId + '.' + level] = interpolatedAttr.id || ("'+N+++'." + uniqueId);
          FnText += ' id="' + tagId + '"';
          if (interpolatedAttr.id) {
            interpolatedAttr.id = void 0;
          }
        }

        //write back attributes
        for(var k in interpolatedAttr) {
          FnText += " " + k + '="' + interpolatedAttr[k] + '"';
        }

        //attach boolean attributes at last
        FnText += noValAttr +  (selfClosing ? ' /' : '') + ">';\n";

        if (watchDiff) {
          // FnText += indent(level) + "N++; \n";
          if (ngIfLevelMap[ngIfLevel] >= 0) {
            ngIfLevelMap[ngIfLevel]++;
            // console.log('isPath ngIfCounter', [tagName, ngIfCounter]);
          }
        }

        //expand doTA templates with expand=1 option
        if (attr['dota-render'] && attr.expand) {
          var attrArray = [];
          //attach data-X attr, and scope-X attr
          for(x in attr) {
            if (!x.indexOf('data-')) {
              attrArray.push('"' + x.slice(5) + '":"' + attr[x] + '"');
            } else if (!x.indexOf('scope-')) {
              attrArray.push('"' + x.slice(6) + '":S["' + attr[x] + '"]');
            }
          }
          FnText += indent(level) + 'var P={' + attrArray.join(',') + '},U="' + attr['dota-render'] + '";\n';
          //only expand if renderFn is ready in cache, but not in cache-dom (which unneeded)
          FnText += indent(level) + 'doTA.C[U]&&!doTA.D[U]&&(R+=doTA.C[U](S,F,P,X)); \n';
        }

        level++;
      },

      //void tag no need to write closing tag
      voidTag: function() {
        level--;

        if (diffLevel && level === ngIfLevel && ngIfLevelMap[ngIfLevel] >= 0) {
          // console.log('ngIfLevelMap1', ngIfLevel, ngIfLevels, ngIfLevelMap);
          if (ngIfLevelMap[ngIfLevel]) {
            FnText += indent(level, 1) + "}else{" +
              "R+='<span id=\"'+N+'." + uniqueId + '" hidden=""></span>\';' +
              "N+=" + ngIfLevelMap[ngIfLevel] + ";}; \n";
          }
          //save counter
          ngIfCounterTmp = ngIfLevelMap[ngIfLevel];
          //clear counter
          ngIfLevelMap[ngIfLevel] = void 0;
          //remove last level
          ngIfLevel = ngIfLevels[--ngIfLevels.length - 1];
          //add up to previous level
          if (ngIfLevel) {
            ngIfLevelMap[ngIfLevel] += ngIfCounterTmp;
          }
          // console.log('ngIfLevelMap2', ngIfLevel, ngIfLevels, ngIfLevelMap);
          if (LevelMap[level] > 0) {
            LevelMap[level]--;
          }
        }

        //close "if", "for", "while" blocks
        //while is needed because loop and if can be in same tag
        while (LevelMap[level] > 0) {
          FnText += indent(level, 1) + '}\n';
          LevelMap[level]--;
        }

        //clear ng-repeat $index
        if (ngRepeatLevel === level) {
          LevelVarMap[level] = 0;
          ngRepeatLevel = void 0;
        }

        //reset dota-pass when out of scope
        if (doTAPass && doTAPass >= level) {
          doTAPass = 0;
        }
      },

      //close tag
      closeTag: function(tagName) {
        level--;

        //just write closing tag back
        FnText += indent(level) + "R+='</" + tagName + ">';\n";

        //ngIfCounter for most possible uniqueId generation; don't work with loop inside!
        if (diffLevel && level === ngIfLevel && ngIfLevelMap[ngIfLevel] >= 0) {
          // console.log('ngIfLevelMap1', ngIfLevel, ngIfLevels, ngIfLevelMap);
          if (ngIfLevelMap[ngIfLevel]) {
            FnText += indent(level, 1) + "}else{" +
              "R+='<" + tagName + " id=\"'+N+'." + uniqueId + '" hidden="" ' +
              (tagName === 'img' || tagName === 'input' || tagName === 'br' || tagName === 'hr' ?
                '/>' : '></' + tagName + '>')
              + '\';' +
              "N+=" + ngIfLevelMap[ngIfLevel] + ";}; \n";
          }
          //save counter
          ngIfCounterTmp = ngIfLevelMap[ngIfLevel];
          //clear counter
          ngIfLevelMap[ngIfLevel] = void 0;
          //remove last level
          ngIfLevel = ngIfLevels[--ngIfLevels.length - 1];
          //add up to previous level
          if (ngIfLevel) {
            ngIfLevelMap[ngIfLevel] += ngIfCounterTmp;
          }
          // console.log('ngIfLevelMap2', ngIfLevel, ngIfLevels, ngIfLevelMap);
          if (LevelMap[level] > 0) {
            LevelMap[level]--;
          }
        }

        // console.log('LevelMap1', LevelMap);
        //close "if", "for", "while" blocks
        while (LevelMap[level] > 0) {
          FnText += indent(level, 1) + '}\n';
          LevelMap[level]--;
        }
        // console.log('LevelMap2', LevelMap);

        if (diffLevel) {
          if (level === skipLevel) {
            // console.log('ngIfLevel', [level, skipLevel, ngRepeatLevel])
            FnText += indent(level, 1) + 'N=O' + level + '; \n';
          }
          if (level === skipLevel) {
            skipLevel = void 0;
          }
        }

        //clear ng-repeat $index
        if (ngRepeatLevel === level) {
          LevelVarMap[level] = 0;
          ngRepeatLevel = void 0;
        }

        //add blank node if $watch block return nothing, mostly occur with ng-if
        if (WatchMap[level]) {
          FnText += indent(level, 1) +
            "R=R||('<" + tagName + ' id="' + idHash[uniqueId + '.' + level] +
            '" style="display:none"></' + tagName + '>\');\n';
          WatchMap[level] = 0;
          FnText += indent(level, 2) + 'return R;}; \n';
          FnText += indent(level, 2) + 'R+=W.F(S,F,$attr,X,N); \n';
        }

        //reset dota-pass when out of scope
        if (doTAPass && doTAPass >= level) {
          doTAPass = 0;
        }
      },

      //text node
      text: function(text) {
        //console.log([text]);
        FnText += indent(level) + ('R+=\'' + interpolate(text) + '\';\n')
          .replace(/\+''|''\+/g,'');
      },

      //comment node
      comment: function(data) {
        if (options.comment !== 0) {
          //console.log(111,[data]);
          FnText += indent(level) + "R+='<" + escapeSingleQuote(data) + ">';\n";
        }
      }
    });

    if (watchDiff) {
      FnText += indent(0) + 'if(X&&J in doTA.H){doTA.diff' + (diffLevel || '') + '(J,R)}' +
        'doTA.H[J]=R;\n';
    }

    FnText += indent(0) +'return R;\n';

    //Default Optimization
    // - concat possible lines for performance
    FnText = FnText.replace(/;R\+=/g,'+').replace(/'\+'/g,'');

    //extra optimization, which might take some more CPU
    if (options.optimize && !watchDiff) {
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
    FnText = LevelMap = LevelVarMap = VarMap = ngIfLevels = ngIfLevelMap = WatchMap = idHash = void 0;
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

  function getUniqueId(key) {
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
    diff: diffPatchExact,
    diff2: diffPatchChildren,
    getId: getUniqueId,
    initCH: initCompileHash,
    compile: compileHTML,
    C: {}, //Cached compiled functions
    D: {}, //Cached DOM to be used by ngDoTA, needed here to prevent unneccessary rendering
    H: {} //HashMap for TextDiff
  };

  //warmup most used functions
  doTAObj.compile('<div class="x {{x}}" ng-class="{x:1}" ng-repeat="x in y" ng-if="x">x{{x}}</div><!--x-->', {
    watchDiff: 1, diffLevel: 2});

  return doTAObj;
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = doTA;
//IE8
} else if (typeof console === "undefined") {
  var noop = function() {};
  console = {log: noop, time: noop, timeEnd: noop};
}
