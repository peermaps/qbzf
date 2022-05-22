var cubic2quad = require('cubic2quad')
var vec2normalize = require('gl-vec2/normalize')
var N = [0,0]

module.exports = function commandsToCurves(commands, bbox) {
  var curves = []
  var p = { x: 0, y: 0 }
  for (var i = 0; i < commands.length; i++) {
    var c = commands[i]
    if (c.type === 'L') {
      //N[0] = c.y - p.y
      //N[1] = p.x - c.x
      //vec2normalize(N, N)
      //var lx = p.x*0.5+c.x*0.5 + N[0]*0.1
      //var ly = p.y*0.5+c.y*0.5 + N[1]*0.1
      var lx = p.x*0.5+c.x*0.5
      var ly = p.y*0.5+c.y*0.5
      curves.push([ p.x, p.y, lx, ly, c.x, c.y ])
    } else if (c.type === 'Q') {
      curves.push([ p.x, p.y, c.x1, c.y1, c.x, c.y ])
    } else if (c.type === 'C') {
      var quads = cubic2quad(p.x, p.y, c.x1, c.y1, c.x2, c.y2, c.x, c.y, 0.1)
      for (var j = 0; j < quads.length; j+=4) {
        curves.push(quads.slice(j,j+6))
      }
    }
    p.x = c.x
    p.y = c.y
  }
  return curves
}
