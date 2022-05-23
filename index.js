var varint = require('varint')

module.exports = function (src) {
  var offset = 0
  for (; offset < src.length && src[offset] !== 0x0a; offset++);
  //console.error(src.slice(0,offset))
  offset++
  var unitsPerEm = varint.decode(src, offset)
  offset += varint.decode.bytes

  var curves = new Map
  while (offset < src.length) {
    var xndigits = varint.decode(src, offset)
    var ndigits = xndigits>>1
    offset += varint.decode.bytes
    var u0 = varint.decode(src, offset)
    offset += varint.decode.bytes
    var u1 = -1
    var key = String(u0)
    if (xndigits % 2 === 1) {
      u1 = varint.decode(src, offset)
      offset += varint.decode.bytes
      key += ',' + String(u1)
    }
    var advanceWidth = varint.decode(src, offset)
    offset += varint.decode.bytes
    var leftSideBearing = varint.decode(src, offset)
    offset += varint.decode.bytes
    var xmin = varint.decode(src, offset)
    offset += varint.decode.bytes
    var ymin = varint.decode(src, offset)
    offset += varint.decode.bytes
    var xmax = varint.decode(src, offset)
    offset += varint.decode.bytes
    var ymax = varint.decode(src, offset)
    offset += varint.decode.bytes
    var px = 0, py = 0
    var cs = []
    for (var n = 0; n < ndigits; n++) {
      var cx = decode(src, offset)
      offset += varint.decode.bytes
      var cxr = ((cx%3)+3)%3
      cx = Math.floor(cx/3)
      var cy = decode(src, offset)
      offset += varint.decode.bytes
      if (cxr === 0) { // M
        px += cx
        py += cy
      } else if (cxr === 1) { // L
        cs.push([ px, py, cx+px, cy+py ])
        px += cx
        py += cy
      } else if (cxr === 2) { // Q
        var nx = decode(src, offset)
        offset += varint.decode.bytes
        var ny = decode(src, offset)
        offset += varint.decode.bytes
        cs.push([ px, py, cx+px, cy+py, nx+px, ny+py ])
        px += nx
        py += ny
      }
    }
    curves.set(key, cs)
  }
  var result = {
    data: null,
    codes: new Map,
  }
}

function decode(src, offset) {
  var x = varint.decode(src, offset)
  return x % 2 === 1 ? -(x-1)/2-1 : x/2
}
