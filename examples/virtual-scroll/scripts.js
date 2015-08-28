angular.module('app', ['doTA'])
.controller('ctrl', function($scope) {
  //scrollTop limit: firefox: 4M, IE: 1M, others 10M
  var maxScrollTop = window.mozRequestAnimationFrame ? 4e6 :
    document.documentMode || /Edge/.test(navigator.userAgent) ? 1e6 : 1e7;

  $scope.hasRIC = !!window.requestIdleCallback;
  $scope.hasRAF = !!window.requestAnimationFrame;

  $scope.useWhat = 0;

  window.virtualScroll = function(elem) {
    $scope.scrollTop = elem.scrollTop;
    $scope.offset = (((elem.scrollTop * $scope.scale) / $scope.cellHeight) | 0) || 0;
    if ($scope.offset + $scope.rows > $scope.data.length) {
      // console.log('offset over', $scope.offset, $scope.scrollTop);
      $scope.offset = $scope.data.length - $scope.rows;
    }
    // console.log('offset', [$scope.offset, $scope.scrollTop, $scope.useWhat]);
    switch (+$scope.useWhat) {
      case 0:
        return doTA.C[1]($scope, 0, 0, 1);
      case 1:
        return requestAnimationFrame(function(){
          doTA.C[1]($scope, 0, 0, 1);
        });
      case 2:
        return requestIdleCallback(function(){
          doTA.C[1]($scope, 0, 0, 1);
        });
      case 3:
        return setTimeout(function(){
          doTA.C[1]($scope, 0, 0, 1);
        });
    }
  };

  var random1 = makeRandom(100, function(){return Math.random().toFixed(2) * 100 | 0;});
  var random2 = makeRandom(100, function(){return Math.random().toFixed(5);});
  var random3 = makeRandom(100, function(){return Math.random().toFixed(5);});
  var random4 = makeRandom(100, function(){return new Date((Math.random() + 0.3) * +new Date()).toISOString().slice(0,10);});

  $scope.data = makeData(1e6);
  // console.table($scope.data.slice(0, 10))

  $scope.height = 500; //grid (viewport) height
  $scope.cellHeight = 25; //height of each cells
  $scope.offset = 0; //data array offset
  $scope.scrollTop = 0; //in pixel
  $scope.rows = ($scope.height / $scope.cellHeight) | 0; //dynamic row count
  $scope.totalHeight = $scope.cellHeight * $scope.data.length; //calc total height
  $scope.scale = 1; //initial scale

  if ($scope.totalHeight > maxScrollTop) {
    $scope.scale = $scope.totalHeight / maxScrollTop;
    //approx
    $scope.totalHeight = maxScrollTop + $scope.height + ($scope.cellHeight / $scope.scale) - ($scope.height / $scope.scale);
  }

  console.log('scale', $scope.scale, $scope.rows, maxScrollTop, $scope.totalHeight, $scope.data.length);

  function makeData(count) {
    // console.time('makeData');
    var data = [];
    for (var i = 0; i < count; i++) {
      data.push({id: i, label: 'Text ' + i, percent: random1[i % 100],
        field1: 'More ' + random2[i % 100],
        field2: 'Num ' + random3[i % 100],
        field3: random4[i % 100]});
    }
    // console.timeEnd('makeData');
    return data;
  }

  function makeRandom(count, fn) {
    var ret = [];
    for (var i = 0; i < count; i++) {
      ret.push(fn());
    }
    return ret;
  }
})