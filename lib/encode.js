var varint = require('varint')
var magic = require('./magic.js')

module.exports = function (font) {
  var hsize = magic.length + 1 + varint.encodingLength(font.unitsPerEm)
  var header = Buffer.alloc(hsize)
  magic.copy(header, 0)
  header[magic.length] = 0x0a
  varint.encode(font.unitsPerEm, buf, magic.length+1)
  var buffers = Array(1+font.glyphs.length)
  buffers[0] = header
  for (var i = 0; i < font.glyphs.length; i++) {
    buffers[i+1] = pack(font.glyphs[i])
  }
  return Buffer.concat(buffers)
}
