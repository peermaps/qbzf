var vec2set = require('gl-vec2/set')
var v0 = [0,0]
var b0 = [0,0], b1 = [0,0], b2 = [0,0]
var epsilon = 1e-8

module.exports = bzRectIntersect

function bz(a, b, c, t) {
  var t1 = 1.0-t
  return t1*t1*a + 2.0*t1*t*b + t*t*c
}

function bzRectIntersect(rect, c, dx, dy) {
  var c0 = c[0]+dx, c1 = c[1]+dy, c2 = c[2]+dx, c3 = c[3]+dy, c4 = c[4]+dx, c5 = c[5]+dy
  if (rect[0] <= c0 && c0 <= rect[2] && rect[1] <= c1 && c1 <= rect[3]) return true
  vec2set(b0, c0, c1)
  vec2set(b1, c2, c3)
  vec2set(b2, c4, c5)
  if (checkSide(rect[0], 0, rect, b0, b1, b2)) return true
  if (checkSide(rect[1], 1, rect, b0, b1, b2)) return true
  if (checkSide(rect[2], 0, rect, b0, b1, b2)) return true
  if (checkSide(rect[3], 1, rect, b0, b1, b2)) return true
  return false
}

function checkSide(x, i, rect, b0, b1, b2) {
  var n0 = raycast(v0, x, b0[i], b1[i], b2[i])
  if (n0 > 0 && check(rect,b0,b1,b2,v0[0])) return true
  if (n0 > 1 && check(rect,b0,b1,b2,v0[1])) return true
}

function check(rect,b0,b1,b2,t) {
  var x = bz(b0[0],b1[0],b2[0],t)
  if (rect[0]-epsilon <= x && x <= rect[2]+epsilon) {
    var y = bz(b0[1],b1[1],b2[1],t)
    if (rect[1]-epsilon <= y && y <= rect[3]+epsilon) return true
  }
  return false
}

function raycast(out, x, b0, b1, b2, epsilon) {
  if (epsilon === undefined) epsilon = 1e-8
  var a = b0 - 2.0*b1 + b2
  var b = -2.0*(b0 - b1)
  var c = b0 - x
  var s = b*b - 4.0*a*c;
  if (s < 0.0 || Math.abs(a) < epsilon) return 0
  var sq = Math.sqrt(s)
  var pt = (-b + sq) / (2.0*a)
  var nt = (-b - sq) / (2.0*a)
  var n = 0
  if (0.0 <= pt && pt <= 1.0) out[n++] = pt
  if (0.0 <= nt && nt <= 1.0) out[n++] = nt
  return n
}
