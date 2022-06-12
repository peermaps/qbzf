var bzli = require('./bzli.js')
var l0 = [0,0,0,0], l1 = [0,0,0,0]

module.exports = bzRectIntersect

function bzRectIntersect(rect, c, dx, dy, padding) {
  if (padding === undefined) padding = 1e-8
  var r0 = rect[0]-dx, r1 = rect[1]-dy, r2 = rect[2]-dx, r3 = rect[3]-dy
  if (r0 <= c[0] && c[0] <= r2 && r1 <= c[1] && c[1] <= r3) return true
  if (r0 <= c[4] && c[4] <= r2 && r1 <= c[5] && c[5] <= r3) return true
  vec4set(l0, r0, r1, r0, r3)
  var n = bzli(l1,c,l0)
  if (n > 0) return true
  vec4set(l0, r2, r1, r2, r3)
  var n = bzli(l1,c,l0)
  if (n > 0) return true
  vec4set(l0, r0, r1, r2, r1)
  var n = bzli(l1,c,l0)
  if (n > 0) return true
  vec4set(l0, r0, r3, r2, r3)
  var n = bzli(l1,c,l0)
  if (n > 0) return true
  return false
}

function vec4set(out, a, b, c, d) {
  out[0] = a
  out[1] = b
  out[2] = c
  out[3] = d
  return out
}
