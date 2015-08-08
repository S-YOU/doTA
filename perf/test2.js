/* global process */
var ARGV = process.argv;
var DEBUG = +ARGV[2] >= 2;
var CONSOLE = +ARGV[3] >= 1;

var doTA = require('../dist/doTA' + (DEBUG ? '' : '.min'));
var tmpl = require('../fixtures/templates');
var timer = require('./timer');

function repeat(str, len) {
  var ret = str;
  while (--len > 0) {
    ret += str;
  }
  return ret;
}

timer(1);
for (var k in tmpl.templates) {
  var v = tmpl.templates[k];
  var fn = doTA.compile(v, {debug: 0, encode: 0, event: 1, optimize: 1});
  if (CONSOLE) {
    console.log(repeat(">", 50));
    console.log(v);
    console.log(repeat("-", 50), v.length);
    var fnStr = fn.toString();
    console.log(fnStr);
    console.log(repeat("<", 50), fnStr.length);
  }
};
timer(1, 'compile');