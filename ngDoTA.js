/* global angular, doTA */
(function(global, factory) {

	factory(global, global.document, global.doTA);

}(typeof window !== 'undefined' ? window : this, function(window, document, doTA) {

	var msie = document.documentMode;
	var ie8 = msie <= 8;
	var textContent = ie8 ? 'innerText' : 'textContent';
	var listenerName = ie8 ? 'attachEvent' : 'addEventListener';
	var frag, newNode = doTA.N;
	var BoolMap = {0: 0, 'false': 0, 1: 1, 'true': 1};

	setTimeout(function() {
		frag = document.createDocumentFragment();
	});

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
	function resolveDot(path, obj) {
		//console.log(['resolveDot', path, obj]);
		if (path.indexOf('.') > 0) {
			var chunks = path.split('.');
			return chunks.reduce(function (prev, curr) {
				return prev ? prev[curr] : undefined;
			}, obj);
		} else {
			return obj[path];
		}
	}

	function resolveObject(path, obj) {
		if (path.indexOf('[') > 0) {
			var result;
			while (path.indexOf('[') > 0) {
				/*jshint loopfunc: true */
				path = path.replace(/([$\w.]+)\[([^[\]]+)\](?:\.([$\w.]+))?/g, function($0, lpart, part, rpart) {
					var lobj = resolveDot(lpart, obj);
					//console.log(['part', part, 'lpart', lpart, 'lobj', lobj]);
					var robj = resolveDot(part, lobj);
					//console.log(['part', part, 'lobj', lobj, 'robj', robj]);
					if (typeof robj === 'object' && rpart) {
						return (result = resolveDot(rpart, robj));
					}
					return (result = robj);
				});
				/*jshint loopfunc: false */
			}
			return result;
		} else {
			return resolveDot(path, obj);
		}
	}

	// var obj2 = {
	// 	params: { groups: {'test': 1234, abcd: 'efgh'}},
	// 	groups: [{_id: 'test'},{_id: 'abcd'}]
	// };
	// console.log(resolveObject('params.groups[groups[0]._id]', obj2));
	// console.log(resolveObject('params.groups[groups[1]._id]', obj2));
	// console.log(resolveObject('groups.0._id', obj2));
	// console.log(resolveObject('groups.0', obj2));

	function parseDot(path, obj) {
		//console.log(['resolveDot', path, obj]);
		if (path.indexOf('.') > 0) {
			var chunks = path.split('.');
			path = chunks.pop();
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

	//get nested value as assignable fn like $parse.assign
	function parseObject(path, obj) {
		if (path.indexOf('[') > 0) {
			var result;
			while (path.indexOf('[') > 0) {
				/*jshint loopfunc: true */
				path = path.replace(/([$\w.]+)\[([^[\]]+)\](?:\.([$\w.]+))?/g, function($0, lpart, part, rpart) {
					var lobj = resolveDot(lpart, obj);
					//console.log(['part', part, 'lpart', lpart, 'lobj', lobj]);
					if (rpart) {
						var robj = resolveDot(part, lobj);
						result = parseDot(rpart, robj);
						return resolveDot(rpart, robj);
					} else {
						result = parseDot(part, lobj);
						return resolveDot(part, lobj);
					}
				});
				/*jshint loopfunc: false */
			}
			return result;
		} else {
			return parseDot(path, obj);
		}
	}

	// var obj = {};
	// var parsed = parseObject('name', obj);
	// parsed.assign('test');
	// console.log(obj);
	// parsed = parseObject('three.one', obj);
	// parsed.assign('haha');
	// console.log(obj);

	// var obj2 = {
	// 	params: { groups: {'test': 1234, abcd: 'efgh'}},
	// 	groups: [{_id: 'test'},{_id: 'abcd'}]
	// };
	// parsed = parseObject('groups.1._id', obj2);
	// console.log(obj2);
	// parsed.assign('zzzz');
	// console.log(JSON.stringify(obj2,0,4));
	// parsed = parseObject('params.groups[groups[0]._id]', obj2);
	// console.log(obj2);
	// parsed.assign(23923223);
	// console.log(JSON.stringify(obj2,0,4));

	//debounce for events like resize
	function debounce(fn, timeout) {
		if (timeout === undefined) {
			timeout = 500;
		}
		var timeoutId;
		var args, thisArgs;
		function debounced() {
			fn.apply(thisArgs, args);
		}
		return function() {
			args = arguments;
			thisArgs = this;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			// console.log('debounce: new timer', [timer]);
			timeoutId = setTimeout(debounced, timeout);
		};
	}
	doTA.debounce = debounce;

	//throttle for events like input
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
			while ((child = child.nextSibling)) {
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
		});
	}

	function evalExpr(expr) {
		return new Function('S', 'return ' + expr.replace(/[$\w.]+/g, function($0) {
				return 'S.' + $0;
			}));
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
			//	 scope.$event = evt;
			//	 // var locals = {$event: evt};
			//	 var fn = new Function('with(this){' + expr + '}');
			//	 console.log('eventHandlerFn', fn, scope);
			//	 fn.apply(scope);
			// }
		};
	}

	function getElements(elem, selector) {
		return ie8 ? elem.querySelectorAll('.' + selector) : elem.getElementsByClassName(selector);
	}

	function addEventUnknown(partial, scope) {
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
				// console.log('event added', attrName);
			}
		}
	}

	//specified events
	function addEventKnown(partial, scope, events) {
		if (partial.ded) { return; } //only attach events once
		partial.ded = 1;
		var attrName, attrVal;

		// console.log('attributes', attributes);
		for(var i = 0, l = events.length; i < l; i++) {
			attrName = 'de-' + events[i];
			attrVal = partial.getAttribute(attrName);
			// console.log(i, [attrVal, events[i]])
			if (!attrVal) { continue; }
			partial[listenerName]((ie8 ? 'on' : '') + events[i],
				eventHandlerFn(scope, attrVal));
		}
	}

	function addEvents(elem, scope, event, uniqueId) {
		//getElementsByClassName is faster than querySelectorAll
		//http://jsperf.com/queryselectorall-vs-getelementsbytagname/20
		// console.time('find-nodes:');
		var elements = getElements(elem, 'de' + uniqueId);
		var i, l;
		// console.timeEnd('find-nodes:');
		if (typeof event === 'number') {
			for (i = 0, l = elements.length; i < l; i++) {
				addEventUnknown(elements[i], scope);
			}
		} else {
			var events = event.split(' ');
			for (i = 0, l = elements.length; i < l; i++) {
				addEventKnown(elements[i], scope, events);
			}
		}
	}
	doTA.addEvents = addEvents;

	function addNgModels(elem, scope, uniqueId) {
		var elements = getElements(elem, 'dm' + uniqueId);
		forEachArray(elements, function(partial) {
			if (partial.dm) return;
			partial.dm = 1;
			var dotaPass = partial.getAttribute('dota-pass');
			// console.log('dotaPass', [dotaPass]);
			if (dotaPass != null) { // jshint ignore:line
				return;
			} //null or undefined

			var modelName = partial.getAttribute('dota-model');
			var initValue = partial.getAttribute('value');

			//textbox default event is input unless IE8, all others are change event
			var updateOn = partial.getAttribute('update-on') ||
				(partial.type !== 'text' || ie8 ? 'change' : 'input');
			var throttleVal = +partial.getAttribute('throttle') || 100;

			//use checked property for checkbox and radio
			var bindProp = partial.getAttribute('bind-prop') ||
				((partial.type === 'checkbox' || partial.type === 'radio') && 'checked');
			var curValue = resolveObject(modelName, scope);

			console.log('partial', [partial.tagName, modelName, bindProp, partial.type, curValue, partial.value, partial[bindProp]]);
			if (bindProp) {
				//set true or false on dom properties
				if (initValue)
					partial[bindProp] = partial.value == curValue; //  loose compare
				else
					partial[bindProp] = curValue;
			} else {
				if (typeof curValue !== 'undefined') {
					partial.value = curValue;
				//} else if (partial.tagName === 'SELECT') {
				//	partial.selectedIndex = 0;
				}
			}

			//bind each events
			var events = updateOn.split(' ');
			for (var i = 0; i < events.length; i++) {
				var evtName = events[i].trim();
				partial.addEventListener(evtName, throttle((function (partial, modelName, bindProp) {
					var parsed;
					return function (evt) {
						if (!parsed) {
							parsed = parseObject(modelName, scope);
						}
						if (ie8) {
							evt.returnValue = false;
							evt.cancelBubble = true;
						} else {
							evt.preventDefault();
							evt.stopPropagation();
						}

						// console.log('event', modelName, evtName, partial, bindProp, [partial[bindProp || 'value']]);
						scope.$applyAsync((function () {
							//console.log("value", [partial.value, partial.getAttribute('value'), curValue, bindProp, initValue, partial[bindProp]]);
							if (bindProp) {
								if (initValue) {
									parsed.assign(partial[bindProp] ? partial.value : undefined);
								} else {
									parsed.assign(partial[bindProp]);
								}
							} else {
								parsed.assign(partial.value);
							}
						}));
					};
				})(partial, modelName, bindProp), throttleVal));
			}
		});
	}
	doTA.addNgModels = addNgModels;

	angular.module('doTA', [])
		.config(['$provide',function(P) {
			P.factory('doTA', function(){
				return doTA;
			});
		}])

		.directive('render', render)
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
						console.log('dotaTemplate - compile', [attrs.dotaTemplate]);
						var attrCompile = makeBool(attrs.compile, 1);

						scope.$watch(evalExpr(attrs.dotaTemplate), function(newVal, oldVal) {
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
			return function (name, scope, callback, _opt){
				var options = {render: name, loose: 1};
				if (_opt) {
					for (var x in _opt) {
						options[x] = _opt[x];
					}
				}
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

		render.$inject = ['doTA', '$http', '$filter', '$templateCache', '$compile', '$controller'];
		function render(doTA, $http, $filter, $templateCache, $compile, $controller) {

			return {
				restrict: 'A',
				priority: 10000,
				terminal: true,
				controller: angular.noop,
				link: angular.noop,
				compile: function() {
					var Watchers = [], BindValues = {}, Scopes = {};
					console.info('render compileFn');

					return function($scope, elem, attrs) {
						console.time('render');
						//ToDo: check Watchers scope
						while (Watchers.length) {
							Watchers.pop()();
						}

						//used attributes, good for minification with closure compiler;
						var attrCacheDOM = attrs.cacheDom | 0;
						var attrRender = attrs.render;
						var attrScope = attrs.scope;
						var attrNgController = attrs.ngController;
						var attrLoose = attrs.loose;
						var attrEvent = attrs.event;
						var attrDebug = attrs.debug;
						var attrWatch = attrs.hasOwnProperty('watch') && attrs.watch;
						var attrWatchDiff = attrs.watchDiff;
						var attrCompile = attrs.compile;
						var attrModel = attrs.model;
						var attrBind = attrs.bind;
						var attrCompileAll = attrs.compileAll;
						var attrOnload = attrs.onload;
						var attrNgLoad = attrs.ngLoad;
						var attrLoaded = attrs.loaded;
						var attrInline = attrs.inline;
						var origAttrMap = attrs.$attr;
						var params = {};
						var NewScope;
						var uniqueId;

						attrs.loose = makeBool(attrLoose, 1); //if set, falsy => ''
						attrs.optimize = makeBool(attrs.optimize, 0);
						attrs.comment = makeBool(attrs.comment, 1); //if 0, remove comments
						attrDebug = attrs.debug = makeBool(attrDebug, 0);
						attrEvent = attrs.event = makeBool(attrEvent, 1); //ng-click to native click
						if (attrs.diffLevel) {
							attrs.diffLevel = +attrs.diffLevel;
						}

						//to prevent angular binding this
						if (attrNgController) {
							elem[0].removeAttribute('ng-controller');
						}

						if (attrCacheDOM && doTA.D[attrRender]) {
							// alert( doTA.D[attrRender].innerHTML);
							console.log('cacheDOM: just moved cached DOM', doTA.D[attrRender]);
							var cachedElem = msie ? doTA.D[attrRender].cloneNode(true) : doTA.D[attrRender];
							elem[0].parentNode.replaceChild(cachedElem, elem[0]);
							if (attrCacheDOM === 2) {
								onLoad();
							}
							return;
						}

						//attributes on render tags to be accessiable as $attr in templates
						for (var x in origAttrMap) {
							var z = origAttrMap[x];
							//map data-* attributes into origAttrMap (inline text)
							if (!z.indexOf('data-')) {
								params[z.slice(5)] = attrs[x];
								attrs.params = 1;
							//map scope-* attributes into origAttrMap (first level var from scope)
							} else if (!z.indexOf('scope-')) {
								attrs.params = 1;
								if (attrs[x].indexOf('.') >= 0 || attrs[x].indexOf('[') >= 0) {
									if (attrs[x].indexOf('$index') > 0) {
										params[z.slice(6)] = $scope.$eval(attrs[x]);
									} else {
										params[z.slice(6)] = resolveObject(attrs[x], $scope);
									}
								} else {
									params[z.slice(6)] = $scope[attrs[x]];
								}
							}
						}

						//create new scope if scope=1 or ng-controller is specified
						if (attrScope || attrNgController) {
							console.log('scope', attrScope, elem, elem.scope());

							//$destroy previously created scope or will leak.
							if (Scopes[attrRender]) {
								Scopes[attrRender].$destroy();
								// /**/console.log('newScope $destroy', attrRender, NewScope);
							}
							NewScope = Scopes[attrRender] = $scope.$new();
							// /**/console.log('newScope created', attrRender, NewScope);
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
							console.log('new controller created', attrRender);
						}

						// watch and re-render the whole template when change
						if(attrWatch) {
							console.log(attrRender, 'registering watch for', attrWatch);
							var oneTimePos = attrWatch.indexOf('::');
							if (oneTimePos >= 0) {
								attrWatch = attrWatch.slice(oneTimePos + 2);
							}
							var oneTimeExp = NewScope['$watch' + (attrWatch[0] === '[' ? 'Collection': '')](evalExpr(attrWatch), function(newVal, oldVal){
								if(newVal !== undefined && newVal !== oldVal && doTA.C[attrRender]) {
									if (oneTimePos >= 0) oneTimeExp();
									console.log(attrRender, 'watch before render');
									renderTemplate(doTA.C[attrRender]);
									console.log(attrRender, 'watch after render');
								}
							});
						}

						// watch and partially render by diffing. diff-level = 2 may be used to patch children
						if(attrWatchDiff) {
							console.log(attrRender, 'registering diff watch for', attrWatchDiff);
							NewScope['$watch' + (attrWatchDiff[0] === '[' ? 'Collection': '')](evalExpr(attrWatchDiff), function(newVal, oldVal){
								if(newVal !== oldVal && doTA.C[attrRender]) {
									console.log(attrRender, 'diff watch before render');
									renderTemplate(doTA.C[attrRender], true);
									console.log(attrRender, 'diff watch after render');
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
								// alert(['$destroy', elem[0], frag]);
								if (frag) {
									doTA.D[attrRender] = elem[0];
									frag.appendChild(elem[0]);
								}
							});
						}

						////////////////////////////////////////////////////////////////////////////
						// doTA.compile and return compiledFn
						////////////////////////////////////////////////////////////////////////////
						function compile(template) {
							if(attrDebug) {
								console.log(attrRender + ':' + template);
							}

							console.log(attrRender,'before compile');
							var compiledFn;
							//compile the template html text to function like doT does
							try {
								console.time('compile:' + attrRender);
								compiledFn = doTA.compile(template, attrs);
								console.timeEnd('compile:'	+ attrRender);
								uniqueId = doTA.U[attrRender];
								console.log(attrRender,'after compile(no-cache)');
							} catch (x) {
								/**/console.log('compile error', attrs, template);
								throw x;
							}

							//compiled func into cache for later use
							if (attrRender) {
								doTA.C[attrRender] = compiledFn;
							}

							return compiledFn;
						}


						////////////////////////////////////////////////////////////////////////////
						// attach ng-bind
						////////////////////////////////////////////////////////////////////////////
						function addNgBind(rawElem, scope, uniqueId) {
							var elements = getElements(rawElem, 'db' + uniqueId);
							forEachArray(elements, function(partial) {
								if (partial.db) return;
								partial.db = 1;
								//override ng-bind
								var bindExpr = partial.getAttribute('dota-bind');
								var oneTimePos = bindExpr.indexOf('::');
								if (oneTimePos >= 0) {
									bindExpr = bindExpr.slice(oneTimePos + 2);
								}

								if (BindValues[bindExpr]) {
									partial.innerHTML = BindValues[bindExpr];
								}
								console.log('binding', bindExpr);
								console.time('dota-bind');
								var oneTimeExp = scope['$watch' + (bindExpr[0] === '[' ? 'Collection': '')](evalExpr(bindExpr), function(newVal, oldVal){
									if (newVal && oneTimePos >= 0) { oneTimeExp(); }
									console.log('watch fired before bindExpr', [newVal, oldVal]);
									partial[textContent] = BindValues[bindExpr] = newVal || '';
									console.log('watch fired after render');
								});
								Watchers.push(oneTimeExp);
								console.timeEnd('dota-bind');
								console.log(partial);
							});
						}

						////////////////////////////////////////////////////////////////////////////
						// attach ng-model, events, ng-bind, and $compile
						////////////////////////////////////////////////////////////////////////////
						function attachEventsAndCompile(rawElem, scope) {
							console.log('attachEventsAndCompile', attrRender, attrModel, attrEvent, attrBind, attrCompile, attrCompileAll);

							if (attrModel) {
								console.time('ngModel:' + attrRender);
								addNgModels(rawElem, scope, uniqueId);
								console.timeEnd('ngModel:' + attrRender);
							}

							//attach events before replacing
							if (attrEvent) {
								console.time('ng-events:' + attrRender);
								addEvents(rawElem, scope, attrEvent, uniqueId);
								console.timeEnd('ng-events:' + attrRender);
							}

							//ng-bind
							if (attrBind) {
								console.time('ngBind:' + attrRender);
								addNgBind(rawElem, scope, uniqueId);
								console.timeEnd('ngBind:' + attrRender);
							}

							//$compile html if you need ng-model or ng-something
							if (attrCompile){
								//partially compile each dota-pass and its childs,
								// not sure this is suitable if you have so many dota-passes
								console.time('$compile:' + attrRender);
								forEachArray(rawElem.querySelectorAll('[dota-pass]'), function(partial){
									// console.log('$compile:partial:' + attrRender, partial);
									$compile(partial)(scope);
								});
								console.timeEnd('$compile:' + attrRender);
								console.log(attrRender,'after $compile partial');

							} else if (attrCompileAll){
								//compile child nodes
								console.time('compile-all:' + attrRender);
								$compile(rawElem.contentDocument || rawElem.childNodes)(scope);
								console.timeEnd('compile-all:' + attrRender);
								console.log(attrRender,'after $compile all');
							}
						}

						function onLoad() {
							if(attrOnload){
								setTimeout(function(){
									var onLoadFn = new Function(attrOnload);
									onLoadFn.apply(elem[0]);
									console.log(attrRender,'after eval');
								});
							}

							//execute scope functions
							if(attrNgLoad) {
								setTimeout(function() {
									NewScope.$evalAsync(attrNgLoad);
									console.log(attrRender, 'after scope $evalAsync scheduled');
								});
							}
						}

						////////////////////////////////////////////////////////////////////////////
						// render the template, cache-dom, run onload scripts, add dynamic watches
						////////////////////////////////////////////////////////////////////////////
						function renderTemplate(func, patch) {

							//unless pre-render
							if (func) {
								//trigger destroying children
								if (!patch && elem[0].firstChild) {
									destroyChildren(elem[0]);
								}


								console.log('uniqueId', attrRender, uniqueId);

								console.log(attrRender, 'before render', patch);
								//execute render function against scope, $filter, etc.
								var renderedHTML;
								try {
									console.time('render:' + attrRender);
									renderedHTML = func(NewScope, $filter, params, patch);
									console.timeEnd('render:' + attrRender);
									console.log(attrRender,'after render', patch);
								} catch (x) {
									/**/console.log('render error', func);
									throw x;
								}

								if(attrDebug) {
									/* */console.log(attrRender, renderedHTML);
									// console.log(attrRender, func.toString());
								}

								// console.log('patch?', [patch]);
								if (patch) {
									attachEventsAndCompile(elem[0], NewScope);
									return;
								}

								//if node has some child, use appendChild
								if (elem[0].firstChild) {
									console.time('appendChild:' + attrRender);
									var firstChild;
									newNode.innerHTML = renderedHTML;

									//if needed, attach events and $compile
									attachEventsAndCompile(newNode, NewScope);

									//move child from temp nodes
									while ((firstChild = newNode.firstChild)) {
										elem[0].appendChild(firstChild);
									}
									console.timeEnd('appendChild:' + attrRender);
									console.log(attrRender, 'after appendChild');

								//if node is blank, use innerHTML
								} else {
									console.time('innerHTML:' + attrRender);
									elem[0].innerHTML = renderedHTML;
									console.timeEnd('innerHTML:' + attrRender);
									console.log(attrRender, 'after innerHTML');

									//if needed, attach events and $compile
									attachEventsAndCompile(elem[0], NewScope);
								}

							//attach client side to prerender context
							} else {
								attachEventsAndCompile(elem[0], NewScope);
							}

							//execute raw functions, like jQuery
							onLoad();

							if (attrCacheDOM) {
								cacheDOM();
							}

							//you can now hide raw html before rendering done
							// with loaded=false attribute and following css
							/*
							[render][loaded]:not([loaded=true]) {
								display: none;
							}
							*/
							if (attrLoaded) {
								elem.attr("loaded",true);
							}

							//this watch may be dynamically add or remove
							if (func && doTA.W[uniqueId]) {
								var W = doTA.W[uniqueId];
								console.log('partial watch', attrRender, W);
								var scopes = {}, watches = {};
								for(var i = 0; i < W.length; i++) {
									var w = W[i];
									// console.log('watch', w);

									watches[w.I] = NewScope['$watch' + (w.W[0] === '[' ? 'Collection': '')](evalExpr(w.W), function(newVal, oldVal){
										console.log('partial watch trigger', [newVal, oldVal]);
										if (newVal === oldVal && !newVal) { return; }
										console.log(attrRender, w.W, 'partial watch before render');
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
												console.log(attrRender, w.W, 'partial watch old $scope $destroy');
											}
											scopes[w.I] = NewScope.$new();
											console.log(attrRender, w.W, 'partial watch new $scope');
										}

										angular.element(oldTag).replaceWith(newTag);

										attachEventsAndCompile(newTag[0], scopes[w.I] || NewScope);

										if (!attrCompile && !attrCompileAll && w.C) {
											$compile(newTag)(scopes[w.I] || NewScope);
										}

										console.log(attrRender, w.W, 'partial watch content written', newTag[0]);

										//unregister watch if wait once
										if (w.O) {
											console.log(attrRender, w.W, 'partial watch unregistered');
											watches[w.I]();
										}
										console.log(attrRender, w.W, 'partial watch after render');
									});
								}
							}
						}

						function loader(){
							if(doTA.C[attrRender]){
								uniqueId = doTA.U[attrRender];
								console.log(attrRender,'get compile function from cache');
								//watch need to redraw, also inline, because inline always hasChildNodes
								if (elem[0].hasChildNodes() && !attrInline) {
									console.log('hasChildNodes', attrRender);
									renderTemplate();
								} else {
									renderTemplate(doTA.C[attrRender]);
								}
							} else if (attrInline) {
								// render inline by loading inner html tags,
								// html entities encoding sometimes need for htmlparser here or you may use htmlparser2 (untested)
								console.log(attrRender,'before get innerHTML');
								var v = elem[0].innerHTML;
								console.log(attrRender,'after get innerHTML');
								renderTemplate(compile(v, attrs));
							} else if (attrRender) { //load real template
								console.log('before $http', attrRender);
								//server side rendering or miss to use inline attrs?
								if (elem[0].hasChildNodes()) {
									console.log('hasChildNodes', attrRender);
									renderTemplate();
								} else {
									$http.get(attrRender, {cache: $templateCache}).success(function (v) {
										console.log('after $http response', attrRender);
										renderTemplate(compile(v, attrs));
									});
								}
							}
						}

						console.timeEnd('render');
						//////////////////////////////////////////////////

					};
				}
			};
		}
}));
