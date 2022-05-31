module.exports = function mivxa(out, pts, range, epsilon) {
  if (epsilon === undefined) epsilon = 1e-8
  pts.sort(cmp)
  var j = 0
  for (var i = 0; i < pts.length; i+=2) {
    var x0 = pts[i+0], x1 = pts[i+1]
    if (x1 <= range[0]) continue
    if (x0 >= range[1]) break
    if (x0 < range[0] && range[0] < x1) {
      x0 = range[0]
    }
    if (x0 < range[1] && range[1] < x1) {
      x1 = range[1]
    }
    if (j > 0 && Math.abs(out[j-1]-x0) < epsilon) {
      out[j-1] = x1
    } else if (Math.abs(x0-x1) > 0) {
      out[j++] = x0
      out[j++] = x1
    }
  }
  out.length = j
  return out
}

function cmp(a,b) { return a < b ? -1 : +1 }
