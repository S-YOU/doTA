var globalScope;

angular.module('fasterAngular', ['doTA']).controller('mycontroller', ['$scope', function($scope) {
    $scope.updated = +new Date();
    $scope.dataLines = dataLines;
    updateRowCount();
    updateIterationCount();
    globalScope = $scope;
}]).filter('unsafe', function ($sce) { return $sce.trustAsHtml; });

rerender = function() {
    globalScope.updated = +new Date();
    /* Force Angular to perform a check and rerender as necessary */
    globalScope.$apply(function() {});
};

