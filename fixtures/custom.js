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

  // 'else': '<div ng-repeat="x in data"><div ng-if="x===1">1</div><div else>else</div></div>',
  // 'elif': '<div ng-repeat="x in data"><div ng-if="x===1">1</div><div elif="x===2">2</div><div else>else</div></div>',

  'ngValue': '<div ng-repeat="x in data"><input ng-value="x"></div>',
  'diffLvl2': `<table width="100%" cellspacing="2" ng-class="{ 'filtered': vm.form.filter }">
		<tr ng-repeat="row in vm.grid">
			<td class="test">
				{{ row.id }}
			</td>
			<td
				ng-repeat="item in row.items"
				class="item"
				ng-class="{ 'hidden': item.isHiddenByFilter }">
				<span ng-if="!item.isHiddenByFilter">{{ item.value }}</span>
        <span ng-if="item.isHiddenByFilter"><input ng-value="item.value"></span>
        <span ng-if="item.isHiddenByFilter"><input ng-repeat="x in y" ng-value="item.value"></span>
        </td>
		</tr>
	</table>`

  // 'broken': '<div ng-if="!editing" ng-click="startEditing()">{{data.incharge_sale|incharge_label}}&nbsp;</div><div ng-if="editing"><select ng-model="incharge_sale" ng-change="doneEditing($event)><option ng-repeat="x in Sales" ng-value="x._id">{{x.name}}</option></select></div>'
}