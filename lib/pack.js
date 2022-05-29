var varint = require('varint')
var cubic2quad = require('cubic2quad')

module.exports = function pack(g) {
  var digits = g.unicodes.length === 1
    ? [
      0,
      g.unicodes[0],
      g.advanceWidth,
      g.leftSideBearing,
      g.xMin ?? 0, g.yMin ?? 0, g.xMax ?? 0, g.yMax ?? 0
    ]
    : [
      1,
      g.unicodes[0],
      g.unicodes[1],
      g.advanceWidth,
      g.leftSideBearing,
      g.xMin ?? 0, g.yMin ?? 0, g.xMax ?? 0, g.yMax ?? 0
    ]
  var hlen = digits.length - 6
  var n = 0
  var p = { x: 0, y: 0 }
  for (var i = 0; i < g.path.commands.length; i++) {
    var c = g.path.commands[i]
    var cx = Math.floor(c.x), cy = Math.floor(c.y)
    var cx1 = Math.floor(c.x1), cy1 = Math.floor(c.y1)
    var cx2 = Math.floor(c.x2), cy2 = Math.floor(c.y2)
    if (c.type === 'M') {
      digits.push((cx-p.x)*3+0, cy-p.y)
      n++
    } else if (c.type === 'L') {
      digits.push((cx-p.x)*3+1, cy-p.y)
      n++
    } else if (c.type === 'Q') {
      digits.push((cx1-p.x)*3+2, cy1-p.y, cx-p.x, cy-p.y)
      n++
    } else if (c.type === 'C') {
      var quads = cubic2quad(p.x, p.y, cx1, cy1, cx2, cy2, cx, cy, 0.1)
      var x = p.x, y = p.y
      for (var j = 2; j < quads.length; j+=4) {
        digits.push((quads[j+0]-x)*3+2, (quads[j+1]-y), quads[j+2]-x, quads[j+3]-y)
        x = quads[j+2]
        y = quads[j+3]
        n++
      }
    } else {
      continue
    }
    p.x = cx
    p.y = cy
  }
  digits[0] += n*2
  var size = 0
  for (var i = 0; i < hlen; i++) {
    size += varint.encodingLength(digits[i])
  }
  for (var i = hlen; i < digits.length; i++) {
    size += encodingLength(digits[i])
  }
  var buf = Buffer.alloc(size) // todo: Uint8Array
  var offset = 0
  for (var i = 0; i < hlen; i++) {
    varint.encode(digits[i], buf, offset)
    offset += varint.encode.bytes
  }
  for (var i = hlen; i < digits.length; i++) {
    offset += encode(digits[i], buf, offset)
  }
  if (size !== offset) throw new Error(`mismatch ${size} != ${offset}`)
  return buf
}

function encode(x, out, offset) { varint.encode(x < 0 ? Math.abs(x+1)*2+1 : x*2+0, out, offset)
  return varint.encode.bytes
}

function encodingLength(x) {
  return varint.encodingLength(x < 0 ? Math.abs(x+1)*2+1 : x*2+0)
}
