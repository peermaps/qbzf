module.exports = function raycast(out, x, b0, b1, b2, epsilon) {
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
