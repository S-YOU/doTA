angular.module('app', ['doTA'])

.filter('toFixed', function() {
	return function(val, digit) {
		return val.toFixed(digit || 5);
	};
})

.controller('ctrl', function($scope, $filter, doTA) {
	//some settings
	$scope.hasRIC = typeof requestIdleCallback !== 'undefined';
	$scope.hasRAF = typeof requestAnimationFrame !== 'undefined';
	$scope.useWhat = 0;
	$scope.rowType = 0;
	$scope.colType = 0;

	//colDefs
	var defaultWidth = 125;
	var scrollBarSize = 17;
	var borderSize = 1;
	var colDef = [
		{id: 'id', name: 'ID', width: 90, template_id : 'id', group: 'ID:Text (Pinned)', hClass: 'red'},
		{id: 'label', name: 'Text', width: 130, template_id: 'text', group: 'ID:Text (Pinned)'},
		{id: 'percent', name: 'Progress', width: 110, template_id: 'percent', hClass: 'yellow'},
		{id: 'field1', name: 'More ...', width: defaultWidth, template_id: 'more', group: 'More Numbers'},
		{id: 'field2', name: 'Num ...', width: defaultWidth, template_id: 'num', group: 'More Numbers'},
		{id: 'field3', name: 'Date', width: 110, template_id: 'date', hClass: 'blue'},
		{id: 'field4', name: 'Col 7', width: defaultWidth}
	];
	colDef.length = 1e5;

	//gridOptions
	var g = $scope.g = {
		colDef: colDef,
		pinLeft: 2,
		rowClass: rowClassFn,
		groupHeader: true
	};

	var gridRoot = document.getElementById('grid');
	var gridStyle = gridRoot.currentStyle || document.defaultView.getComputedStyle(gridRoot, '');
	console.log(gridStyle.width, gridStyle.height);

	//initialize scope variables
	$scope.defaultWidth = defaultWidth;
	$scope.cellHeight = 25; //height of each cells
	$scope.offsetLeft = g.pinLeft || 0;
	$scope.realOffsetTop = $scope.offsetTop = 0; //data array offsetTop
	$scope.scrollTop = $scope.scrollOffsetTop = 0; //pixel
	$scope.scrollLeft = $scope.scrollOffsetLeft = 0; //pixel
	$scope.headerHeight = g.groupHeader ? $scope.cellHeight * 2 : $scope.cellHeight;

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
	var elemLeft, elemCenter; //keep it for scroll to top later
	var vScale = 1, hScale = 1;
	var random1, random2, random3, random4;
	var offset, idx;
	var widthMap = [], groupWidthMap = [], realTotalWidth = 0;

	//scrollTop limit: firefox: 6M, IE/Edge: 1M, others 32M
	var vMaxScroll = window.mozRequestAnimationFrame ? 6e6 :
		document.documentMode || /Edge/.test(navigator.userAgent) ? 1e6 :
		32e6;
	var hMaxScroll = vMaxScroll;

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

	//initialize data
	initData();
	$scope.data = makeData(1e2, 0);
	$scope.data.length = 1e6;
	$scope.updated = 0;
	calcScale();

	// console.log('offsetLeft/offsetRight', [$scope.offsetLeft, $scope.offsetRight]);

	//get grid template from script tag
	var template = document.getElementById('grid-template').innerHTML;
	// console.log(template);
	//compile template to fn
	var compileFn = doTA.compile(template, {strip: 1, encode: 1, loose: 0, event: 1,
		watchDiff: 1, diffLevel: 3, debug: 0, dotaRender: TEMPLATE_ID, comment: 0});

	//write to dom
	gridRoot.innerHTML = compileFn($scope, $filter);
	elemLeft = gridRoot.querySelector('.body-left');
	elemCenter = gridRoot.querySelector('.body-center');

	//add some events
	doTA.addEvents(gridRoot, $scope, {event: 'click dblclick mousemove'});

	var $window = angular.element(window);

	//can use throttle or debounce here
	$window.on('resize', function(){
		console.log('resizing the grid ...');
		calcScale();
		// gridRoot.innerHTML = compileFn($scope, $filter);
		applyPatch();
		if (!elemCenter) {
			elemCenter = document.getElementsByClassName('body-center')[0];
		}
		virtualScroll(elemCenter);
	});

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

	function rowClassFn(row, i) {
		return i % 5 === 0 ? 'blue' : i % 7 === 0 ? 'green' : '';
	}

	function rowChange() {
		console.log('rowChange', $scope.rowType);
		if (+$scope.rowType === 1) {
			$scope.data.length = 1e9;
		} else {
			$scope.data.length = 1e6;
		}
		$scope.offsetTop = 0;
		$scope.offsetLeft = g.pinLeft || 0;
		if (elemLeft) { elemLeft.scrollTop = 0; } //bring scrollbar to top manually
		if (elemCenter) { elemCenter.scrollTop = 0; } //bring scrollbar to top manually

		calcScale();
		applyPatch();
		if (!elemCenter) {
			elemCenter = document.getElementsByClassName('body-center')[0];
		}
		virtualScroll(elemCenter);

		console.log(
			'vScale/hScale/rows/totalHeight', [vScale, hScale, $scope.rows, $scope.totalHeight],
			'scrollLeft/scrollTop/offsetTop', [$scope.scrollLeft, $scope.scrollTop, $scope.offsetTop],
			'width/bodyWidth/totalWidth/data.length', [$scope.width, $scope.bodyWidth, $scope.totalWidth, $scope.data.length]
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
		if (elemLeft) { elemLeft.scrollLeft = 0; } //bring scrollbar to top manually
		if (elemCenter) { elemCenter.scrollLeft = 0; } //bring scrollbar to top manually

		calcScale();
		applyPatch();
		if (!elemCenter) {
			elemCenter = document.getElementsByClassName('body-center')[0];
		}
		virtualScroll(elemCenter);

		console.log(
			'vScale/hScale/rows/totalHeight', [vScale, hScale, $scope.rows, $scope.totalHeight],
			'scrollLeft/scrollTop/offsetTop', [$scope.scrollLeft, $scope.scrollTop, $scope.offsetTop],
			'data.length', [$scope.data.length]
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
		};
	}

	function getCol(i) {
		return {id: 'field' + (i % 2 + 4), name: 'Col ' + (i + 1), width: defaultWidth};
	}

	function virtualScroll(elem, hOnly, vOnly) {
		if (suppressScroll > 0) { suppressScroll--; return; }
		// console.log(elem);

		if (!hOnly) {
			var scrollTop = elem.scrollTop;
			// Find Row Index
			var offsetTop = (((scrollTop * vScale) / $scope.cellHeight) | 0) || 0;
			if (offsetTop + $scope.rows > $scope.data.length) {
				// console.log('offsetTop over', $scope.offsetTop, scrollTop);
				offsetTop = $scope.data.length - $scope.rows;
			}
			var realOffsetTop = offsetTop;

			$scope.realOffsetTop = realOffsetTop;
			$scope.offsetTop = offsetTop;
			$scope.scrollTop = scrollTop;
		}

		if (!vOnly) {
			var scrollLeft = elem.scrollLeft;
			// Find Column Index
			// console.time('column');
			var offsetLeft = 0, offsetRight, scrollOffsetLeft = 0;
			var scaleLeft = scrollLeft * hScale;
			//find nearest index
			var i = scaleLeft / widthMap[widthMap.length - 1] * g.colDef.length | 0;
			//100000 2.0833233333333334 12500010.832993334 100000 12499940
			// console.log(i, hScale, scaleLeft, widthMap.length, widthMap[widthMap.length - 1]);
			for (; i < widthMap.length; i++) {
				if ( scaleLeft < widthMap[i] ) {
					offsetLeft = i;
					break;
				}
			}
			// console.log('offsetLeft', offsetLeft);
			scrollOffsetLeft = offsetLeft && widthMap[offsetLeft - 1] ? widthMap[offsetLeft - 1] / hScale : 0;
			for (var j = offsetLeft; j < widthMap.length; j++) {
				if ( scaleLeft + $scope.bodyWidth <= widthMap[j] ) {
					offsetRight = j + 1;
					if (g.pinLeft) {
						offsetRight += g.pinLeft;
						offsetLeft += g.pinLeft;
					}
					//limit offsetRight to column length
					if (offsetRight >= widthMap.length) {
						offsetRight = widthMap.length;
					}
					// console.log('offsetRight', offsetRight);
					break;
				}
			}

			//100000 2.0833233333333334 12500010.832993334 100000 12499940
			// useWhat/rowType [0, 0] scrollLeft/scrollTop/scrollOffsetLeft [6000034, 0, 0] offsetTop/offsetLeft/offsetRight [0, -1, 99999]
			//if scroll hit right margin
			if (!offsetRight) {
				offsetRight = widthMap.length;
				i = offsetLeft = offsetRight - 1;
				var xWidth = 0;
				while ( xWidth < $scope.bodyWidth ) {
					// console.log('right corner xx', [offsetLeft, offsetRight, i, g.colDef[i], xWidth]);
					offsetLeft = i--;
					xWidth += g.colDef[i] && g.colDef[i].width || defaultWidth;
				}
				scrollOffsetLeft = widthMap[offsetLeft - 1] / hScale; //$scope.totalWidth - $scope.bodyWidth - (xWidth - $scope.bodyWidth);
				// console.warn('right corner', [$scope.width, $scope.bodyWidth, xWidth]);
			// } else if (offsetLeft && !offsetRight) {
			// 	offsetRight = widthMap.length;
			// 	console.log('no offsetRight', [offsetRight, scrollOffsetLeft, offsetRight]);
			}
			// console.timeEnd('column');

			$scope.offsetLeft = offsetLeft;
			$scope.offsetRight = offsetRight;
			$scope.scrollOffsetLeft = scrollOffsetLeft;
			$scope.scrollLeft = scrollLeft;
		}

		// if (offsetRight - offsetLeft	> 7) {
		//	 console.log('offsetTop|offsetLeft/offsetRight', [offsetTop, offsetLeft, offsetRight]);
		// }
		// console.log('useWhat/rowType', [+$scope.useWhat, +$scope.rowType],
		// 	'scrollLeft/scrollTop/scrollOffsetLeft', [$scope.scrollLeft, $scope.scrollTop, $scope.scrollOffsetLeft],
		// 	'elem.scrollLeft/elem.scrollTop', [elemCenter.scrollLeft, elemCenter.scrollTop],
		// 	'offsetTop/offsetLeft/offsetRight', [$scope.offsetTop, $scope.offsetLeft, $scope.offsetRight]);

		applyPatch(hOnly, vOnly);
	}

	////////////////////////////////////// shared functions //////////////////////

	function applyPatch(hOnly, vOnly) {
		switch (+$scope.useWhat) {
			case 0:
				return patch(hOnly, vOnly);
			case 1:
				return requestAnimationFrame(function(){patch(hOnly, vOnly);});
			case 2:
				return requestIdleCallback(function(){patch(hOnly, vOnly);});
			case 3:
				return setTimeout(function(){patch(hOnly, vOnly);});
		}
	}

	//get cell x, y from event.target
	function getCellIndex(elem) {
		while (!elem.getAttribute('col')) {
			elem = elem.parentNode;
			if (elem === elemLeft || elem === elemCenter || elem === gridRoot) { return; }
		}
		//destroyed nodes?
		if (!elem || !elem.parentNode) { return; }
		var col = elem.getAttribute('col'), row = elem.parentNode.getAttribute('row');
		if (row && col) return [row, col];
	}

	//calculate height scale to possible scroll bar height
	function calcScale() {
		$scope.outerWidth = parseFloat(gridStyle.width);
		$scope.outerHeight = parseFloat(gridStyle.height); //grid (viewport) height

		//grid must be one cell height, or lib don't support it
		if ($scope.outerHeight <= $scope.headerHeight + $scope.cellHeight) {
			$scope.outerHeight = $scope.headerHeight + $scope.cellHeight;
		}

		$scope.width = $scope.outerWidth;
		$scope.height = $scope.outerHeight;

		$scope.bodyWidth = $scope.outerWidth - scrollBarSize;
		$scope.bodyHeight = $scope.outerHeight - $scope.headerHeight - scrollBarSize;
		$scope.rows = $scope.bodyHeight / $scope.cellHeight | 0; //dynamic row count

		// console.log('width/height/bodyHeight', [$scope.width, $scope.height, $scope.bodyHeight],
		//	 'bodyHeight/rows', [$scope.bodyHeight, $scope.rows]);

		$scope.totalHeight = $scope.cellHeight * $scope.data.length + scrollBarSize + borderSize; //calc total height
		vScale = hScale = 1; //initial scale
		if ($scope.totalHeight > vMaxScroll) {
			vScale = $scope.totalHeight / vMaxScroll;
			$scope.totalHeight = vMaxScroll + $scope.bodyHeight;
		}

		//calc header widths
		realTotalWidth = 0;
		widthMap.length = 0;
		groupWidthMap.length = 0;
		var offsetRight = 0;
		var lastGroupIndex;
		for (var i = 0; i < g.colDef.length; i++) {
			var col = g.colDef[i];
			realTotalWidth += col && col.width || defaultWidth;
			//width map, which sum upto x columns, to prevent extra loop at scroll event
			widthMap[i] = realTotalWidth;

			if (!offsetRight && $scope.bodyWidth < realTotalWidth) {
				offsetRight = i + 1;
			}

			if (!col) { continue; }

			//calc header groups width
			if (col.group) {
				if (lastGroupIndex >= 0 && g.colDef[lastGroupIndex].group === col.group) {
					g.colDef[lastGroupIndex].groupWidth += col.width || defaultWidth;
					col.groupWidth = 0;
				} else {
					lastGroupIndex = i;
					g.colDef[lastGroupIndex].groupWidth = col.width || defaultWidth;
				}
			}
		}
		if (lastGroupIndex >= 0) {
			$scope.headerHeight = $scope.cellHeight * 2;
		}
		$scope.offsetRight = offsetRight;

		if (g.pinLeft) {
			g.widthLeft = widthMap[g.pinLeft - 1];
			$scope.bodyWidth = $scope.outerWidth - g.widthLeft - scrollBarSize;
		}

		// console.log('offsetLeft/offsetRight', [$scope.offsetLeft, $scope.offsetRight]);

		$scope.totalWidth = realTotalWidth; //firefox? or border-box thing?
		if ($scope.totalWidth > hMaxScroll) {
			hScale = $scope.totalWidth / hMaxScroll;
			$scope.totalWidth = hMaxScroll + $scope.bodyWidth;
		}

		console.log('vScale/hScale/hMaxScroll', [vScale, hScale, hMaxScroll],
			'totalHeight/totalWidth/widthLeft', [$scope.totalHeight, $scope.totalWidth, g.widthLeft]);
	}

	//dom patching
	var suppressScroll = 0;
	function patch(hOnly, vOnly){
		// console.time('patch');
		compileFn($scope, $filter, 0, 1);
		// console.log('scrollTop', $scope.scrollTop);
		if (elemLeft.scrollTop !== $scope.scrollTop) {
			suppressScroll = 1;
			elemLeft.scrollTop = $scope.scrollTop;
		}
		if (elemCenter.scrollTop !== $scope.scrollTop) {
			suppressScroll = 1;
			elemCenter.scrollTop = $scope.scrollTop;
		}
		if (elemCenter.scrollLeft !== $scope.scrollLeft) {
			suppressScroll = 1;
			elemCenter.scrollLeft = $scope.scrollLeft;
		}
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
		random1 = makeRandom(1e2, function(){ return Math.random() * 100 | 0;});
		random2 = makeRandom(1e2, function(){ return Math.random(); });
		random3 = makeRandom(1e2, function(){ return Math.random(); });
		random4 = makeRandom(1e2, function(){
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
