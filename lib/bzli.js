var bz = require('./bz.js')

module.exports = function bzi(out, c, a, b, epsilon) {
  if (epsilon === undefined) epsilon = 1e-8
  var c0 = c[0], c1 = c[1], c2 = c[2], c3 = c[3], c4 = c[4], c5 = c[5]
  var a0 = a[0], a1 = a[1], b0 = b[0], b1 = b[1]

  // y = mx+b
  // a1 = m*a0+b
  // b1 = m*b0+b
  // m = (a1-b1)/(a0-b0)
  // b = a1-m*a0

  // y-y1 = m*(x-x1)
  // y-a1 = (a1-b1)/(a0-b0)*(x-a0)
  // (y-a1)*(a0-b0) = (a1-b1)*(x-a0)
  // y*(a0-b0) - a1*(a0-b0) = a1*(x-a0) - b1*(x-a0)
  // y*(a0-b0) - a1*(a0-b0) = a1*x - a1*a0 - b1*x + b1*a0
  // y*(a0-b0) - a1*(a0-b0) = (a1-b1)*x - a1*a0 + b1*a0
  // y*(a0-b0) - a1*a0 + a1*b0 = (a1-b1)*x - a1*a0 + b1*a0
  // y*(a0-b0) = (a1-b1)*x + a0*b1 - a1*b0
  // y*(a0-b0) - (a1-b1)*x - a0*b1 + a1*b0 = 0
  // A*x + B*y + C = 0
  // A = b1-a1
  // B = a0-b0
  // C = a1*b0 - a0*b1

  // A*x + B*y + C = 0
  // x = c0*(1-t)*(1-t) + c2*(1-t)*t + c4*t*t
  // y = c1*(1-t)*(1-t) + c3*(1-t)*t + c5*t*t

  // A*(c0*(1-t)*(1-t) + c2*(1-t)*t + c4*t*t) + B*(c1*(1-t)*(1-t) + c3*(1-t)*t + c5*t*t) + C = 0
  // A*c0*(1-t)*(1-t) + A*c2*(1-t)*t + A*c4*t*t + B*c1*(1-t)*(1-t) + B*c3*(1-t)*t + B*c5*t*t + C = 0
  // A*c0*(1-t) - t*A*c0*(1-t) + A*c2*t - A*c2*t*t + A*c4*t*t + B*c1*(1-t) \
  //   - B*c1*(1-t)*t + B*c3*t - B*c3*t*t + B*c5*t*t + C = 0
  // A*c0 - A*c0*t - A*c0*t + A*c0*t*t + A*c2*t - A*c2*t*t + A*c4*t*t + B*c1 - B*c1*t \
  //   - B*c1*t + B*c1*t*t + B*c3*t - B*c3*t*t + B*c5*t*t + C = 0

  // t*t * (A*c0 - A*c2 + A*c4 + B*c1 - B*c3 + B*c5) \
  // + t * (-A*c0*2 + A*c2 - B*c1*2 + B*c3) \
  // + A*c0 + B*c1 + C = 0

  var A = b1-a1
  var B = a0-b0
  var C = a1*b0 - a0*b1
  var qa = A*c0 - A*c2 + A*c4 + B*c1 - B*c3 + B*c5
  var qb = -A*c0*2 + A*c2 - B*c1*2 + B*c3
  var qc = A*c0 + B*c1 + C

  if (Math.abs(qa) < epsilon) return 0
  var qs = qb*qb-4*qa*qc
  if (qs < 0) return 0
  var qsq = Math.sqrt(qs)/(2*qa)
  var v = Math.abs(a0-b0) < epsilon
  var n = 0
  var t0 = -qb + qsq
  var t1 = -qb - qsq

  var l0min = Math.min(a0,b0), l0max = Math.max(a0,b0)
  var l1min = Math.min(a1,b1), l1max = Math.max(a1,b1)

  if (0.0 <= t0 && t0 <= 1.0) {
    var x0 = bz(c0,c2,c4,t0)
    if (l0min-epsilon <= x0 && x0 <= l0max+epsilon) {
      var y0 = bz(c1,c3,c5,t0)
      if (l1min-epsilon <= y0 && y0 <= l1max+epsilon) {
        out[n*2+0] = x0
        out[n*2+1] = y0
        n++
      }
    }
  }
  if (0.0 <= t1 && t1 <= 1.0) {
    var x1 = bz(c0,c2,c4,t1)
    if (l0min-epsilon <= x1 && x1 <= l0max+epsilon) {
      var y1 = bz(c1,c3,c5,t1)
      if (l1min-epsilon <= y1 && y1 <= l1max+epsilon) {
        out[n*2+0] = x1
        out[n*2+1] = y1
        n++
      }
    }
  }
  return n
}
