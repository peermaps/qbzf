module.exports = function cmp(a,b) {
  var l = Math.min(a.length,b.length)
  for (var i = 0; i < l; i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return +1
  }
  if (a.length === b.length) return 0
  return a.length < b.length ? -1 : +1
}
