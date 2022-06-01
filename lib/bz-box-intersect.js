var vec2set = require('gl-vec2/set')
var raycast = require('./raycast.js')
var bz = require('./bz.js')
var v0 = [0,0]
var b0 = [0,0], b1 = [0,0], b2 = [0,0]

module.exports = bzRectIntersect

function bzRectIntersect(rect, c, dx, dy, padding) {
  if (padding === undefined) padding = 1e-8
  var c0 = c[0]+dx, c1 = c[1]+dy, c2 = c[2]+dx, c3 = c[3]+dy, c4 = c[4]+dx, c5 = c[5]+dy
  if (rect[0] <= c0 && c0 <= rect[2] && rect[1] <= c1 && c1 <= rect[3]) return true
  vec2set(b0, c0, c1)
  vec2set(b1, c2, c3)
  vec2set(b2, c4, c5)
  if (checkSide(rect[0], 0, rect, b0, b1, b2, padding)) return true
  if (checkSide(rect[1], 1, rect, b0, b1, b2, padding)) return true
  if (checkSide(rect[2], 0, rect, b0, b1, b2, padding)) return true
  if (checkSide(rect[3], 1, rect, b0, b1, b2, padding)) return true
  return false
}

function checkSide(x, i, rect, b0, b1, b2, padding) {
  var n0 = raycast(v0, x, b0[i], b1[i], b2[i])
  if (n0 > 0 && check(rect,b0,b1,b2,v0[0],padding)) return true
  if (n0 > 1 && check(rect,b0,b1,b2,v0[1],padding)) return true
}

function check(rect,b0,b1,b2,t,padding) {
  var x = bz(b0[0],b1[0],b2[0],t)
  if (rect[0]-padding <= x && x <= rect[2]+padding) {
    var y = bz(b0[1],b1[1],b2[1],t)
    if (rect[1]-padding <= y && y <= rect[3]+padding) return true
  }
  return false
}
