module.exports = {
	'array': '<div ng-repeat="x in arr">{{x}}</div>',
	'arrayWithFilter': '<div ng-repeat="x in arr|orderBy:name">{{x}}</div>',

	'dict': '<div ng-repeat="k,v in obj">{{k}}: {{v}}</div>',
	'dictWithFilter': '<div ng-repeat="k,v in obj|filter:name">{{k}}: {{v}}</div>',

	'range': '<div ng-repeat="x in 1:10">{{x}}</div>',
	'rangeStep2': '<div ng-repeat="x in 1:10:2">{{x}}</div>',
	'rangeRev': '<div ng-repeat="x in 10:1:-1">{{x}}</div>',
	'rangeInclusive': '<div ng-repeat="x in 1:=10">{{x}}</div>',

	'withFilter': '<div ng-repeat="x in arr">{{x | json}}</div>',
	'withComment': '<div ng-repeat="x in arr">{{x | json}}<!--test--></div><!--test2-->',
	'withFilterOptions': '<div ng-repeat="x in arr">{{x | date:"YYMMDD"}}<!--test--></div><!--test2-->',

	'jsperf': '<div id="{{id}}"><ul><li ng-repeat="value in data" class="test-{{id}}">{{value}}</li></ul></div>',
	'selfClosing': '<div/><div /><br><hr><div ng-repeat="x in data"><img src="{{x}}" /></div>',

	'ngShowHide': '<div ng-repeat="x in data"><div ng-show="x">TRUE</div><div ng-hide="x">FALSE</div></div>',
	'ngShowHideWithClass': '<div ng-repeat="x in data"><div class="new" ng-show="x">TRUE</div><div ng-hide="x" class="old">FALSE</div></div>',
	'ngShowHideWithNgClass': '<div ng-repeat="x in data"><div ng-class="{shiny:1}" class="new" ng-show="x">TRUE</div><div ng-hide="x" class="old" ng-class="{darky:0}">FALSE</div></div>',

	'complexFilters': '<div>{{car.incharge_stock|filterBy:"purchaser"|short|cut:0:10}}</div>',

	// 'else': '<div ng-repeat="x in data"><div ng-if="x===1">1</div><div else>else</div></div>',
	// 'elif': '<div ng-repeat="x in data"><div ng-if="x===1">1</div><div elif="x===2">2</div><div else>else</div></div>',

	'ngValue': '<div ng-repeat="x in data"><input ng-value="x"></div>',
	'diffLvl2': "<table width=\"100%\" cellspacing=\"2\" ng-class=\"{ 'filtered': vm.form.filter }\">\n		<tr ng-repeat=\"row in vm.grid\">\n			<td class=\"test\">\n				{{ row.id }}\n			</td>\n			<td\n				ng-repeat=\"item in row.items\"\n				class=\"item\"\n				ng-class=\"{ 'hidden': item.isHiddenByFilter }\">\n				<span ng-if=\"item.isHiddenByFilter\">0</span>\n				<span ng-if=\"!item.isHiddenByFilter\" skip=200>{{ item.value }}\n					<span ng-if=\"item.isHiddenByFilter\">0</span>\n					<span ng-repeat=\"x in vm.someArr\"></span>\n					<span ng-if=\"item.isHiddenByFilter\">0</span>\n					<span ng-repeat=\"k,v in vm.someObj\"></span>\n					<span ng-if=\"item.isHiddenByFilter\">0</span>\n					<span ng-repeat=\"i in 1:10\"></span>\n				</span>\n				<span ng-if=\"item.isHiddenByFilter\"><input value=\"test\" ng-model=\"vm.value\" ng-blur=\"vm.blur($event)\" ng-value=\"item.value\"></span>\n				<span ng-if=\"item.isHiddenByFilter\">1</span>\n				<span ng-if=\"item.isHiddenByFilter\" ng-bind=\"vm.value\">2</span>\n				</td>\n		</tr>\n	</table>",

	'disabled': '<input type="text" ng-value="x.id" disabled />',
	'two single attr': '<thead dota-pass table-sort><div dota-pass=""></div></thead>',

	'single quote': '<div onclick=\'test("google")\' class="google login button"></div>',
	'double quote': '<div onclick="test(\'google\')" class="google login button"></div>',

	// `<table width="100%" cellspacing="2" ng-class="{ 'filtered': vm.form.filter }">
	//	 <tr ng-repeat="row in vm.grid">
	//		 <td class="test">
	//			 {{ row.id }}
	//		 </td>
	//		 <td
	//			 ng-repeat="item in row.items"
	//			 class="item"
	//			 ng-class="{ 'hidden': item.isHiddenByFilter }">
	//			 <span ng-if="item.isHiddenByFilter">0</span>
	//			 <span ng-if="!item.isHiddenByFilter" skip=200>{{ item.value }}
	//				 <span ng-if="item.isHiddenByFilter">0</span>
	//				 <span ng-repeat="x in vm.someArr"></span>
	//				 <span ng-if="item.isHiddenByFilter">0</span>
	//				 <span ng-repeat="k,v in vm.someObj"></span>
	//				 <span ng-if="item.isHiddenByFilter">0</span>
	//				 <span ng-repeat="i in 1:10"></span>
	//			 </span>
	//			 <span ng-if="item.isHiddenByFilter"><input value="test" ng-model="vm.value" ng-blur="vm.blur($event)" ng-value="item.value"></span>
	//			 <span ng-if="item.isHiddenByFilter">1</span>
	//			 <span ng-if="item.isHiddenByFilter" ng-bind="vm.value">2</span>
	//			 </td>
	//	 </tr>
	// </table>`
	'ng-click': '<div ng-if="!editing" ng-click="startEditing()" class="center">&nbsp;</div><div ng-if="!editing" ng-click="startEditing()">{{data.incharge_sale|incharge_label}}&nbsp;</div><div ng-if="editing"><select ng-model="incharge_sale" ng-change="doneEditing($event)"><option ng-repeat="x in Sales" ng-value="x._id">{{x.name}}</option></select></div>',
	'test1': '<div ng-init="var _D,_G;_D=$attr.data.slice(0,$attr.count);_G=hasX(_D,\'grade\')" class="row half-pad ac no-color {{$attr.tag}}"></div>',
	'bug1': '<a href="https://www.cheki.co.zw/search/result?year_from={{car.year}}&year_to={{car.year}}&keyword_search={{car.maker}}%20{{car.model}}&sort_by=2" target="_blank">ZW</a>',
	'broken': '<div ng-if="!editing" ng-click="startEditing()">{{data.incharge_sale|incharge_label}}&nbsp;</div><div ng-if="editing"><select ng-model="incharge_sale" ng-change="doneEditing($event)><option ng-repeat="x in Sales" ng-value="x._id">{{x.name}}</option></select></div>',
};
