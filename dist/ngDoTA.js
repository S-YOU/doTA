var doTA = (function() {'use strict';
  // var msie = (typeof document !== 'undefined' && document.documentMode) ||
  //   (typeof navigator !== 'undefined' && /Edge/.test(navigator.userAgent) && 12);

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

  // function forEachArray(src, iter, ctx) {
  //   if (!src) { return; }
  //   if (src.forEach) {
  //     return src.forEach(iter);
  //   }
  //   for (var key = 0, length = src.length; key < length; key++) {
  //     iter.call(ctx, src[key], key);
  //   }
  // }

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
    var spPos;
    var len, attrName, attrVal;
    var valStart, valEndPos;

    if (pos !== -1) {
      tagName = chunk.slice(0, pos);
      len = chunk.length;

      //console.log(222, [pos, chunk]);
      while (++pos < len) {
        var eqPos = chunk.indexOf('=', pos);
        // console.log('chunk', [chunk, pos, eqPos, chunk.slice(pos)]);

        // ** attribute without value (last attribute) **
        if (eqPos === -1) {
          do {
            spPos = chunk.indexOf(' ', pos);
            if (spPos > 0) {
              attrName = chunk.slice(pos, spPos);
            } else {
              attrName = chunk.slice(pos);
            }
            // console.log('eqPos === -1', [attrName, pos, chunk])
            if (attrName !== '/') {
              attr[attrName] = '';
            }
            pos = spPos + 1;

          } while (spPos > 0);
          //attr required will be required="", while is valid syntax
          //http://www.w3.org/TR/html-markup/syntax.html#syntax-attr-empty
          break;
        }


        spPos = chunk.indexOf(' ', pos);
        // console.log('chunk', [chunk, eqPos, pos, spPos, chunk.slice(pos, spPos)]);

        if (spPos > 0 && spPos < eqPos) {
          attr[chunk.slice(pos, spPos)] = "";
          pos = spPos;
          continue;
        }

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

  var events = ' scroll change click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste ';
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
        if (prevPos === 0 && pos < 0 && html) {
          func.text(html);
        } else {
          /** */console.error('Parse ERR?', [prevPos, pos, html, html.substring(prevPos, pos), html.slice(pos)]);
        }
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

  //less memory usage with this, javascript is single threaded anyway
  var newNode = typeof document !== 'undefined' && document.createElement('div');

  // FlatDOM: diff html as text and patch dom nodes
  function diff2(prevKey, html2) {
    var html1 = doTA.H[prevKey];
    var prevPos1 = 0, pos1 = html1.indexOf('<');
    var prevPos2 = 0, pos2 = html2.indexOf('<');
    var tagId1, tagId2, elem1, part1, part2;
    // var tagNo1 = 0, tagNo2 = 0;
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
          if (elem1) {
            //nodes to be inserted or deleted
            if ((part1.substr(1, 6) === 'hidden') !== (part2.substr(1, 6) === 'hidden')) {
              tagStartPos2 = html2.lastIndexOf('<', pos2 - 6);
              LVL=1,pos2=tagStartPos2;for(;;){pos2=html2.indexOf(">",pos2);if("/"===html2.charAt(pos2-1)&&(LVL--,0>=LVL))break;pos2=html2.indexOf("<",pos2);if("/"===html2.charAt(pos2+1)){if(LVL--,0>=LVL){pos2=html2.indexOf(">",pos2+2);break}}else"!"!==html2.charAt(pos2+1)&&LVL++}pos2++; //INLINE
              newNode.innerHTML = html2.substring(tagStartPos2, pos2);

              // tagStartPos1 = html1.lastIndexOf('<', pos1 - 6);
              // console.warn('replaceChild', [tagId2, tagId1], [
              //   html2.substring(tagStartPos2, getOuterHTMLEnd(html2, tagStartPos2)),
              //   html1.substring(tagStartPos1, getOuterHTMLEnd(html1, pos1))]);

              elem1.parentNode.replaceChild(newNode.firstChild, elem1);

              LVL=1,pos1=pos1;for(;;){pos1=html1.indexOf(">",pos1);if("/"===html1.charAt(pos1-1)&&(LVL--,0>=LVL))break;pos1=html1.indexOf("<",pos1);if("/"===html1.charAt(pos1+1)){if(LVL--,0>=LVL){pos1=html1.indexOf(">",pos1+2);break}}else"!"!==html1.charAt(pos1+1)&&LVL++}pos1++; //INLINE

            //only attribute changes
            } else {
              parsePatchAttr(part1, part2, elem1);
              // console.warn('patch node', [tagId1, tagId2], [pos1, pos2], [tagStartPos1, tagStartPos2], [part1, part2])
            }
          } else {
            console.error('elem not found', [tagId1, tagId2], [part1, part2]);
            return;
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
              console.error('node not found', [tagId1, tagId2], [part1, part2], [html1.substr(pos1, 15), html2.substr(pos2, 15)], [html1, html2]);
              return;
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
        console.error("different Id - not supported for now!", [tagId1, tagId2]);
        return;
      }

    } //infinite loop

  }

  // diff3: no place holder nodes
  function diff3(prevKey, html2) {
    var html1 = doTA.H[prevKey];
    var part1, part2, elem1;
    var prevPos1, lastPos1, pos1 = html1.indexOf('<');
    var prevPos2, lastPos2, pos2 = html2.indexOf('<');
    var tagId1, tagId2, prevTagId1, prevTagId2;
    var tagNo1, tagNo2, subNo1, subNo2, dotPos1, dotPos2;
    var tagStartPos1, tagStartPos2;
    var LVL; //this is needed for fnInline
    // console.log(html1);
    // console.log(html2);
    // var logger = [];

    for (;;) {
      // console.log('before', [dirty1, dirty2], [tagId1, tagId2], [html1.substr(pos1, 20), html2.substr(pos2, 20)]);

      if (pos1 >= 0) {
        lastPos1 = pos1;
        pos1 = html1.indexOf(' id="', pos1);
        if (pos1 > 0) {
          prevPos1 = pos1 + 5;
          pos1 = html1.indexOf('"', prevPos1);
          prevTagId1 = tagId1;
          tagId1 = html1.substring(prevPos1, pos1);
        }
      }

      // console.log('middle', [tagId1, tagId2], [html1.substr(pos1, 20), html2.substr(pos2, 20)]);

      if (pos2 >= 0) {
        lastPos2 = pos2;
        pos2 = html2.indexOf(' id="', pos2);
        if (pos2 > 0) {
          prevPos2 = pos2 + 5;
          pos2 = html2.indexOf('"', prevPos2);
          prevTagId2 = tagId2;
          tagId2 = html2.substring(prevPos2, pos2);
        }
      }

      // console.log('after', [dirty1, dirty2], [tagId1, tagId2],
      //   [pos1, pos2], [html1.substr(pos1, 20), html2.substr(pos2, 20)]);

      //exist inifite loop
      if (pos1 < 0 && pos2 < 0) break;

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
          if (elem1) {
            //nodes to be inserted or deleted
            if ((part1.substr(1, 6) === 'hidden') !== (part2.substr(1, 6) === 'hidden')) {
              tagStartPos2 = html2.lastIndexOf('<', pos2 - 6);
              LVL=1,pos2=tagStartPos2;for(;;){pos2=html2.indexOf(">",pos2);if("/"===html2.charAt(pos2-1)&&(LVL--,0>=LVL))break;pos2=html2.indexOf("<",pos2);if("/"===html2.charAt(pos2+1)){if(LVL--,0>=LVL){pos2=html2.indexOf(">",pos2+2);break}}else"!"!==html2.charAt(pos2+1)&&LVL++}pos2++; //INLINE
              newNode.innerHTML = html2.substring(tagStartPos2, pos2);

              // tagStartPos1 = html1.lastIndexOf('<', pos1 - 6);
              // console.warn('replaceChild', [tagId2, tagId1], [
              //   html2.substring(tagStartPos2, getOuterHTMLEnd(html2, tagStartPos2)),
              //   html1.substring(tagStartPos1, getOuterHTMLEnd(html1, pos1))]);

              elem1.parentNode.replaceChild(newNode.firstChild, elem1);

              LVL=1,pos1=pos1;for(;;){pos1=html1.indexOf(">",pos1);if("/"===html1.charAt(pos1-1)&&(LVL--,0>=LVL))break;pos1=html1.indexOf("<",pos1);if("/"===html1.charAt(pos1+1)){if(LVL--,0>=LVL){pos1=html1.indexOf(">",pos1+2);break}}else"!"!==html1.charAt(pos1+1)&&LVL++}pos1++; //INLINE

            //only attribute changes
            } else {
              parsePatchAttr(part1, part2, elem1);
              // console.warn('patch node', [tagId1, tagId2], [pos1, pos2], [tagStartPos1, tagStartPos2], [part1, part2])
            }
          } else {
            console.error('elem not found', [tagId1, tagId2], [part1, part2]);
            return;
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
              console.error('node not found', [tagId1, tagId2], [part1, part2], [html1.substr(pos1, 15), html2.substr(pos2, 15)], [html1, html2]);
              return;
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


      //when id is different
      } else {

        dotPos1 = tagId1.indexOf('.');
        tagNo1 = tagId1.slice(0, dotPos1) ^ 0;
        dotPos2 = tagId1.indexOf('.', ++dotPos1);
        subNo1 = dotPos2 > 0 && tagId1.slice(dotPos1, dotPos2) ^ 0;

        dotPos2 = tagId2.indexOf('.');
        tagNo2 = tagId2.slice(0, dotPos2) ^ 0;
        dotPos1 = tagId2.indexOf('.', ++dotPos2);
        subNo2 = dotPos1 > 0 && tagId2.slice(dotPos2, dotPos1) ^ 0;

        if (prevTagId1 === prevTagId2 && pos1 > 0 && pos2 > 0) {

          //["6.1", "5.7.1"] ["5.6.1", "5.6.1"]
          if (tagNo1 > tagNo2) {
            elem1 = document.getElementById(prevTagId2);
            if (!elem1) {
              console.warn(["no existing node 5", [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2]]);
            } else {
              tagStartPos2 = html2.lastIndexOf('<', pos2 - 6);
              LVL=1,pos2=tagStartPos2;for(;;){pos2=html2.indexOf(">",pos2);if("/"===html2.charAt(pos2-1)&&(LVL--,0>=LVL))break;pos2=html2.indexOf("<",pos2);if("/"===html2.charAt(pos2+1)){if(LVL--,0>=LVL){pos2=html2.indexOf(">",pos2+2);break}}else"!"!==html2.charAt(pos2+1)&&LVL++}pos2++; //INLINE
              newNode.innerHTML = html2.substring(tagStartPos2, pos2);

              //huge scroll - hack
              if (tagId2.length - prevTagId2.length >= 2) {
                elem1.appendChild(newNode.firstChild);
                // logger.push(["this.appendChild", [tagId1, tagId2], [prevTagId1, prevTagId2], [html2.substring(tagStartPos2, pos2)]]);
              } else {
                elem1.parentNode.appendChild(newNode.firstChild);
                // logger.push(["parent.appendChild[first]", [tagId1, tagId2], [prevTagId1, prevTagId2], [html2.substring(tagStartPos2, pos2)]]);
              }
              pos1 = lastPos1;
              tagId1 = prevTagId1;
              tagId2 = prevTagId2;
              continue;
            }

          // [5, 6] [24, false] ["5.24.1", "6.1"] ["5.23.1", "5.23.1"] [673, 770]
          } else if (tagNo1 < tagNo2) {
            elem1 = document.getElementById(tagId1);
            if (!elem1) {
              console.warn(["no existing node 4", [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2]]);
            } else {
              elem1.parentNode.removeChild(elem1);
              if (pos1 > 0) {
                LVL=1,pos1=pos1;for(;;){pos1=html1.indexOf(">",pos1);if("/"===html1.charAt(pos1-1)&&(LVL--,0>=LVL))break;pos1=html1.indexOf("<",pos1);if("/"===html1.charAt(pos1+1)){if(LVL--,0>=LVL){pos1=html1.indexOf(">",pos1+2);break}}else"!"!==html1.charAt(pos1+1)&&LVL++}pos1++; //INLINE
              }
              // logger.push(["removeChild[first]", tagId1, [tagId1, tagId2], [prevTagId1, prevTagId2], [html2.substring(tagStartPos2, pos2)]]);
              pos2 = lastPos2;
              tagId1 = prevTagId1;
              tagId2 = prevTagId2;
              continue;
            }
          }



          //same level
          if (tagNo1 === tagNo2) {

            // [5, 5] [1, 2] ["5.1.1", "5.2.1"] ["5.1", "5.1"] [229, 227]
            if ( subNo1 < subNo2 ) {
              elem1 = document.getElementById(tagId1);
              if (!elem1) {
                console.warn(["no existing node 4", [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2]]);
              } else {
                elem1.parentNode.removeChild(elem1);
                if (pos1 > 0) {
                  LVL=1,pos1=pos1;for(;;){pos1=html1.indexOf(">",pos1);if("/"===html1.charAt(pos1-1)&&(LVL--,0>=LVL))break;pos1=html1.indexOf("<",pos1);if("/"===html1.charAt(pos1+1)){if(LVL--,0>=LVL){pos1=html1.indexOf(">",pos1+2);break}}else"!"!==html1.charAt(pos1+1)&&LVL++}pos1++; //INLINE
                }
                // logger.push(["removeChild[backward.last]", tagId1, [tagId1, tagId2], [prevTagId1, prevTagId2], [html2.substring(tagStartPos2, pos2)]]);
                pos2 = lastPos2;
                tagId1 = prevTagId1;
                tagId2 = prevTagId2;
                continue;
              }

            //[5, 5] [19, 18] ["5.19.1", "5.18.1"] ["5.1", "5.1"] [229, 231]
            } else if ( subNo1 > subNo2 ) {
              elem1 = document.getElementById(tagId1);

              tagStartPos2 = html2.lastIndexOf('<', pos2 - 6);
              LVL=1,pos2=tagStartPos2;for(;;){pos2=html2.indexOf(">",pos2);if("/"===html2.charAt(pos2-1)&&(LVL--,0>=LVL))break;pos2=html2.indexOf("<",pos2);if("/"===html2.charAt(pos2+1)){if(LVL--,0>=LVL){pos2=html2.indexOf(">",pos2+2);break}}else"!"!==html2.charAt(pos2+1)&&LVL++}pos2++; //INLINE
              newNode.innerHTML = html2.substring(tagStartPos2, pos2);

              elem1.parentNode.insertBefore(newNode.firstChild, elem1);
              // logger.push(["this.insertBefore[elem1]", [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2], [html2.substring(tagStartPos2, pos2)]]);

              pos1 = lastPos1;
              tagId1 = prevTagId1;
              tagId2 = prevTagId2; //check later
              continue;
            }

          } //same parent

        } //prevTagId1 === prevTagId2



        //end of previous html
        else if (pos1 < 0) {

          // ["28.9.1", "28.10.1"] ["28.8.1", "28.9.1"] [-1, 16911]
          if ( tagNo1 === tagNo2 && subNo1 < subNo2 ) {
            elem1 = document.getElementById(prevTagId2);

            tagStartPos2 = html2.lastIndexOf('<', pos2 - 6);
            LVL=1,pos2=tagStartPos2;for(;;){pos2=html2.indexOf(">",pos2);if("/"===html2.charAt(pos2-1)&&(LVL--,0>=LVL))break;pos2=html2.indexOf("<",pos2);if("/"===html2.charAt(pos2+1)){if(LVL--,0>=LVL){pos2=html2.indexOf(">",pos2+2);break}}else"!"!==html2.charAt(pos2+1)&&LVL++}pos2++; //INLINE
            newNode.innerHTML = html2.substring(tagStartPos2, pos2);

            //huge scroll - hack
            if (tagId2.length - prevTagId2.length >= 2) {
              elem1.appendChild(newNode.firstChild);
              // logger.push(["this.appendChild", [tagId1, tagId2], [prevTagId1, prevTagId2], [html2.substring(tagStartPos2, pos2)]]);
            } else {
              elem1.parentNode.appendChild(newNode.firstChild);
              // logger.push(["appendChild[parent.last]1<0", [tagId1, tagId2], [subNo1, subNo2], [prevTagId1, prevTagId2], [pos1, pos2], [html2.substring(tagStartPos2, pos2)]]);
            }

            tagId1 = prevTagId1;
            tagId2 = prevTagId2;
            continue;
          } else {
            console.warn('not impl1 pos1 < 0', [tagNo1, tagNo2], [subNo1, subNo2], [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2], [html2.substring(tagStartPos2, pos2)]);
          }
        }


        //end of new html
        else if (pos2 < 0) {

          //same base id
          if (tagNo1 === tagNo2) {

            // [28, 28] [undefined, 13] ["28.1", "28.13.1"] ["28.1", "28.1"] [-1, 12127]
            if (subNo1 < subNo2) {
              elem1 = document.getElementById(prevTagId2);

              tagStartPos2 = html2.lastIndexOf('<', pos2 - 6);
              LVL=1,pos2=tagStartPos2;for(;;){pos2=html2.indexOf(">",pos2);if("/"===html2.charAt(pos2-1)&&(LVL--,0>=LVL))break;pos2=html2.indexOf("<",pos2);if("/"===html2.charAt(pos2+1)){if(LVL--,0>=LVL){pos2=html2.indexOf(">",pos2+2);break}}else"!"!==html2.charAt(pos2+1)&&LVL++}pos2++; //INLINE
              newNode.innerHTML = html2.substring(tagStartPos2, pos2);

              elem1.appendChild(newNode.firstChild);
              // logger.push(["appendChild[parent.last]2<0", [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2], [html2.substring(tagStartPos2, pos2)]]);

              tagId1 = prevTagId1;
              tagId2 = prevTagId2;
              continue;

            //[28, 28] [27, 26] ["28.27.1", "28.26.1"] ["28.26.1", "28.25.1"] [12548, -1]
            } else if (subNo1 > subNo2) {

              elem1 = document.getElementById(tagId1);
              if (!elem1) {
                console.warn(["no existing node 4", [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2]]);
              } else {
                elem1.parentNode.removeChild(elem1);
                if (pos1 > 0) {
                  LVL=1,pos1=pos1;for(;;){pos1=html1.indexOf(">",pos1);if("/"===html1.charAt(pos1-1)&&(LVL--,0>=LVL))break;pos1=html1.indexOf("<",pos1);if("/"===html1.charAt(pos1+1)){if(LVL--,0>=LVL){pos1=html1.indexOf(">",pos1+2);break}}else"!"!==html1.charAt(pos1+1)&&LVL++}pos1++; //INLINE
                }
                // logger.push(["removeChild[backward.last]", tagId1, [tagId1, tagId2], [prevTagId1, prevTagId2], [html2.substring(tagStartPos2, pos2)]]);

                tagId1 = prevTagId1;
                tagId2 = prevTagId2;
                continue;
              }

            } else {
              console.warn('not impl3 pos2 < 0', [tagNo1, tagNo2], [subNo1, subNo2], [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2], [html2.substring(tagStartPos2, pos2)]);
            }
          }
        }

        ////////////// THIS SHOULD NEVER REACH ///////////////

        // console.log('====')
        // logger.slice(-10).forEach(function(item){
        //   console.info.apply(console, item)
        // })
        console.error("different Id - not supported for now!", [tagNo1, tagNo2], [subNo1, subNo2], [tagId1, tagId2], [prevTagId1, prevTagId2], [pos1, pos2]);
        console.log([html1.substr(pos1 - 100, 100), html1.substr(pos1, 20)]);
        console.log([html2.substr(pos2 - 100, 100), html2.substr(pos2, 20)]);
        // console.log(html1);
        // console.log(html2)
        return;
      }

    } //infinite loop

  }

  var camelCaseRE = /-(.)/g;
  function camelCase(str) {
    return str.replace(camelCaseRE, function($0, $1){ return $1.toUpperCase(); });
  }

  // parse attributes from html open tag and patch DOM when different
  function parsePatchAttr(chunkA, chunkB, elem) {
    var tagId;
    var posA1, posA2, posB1, posB2;
    var posDiff = 0;
    var attrName, attrVal1, attrVal2;
    // var len1 = chunk1.length;
    // console.log('chunks', [chunkA, chunkB]);

    //extract id to tag, if no elem specified
    if (!elem) {
      posA1 = chunkA.indexOf(' id="', posA1);
      if (posA1 >= 0) {
        posA1 += 5;
        posA2 = chunkA.indexOf('"', posA1);
        tagId = chunkA.slice(posA1, posA2);
        elem = document.getElementById(tagId);
        if (!elem) {
          throw console.error('tag not found', [posA1, posA2, tagId, elem, chunkA, chunkB]);
        }
        posA2 += 2;
      } else {
        throw console.error('id not found', [posA1, posA1, chunkA, chunkB]);
      }
    } else {
      //first char is always space
      posA2 = posB2 = 1;
    }

    for(;;) {
      //attr name
      posA1 = chunkA.indexOf('="', posA2);
      if (posA1 < 0) break;
      attrName = chunkA.slice(posA2, posA1);

      //attr values
      posA2 = chunkA.indexOf('"', posA1 + 2);
      attrVal1 =  chunkA.slice(posA1 + 2, posA2);

      posB1 = posA1 + posDiff;
      posB2 = chunkB.indexOf('"', posB1 + 2);
      attrVal2 =  chunkB.slice(posB1 + 2, posB2);

      if (attrVal1 !== attrVal2) {
        // console.log('setAttribute', [attrName, attrVal1, attrVal2], [chunk1, chunk2])
        if (attrName === 'value') {
          elem[attrName] = attrVal2;
        } else if (attrName.charAt(0) === '-') {
          elem[attrName.substr(1)] = attrVal2;
          // console.log('prop-', attrName.substr(1), attrVal2, elem[attrName.substr(1)]);
        } else {
          /*if (attrName === 'class') {
            elem.className = attrVal2;
          } else */
          //IE or Edge can't set dynamic styles
          // if (msie && attrName === 'style') {
          //   var prevSCPpos = 0, SCPos = attrVal2.indexOf(';'), aStyle, colonPos;
          //   while (SCPos > 0) {
          //     aStyle = attrVal2.slice(prevSCPpos, SCPos);
          //     colonPos = aStyle.indexOf(':');
          //     if (colonPos > 0) {
          //       elem.style[aStyle.substr(0, colonPos).trim()] = aStyle.slice(colonPos+1);
          //     }
          //     prevSCPpos = SCPos + 1;
          //     SCPos = attrVal2.indexOf(';', prevSCPpos);
          //   }
          //   if (prevSCPpos < attrVal2.length) {
          //     aStyle = attrVal2.slice(prevSCPpos);
          //     colonPos = aStyle.indexOf(':');
          //     if (colonPos > 0) {
          //       elem.style[aStyle.substr(0, colonPos).trim()] = aStyle.slice(colonPos+1);
          //     }
          //   }
          //   // forEachArray(attrVal2.match(/[^;]+/g), function(item){
          //   //   var colonPos = item.indexOf(':');
          //   //   if (colonPos > 0) {
          //   //     // console.log('style', [item.substr(0, colonPos).trim(), item.slice(colonPos+1).trim()])
          //   //     elem.style[item.substr(0, colonPos).trim()] = item.slice(colonPos+1);
          //   //   }
          //   // })
          // } else {
            elem.setAttribute(attrName, attrVal2);
          // }
        }
        posDiff = posB2 - posA2;
      }

      posA2 += 2;
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
  function splitFilters(input, pos) {
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

  function parseStyle(styleObj) {
    var ret = '';
    for (var x in styleObj) {
      ret += x + ':' + styleObj[x] + ';';
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
  var $parent$indexRegex = /(?:\$parent\.)+\$index/g;

  // exported as doTA.compile
  function compileHTML(template, options) {
    options = options || {};
    var val_mod = options.loose ? "||''" : '';
    var watchDiff = options.watchDiff;
    var diffLevel = +options.diffLevel;
    var VarMap = {$index: 1, undefined: 1, this: 1,
      doTA: 1, S: 1, F: 1, $attr: 1, X: 1, K: 1, M: 1, N: 1,
      Math: 1, Date: 1, String: 1, Object: 1, Array: 1, Infinity: 1, NaN: 1,
      // alert: 1, confirm: 1, prompt: 1,
      var: 1, in: 1,
      true: 1, false: 1, null: 1, void: 1};
    var level = 0, ngRepeatLevel;
    var ngIfLevel, skipLevel, ngIfCounterTmp, ngIfLevels = [], ngIfLevelMap = {};
    var LevelMap = {}, LevelVarMap = {};
    var KeyMap = [], keyLevel = 0;
    var WatchMap = {}, Watched;
    var doTAPass, doTAContinue;
    var compiledFn;
    var uniqueId = this.getId(options.dotaRender);
    var idHash = {};
    var FnText = '';

    if (options.key) {
      FnText += indent(level) + "var R='';\n";
    } else {
      FnText += indent(level) + "'use strict';var " +
      (watchDiff ? 'M,N=1,' : '') +
      "R='';\n"; //ToDO: check performance on var declaration
    }

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
              //only support last level for now
              vv += matches[i].replace($indexRegex, LevelVarMap[ngRepeatLevel]);
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

    // // interpolation
    // function interpolateInner(str) {
    //   var pos = str.indexOf('{{');
    //   if (pos >= 0) {
    //     var prevPos = 0;
    //     var ret = '';
    //     var outsideStr, insideStr;
    //     do {
    //       outsideStr = str.substring(prevPos, pos);
    //       ret += outsideStr;

    //       //skip {{
    //       prevPos = pos + 2;
    //       pos = str.indexOf('}}', prevPos);

    //       insideStr = str.substring(prevPos, pos);
    //       ret += "(" + attachFilter(insideStr) + val_mod + ")";

    //       //skip }} for next
    //       prevPos = pos + 2;
    //       pos = str.indexOf('{{', prevPos);
    //     } while (pos > 0);

    //     //remaining text outside interpolation
    //     ret += str.substr(prevPos);
    //     return ret;
    //   } else {
    //     return str;
    //   }
    // }

    // attach $filters
    function attachFilter($1) {
      //console.log(333,$1);
      var pos = $1.indexOf('|');
      if (pos === -1) {
        return attachScope($1);
      } else {
        //ToDo: check this line later
        var v = splitFilters($1, pos);
        var val = attachScope(v[0]);
        var prevColonPos, colonPos;
        var filter;

        //parse each filters
        for(var i = 1; i < v.length; i++) {
          filter = v[i], prevColonPos = 0;

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

    function apply$index(attrVal) {
      var count, tmpRepeatLevel;

      if (attrVal.indexOf('$parent.$index') >= 0) {
        tmpRepeatLevel = ngRepeatLevel;
        attrVal = attrVal.replace($parent$indexRegex, function($0) {
          count = $0.match(/\$parent/g).length; //may need to rewrite with indexOf
          while (count>0) {
            while (tmpRepeatLevel >= 0 && typeof LevelVarMap[--tmpRepeatLevel] === 'undefined') {}
            --count;
          }
          return "'+" + LevelVarMap[tmpRepeatLevel] + "+'";
        });
      }
      if (attrVal.indexOf('$index') >= 0) {
        return attrVal.replace($indexRegex, "'+" + LevelVarMap[ngRepeatLevel] + "+'");
      }
      return attrVal;
    }

    //parse the element
    parseHTML(template, {
      //open tag with attributes
      openTag: function(tagName, attr, selfClosing) {
        // debug && console.log('openTag', [tagName, attr]);
        var parsedAttr = {}, customId, tagId, noValAttr = '';
        var attrName, attrVal, attrSkip, oneTimeBinding, doTAPassThis;

        //skip parsing if dota-pass is specified (interpolation will still be expanded)
        // https://jsperf.com/hasownproperty-vs-in-vs-undefined/12
        if (typeof attr['dota-pass'] !== 'undefined') {
          if (attr['dota-pass'] === 'this') {
            doTAPass = doTAPassThis = 1;
          } else {
            doTAPass = level; doTAContinue = 0;
          }
        //re-enable dota parsing
        } else if (typeof attr['dota-continue'] !== 'undefined') {
          doTAContinue = level;
        }

        //unless dota-pass or with dota-continue
        if (doTAPass === void 0 || doTAContinue) {

          if (diffLevel === 2 && attr.skip) {
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
              repeatSrcNew = attachScope(repeatSrc);
              colonPos = repeatSrcNew.indexOf(':');
            }

            // Range: "i in 1:10" ==> (for i = 1; i < 10; i++)
            if (colonPos >= 0) {
              var start = repeatSrcNew.substr(0, colonPos) || 0, end, step;
              var anotherColon = repeatSrcNew.indexOf(':', ++colonPos);
              if (anotherColon > 0) {
                end = repeatSrcNew.substring(colonPos, anotherColon);
                step = repeatSrcNew.substr(anotherColon + 1);
              } else {
                end = repeatSrcNew.substr(colonPos);
                step = 1;
              }
              // console.log([start, end, step, repeatSrcNew, colonPos]);

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

          if (diffLevel === 3 && attr.key) {
            keyLevel = level;
            KeyMap[level] = attr.key;
            FnText += indent(level, 1) + 'var ' + attr.key + '=N,M=1; \n';
            attr.key = void 0;
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
            var eqPos = attr["ng-init"].indexOf('=');
            if (eqPos > 0) {
              var varName = attr["ng-init"].substr(0, eqPos);
              if (varName.indexOf('.') < 0 && varName.indexOf('[') < 0) {
                FnText += indent(level) + 'var ' + varName + '=' +
                  attachScope(attr["ng-init"].substr(eqPos + 1)) + '; \n';
                VarMap[varName] = 1;
              } else {
                FnText += indent(level) + attachScope(attr["ng-init"]) + '; \n';
              }
            } else {
              FnText += indent(level) + attachScope(attr["ng-init"]) + '; \n';
            }
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

          if (attr['elif']) {
            FnText += indent(level, 1) + 'else if('+ attachScope(attr['elif']) +'){\n';
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            attr['elif'] = void 0;
          }

          if (typeof attr['else'] !== 'undefined' && !watchDiff) {
            FnText += indent(level, 1) + 'else{\n';
            LevelMap[level] = LevelMap[level] ? LevelMap[level] + 1 : 1;
            attr['else'] = void 0;
          }

          //remove +''+ from class, for unnecessary string concat
          if (attr.class) {
            parsedAttr.class = interpolate(attr.class);
            attr.class = void 0;
          }

          if (attr['ng-class']) {
            var match;
            var ngScopedClass = attachScope(attr['ng-class']);
            parsedAttr.class = parsedAttr.class || '';
            while((match = ngClassRegex.exec(ngScopedClass)) !== null) {
              parsedAttr.class +=
                ("'+(" + match[2] + '?' +
                  "'" + (parsedAttr.class ? ' ' : '') + match[1].replace(/['"]/g, '') +
                  "':'')+'");
            }
            attr['ng-class'] = void 0;
          }

          if (attr['ng-show']) {
            parsedAttr.class = parsedAttr.class || '';
            parsedAttr.class += "'+(" + attachScope(attr['ng-show']) +
              "?'':'" + (parsedAttr.class ? ' ' : '') + "ng-hide')+'";
            attr['ng-show'] = void 0;
          }

          if (attr['ng-style']) {
            parsedAttr.style = (attr.style ? attr.style + ';' : '') + interpolate(attr['ng-style']);
              // "'+doTA.PS(" + interpolateInner(attr['ng-style']) + ")+'";
            attr['ng-style'] = void 0;
            attr.style = void 0;
          }

          if (attr['ng-hide']) {
            parsedAttr.class = parsedAttr.class || '';
            parsedAttr.class += "'+(" + attachScope(attr['ng-hide']) +
              "?'" + (parsedAttr.class ? ' ' : '') + "ng-hide':'')+'";
            attr['ng-hide'] = void 0;
          }

          if (options.model && attr['ng-model']) {
            if (attr['ng-model'].indexOf('$index') >= 0) {
              parsedAttr['dota-model'] = apply$index(attr['ng-model']);
            } else {
              parsedAttr['dota-model'] = attr['ng-model'];
            }
            attr['ng-model'] = void 0;
          }

          if (options.bind && attr['ng-bind']) {
            if (attr['ng-bind'].indexOf('$index') >= 0) {
              parsedAttr['dota-bind'] = apply$index(attr['ng-bind']);
            } else {
              parsedAttr['dota-bind'] = attr['ng-bind'];
            }
            attr['ng-bind'] = void 0;
          }

          if (attr['ng-value']) {
            parsedAttr.value = "'+(" + attachFilter(attr['ng-value']) + ")+'";
            attr['ng-value'] = void 0;
          }

          //some cleanup
          if (parsedAttr.class) {
            parsedAttr.class = parsedAttr.class.replace(/\+''\+/g, '+');
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
                //add class 'de' for one time querying
                if (parsedAttr.class) {
                  if (parsedAttr.class.substr(0, 2) !== 'de') {
                    parsedAttr.class = 'de ' + parsedAttr.class;
                  }
                } else {
                  parsedAttr.class = 'de';
                }
                // parsedAttr.de = 1;
                x = 'de-' + attrName;

              } else if (noValAttrRegex.test(attrName)) {
                noValAttr += "'+(" + attachScope(attrVal) + "?' " + attrName + "=\"\"':'')+'";
                //noValAttr will attach later
                continue;

              }
            } else if (x.charAt(0) === '-') {
              x = '-' + camelCase(x.substr(1));
              parsedAttr[x] = "'+(" + attachScope(attrVal) + ")+'";
              continue;
            }

            //ng-repeat loop variables are not available!
            // only way to acccess is to use $index like "data[$index]"
            // instead of "item" as in "item in data"
            parsedAttr[x] = apply$index(interpolate(attrVal));
          }

        // pass all attributes to angular, except interpolation and $index
        } else {
          if (doTAPassThis) {
            doTAPass = void 0;
          }
          //still expand interpolation even if dota-pass is set
          for (x in attr) {
            parsedAttr[x] = apply$index(interpolate(attr[x]));;
          }
        }

        //write tag back as string
        FnText += indent(level) + "R+='<" + tagName;

        //make id attr come before anything
        if (customId || watchDiff) {
          tagId = idHash[uniqueId + '.' + level] = parsedAttr.id || ( (
            keyLevel < level && KeyMap[keyLevel] || options.key ?
            "'+" + (options.key || KeyMap[keyLevel]) + "+'.'+M+++'." :
            "'+N+++'."
          ) + uniqueId);
          FnText += ' id="' + tagId + '"';
          if (parsedAttr.id) {
            parsedAttr.id = void 0;
          }
        }

        //write back attributes
        for(var k in parsedAttr) {
          FnText += " " + k + '="' + parsedAttr[k] + '"';
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
          FnText += indent(level) + 'if(typeof doTA.C[U]!=="undefined"&&typeof doTA.D[U]==="undefined"){' +
            'R+=doTA.C[U](S,F,P)}; \n';
        }

        level++;
      },

      //void tag no need to write closing tag
      voidTag: function() {
        level--;

        if (diffLevel === 2 && level === ngIfLevel && ngIfLevelMap[ngIfLevel] >= 0) {
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
          while (ngRepeatLevel >=0 && typeof LevelVarMap[--ngRepeatLevel] === 'undefined') {}
        }

        //reset dota-pass when out of scope
        if (doTAPass >= level) {
          doTAPass = void 0;
        }
      },

      //close tag
      closeTag: function(tagName) {
        level--;

        //just write closing tag back
        FnText += indent(level) + "R+='</" + tagName + ">';\n";

        if (diffLevel === 3) {
          if (level === ngIfLevel && ngIfLevelMap[ngIfLevel]) {
            // FnText += indent(level, 1) + "}else{M+=" + ngIfLevelMap[ngIfLevel] + '} \n';
            // if (LevelMap[level] > 0) {
            //   LevelMap[level]--;
            // }
          }
          if (level === keyLevel) {
            // FnText += indent(level, 1) + 'N=' + level + '+1; \n';
          }
        }

        //ngIfCounter for most possible uniqueId generation; don't work with loop inside!
        if (diffLevel === 2 && level === ngIfLevel && ngIfLevelMap[ngIfLevel] >= 0) {
          // console.log('ngIfLevelMap1', ngIfLevel, ngIfLevels, ngIfLevelMap);
          if (ngIfLevelMap[ngIfLevel]) {
            FnText += indent(level, 1) + "}else{" +
              "R+='<" + tagName + " id=\"'+N+'." + uniqueId + '" hidden="" ' +
              (tagName === 'img' || tagName === 'input' || tagName === 'br' || tagName === 'hr' ?
                '/>' : '></' + tagName + '>')
              + '\';' +
              "N+=" + ngIfLevelMap[ngIfLevel] + "} \n";
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

        if (diffLevel === 2) {
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
          while (ngRepeatLevel >=0 && typeof LevelVarMap[--ngRepeatLevel] === 'undefined') {}
        }

        //add blank node if $watch block return nothing, mostly occur with ng-if
        if (WatchMap[level]) {
          FnText += indent(level, 1) +
            "R=R||('<" + tagName + ' id="' + idHash[uniqueId + '.' + level] +
            '" style="display:none"></' + tagName + '>\');\n';
          WatchMap[level] = 0;
          FnText += indent(level, 2) + 'return R;}; \n';
          FnText += indent(level, 2) + 'R+=W.F(S,F,$attr,0,N); \n';
        }

        //reset dota-pass when out of scope
        if (doTAPass >= level) {
          doTAPass = void 0;
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

    if (watchDiff && diffLevel !== 0) {
      //http://jsperf.com/hasownproperty-vs-in-vs-undefined/87
      FnText += indent(0) + 'if(X&&typeof doTA.H[' + uniqueId + ']!=="undefined"){doTA.diff' + (diffLevel || '') +
        '(' + uniqueId + ',R)}' +
        'doTA.H[' + uniqueId + ']=R;\n';
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
      if (watchDiff || diffLevel) {
        compiledFn = new Function('S', 'F', '$attr', 'X', 'N', 'K', 'M', FnText);
      } else {
        compiledFn = new Function('S', 'F', '$attr', FnText);
      }
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
    diff2: diff2,
    diff3: diff3,
    getId: getUniqueId,
    initCH: initCompileHash,
    compile: compileHTML,
    PS: parseStyle,
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

/* global angular, doTA */
(function (angular, document) {'use strict';
  var msie = document.documentMode;
  var ie8 = msie <= 8;
  var textContent = ie8 ? 'innerText' : 'textContent';
  var listenerName = ie8 ? 'attachEvent' : 'addEventListener';
  var hiddenDIV;
  setTimeout(function(){
    if (document.createElement) {
      hiddenDIV = document.createElement('div');
    }
  },0);
  var BoolMap = {0: 0, 'false': 0, 1: 1, 'true': 1};
  function makeBool(attr, defaultValue){
    return attr in BoolMap ? BoolMap[attr] : attr || defaultValue;
  }

  function forEachArray(src, iter, ctx) {
    if (!src) { return; }
    if (src.forEach) {
      return src.forEach(iter);
    }
    for (var key = 0, length = src.length; key < length; key++) {
      iter.call(ctx, src[key], key);
    }
  }

  //retrieve nested value from object, support a.b or a[b]
  function resolveObject(path, obj) {
    if (path.indexOf('.') >= 0 || path.indexOf('[') >= 0) {
      var chunks = path.replace(/[\]]$/, '').split(/[.\[\]"']+/g);
      return chunks.reduce(function (prev, curr) {
        return prev ? prev[curr] : undefined;
      }, obj);
    } else {
      return obj[path];
    }
  }

  //get nested value as assignable fn like $parse.assign
  function parseObject(path, obj) {
    if (path.indexOf('.') >= 0 || path.indexOf('[') >= 0) {
      var chunks = path.replace(/[\]]$/, '').split(/[.\[\]"']+/g);
      path = chunks.splice(-1, 1)[0];
      // console.log('path, last', chunks, path)
      obj = chunks.reduce(function (prev, curr) {
        // console.log('parseObject', [prev, curr])
        if (!prev[curr]) {
          prev[curr] = {};
        }
        return prev[curr];
      }, obj);
    }
    return {
      assign: function(val) {
        obj[path] = val;
      }
    };
  }

  // var obj = {};
  // var parsed = parseObject('name', obj);
  // parsed.assign('test');
  // console.log(obj);
  // parsed = parseObject('three.one', obj);
  // parsed.assign('haha');
  // console.log(obj);

  //debounce for events
  // function debounce(fn, timeout) {
  //   if (timeout === undefined) {
  //     timeout = 200;
  //   }
  //   var timeoutId;
  //   var args, thisArgs;
  //   function debounced() {
  //     fn.apply(thisArgs, args);
  //   }
  //   return function() {
  //     args = arguments;
  //     thisArgs = this;
  //     if (timeoutId) {
  //       clearTimeout(timeoutId);
  //     }
  //     // console.log('debounce: new timer', [timer]);
  //     timeoutId = setTimeout(debounced, timeout);
  //   };
  // }

  //throttle for events
  function throttle(fn, timeout) {
    if (timeout === undefined) {
      timeout = 200;
    }
    var timeoutId;
    var start = +new Date(), now;
    // console.log('timeout', timeout)
    var args, thisArgs;
    function throttled() {
      fn.apply(thisArgs, args);
    }
    return function() {
      args = arguments;
      thisArgs = this;
      now = +new Date();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (now - start >= timeout) {
        // console.log(now - start)
        start = now;
        throttled();
        return;
      }
      // console.log('throttled: new timer', [timer]);
      timeoutId = setTimeout(throttled, timeout);
    };
  }
  doTA.throttle = throttle; //export

  //hide and destroy children
  function destroyChildren(elem) {
    var child = elem.firstChild, hiddenTags = [];
    if (child) {
      child.hidden = 1;
      hiddenTags.push(child);
      while (child = child.nextSibling) {
        child.hidden = 1;
        hiddenTags.push(child);
      }
    }
    //destroying children block everything
    // so do it later, since deleting don't have to be synchronous
    setTimeout(function(){
      console.time('removeChild');
      forEachArray(hiddenTags, function(child) {
        if (child && child.parentNode) {
          child.parentNode.removeChild(child);
        }
      });
      console.timeEnd('removeChild');
    })
  }

  function eventHandlerFn(scope, expr) {
    return function(evt){
      if (ie8) {
        //make $event.target always available
        evt.target = evt.srcElement || document;
        evt.returnValue = false;
        evt.cancelBubble = true;
      } else {
        evt.preventDefault();
        evt.stopPropagation();
      }

      // if (scope.$evalAsync) {
        //isedom: disallow, so no $target here
        scope.$evalAsync(expr, {$event: evt});
      // } else {
      //   scope.$event = evt;
      //   // var locals = {$event: evt};
      //   var fn = new Function('with(this){' + expr + '}');
      //   console.log('eventHandlerFn', fn, scope);
      //   fn.apply(scope);
      // }
    };
  }

  function addEventUnknown(partial, scope, attrs) {
    if (partial.de) { return; } //only attach events once
    partial.de = 1;
    var attributes = partial.attributes, attrName, attrVal;
    // console.log('attributes', attributes);
    for(var i = 0, l = attributes.length; i < l; i++) {
      if (!attributes[i] || !attributes[i].name || !attributes[i].value) { continue; }
      attrName = attributes[i].name;
      attrVal = attributes[i].value;
      if (attrName.substr(0, 3) === 'de-') {
        //remove attribute, so never bind again
        partial[listenerName]((ie8 ? 'on' : '') + attrName.substr(3),
          eventHandlerFn(scope, attrVal));
        // console.log('event added', uniqueId, attrName);
      }
    }
  }

  //specified events
  function addEventKnown(partial, scope, attrs) {
    if (partial.ded) { return; } //only attach events once
    partial.ded = 1;
    var attrName, attrVal;

    var events = attrs.events;
    // console.log('attributes', attributes);
    for(var i = 0, l = events.length; i < l; i++) {
      attrName = 'de-' + events[i]
      attrVal = partial.getAttribute(attrName);
      // console.log(i, [attrVal, events[i]])
      if (!attrVal) { continue; }
      partial[listenerName]((ie8 ? 'on' : '') + events[i],
        eventHandlerFn(scope, attrVal));
    }
  }

  function addEvents(elem, scope, attrs) {
    //getElementsByClassName is faster than querySelectorAll
    //http://jsperf.com/queryselectorall-vs-getelementsbytagname/20
    // console.time('find-nodes:');
    var elements = ie8 ? elem.querySelectorAll('.de') : elem.getElementsByClassName('de');
    // console.timeEnd('find-nodes:');
    if (typeof attrs.event === 'number') {
      for (var i = 0, l = elements.length; i < l; i++) {
        addEventUnknown(elements[i], scope, attrs);
      }
    } else {
      attrs.events = attrs.event.split(' ');
      for (var i = 0, l = elements.length; i < l; i++) {
        addEventKnown(elements[i], scope, attrs);
      }
    }
  }

  function addNgModels(elem, scope, uniqueId) {
    forEachArray(elem.querySelectorAll('[dota-model]'), function(partial) {
      var dotaPass = partial.getAttribute('dota-pass');
      // console.log('dotaPass', [dotaPass]);
      if (dotaPass != undefined) { return; } //null or undefined

      var modelName = partial.getAttribute('dota-model');

      //textbox default event is input unless IE8, all others are change event
      var updateOn = partial.getAttribute('update-on') ||
        (partial.type !== 'text' || ie8 ? 'change' : 'input');
      var throttleVal = +partial.getAttribute('throttle') || 100;

      //use checked property for checkbox and radio
      var bindProp = partial.getAttribute('bind-prop') ||
        ((partial.type === 'checkbox' || partial.type === 'radio') && 'checked');
      var curValue = resolveObject(modelName, scope);

      // console.log('partial', [partial.tagName, partial.type, curValue, partial.value]);
      if (bindProp) {
        //set true or false on dom properties
        partial[bindProp] = partial.value == curValue; // loose compare
      } else {
        if (typeof curValue !== 'undefined') {
          partial.value = curValue;
        }
      }

      //bind each events
      var parsed;
      forEachArray(updateOn.split(' '), function(evtName){
        evtName = evtName.trim();
        partial.addEventListener(evtName, throttle(function(evt) {
          if (!parsed) {
            parsed = parseObject(modelName, scope);
          }
          evt.preventDefault();
          evt.stopPropagation();

          // console.log('event', evtName, evt.target, [evt.target[bindProp || 'value']])
          scope.$applyAsync((function(){
            if (bindProp) {
              parsed.assign(bindProp && evt.target[bindProp] ? evt.target.value : undefined);
            } else {
              parsed.assign(evt.target.value);
            }
          }))
        }, throttleVal));
      });
    });
  }

  angular.module('doTA', [])
    .config(['$provide',function(P) {
      P.factory('doTA', function(){
        doTA.addEvents = addEvents;
        doTA.addNgModels = addNgModels;
        return doTA;
      });
    }])

    .directive('dotaRender', ['doTA', '$http', '$filter', '$templateCache', '$compile', '$controller',
      function(doTA, $http, $filter, $templateCache, $compile, $controller) {
      var scopes = {}; //scope management

      return {
        restrict: 'A',
        priority: 10000,
        terminal: true,
        controller: angular.noop,
        link: angular.noop,
        compile: function() {
          var Watchers = [], BindValues = {};

          return function($scope, elem, attrs) {
            //used attributes, good for minification with closure compiler;
            var attrCacheDOM = attrs.cacheDom;
            var attrDoTARender = attrs.dotaRender;
            var attrScope = attrs.scope;
            var attrNgController = attrs.ngController;
            var attrLoose = attrs.loose;
            var attrEvent = attrs.event;
            var attrDebug = attrs.debug;
            var attrWatch = attrs.watch;
            var attrCompile = attrs.compile;
            var attrModel = attrs.model;
            var attrBind = attrs.bind;
            var attrCompileAll = attrs.compileAll;
            var attrDoTAOnload = attrs.dotaOnload;
            var attrDoTAOnloadScope = attrs.dotaOnloadScope;
            var attrLoaded = attrs.loaded;
            var attrInline = attrs.inline;
            var attrWatchDiff = attrs.watchDiff;
            var origAttrMap = attrs.$attr;
            var params = {};
            var NewScope;

            attrs.loose = makeBool(attrLoose, 1); //if set, falsy => ''
            attrs.optimize = makeBool(attrs.optimize, 0);
            attrs.comment = makeBool(attrs.comment, 1); //if 0, remove comments
            attrDebug = attrs.debug = makeBool(attrDebug, 0);
            attrEvent = attrs.event = makeBool(attrEvent, 1); //ng-click to native click
            if (attrs.diffLevel) {
              attrs.diffLevel = +attrs.diffLevel;
            }
            attrWatch = attrs.watch = typeof attrWatch === 'string' ? attrWatch : 0; //Firefox throw error if does not exists

            //to prevent angular binding this
            if (attrNgController) {
              elem[0].removeAttribute('ng-controller');
            }

            if (attrCacheDOM && doTA.D[attrDoTARender]) {
              // alert( doTA.D[attrDoTARender].innerHTML);
              console.log('cacheDOM: just moved cached DOM', doTA.D[attrDoTARender]);
              var cachedElem = msie ? doTA.D[attrDoTARender].cloneNode(true) : doTA.D[attrDoTARender];
              elem[0].parentNode.replaceChild(cachedElem, elem[0]);
              return;
            }

            //attributes on dota-render tags to be accessiable as $attr in templates
            for (var x in origAttrMap) {
              var z = origAttrMap[x];
              //map data-* attributes into origAttrMap (inline text)
              if (!z.indexOf('data-')) {
                params[x] = attrs[x];
              //map scope-* attributes into origAttrMap (first level var from scope)
              } else if (!z.indexOf('scope-')) {
                if (attrs[x].indexOf('.') >= 0 || attrs[x].indexOf('[') >= 0) {
                  params[z.slice(6)] = $scope.$eval(attrs[x]);
                } else {
                  params[z.slice(6)] = $scope[attrs[x]];
                }
              }
            }

            //create new scope if scope=1 or ng-controller is specified
            if (attrScope || attrNgController) {
              console.log('scope', attrScope, elem, elem.scope());

              //$destroy previously created scope or will leak.
              if (scopes[attrDoTARender]) {
                scopes[attrDoTARender].$destroy();
                // /**/console.log('newScope $destroy', attrDoTARender, NewScope);
              }
              NewScope = scopes[attrDoTARender] = $scope.$new();
              // /**/console.log('newScope created', attrDoTARender, NewScope);
            } else {
              NewScope = $scope;
            }

            //attach ng-controller, and remove attr to prevent angular running again
            if (attrNgController) {
              var asPos = attrNgController.indexOf(' as ');
              if (asPos > 0) {
                attrNgController = attrNgController.substr(0, asPos).trim();
              }
              console.log('new controller', attrNgController);
              var l = {$scope: NewScope}, controller = $controller(attrNgController, l);
              //untested controller-as attr or as syntax
              if (attrs.controllerAs || asPos > 0) {
                NewScope[attrs.controllerAs || attrNgController.substr(asPos + 4).trim()] = controller;
              }
              elem.data('$ngControllerController', controller);
              elem.children().data('$ngControllerController', controller);
              console.log('new controller created', attrDoTARender);
            }

            // watch and re-render the whole template when change
            if(attrWatch) {
              console.log(attrDoTARender, 'registering watch for', attrWatch);
              var oneTimePos = attrWatch.indexOf('::');
              if (oneTimePos >= 0) {
                attrWatch = attrWatch.slice(oneTimePos + 2);
              }
              var oneTimeExp = NewScope.$watchCollection(attrWatch, function(newVal, oldVal){
                if(newVal !== undefined && newVal !== oldVal && doTA.C[attrDoTARender]) {
                  if (oneTimePos >= 0) oneTimeExp();
                  console.log(attrDoTARender, 'watch before render');
                  render(doTA.C[attrDoTARender]);
                  console.log(attrDoTARender, 'watch after render');
                }
              });
            }

            // watch and partially render by diffing. diff-level = 2 may be used to patch children
            if(attrWatchDiff) {
              console.log(attrDoTARender, 'registering diff watch for', attrWatchDiff);
              NewScope.$watchCollection(attrWatchDiff, function(newVal, oldVal){
                if(newVal !== oldVal && doTA.C[attrDoTARender]) {
                  console.log(attrDoTARender, 'diff watch before render');
                  render(doTA.C[attrDoTARender], true);
                  console.log(attrDoTARender, 'diff watch after render');
                }
              });
            }

            // run the loader
            loader();

            ////////////////////////////////////////////////////////////////////////////
            // cache-dom for static html, $scope will not be triggered
            ////////////////////////////////////////////////////////////////////////////
            function cacheDOM(){
              // console.log('cacheDOM()', attrs)
              $scope.$on("$destroy", function(){
                console.log('$destroy', elem);
                // alert(['$destroy', elem[0], hiddenDIV]);
                if (hiddenDIV) {
                  doTA.D[attrDoTARender] = elem[0];
                  hiddenDIV.appendChild(elem[0]);
                }
              });
            }

            ////////////////////////////////////////////////////////////////////////////
            // doTA.compile and return compiledFn
            ////////////////////////////////////////////////////////////////////////////
            function compile(template) {
              if(attrDebug) {
                console.log(attrDoTARender + ':' + template);
              }

              console.log(attrDoTARender,'before compile');
              //compile the template html text to function like doT does
              try {
                console.time('compile:' + attrDoTARender);
                var compiledFn = doTA.compile(template, attrs);
                console.timeEnd('compile:'  + attrDoTARender);
                console.log(attrDoTARender,'after compile(no-cache)');
              } catch (x) {
                /**/console.log('compile error', attrs, template);
                throw x;
              }

              //compiled func into cache for later use
              if (attrDoTARender) {
                doTA.C[attrDoTARender] = compiledFn;
              }

              return compiledFn;
            }

            ////////////////////////////////////////////////////////////////////////////
            // attach ng-bind
            ////////////////////////////////////////////////////////////////////////////
            function addNgBind(rawElem, scope, attrDoTARender) {
              //ToDo: check Watchers scope
              while (Watchers.length) {
                Watchers.pop()();
              }
              forEachArray(rawElem.querySelectorAll('[dota-bind]'), function(partial) {
                //override ng-bind
                var bindExpr = partial.getAttribute('dota-bind');
                var oneTimePos = bindExpr.indexOf('::');
                if (oneTimePos >= 0) {
                  bindExpr = bindExpr.slice(oneTimePos + 2);
                }

                if (BindValues[bindExpr]) {
                  partial.innerHTML = BindValues[bindExpr];
                }
                var oneTimeExp = scope.$watchCollection(bindExpr, function(newVal, oldVal){
                  if (newVal && oneTimePos >= 0) { oneTimeExp(); }
                  console.log(attrDoTARender, 'watch before bindExpr', [newVal, oldVal]);
                  partial[textContent] = BindValues[bindExpr] = newVal || '';
                  console.log(attrDoTARender, 'watch after render');
                });
                Watchers.push(oneTimeExp);
              });
            }

            ////////////////////////////////////////////////////////////////////////////
            // attach ng-model, events, ng-bind, and $compile
            ////////////////////////////////////////////////////////////////////////////
            function attachEventsAndCompile(rawElem, scope) {

              if (attrModel) {
                console.time('ngModel:' + attrDoTARender);
                addNgModels(rawElem, scope, attrDoTARender);
                console.timeEnd('ngModel:' + attrDoTARender);
              }

              //attach events before replacing
              if (attrEvent) {
                console.time('ng-events:' + attrDoTARender);
                addEvents(rawElem, scope, attrs);
                console.timeEnd('ng-events:' + attrDoTARender);
              }

              //ng-bind
              if (attrBind) {
                console.time('ngBind:' + attrDoTARender);
                addNgBind(rawElem, scope, attrDoTARender);
                console.timeEnd('ngBind:' + attrDoTARender);
              }

              //$compile html if you need ng-model or ng-something
              if (attrCompile){
                //partially compile each dota-pass and its childs,
                // not sure this is suitable if you have so many dota-passes
                console.time('$compile:' + attrDoTARender);
                forEachArray(rawElem.querySelectorAll('[dota-pass]'), function(partial){
                  // console.log('$compile:partial:' + attrDoTARender, partial);
                  $compile(partial)(scope);
                });
                console.timeEnd('$compile:' + attrDoTARender);
                console.log(attrDoTARender,'after $compile partial');

              } else if (attrCompileAll){
                //compile child nodes
                console.time('compile-all:' + attrDoTARender);
                $compile(rawElem.contentDocument || rawElem.childNodes)(scope);
                console.timeEnd('compile-all:' + attrDoTARender);
                console.log(attrDoTARender,'after $compile all');
              }
            }

            ////////////////////////////////////////////////////////////////////////////
            // render the template, cache-dom, run onload scripts, add dynamic watches
            ////////////////////////////////////////////////////////////////////////////
            function render(func, patch) {

              //unless prerender
              if (func) {
                //trigger destroying children
                if (!patch && elem[0].firstChild) {
                  destroyChildren(elem[0]);
                }

                console.log(attrDoTARender, 'before render', patch);
                //execute render function against scope, $filter, etc.
                try {
                  console.time('render:' + attrDoTARender);
                  var v = func.F ? func.F(NewScope, $filter, params, patch) : func(NewScope, $filter, params, patch);
                  console.timeEnd('render:' + attrDoTARender);
                  console.log(attrDoTARender,'after render', patch);
                } catch (x) {
                  /**/console.log('render error', func);
                  throw x;
                }

                if(attrDebug) {
                  /* */console.log(attrDoTARender, v);
                  // console.log(attrDoTARender, (func.F || func).toString());
                }

                // console.log('patch?', [patch]);
                if (patch) {
                  attachEventsAndCompile(elem[0], NewScope);
                  return;
                }

                //if node has some child, use appendChild
                if (elem[0].firstChild) {
                  console.time('appendChild:' + attrDoTARender);
                  var newNode = document.createElement('div'), firstChild;
                  newNode.innerHTML = v;

                  //if needed, attach events and $compile
                  attachEventsAndCompile(newNode, NewScope);

                  //move child from temp nodes
                  while (firstChild = newNode.firstChild) {
                    elem[0].appendChild(firstChild);
                  }
                  console.timeEnd('appendChild:' + attrDoTARender);
                  console.log(attrDoTARender, 'after appendChild');

                //if node is blank, use innerHTML
                } else {
                  console.time('innerHTML:' + attrDoTARender);
                  elem[0].innerHTML = v;
                  console.timeEnd('innerHTML:' + attrDoTARender);
                  console.log(attrDoTARender, 'after innerHTML');

                  //if needed, attach events and $compile
                  attachEventsAndCompile(elem[0], NewScope);
                }

              //attach client side to prerender context
              } else {
                attachEventsAndCompile(elem[0], NewScope);
              }

              //execute raw functions, like jQuery
              if(attrDoTAOnload){
                setTimeout(function(){
                  var onLoadFn = new Function(attrDoTAOnload);
                  onLoadFn.apply(elem[0]);
                  console.log(attrDoTARender,'after eval');
                });
              }

              //execute scope functions
              if(attrDoTAOnloadScope) {
                setTimeout(function() {
                  NewScope.$evalAsync(attrDoTAOnloadScope);
                  console.log(attrDoTARender, 'after scope $evalAsync scheduled');
                });
              }

              if (attrCacheDOM) {
                cacheDOM();
              }

              //you can now hide raw html before rendering done
              // with loaded=false attribute and following css
              /*
              [dota-render][loaded]:not([loaded=true]) {
                display: none;
              }
              */
              if (attrLoaded) {
                elem.attr("loaded",true);
              }

              //this watch may be dynamically add or remove
              if (func && func.W) {
                console.log('func.W watch', attrDoTARender, func.W);
                var scopes = {}, watches = {};
                for(var i = 0; i < func.W.length; i++) {
                  var w = func.W[i];
                  // console.log('watch', w);

                  watches[w.I] = NewScope.$watchCollection(w.W, (function(w) {
                    return function(newVal, oldVal){
                      console.log('$watch trigger', [newVal, oldVal]);
                      if (newVal === oldVal && !newVal) { return; }
                      console.log(attrDoTARender, w.W, 'partial watch before render');
                      var oldTag = document.getElementById(w.I);
                      if (!oldTag) { return console.log('tag not found'); }

                      //we don't need new scope here
                      var content = w.F(NewScope, $filter, params, 0, w.N);
                      if (!content) { return console.log('no contents'); }
                      console.log('watch new content', content);
                      var newTag = angular.element(content);

                      //compile only if specified
                      if (w.C) {
                        //scope management
                        if (scopes[w.I]) {
                          scopes[w.I].$destroy();
                        }
                        scopes[w.I] = NewScope.$new();
                      }

                      attachEventsAndCompile(newTag[0], scopes[w.I] || NewScope);

                      angular.element(oldTag).replaceWith(newTag);

                      console.log(attrDoTARender, w.W, 'partial watch content written');
                      //unregister watch if wait once
                      if (w.O) {
                        console.log(attrDoTARender, w.W, 'partial watch unregistered');
                        watches[w.I]();
                      }
                      console.log(attrDoTARender, w.W, 'partial watch after render');
                    };
                  })(w));
                }
              }
            }

            function loader(){
              if(doTA.C[attrDoTARender]){
                console.log(attrDoTARender,'get compile function from cache');
                //watch need to redraw, also inline, because inline always hasChildNodes
                if (elem[0].hasChildNodes() && !attrInline) {
                  console.log('hasChildNodes', attrDoTARender);
                  render();
                } else {
                  render(doTA.C[attrDoTARender]);
                }
              } else if (attrInline) {
                // render inline by loading inner html tags,
                // html entities encoding sometimes need for htmlparser here or you may use htmlparser2 (untested)
                console.log(attrDoTARender,'before get innerHTML');
                var v = elem[0].innerHTML;
                console.log(attrDoTARender,'after get innerHTML');
                render(compile(v, attrs));
              } else if (attrDoTARender) { //load real template
                console.log('before $http', attrDoTARender);
                //server side rendering or miss to use inline attrs?
                if (elem[0].hasChildNodes()) {
                  console.log('hasChildNodes', attrDoTARender);
                  render();
                } else {
                  $http.get(attrDoTARender, {cache: $templateCache}).success(function (v) {
                    console.log('after $http response', attrDoTARender);
                    render(compile(v, attrs));
                  });
                }
              }
            }

            //////////////////////////////////////////////////

          };
        }
      };
    }])
    .directive('dotaInclude', ['$http', '$templateCache', '$compile', function($http, $templateCache, $compile) {
      return {
        restrict: 'A',
        priority: 10000,
        terminal: true,
        compile: function() {
          return function(scope, elem, attrs) {
            var attrCompile = makeBool(attrs.compile, 1);

            console.log('dotaInclude', attrs.dotaInclude);
            $http.get(attrs.dotaInclude, {cache: $templateCache}).success(function (data) {
              elem.html(data);
              if (attrCompile !== 0) {
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
        priority: 10000,
        terminal: true,
        compile: function() {
          return function(scope, elem, attrs) {
            console.log('dotaTemplate - compile', [attrs.dotaTemplate])
            var attrCompile = makeBool(attrs.compile, 1);

            scope.$watch(attrs.dotaTemplate, function(newVal, oldVal) {
              if (newVal) {
                console.log('dotaTemplate', newVal);
                $http.get(newVal, {cache: $templateCache}).success(function (data) {
                  elem.html(data);
                  if (attrCompile !== 0) {
                    console.log('dotaTemplate $compile', newVal, data);
                    $compile(elem.contents())(scope);
                  }
                });
              }
            });
          };
        }
      };
    }])
    .factory('dotaHttp', ['$compile', '$http', '$templateCache', '$filter', 'doTA',
      function($compile, $http, $templateCache, $filter, doTA) {
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

})(window.angular, window.document);
