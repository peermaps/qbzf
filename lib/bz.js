module.exports = function bz(a, b, c, t) {
  var t1 = 1.0-t
  return t1*t1*a + 2.0*t1*t*b + t*t*c
}
