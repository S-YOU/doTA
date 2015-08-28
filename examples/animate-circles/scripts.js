// Change N to change the number of drawn circles.

var N = 100;

// The Backbone implementation:
(function(){

  var Box = Backbone.Model.extend({

      defaults: {
          top: 0,
          left: 0,
          color: 0,
          content: 0
      },

      initialize: function() {
          this.count = 0;
      },

      tick: function() {
          var count = this.count += 1;
          this.set({
              top: Math.sin(count / 10) * 10,
              left: Math.cos(count / 10) * 10,
              color: (count) % 255,
              content: count % 100
          });
      }

  });


  var BoxView = Backbone.View.extend({

      className: 'box-view',

      template: _.template($('#underscore-template').html()),

      initialize: function() {
          this.model.bind('change', this.render, this);
      },

      render: function() {
          this.$el.html(this.template(this.model.attributes));
          return this;
      }

  });

  var boxes;

  var backboneInit = function() {
      boxes = _.map(_.range(N), function(i) {
          var box = new Box({number: i});
          var view = new BoxView({model: box});
          $('#grid').append(view.render().el);
          return box;
      });
  };

  var backboneAnimate = function() {
      for (var i = 0, l = boxes.length; i < l; i++) {
        boxes[i].tick();
      }
  };

  window.runBackbone = function() {
      reset();
      backboneInit();
      benchmarkLoop(backboneAnimate);
  };

})();

// The Ember implementation:
(function(){

  var Box = Ember.Object.extend({

      top: 0,
      left: 0,
      content: 0,
      count: 0,

      tick: function() {
          var count = this.get('count') + 1;
          this.set('count', count);
          this.set('top', Math.sin(count / 10) * 10);
          this.set('left', Math.cos(count / 10) * 10);
          this.set('color', count % 255);
          this.set('content', count % 100);
          this.set('style', this.computeStyle());
      },

      computeStyle: function() {
          return 'top: ' + this.get('top') + 'px; left: ' +  this.get('left') +'px; background: rgb(0,0,' + this.get('color') + ');';
      }

  });

  var htmlbarsTemplate = Ember.HTMLBars.compile($('#htmlbars-box').text().trim());

  var BoxView = Ember.View.extend({
      usingHTMLBars: true,
      template: htmlbarsTemplate,
      classNames: ['box-view']
  });

  var boxes;

  // var App = Ember.Application.create();

  var emberInit = function() {
      boxes = _.map(_.range(N), function(i) {
          var box = Box.create();
          var view = BoxView.create({context: box});
          view.appendTo('#grid');
          box.set('number', i);
          return box;
      });
  };

  var emberAnimate = function() {
      Ember.run(function() {
          for (var i = 0, l = boxes.length; i < l; i++) {
            boxes[i].tick();
          }
      });
  };


  window.runEmber = function() {
      reset();
      emberInit();
      benchmarkLoop(emberAnimate);
  };

})();

// The React implementation:
(function(){

  var BoxView = React.createClass({

      render: function() {
          var count = this.props.count + 1;
          return (
              React.DOM.div(
                  {className: "box-view"},
                  React.DOM.div(
                      {
                          className: "box",
                          style: {
                              top: Math.sin(count / 10) * 10,
                              left: Math.cos(count / 10) * 10,
                              background: 'rgb(0, 0,' + count % 255 + ')'
                          }
                      },
                      count % 100
                  )
              )
          );
      }

  });

  var BoxesView = React.createClass({

      render: function() {
          var boxes = _.map(_.range(N), function(i) {
              return BoxView({key: i, count: this.props.count});
          }, this);
          return React.DOM.div(null, boxes);
      }

  });

  var counter;
  var reactInit = function() {
      counter = -1;
      reactAnimate();
  };

  var reactAnimate = function() {
      React.renderComponent(
          BoxesView({count: counter++}),
          document.getElementById('grid')
      );
  };

  window.runReact = function() {
      reset();
      reactInit();
      benchmarkLoop(reactAnimate);
  };

})();

