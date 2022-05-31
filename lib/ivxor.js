module.exports = function ivxor(out, i, a, ia, b, ib, epsilon) {
  if (epsilon === undefined) epsilon = 1e-8
  var a0 = a[ia+0], a1 = a[ia+1], b0 = b[ib+0], b1 = b[ib+1]
  if (Math.abs(a1-b0) < epsilon) {
    out[i++] = a0
    out[i++] = b1
  } else if (Math.abs(a0-b1) < epsilon) {
    out[i++] = b0
    out[i++] = a1
  } else if (a0 <= b0 && b0 <= a1 && a0 <= b1 && b1 <= a1) {
    out[i++] = a0
    out[i++] = b0
    out[i++] = b1
    out[i++] = a1
  } else if (a0 <= b0 && b0 <= a1) {
    out[i++] = a0
    out[i++] = b0
    out[i++] = a1
    out[i++] = b1
  } else if (b0 <= a0 && a0 <= b1 && b0 <= a1 && a1 <= b1) {
    out[i++] = b0
    out[i++] = a0
    out[i++] = a1
    out[i++] = b1
  } else if (b0 <= a0 && a0 <= b1) {
    out[i++] = b0
    out[i++] = a0
    out[i++] = b1
    out[i++] = a1
  } else if (a1 < b0) {
    out[i++] = a0
    out[i++] = a1
    out[i++] = b0
    out[i++] = b1
  } else {
    out[i++] = b0
    out[i++] = b1
    out[i++] = a0
    out[i++] = a1
  }
  return i
}
