var bz = require('./bz.js')

module.exports = tpts

function apex(a, b, c, epsilon) {
  if (epsilon === undefined) epsilon = 1e-8
  var d = 2*a-4*b+2*c
  return Math.abs(d) > epsilon ? -(2*b-2*a)/d : -1
}

function tpts(out, c, epsilon) {
  if (epsilon === undefined) epsilon = 1e-8
  var n = 0
  out[n*2+0] = bz(c[0],c[2],c[4],0)
  out[n*2+1] = bz(c[1],c[3],c[5],0)
  n++
  var t = apex(c[1],c[3],c[5],epsilon)
  if (t > epsilon && t < 1-epsilon) {
    out[n*2+0] = bz(c[0],c[2],c[4],t)
    out[n*2+1] = bz(c[1],c[3],c[5],t)
    n++
  }
  out[n*2+0] = bz(c[0],c[2],c[4],1)
  out[n*2+1] = bz(c[1],c[3],c[5],1)
  n++
  return n
}
