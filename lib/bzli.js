var bz = require('./bz.js')
var lb = [0,0,0,0]

module.exports = function bzli(out, c, l, epsilon) {
  if (epsilon === undefined) epsilon = 1e-8
  var c0 = c[0], c1 = c[1], c2 = c[2], c3 = c[3], c4 = c[4], c5 = c[5]
  var l0 = l[0], l1 = l[1], l2 = l[2], l3 = l[3]
  lb[0] = Math.min(l0,l2)
  lb[1] = Math.min(l1,l3)
  lb[2] = Math.max(l0,l2)
  lb[3] = Math.max(l1,l3)

  // y = mx+b
  // l1 = m*l0+b
  // l3 = m*l2+b
  // m = (l1-l3)/(l0-l2)
  // b = l1-m*l0
  // y = (l1-l3)/(l0-l2)*x + l1-(l1-l3)/(l0-l2)*l0
  // y*(l0-l2) = (l1-l3)*x + l1*(l0-l2) - (l1-l3)*l0
  // y*(l0-l2) - (l1-l3)*x - l1*(l0-l2) + (l1-l3)*l0 = 0
  // A = l3-l1
  // B = l0-l2
  // C = l1*l0 - l3*l0 - l1*l0 + l1*l2
  // C = - l3*l0 + l1*l2
  // C = l1*l2 - l0*l3

  // y-y1 = m*(x-x1)
  // y-l1 = (l1-l3)/(l0-l2)*(x-l0)
  // (y-l1)*(l0-l2) = (l1-l3)*(x-l0)
  // y*(l0-l2) - l1*(l0-l2) = l1*(x-l0) - l3*(x-l0)
  // y*(l0-l2) - l1*(l0-l2) = l1*x - l1*l0 - l3*x + l3*l0
  // y*(l0-l2) - l1*(l0-l2) = (l1-l3)*x - l1*l0 + l3*l0
  // y*(l0-l2) - l1*l0 + l1*l2 = (l1-l3)*x - l1*l0 + l3*l0
  // y*(l0-l2) = (l1-l3)*x + l0*l3 - l1*l2
  // y*(l0-l2) - (l1-l3)*x - l0*l3 + l1*l2 = 0
  // A*x + B*y + C = 0
  // A = l3-l1
  // B = l0-l2
  // C = l1*l2 - l0*l3

  // A*x + B*y + C = 0
  // x = c0*(1-t)*(1-t) + 2*c2*(1-t)*t + c4*t*t
  // y = c1*(1-t)*(1-t) + 2*c3*(1-t)*t + c5*t*t

  // A*(c0*(1-t)*(1-t) + 2*c2*(1-t)*t + c4*t*t) + B*(c1*(1-t)*(1-t) + 2*c3*(1-t)*t + c5*t*t) + C = 0

  // t*t * (A*c0 - 2*A*c2 + A*c4 + B*c1 - 2*B*c3 + B*c5) \
  // + t * (-2*A*c0 + 2*A*c2 - 2*B*c1 + 2*B*c3)
  // + A*c0 + B*c1 + C = 0

  var A = l3-l1
  var B = l0-l2
  var C = l1*l2 - l0*l3
  var qa = A*c0 - 2*A*c2 + A*c4 + B*c1 - 2*B*c3 + B*c5
  var qb = -2*A*c0 + 2*A*c2 - 2*B*c1 + 2*B*c3
  var qc = A*c0 + B*c1 + C

  if (Math.abs(qa) < epsilon) return 0
  var qs = qb*qb-4*qa*qc
  if (qs < 0) return 0
  var qsq = Math.sqrt(qs)
  var t0 = (-qb + qsq) / (2*qa)
  var t1 = (-qb - qsq) / (2*qa)

  var n = 0
  if (0.0 <= t0 && t0 <= 1.0) {
    var x0 = bz(c0,c2,c4,t0)
    var y0 = bz(c1,c3,c5,t0)
    if (checkLine(x0,y0,lb,epsilon)) {
      out[n*2+0] = x0
      out[n*2+1] = y0
      n++
    }
  }
  if (0.0 <= t1 && t1 <= 1.0) {
    var x1 = bz(c0,c2,c4,t1)
    var y1 = bz(c1,c3,c5,t1)
    if (checkLine(x1,y1,lb,epsilon)) {
      out[n*2+0] = x1
      out[n*2+1] = y1
      n++
    }
  }
  return n
}

function checkLine(x,y,lb,epsilon) {
  return lb[0]-epsilon <= x && x <= lb[2]+epsilon && lb[1]-epsilon <= y && y <= lb[3]+epsilon
}
