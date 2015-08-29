angular.module('app', ['doTA'])
.controller('ctrl', function($scope) {
  //scrollTop limit: firefox: 4M, IE: 1M, others 10M
  var maxScrollTop = window.mozRequestAnimationFrame ? 4e6 :
    document.documentMode || /Edge/.test(navigator.userAgent) ? 1e6 : 33e6;

  $scope.hasRIC = typeof requestIdleCallback !== 'undefined';
  $scope.hasRAF = typeof requestAnimationFrame !== 'undefined';
  $scope.useWhat = 0;
  $scope.dataType = 0;
  $scope.lastOffset = 0;
  var scrollElem;

  window.virtualScroll = function(elem) {
    scrollElem = elem;
    $scope.scrollTop = elem.scrollTop;
    var offset = (((elem.scrollTop * $scope.scale) / $scope.cellHeight) | 0) || 0;
    if (offset + $scope.rows > $scope.dataLength) {
      // console.log('offset over', $scope.offset, $scope.scrollTop);
      offset = $scope.dataLength - $scope.rows;
    }

    if (+$scope.dataType === 1) {
      initData();
      $scope.data = makeData($scope.rows, offset);
      $scope.offset = 0;
    } else {
      $scope.offset = offset;
    }

    //if offset don't change, just return
    if ($scope.lastOffset === offset) { return; }
    $scope.lastOffset = offset;

    // console.log('useWhat/dataType', [+$scope.useWhat, +$scope.dataType],
    //   'offset/scrollTop', [$scope.offset, $scope.scrollTop, $scope.totalHeight]);
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

  function patch(){
    doTA.C[1]($scope, 0, 0, 1);
  }

  // $scope.data = makeData(1e6);
  // $scope.dataLength = $scope.data.length;
  // console.table($scope.data.slice(0, 10))
  $scope.height = 500; //grid (viewport) height
  $scope.cellHeight = 25; //height of each cells
  $scope.offset = 0; //data array offset
  $scope.scrollTop = 0; //in pixel
  $scope.rows = ($scope.height / $scope.cellHeight) | 0; //dynamic row count

  function calcScale() {
    $scope.totalHeight = $scope.cellHeight * $scope.dataLength; //calc total height
    $scope.scale = 1; //initial scale
    if ($scope.totalHeight > maxScrollTop) {
      $scope.scale =  $scope.totalHeight / maxScrollTop;
      //approx
      $scope.totalHeight = maxScrollTop + $scope.height + ($scope.cellHeight / $scope.scale) - ($scope.height / $scope.scale);
    }
  }

  initData();
  $scope.data = $scope.fixedData = makeData(1e6);
  $scope.dataLength = $scope.data.length;
  $scope.updated = 0;

  $scope.$watch('dataType', function(newVal, oldVal) {
    console.log('new dataType', [+newVal, +oldVal]);

    $scope.data = +newVal === 1 ? makeData($scope.rows) : $scope.fixedData;
    $scope.dataLength = +newVal === 1 ? 1e9 : $scope.data.length;
    $scope.totalHeight = $scope.cellHeight * $scope.dataLength;
    $scope.offset = $scope.scrollTop = 0;
    if (scrollElem) { scrollElem.scrollTop = 0; }
    calcScale();
    $scope.updated++;

    console.log(
      'scale/rows/totalHeight', [$scope.scale, $scope.rows, $scope.totalHeight],
      'scrollTop/offset', [$scope.scrollTop, $scope.offset],
      'data/dataLength', [$scope.data.length, $scope.dataLength]
    );
  })

  var random1, random2, random3, random4;
  function makeData(count, start) {
    start = start || 0;
    // console.time('makeData');
    var data = [];
    for (var i = 0; i < count; i++) {
      data.push({
        id: i + start, label: 'Text ' + (i + start),
        percent: random1[i % 100],
        field1: 'More ' + random2[i % 100],
        field2: 'Num ' + random3[i % 100],
        field3: random4[i % 100]});
    }
    // console.timeEnd('makeData');
    return data;
  }

  function initData() {
    random1 = makeRandom(100, function(){return Math.random().toFixed(2) * 100 | 0;});
    random2 = makeRandom(100, function(){return Math.random().toFixed(5);});
    random3 = makeRandom(100, function(){return Math.random().toFixed(5);});
    random4 = makeRandom(100, function(){
      return new Date((Math.random() + 0.3) * +new Date()).toISOString().slice(0,10);});
  }

  function makeRandom(count, fn) {
    var ret = [];
    for (var i = 0; i < count; i++) {
      ret.push(fn());
    }
    return ret;
  }

});
