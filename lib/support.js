var bz = require('./bz.js')
var raycast = require('./raycast.js')
var vec2set = require('gl-vec2/set')
var v0 = [0,0]

module.exports = support

function apex(a, b, c, epsilon) {
  if (epsilon === undefined) epsilon = 1e-8
  var d = 2*a-4*b+2*c
  return Math.abs(d) > epsilon ? -(2*b-2*a)/d : -1
}

function support(out, c, rect, epsilon, gx, gy) {
  if (epsilon === undefined) epsilon = 1e-8
  var t = apex(c[1],c[3],c[5],epsilon)
  if (t < 0) return 0
  var yt = bz(c[1],c[3],c[5],t)
  var y0 = c[1]
  var y1 = c[5]
  var q = ((y0 <= yt ? 1 : 0) << 0) | ((y1 <= yt ? 1 : 0) << 1) | ((y0 <= y1 ? 1 : 0) << 2)
  q |= ((fixCount(rect[2],rect[3],c,epsilon) % 2) << 3)
  q |= ((rect[3] < y0) << 4)
  q |= ((rect[3] < yt) << 5)
  q |= ((rect[3] < y1) << 6)
  q |= ((fixCount(rect[2],yt,c,epsilon) % 2) << 7)
  q |= ((fixCount(rect[2],rect[1],c,epsilon) % 2) << 7)
  //console.log('q=',q,'n=',n)

  //if (gx === 2 && gy === 0) console.log(gx,gy,'Q=',q)
  var n = 0
  if (q === 0) {
  } else if (q === 3) {
    out[n++] = y1
    out[n++] = y0
  } else if (q === 7) {
    out[n++] = y1
    out[n++] = yt
  } else if (q === 11) {
    out[n++] = y1
    out[n++] = yt
  } else if (q === 15) {
    out[n++] = yt
    out[n++] = y1
  } else if (q === 19) {
    //
  } else if (q === 23) {
    out[n++] = yt
    out[n++] = y1
  } else if (q === 27) {
    out[n++] = y0
    out[n++] = y1
  } else if (q === 35) {
    out[n++] = y0
    out[n++] = y1
  } else if (q === 47) {
    out[n++] = yt
    out[n++] = y1
  } else if (q === 59) {
    out[n++] = y0
    out[n++] = y1
  } else if (q === 152) {
    out[n++] = y0
    out[n++] = yt
  } else if (q === 128) {
    out[n++] = y0
    out[n++] = y1
  } else if (q === 131) {
    out[n++] = y0
    out[n++] = y1
  } else if (q === 163) {
    out[n++] = y0
    out[n++] = y1
  } else if (q === 175) {
    out[n++] = y0
    out[n++] = yt
  } else if (q === 187) {
    out[n++] = y0
    out[n++] = y1
  } else {
    //console.log('ALT q=',q)
  }
  return n
}

function countRaycast(p, c) {
  var x = p[0], y = p[1]
  var n = raycast(v0, y, c[1], c[3], c[5])
  var count = 0
  if (n > 0) {
    var x0 = bz(c[0],c[2],c[4],v0[0])
    if (x0 > x) count++
  }
  if (n > 1) {
    var x1 = bz(c[0],c[2],c[4],v0[1])
    if (x1 > x) count++
  }
  return count
}

function fixCount(x, y, c, epsilon) {
  vec2set(v0,x,y)
  if (Math.abs(c[1]-v0[1]) < epsilon) v0[1] += epsilon * Math.sign(c[1]-c[5])
  else if (Math.abs(c[5]-v0[1]) < epsilon) v0[1] += epsilon * Math.sign(c[1]-c[5])
  return countRaycast(v0,c)
}
