(function () {
  var fs = require('fs');
  var doTA = require('../dist/doTA.min');
  var timer = require('./timer');

  // var x = "{'active':isActive(base+'/'+item.link,item.title),'new':1}";
  // var re = /('[^']+'|"[^"]+"|[\w$]+)\s*:\s*((?:[$.\w]+|\([^)]+\)|[^},])+)/g, match;
  // console.log(x);
  // var result = 'res:';
  // while ((match = re.exec(x)) !== null) {
  //   result += '(k,v):' + match[1] + ',' + match[2] + '\n';
  // }
  // console.log(result);
  timer(1);
  var content = fs.readFileSync(__dirname + '/test1.html').toString();
  // console.log(content);
  timer(1, 'template file loaded');
  timer(2);
  //for (var i = 0; i < 100; i++) {
  var compiledFn = doTA.compile(content, { watchDiff: 1 });
  //}
  timer(2, 'template compiled')

  // console.log(compiledFn.toString())

  var row = 1000, col = 10;

  var vm = {};
  var $scope = { vm: vm };

  // We'll start out with a grid with 10,000 items.
  vm.grid = generateGrid(row, col);

  // Calculate the number of data-points that may have filtering.
  vm.dataPoints = (vm.grid.length * vm.grid[0].items.length);

  // I hold the form data for use with ngModel.
  vm.form = {
    filter: "a"
  };
  handleFilterChange(vm.form.filter);

  // I hold the number of items that are visible based on filtering.
  vm.visibleCount = 0;

  // As the user interacts with filter, we need to update the view-model
  // to reflect the matching items.
  // $scope.$watch( "vm.form.filter", handleFilterChange );

  // Expose the public API.
  vm.remountGrid = remountGrid;
  vm.unmountGrid = unmountGrid;

  // ---
  // PUBLIC METHODS.
  // ---
  global.doTA = doTA;
  timer(1);
  for (var i = 0; i < 1; i++) {
    var text = compiledFn($scope);
  }
  timer(1, 'template rendered to text');
  if (row <= 10) {
    console.log(text);
  }
  console.log(text.length);

  // I update the visibility of the items when the filter is updated.
  function handleFilterChange(newValue, oldValue) {

    if (newValue === oldValue) {

      return;

    }

    // Reset the visible count. As we iterate of the items checking
    // for visibility, we can increment this count as necessary.
    vm.visibleCount = 0;

    for (var r = 0, rowCount = vm.grid.length; r < rowCount; r++) {

      var row = vm.grid[r];

      for (var c = 0, columnCount = row.items.length; c < columnCount; c++) {

        var item = row.items[c];

        // The item is hidden if the given filter text cannot be
        // found in the value of the item.
        item.isHiddenByFilter = (newValue && (item.value.indexOf(newValue) === -1));

        // If the item isn't hidden, track it as part of the visible
        // set of data.
        if (!item.isHiddenByFilter) {

          vm.visibleCount++;

        }

      }

    }

  }


  // I repopulate the grid with data. This will help separate processing
  // performance characteristics from page-load processing.
  function remountGrid() {

    vm.grid = generateGrid(row, col);
    vm.dataPoints = (vm.grid.length * vm.grid[0].items.length);

    vm.visibleCount = 0;
    vm.form.filter = "";

  }


  // I clear the grid of data. This will help separate processing
  // performance characteristics from page-load processing.
  function unmountGrid() {

    vm.grid = [];
    vm.dataPoints = 0;

    vm.visibleCount = 0;
    vm.form.filter = "";

  }


  // ---
  // PRIVATE METHODS.
  // ---


  // I generate a grid of items with the given dimensions. The grid is
  // represented as a two dimensional grid, of sorts. Each row has an
  // object that has an items collection.
  function generateGrid(rowCount, columnCount) {

    var valuePoints = [
      "Daenerys", "Jon", "Sansa", "Arya", "Stannis", "Gregor", "Tyrion",
      "Theon", "Joffrey", "Ramsay", "Cersei", "Bran", "Margaery",
      "Melisandre", "Daario", "Jamie", "Eddard", "Myrcella", "Robb",
      "Jorah", "Petyr", "Tommen", "Sandor", "Oberyn", "Drogo", "Ygritte"
    ];

    var valueIndex = 0;

    var grid = [];

    for (var r = 0; r < rowCount; r++) {

      var row = {
        id: r,
        items: []
      };

      for (var c = 0; c < columnCount; c++) {

        row.items.push({
          id: (r + "-" + c),
          value: valuePoints[valueIndex],
          isHiddenByFilter: false
        });

        if (++valueIndex >= valuePoints.length) {

          valueIndex = 0;

        }

      }

      grid.push(row);

    }

    return (grid);

  }

})();