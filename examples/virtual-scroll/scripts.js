angular.module('app', ['doTA'])
.controller('ctrl', function($scope, $filter, doTA) {
  //scrollTop limit: firefox: 4M, IE: 1M, others 10M
  var maxScrollTop = window.mozRequestAnimationFrame ? 6e6 :
    document.documentMode || /Edge/.test(navigator.userAgent) ? 1e6 : 32e6;

  $scope.hasRIC = typeof requestIdleCallback !== 'undefined';
  $scope.hasRAF = typeof requestAnimationFrame !== 'undefined';
  $scope.useWhat = 0;
  $scope.dataType = 0;
  var scrollElem; //keep it for scroll to top later
  var data = [], fixedData = [];

  window.virtualScroll = function(elem) {
    scrollElem = elem;
    var scrollTop = elem.scrollTop;
    var scrollLeft = elem.scrollLeft;

    // Find Row Index
    var offsetTop = (((scrollTop * $scope.scale) / $scope.cellHeight) | 0) || 0;
    if (offsetTop + $scope.rows > $scope.dataLength) {
      // console.log('offsetTop over', $scope.offsetTop, scrollTop);
      offsetTop = $scope.dataLength - $scope.rows;
    }

    // if ($scope.offsetTop !== offsetTop) {
      if (+$scope.dataType === 1) {
        // console.log('create virtual data', offsetTop, scrollTop);
        makeData($scope.rows, offsetTop, data);
        offsetTop = 0;
      } else {
        offsetTop = offsetTop;
      }
    // }

    // Find Column Index
    // console.time('column');
    var offsetLeft = 0, offsetRight = widthMap.length - 1, scrollOffsetLeft = 0;
    for (var i = 0; i < widthMap.length; i++) {
      if (scrollLeft < widthMap[i]) {
        offsetLeft = i;
        scrollOffsetLeft = widthMap[i - 1] || 0;
        for (var j = i; j < widthMap.length; j++) {
          if (scrollLeft + $scope.width < widthMap[j]) {
            offsetRight = j;
            break;
          }
        }
        break;
      }
    }
    // console.timeEnd('column');
    // console.log('offsetTop|offsetLeft/offsetRight', [offsetTop, offsetLeft, offsetRight]);

    // if offsetTop don't change, just return
    // if ( $scope.offsetTop === offsetTop && $scope.scrollLeft === scrollLeft) { return; }

    $scope.offsetTop = offsetTop
    $scope.offsetLeft = offsetLeft;
    $scope.offsetRight = offsetRight;
    $scope.scrollTop = scrollTop;
    $scope.scrollLeft = scrollLeft;
    $scope.scrollOffsetLeft = scrollOffsetLeft;

    // console.log('useWhat/dataType', [+$scope.useWhat, +$scope.dataType],
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

  function patch(){
    // console.time('patch');
    compileFn($scope, 0, 0, 1);
    // console.timeEnd('patch');
  }

  $scope.height = 500; //grid (viewport) height
  $scope.width = 750;
  $scope.cellHeight = 25; //height of each cells
  $scope.offsetTop = 0; //data array offsetTop
  $scope.offsetLeft = 0;
  $scope.offsetRight = 6;
  $scope.scrollTop = $scope.scrollLeft = $scope.scrollOffsetLeft = 0; //in pixel
  $scope.rows = ($scope.height / $scope.cellHeight) | 0; //dynamic row count
  $scope.bodyHeight = $scope.height + 16; //+ scroll bar height
  $scope.headerHeight = $scope.cellHeight;

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
  makeData(1e6, 0, fixedData);
  $scope.data = fixedData;
  $scope.dataLength = $scope.data.length;
  $scope.updated = 0;
  calcScale();

  var template = document.getElementById('grid-template').innerHTML;

  $scope.gridOptions = [
    {id: 'id', name: 'ID', width: 90,
      template: '<input type="text" ng-value="x.id" disabled />'},
    {id: 'label', name: 'Text', width: 130,
      template: 'Text {{x.id}}'},
    {id: 'percent', name: 'Progress', width: 110,
      template: '<span class="percent" ng-style="width:{{x.percent}}px" ' +
        'ng-class="{green:x.percent>50,red:x.percent<30}"></span>'},
    {id: 'field1', name: 'More ...', width: 125,
      template: 'More ... {{x.field1}}'},
    {id: 'field2', name: 'Num ...', width: 125,
      template: 'Num ... {{x.field2}}'},
    {id: 'field3', name: 'Date', width: 110,
      template: '<input type="date" ng-value="x.field3" />'},
    {id: 'field4', name: 'Col 7', width: 125}
  ];
  var i = $scope.gridOptions.length + 1;
  do {
    $scope.gridOptions.push({id: 'field' + (i % 5 + 1), name: 'Col ' + i, width: 125});
  } while (++i <= 1000);

  // apply cell template to grid template
  $scope.totalWidth = 0;
  var cellOutlet = '', headerOutlet = '', widthMap = [];
  $scope.gridOptions.forEach(function(col, i) {
    headerOutlet += '<div class="cell" style="width:' + col.width + 'px" ' +
      'offset="' + i + '" ng-if="offsetLeft<='+ i + '&&offsetRight>='+ i + '">' +
      (col.headerTemplate || col.name) +
      '</div>';
    cellOutlet += '<div class="cell" style="width:' + col.width + 'px" ' +
      'offset="' + i + '" ng-if="offsetLeft<='+ i + '&&offsetRight>='+ i + '">' +
      (col.template || '{{x.' + col.id + '}}') +
      '</div>';
    $scope.totalWidth += col.width || 100;
    widthMap[i] = $scope.totalWidth;
  });
  // console.log(widthMap);
  template = template.replace('{cell-outlet}', cellOutlet).replace('{header-outlet}', headerOutlet);

  var compileFn = doTA.compile(template, {strip: 1, encode: 1, loose: 0,
    watchDiff: "updated", diffLevel: 3, debug: 0});

  //write to dom
  var gridRoot = document.getElementById('grid');
  gridRoot.innerHTML = compileFn($scope, $filter);

  $scope.$watch('dataType', function(newVal, oldVal) {
    if (newVal !== oldVal) {
      console.log('new dataType', [+newVal, +oldVal]);

      if (+newVal === 1) {
        makeData($scope.rows, 0, data);
        $scope.data = data;
      } else {
        $scope.data = fixedData;
      }
      $scope.dataLength = +newVal === 1 ? 1e9 : $scope.data.length;
      $scope.totalHeight = $scope.cellHeight * $scope.dataLength;
      $scope.offsetTop = $scope.scrollTop = 0;
      if (scrollElem) { scrollElem.scrollTop = 0; } //bring scrollbar to top manually
      calcScale();
      $scope.updated++;

      console.log(
        'scale/rows/totalHeight', [$scope.scale, $scope.rows, $scope.totalHeight],
        'scrollLeft/scrollTop/offsetTop', [$scope.scrollLeft, $scope.scrollTop, $scope.offsetTop],
        'data/dataLength', [$scope.data.length, $scope.dataLength]
      );
    }
  });

  var random1, random2, random3, random4;
  var offset, idx;
  function makeData(count, start, data) {
    start = start || 0;
    data.length = 0;
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
    // console.timeEnd('makeData');
    // return data;
  }

  function initData() {
    random1 = makeRandom(100, function(){ return Math.random().toFixed(2) * 100 | 0;});
    random2 = makeRandom(100, function(){ return Math.random().toFixed(5); });
    random3 = makeRandom(100, function(){ return Math.random().toFixed(5); });
    random4 = makeRandom(100, function(){
      return new Date((Math.random() + 0.3) * +new Date()).toISOString().slice(0,10);
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
