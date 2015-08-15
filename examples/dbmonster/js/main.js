/* global doTA */
'use strict';

var I = 0;
var N = 100;

// function update(dbs) {
//   for (var i = 0; i < dbs.length; i++) {
//     dbs[i].update();
//   }
// }

function formatElapsed(v) {
  if (!v) return '';

  var str = parseFloat(v).toFixed(2);

  if (v > 60) {
    var minutes = Math.floor(v / 60);
    var comps = (v % 60).toFixed(2).split('.');
    var seconds = comps[0];
    var ms = comps[1];
    str = minutes + ":" + seconds + "." + ms;
  }

  return str;
}

function labelClass(count) {
  if (count >= 20) {
    return 'label label-important';
  } else if (count >= 10) {
    return 'label label-warning';
  }
  return 'label label-success';
}

function elapsedClass(t) {
  if (t >= 10.0) {
    return 'Query elapsed warn_long';
  } else if (t >= 1.0) {
    return 'Query elapsed warn';
  }
  return 'Query elapsed short';
}

document.addEventListener('DOMContentLoaded', function() {
  main();
});

function text(x){return x ? x.replace(/</g,'&lt;').replace(/>/g,'&gt;'): ' ';}

function build(scope) {
  for (var i = 0; i < scope.dbs.length; i++) {
    scope.dbs[i].update();
  }
  for (var i = 0; i < scope.dbs.length; i++) {
    var db = scope.dbs[i];
    db.top5 = db.getTopFiveQueries();
    db.count = db.queries.length;
    for (var j = 0; j < 5; j++) {
      var q = db.top5[j];
      q.elapsedClass = elapsedClass(q.elapsed);
      q.formatElapsed = formatElapsed(q.elapsed);
      q.text = text(q.query);
    }
    db.title = text(db.name);
    db.labelClass = labelClass(db.count);
  }
}

function main() {
  var scope = {dbs: []};
  for (var i = 0; i < N; i++) {
    scope.dbs.push(new data.Database('cluster' + i));
    scope.dbs.push(new data.Database('cluster' + i + 'slave'));
  }

  // setInterval(function() {
  //   update(scope.dbs);
  //   build(scope);
  // }, 8);

  var template = document.getElementById('main').innerHTML.replace(/>\s+</g, '><');
  var render = doTA.compile(template, {debug:0, encode:1, watchDiff:1});
  var rootElem = document.getElementById('main');
  // console.log(render.toString());

  build(scope);
  rootElem.innerHTML = render(scope);
  // console.log(render);

  // function dataUpdate() {
  //   // console.time('update')
  //   build(scope);
  //   // console.timeEnd('update')
  //   // setTimeout(dataUpdate);
  //   requestAnimationFrame(dataUpdate);
  // }
  // dataUpdate();

  // var start = +new Date();

  function domUpdate() {
    build(scope);
    // console.time('update')
    render(scope, null, null, true);
    // rootElem.innerHTML = render(scope);
    // console.timeEnd('update')
    // console.log(+new Date() - start);
    // start = +new Date();

    // setTimeout(domUpdate);
    requestAnimationFrame(domUpdate);
  }
  domUpdate();
  // setInterval(domUpdate, 0)

}
