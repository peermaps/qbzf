var { quadBezierAABB } = require('bezier-intersect')

module.exports = function (g) {
  //g.dx
  //g.curves
  //g.grid
  for (var i = 0; i < g.grid[1]; i++) {
    var y0 = i/g.grid[1]
    var y1 = (i+1)/g.grid[1]
    for (var j = 0; j < g.grid[0]; j++) {
      var x0 = j/g.grid[0]
      var x1 = (j+1)/g.grid[0]
      for (var k = 0; k < g.curves.length; k++) {
        g.curves[k]
      }
    }
  }
}