// rawdog
(function(){

  var BoxView = function(number){
      this.el = document.createElement('div');
      this.el.className = 'box-view';
      this.el.innerHTML = '<div class="box" id="box-' + number + '"></div>';
      this.count = 0;
      this.render()
  }

  BoxView.prototype.render = function(){
      var count = this.count
      var el = this.el.firstChild
      el.style.top = Math.sin(count / 10) * 10 + 'px';
      el.style.left = Math.cos(count / 10) * 10 + 'px';
      el.style.background = 'rgb(0,0,' + count % 255 + ')';
      el.textContent = String(count % 100);
  }

  BoxView.prototype.tick = function(){
      this.count++;
      this.render();
  }

  var boxes;

  var init = function() {
      boxes = _.map(_.range(N), function(i) {
          var view = new BoxView(i);
          $('#grid').append(view.el);
          return view;
      });
  };

  var animate = function() {
      for (var i = 0, l = boxes.length; i < l; i++) {
        boxes[i].tick();
      }
  };

  window.runRawdog = function() {
      reset();
      init();
      benchmarkLoop(animate);
  };

})();

// Incremental DOM Implementation
(function(){
  var patch = IncrementalDOM.patch,
    ie_open = IncrementalDOM.ie_open,
    ie_void = IncrementalDOM.ie_void,
    ie_close = IncrementalDOM.ie_close,
    itext = IncrementalDOM.itext;
  var grid = document.getElementById('grid');

  function update(data) {
    patch(grid, function() {
      data.forEach(function(x){
        ie_open('div', '', ['class', 'box-view']);
          ie_open('div', '', ['class', 'box'],
            'style', {
              top: Math.sin(x / 10) * 10 + 'px',
              left: Math.cos(x/10) * 10 + 'px',
              background: 'rgb(0,0,' + (x % 255) +')'
            });
            itext(x % 100);
          ie_close('div');
        ie_close('div');
      });
    });
  }

  var BoxView;

  var init = function() {
    BoxView =  _.map(_.range(N), function() { return 0; });
    update(BoxView);
  };

  var animate = function() {
    for (var i = 0; i < BoxView.length; i++) {
      BoxView[i]++;
    }
    update(BoxView);
  };

  window.runIDOM = function() {
    reset();
    init();
    benchmarkLoop(animate);
  };
})();

// doTA Implementation
(function(){
  var renderFn = doTA.compile($('#dota-template').text().trim(), {watchDiff: 1, diffLevel: 2,
    strip: 1, debug: 0});
  var BoxView = {};

  var init = function() {
    BoxView.X =  _.map(_.range(N), function() { return 0; });
    $('#grid').append(renderFn(BoxView));
  };

  var animate = function() {
    for (var i = 0; i < BoxView.X.length; i++) {
      BoxView.X[i]++;
    }
    renderFn(BoxView, 0, 0, 1);
  };

  window.runDoTA = function() {
    reset();
    init();
    benchmarkLoop(animate);
  };
})();

// Benchmarks script
(function(){
  window.timeout = null;
  window.totalTime = null;
  window.loopCount = null;
  window.reset = function() {
      $('#grid').empty();
      $('#timing').html('&nbsp;');
      clearTimeout(timeout);
      loopCount = 0;
      totalTime = 0;
  };

  window.benchmarkLoop = function(fn) {
      var startDate = new Date();
      fn();
      var endDate = new Date();
      totalTime += endDate - startDate;
      loopCount++;
      if (loopCount % 20 === 0) {
          $('#timing').text('Performed ' + loopCount + ' iterations in ' + totalTime +
            ' ms (average ' + (totalTime / loopCount).toFixed(2) + ' ms per loop).');
      }
      timeout = _.defer(benchmarkLoop, fn);
  };
})();

