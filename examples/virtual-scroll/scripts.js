angular.module('app', ['doTA'])

.filter('toFixed', function() {
  return function(val, digit) {
    return val.toFixed(digit || 5);
  }
})

.controller('ctrl', function($scope, $filter, doTA) {
  //scrollTop limit: firefox: 6M, IE/Edge: 1M, others 32M
  var vMaxScroll = window.mozRequestAnimationFrame ? 6e6 :
    document.documentMode || /Edge/.test(navigator.userAgent) ? 1e6 :
    32e6;
  var hMaxScroll = vMaxScroll;

  //some settings
  $scope.hasRIC = typeof requestIdleCallback !== 'undefined';
  $scope.hasRAF = typeof requestAnimationFrame !== 'undefined';
  $scope.useWhat = 0;
  $scope.rowType = 0;
  $scope.colType = 0;

  //colDefs
  var colDef = [
    {id: 'id', name: 'ID', width: 90, template_id : 'id'},
    {id: 'label', name: 'Text', width: 130, template_id: 'text'},
    {id: 'percent', name: 'Progress', width: 110, template_id: 'percent'},
    {id: 'field1', name: 'More ...', width: 125, template_id: 'more'},
    {id: 'field2', name: 'Num ...', width: 125, template_id: 'num'},
    {id: 'field3', name: 'Date', width: 110, template_id: 'date'},
    {id: 'field4', name: 'Col 7', width: 125}
  ];
  //gridOptions
  var g = $scope.g = {
    colDef: colDef,
    pinLeft: 2
  };

  //initialize scope variables
  $scope.height = 500; //grid (viewport) height
  $scope.width = 750;
  $scope.cellHeight = 25; //height of each cells
  $scope.realOffsetTop = $scope.offsetTop = 0; //data array offsetTop
  $scope.offsetLeft = g.pinLeft || 0;
  $scope.offsetRight = $scope.offsetLeft + 7;
  $scope.scrollTop = $scope.scrollOffsetTop = 0; //pixel
  $scope.scrollLeft = $scope.scrollOffsetLeft = 0; //pixel
  $scope.rows = ($scope.height / $scope.cellHeight) | 0; //dynamic row count
  $scope.bodyHeight = $scope.height + 16; //+ scroll bar height
  $scope.headerHeight = $scope.cellHeight;
  //generate dummy row/col when requested
  $scope.getColDef = getCol;
  $scope.getRow = getRow;

  //when total row count change
  $scope.rowChange = rowChange;
  //when total col count change
  $scope.colChange = colChange;
  //scroll handler
  window.virtualScroll = virtualScroll;
  //click handler
  $scope.clickHandler = clickHandler;
  //mouse over handler
  $scope.hoverHandler = hoverHandler;

  //various shared vars
  var scrollElem; //keep it for scroll to top later
  var vScale = 1, hScale = 1;
  var random1, random2, random3, random4;
  var offset, idx;

  //templates
  var TEMPLATE_ID = 'T_';
  var templates = {
    id: '<input type="text" ng-value="id" disabled />',
    text: 'Text {{id}}',
    percent: '<span class="percent" ng-style="width:{{percent}}px" ng-class="{green:percent>50,red:percent<30}"></span>',
    more: 'More ... {{field1 | toFixed}}',
    num: 'Num ... {{field2 | toFixed}}',
    date: '<input type="date" ng-value="field3|date:\'yyyy-MM-dd\'" disabled />'
  };

  //compile cell templates
  for (var x in templates) {
    doTA.C[TEMPLATE_ID + x] = doTA.compile(templates[x],
      {dotaRender: TEMPLATE_ID, watchDiff: 1, diffLevel: 0, encode: 1, key: 'K'});
  }

  g.colDef.length = 1e5;
  // merge cell templates to grid template
  var widthMap = [], realTotalWidth = 0;

  //initialize data
  initData();
  $scope.data = makeData(100, 0);
  $scope.data.length = 1e6;
  $scope.dataLength = $scope.data.length;
  $scope.updated = 0;
  calcScale();

  //get grid template from script tag
  var template = document.getElementById('grid-template').innerHTML;
  //compile template to fn
  var compileFn = doTA.compile(template, {strip: 1, encode: 1, loose: 0, event: 1,
    watchDiff: "updated", diffLevel: 3, debug: 0, dotaRender: TEMPLATE_ID});

  //write to dom
  var gridRoot = document.getElementById('grid');
  gridRoot.innerHTML = compileFn($scope, $filter);

  //add some events
  doTA.addEvents(gridRoot, $scope, {event: 'click dblclick mousemove'});

  ////////////

  function hoverHandler($event) {
    var cellAt = getCellIndex($event.target);
    if (cellAt) {
      $scope.hoverStatus = 'Mouse over on cell (' + cellAt[0] + ', ' + cellAt[1] + ')';
    }
  }

  function clickHandler($event, dbl) {
    var cellAt = getCellIndex($event.target);
    if (cellAt) {
      $scope.clickStatus = (dbl ? 'Double ' : '') + 'Clicked on cell (' + cellAt[0] + ', ' + cellAt[1] + ')';
    }
  }

  function rowChange() {
    console.log('rowChange', $scope.rowType);
    if (+$scope.rowType === 1) {
      $scope.data.length = 1e9;
    } else {
      $scope.data.length = 1e6;
    }
    $scope.dataLength = +$scope.rowType === 1 ? 1e9 : $scope.data.length;
    $scope.totalHeight = $scope.cellHeight * $scope.dataLength;
    $scope.offsetTop = $scope.scrollTop = 0;
    if (scrollElem) { scrollElem.scrollTop = 0; } //bring scrollbar to top manually
    calcScale();
    $scope.updated++;

    console.log(
      'vScale/hScale/rows/totalHeight', [vScale, hScale, $scope.rows, $scope.totalHeight],
      'scrollLeft/scrollTop/offsetTop', [$scope.scrollLeft, $scope.scrollTop, $scope.offsetTop],
      'data/dataLength', [$scope.data.length, $scope.dataLength]
    );
  }

  function colChange() {
    console.log('colChange', $scope.colType);

    if (+$scope.colType === 1) {
      g.colDef.length = 1e6;
    } else {
      g.colDef.length = 1e5;
    }

    $scope.offsetLeft = g.pinLeft || 0;
    $scope.scrollLeft = 0;
    if (scrollElem) { scrollElem.scrollLeft = 0; } //bring scrollbar to top manually
    calcScale();
    $scope.updated++;

    console.log(
      'vScale/hScale/rows/totalHeight', [vScale, hScale, $scope.rows, $scope.totalHeight],
      'scrollLeft/scrollTop/offsetTop', [$scope.scrollLeft, $scope.scrollTop, $scope.offsetTop],
      'data/dataLength', [$scope.data.length, $scope.dataLength]
    );
  }

  function getRow(i) {
   return {
      id: i,
      percent: random1[i % 100],
      field1: random2[(i + 10) % 100],
      field2: random3[(i + 20) % 100],
      field3: random4[(i + 30) % 100],

      field4: random2[(i + 40) % 100],
      field5: random3[(i + 50) % 100]
    }
  }

  function getCol(i) {
    return {id: 'field' + (i % 2 + 4), name: 'Col ' + (i + 1), width: 125};
  }

  function virtualScroll(elem) {
    scrollElem = elem;
    var scrollTop = elem.scrollTop;
    var scrollLeft = elem.scrollLeft;

    // Find Row Index
    var offsetTop = (((scrollTop * vScale) / $scope.cellHeight) | 0) || 0;
    if (offsetTop + $scope.rows > $scope.dataLength) {
      // console.log('offsetTop over', $scope.offsetTop, scrollTop);
      offsetTop = $scope.dataLength - $scope.rows;
    }
    var realOffsetTop = offsetTop;

    // Find Column Index
    // console.time('column');
    var offsetLeft = 0, offsetRight = widthMap.length, scrollOffsetLeft = 0;
    for (var i = 0; i < widthMap.length; i++) {
      if ( scrollLeft * hScale < widthMap[i] ) {
        offsetLeft = i;
        scrollOffsetLeft = i ? widthMap[i - 1] / hScale : 0;
        for (var j = i; j < widthMap.length; j++) {
          if ( scrollLeft * hScale + $scope.width <= widthMap[j] ) {
            offsetRight = j + 1;
            if (g.pinLeft) {
              offsetRight += g.pinLeft;
              offsetLeft += g.pinLeft;
            }
            // console.log('offsetRight', offsetRight, widthMap.length);
            break;
          }
        }
        break;
      }
    }
    // console.timeEnd('column');
    // if (offsetRight - offsetLeft  > 7) {
    //   console.log('offsetTop|offsetLeft/offsetRight', [offsetTop, offsetLeft, offsetRight]);
    // }

    $scope.realOffsetTop = realOffsetTop;
    $scope.offsetTop = offsetTop
    $scope.offsetLeft = offsetLeft;
    $scope.offsetRight = offsetRight;
    $scope.scrollTop = scrollTop;
    $scope.scrollLeft = scrollLeft;
    $scope.scrollOffsetLeft = scrollOffsetLeft;

    // console.log('useWhat/rowType', [+$scope.useWhat, +$scope.rowType],
    //   'scrollLeft/scrollTop/scrollOffsetLeft', [scrollLeft, offsetTop, scrollOffsetLeft],
    //   'offsetTop/offsetLeft/offsetRight', [offsetTop, offsetLeft, offsetRight]);

    switch (+$scope.useWhat) {
      case 0:
        return patch();
      case 1:
        return requestAnimationFrame(patch);
      case 2:
        return requestIdleCallback(patch);
      case 3:
        return setTimeout(patch);
    }
  };

  ////////////////////////////////////// shared functions //////////////////////

  //get cell x, y from event.target
  function getCellIndex(elem) {
    while (!elem.getAttribute('col')) {
      elem = elem.parentNode;
      if (elem === scrollElem || elem === gridRoot) { return; }
    }
    var col = elem.getAttribute('col'), row = elem.parentNode.getAttribute('row');
    if (row && col) return [row, col];
  }

  //calculate height scale to possible scroll bar height
  function calcScale() {
    $scope.totalHeight = $scope.cellHeight * $scope.dataLength; //calc total height
    vScale = hScale = 1; //initial scale
    if ($scope.totalHeight > vMaxScroll) {
      vScale =  $scope.totalHeight / vMaxScroll;
      $scope.totalHeight = vMaxScroll + $scope.height + ($scope.cellHeight / vScale) - ($scope.height / vScale);
    }

    realTotalWidth = 0;
    widthMap.length = 0;
    for (var i = 0; i < g.colDef.length; i++){
      var col = g.colDef[i];
      realTotalWidth += col && col.width ? col.width  : 125;
      //width map, which sum upto x columns, to prevent extra loop at scroll event
      widthMap[i] = realTotalWidth;
    }
    $scope.totalWidth = realTotalWidth + 1; //firefox? or border-box thing?
    if (g.pinLeft) {
      g.widthLeft = widthMap[g.pinLeft - 1] + 1;
    }

    $scope.totalWidth = realTotalWidth;
    if ($scope.totalWidth > hMaxScroll) {
      hScale =  $scope.totalWidth / hMaxScroll;
      $scope.totalWidth = hMaxScroll + $scope.width - ($scope.width / hScale) + 1;
    }

    // console.log('vScale/hScale', [vScale, hScale],
    //   'totalHeight/totalWidth', [$scope.totalHeight, $scope.totalWidth]);
  }

  //dom patching
  function patch(){
    // console.time('patch');
    compileFn($scope, $filter, 0, 1);
    // console.timeEnd('patch');
  }

  //build some shared data
  function makeData(count, start) {
    start = start || 0;
    var data = [];
    // console.time('makeData');
    for (idx = 0; idx < count; idx++) {
      offset = idx + start;
      data.push({
        id: offset,
        percent: random1[offset % 100],
        field1: random2[(offset + 10) % 100],
        field2: random3[(offset + 20) % 100],
        field3: random4[(offset + 30) % 100],

        field4: random2[(offset + 40) % 100],
        field5: random3[(offset + 50) % 100]
      });
    }
    return data;
    // console.timeEnd('makeData');
    // return data;
  }

  function initData() {
    random1 = makeRandom(100, function(){ return Math.random() * 100 | 0;});
    random2 = makeRandom(100, function(){ return Math.random(); });
    random3 = makeRandom(100, function(){ return Math.random(); });
    random4 = makeRandom(100, function(){
      return (Math.random() + 0.3) * +new Date();
    });
  }

  function makeRandom(count, fn) {
    var ret = [];
    for (var i = 0; i < count; i++) {
      ret.push(fn());
    }
    return ret;
  }

});
