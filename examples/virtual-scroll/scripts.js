angular.module('app', ['doTA'])
.controller('ctrl', function($scope, $filter, doTA) {
  //scrollTop limit: firefox: 4M, IE: 1M, others 10M
  var maxScrollTop = window.mozRequestAnimationFrame ? 4e6 :
    document.documentMode || /Edge/.test(navigator.userAgent) ? 1e6 : 33e6;

  $scope.hasRIC = typeof requestIdleCallback !== 'undefined';
  $scope.hasRAF = typeof requestAnimationFrame !== 'undefined';
  $scope.useWhat = 0;
  $scope.dataType = 0;
  var lastOffset = 0;
  var lastScrollLeft = 0;
  var scrollElem;

  window.virtualScroll = function(elem) {
    scrollElem = elem;
    $scope.scrollTop = elem.scrollTop;
    $scope.scrollLeft = elem.scrollLeft;
    // console.log('scrollLeft', elem.scrollLeft)
    var offset = (((elem.scrollTop * $scope.scale) / $scope.cellHeight) | 0) || 0;
    if (offset + $scope.rows > $scope.dataLength) {
      // console.log('offset over', $scope.offset, $scope.scrollTop);
      offset = $scope.dataLength - $scope.rows;
    }

    if (lastOffset !== offset) {
      if (+$scope.dataType === 1) {
        initData();
        $scope.data = makeData($scope.rows, offset);
        $scope.offset = 0;
      } else {
        $scope.offset = offset;
      }
    }

    // if offset don't change, just return
    if (lastOffset === offset && lastScrollLeft === $scope.scrollLeft) { return; }
    lastOffset = offset;
    lastScrollLeft = $scope.scrollLeft;

    // console.log('useWhat/dataType', [+$scope.useWhat, +$scope.dataType],
    //   'offset/scrollLeft/scrollTop/totalHeight', [$scope.offset, $scope.scrollLeft, $scope.scrollTop, $scope.totalHeight]);

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
    compileFn($scope, 0, 0, 1);
  }

  $scope.height = 500; //grid (viewport) height
  $scope.cellHeight = 25; //height of each cells
  $scope.offset = 0; //data array offset
  $scope.scrollTop = $scope.scrollLeft = 0; //in pixel
  $scope.rows = ($scope.height / $scope.cellHeight) | 0; //dynamic row count
  $scope.bodyHeight = $scope.height + 16; //+ scroll bar height

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
  calcScale();

  var template = document.getElementById('grid-template').innerHTML;

  $scope.gridOptions = [
    {id: 'id', name: 'ID', width: 90,
      template: '<input type="text" ng-value="x.id" disabled />'},
    {id: 'label', name: 'Text', width: 130},
    {id: 'percent', name: 'Progress', width: 110,
      template: '<span class="percent" ng-style="width:{{x.percent}}px" ' +
        'ng-class="{green:x.percent>50,red:x.percent<30}"></span>'},
    {id: 'field1', name: 'More ...', width: 125},
    {id: 'field2', name: 'Num ...', width: 125},
    {id: 'field3', name: 'Date', width: 110,
      template: '<input type="date" ng-value="x.field3" />'},
    {id: 'field4', name: 'Col 7', width: 125},
    {id: 'field5', name: 'Col 8', width: 125},
    {id: 'field6', name: 'Col 9', width: 125},
    {id: 'field7', name: 'Col 10', width: 125},
    {id: 'field8', name: 'Col 11', width: 125},
    {id: 'field9', name: 'Col 12', width: 125},
  ];

  // apply cell template to grid template
  $scope.totalWidth = 0;
  var cellOutlet = '';
  $scope.gridOptions.forEach(function(col, i) {
    cellOutlet += '<div class="cell col-' + i + '" style="width:' + col.width + 'px">' +
      (col.template || '{{x.' + col.id + '}}') +
      '</div>';
    $scope.totalWidth += col.width || 100;
  });
  $scope.totalWidthHeader = $scope.totalWidth + ($scope.gridOptions[$scope.gridOptions.length - 1].width || 100);
  template = template.replace('{cell-outlet}', cellOutlet);

  var compileFn = doTA.compile(template, {strip: 1, encode: 1, loose: 0,
    watchDiff: "updated", diffLevel: 2, debug: 0});

  //write to dom
  var gridRoot = document.getElementById('grid');
  gridRoot.innerHTML = compileFn($scope, $filter);

  $scope.$watch('dataType', function(newVal, oldVal) {
    if (newVal !== oldVal) {
      console.log('new dataType', [+newVal, +oldVal]);

      $scope.data = +newVal === 1 ? makeData($scope.rows) : $scope.fixedData;
      $scope.dataLength = +newVal === 1 ? 1e9 : $scope.data.length;
      $scope.totalHeight = $scope.cellHeight * $scope.dataLength;
      $scope.offset = $scope.scrollTop = 0;
      if (scrollElem) { scrollElem.scrollTop = 0; } //bring scrollbar to top manually
      calcScale();
      $scope.updated++;

      console.log(
        'scale/rows/totalHeight', [$scope.scale, $scope.rows, $scope.totalHeight],
        'scrollLeft/scrollTop/offset', [$scope.scrollLeft, $scope.scrollTop, $scope.offset],
        'data/dataLength', [$scope.data.length, $scope.dataLength]
      );
    }
  });

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
        field3: random4[i % 100],
        field4: random2[i % 100],
        field5: random3[i % 100],
        field6: random2[i % 100],
        field7: random4[i % 100],
        field8: random2[i % 100],
        field9: random3[i % 100]
      });
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
