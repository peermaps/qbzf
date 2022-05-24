var varint = require('varint')
var magic = [0x71,0x62,0x7a,0x66,0x31] // qbzf1
var pointInTriangle = require('point-in-triangle')
var lsi = require('line-segment-intersect-2d')
var vec2set = require('gl-vec2/set')
var tri = [[0,0],[0,0],[0,0]]
var rect = [0,0,0,0]
var v0 = [0,0], v1 = [0,0], v2 = [0,0], v3 = [0,0], v4 = [0,0]

module.exports = QBZF

function QBZF(src) {
  if (!(this instanceof QBZF)) return new QBZF(src)
  this._glyphs = new Map
  this._matches = new Map
  this._offsets = new Map
  this._index = 0
  this._parse(src)
  this.curves = this._buildCurves()
}

QBZF.prototype._parse = function (src) {
  var offset = 0
  for (; offset < src.length && src[offset] !== 0x0a; offset++);
  if (!(vcmp(src,0,offset,magic,0,magic.length))) return null
  offset++
  this._unitsPerEm = varint.decode(src, offset)
  offset += varint.decode.bytes

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
    var curves = [], indexes = []
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
        curves.push([ px, py, cx+px, cy+py ])
        indexes.push(this._index++)
        px += cx
        py += cy
      } else if (cxr === 2) { // Q
        var nx = decode(src, offset)
        offset += varint.decode.bytes
        var ny = decode(src, offset)
        offset += varint.decode.bytes
        curves.push([ px, py, cx+px, cy+py, nx+px, ny+py ])
        indexes.push(this._index++)
        px += nx
        py += ny
      }
    }
    this._glyphs.set(key, {
      curves,
      indexes,
      leftSideBearing,
      advanceWidth,
      bbox: [xmin,ymin,xmax,ymax],
    })
  }
}

QBZF.prototype._buildCurves = function () {
  var w = Math.ceil(Math.sqrt(this._index)/3)
  var h = Math.ceil(this._index/w)
  var data = new Uint8Array(w*h*3*4)
  for (var [key,g] of this._glyphs) {
    for (var i = 0; i < g.curves.length; i++) {
      var c = g.curves[i]
      var offset = (g.indexes[i]%w)*(3*4)
      if (c.length === 4) {
        data[offset+0] = (c[0] >> 8) % 256
        data[offset+1] = c[0] % 256
        data[offset+2] = (c[1] >> 8) % 256
        data[offset+3] = c[1] % 256
        data[offset+4] = (c[0] >> 8) % 256
        data[offset+5] = c[0] % 256
        data[offset+6] = (c[1] >> 8) % 256
        data[offset+7] = c[1] % 256
        data[offset+8] = (c[2] >> 8) % 256
        data[offset+9] = c[2] % 256
        data[offset+10] = (c[3] >> 8) % 256
        data[offset+11] = c[3] % 256
      } else if (c.length === 6) {
        data[offset+0] = (c[0] >> 8) % 256
        data[offset+1] = c[0] % 256
        data[offset+2] = (c[1] >> 8) % 256
        data[offset+3] = c[1] % 256
        data[offset+4] = (c[2] >> 8) % 256
        data[offset+5] = c[2] % 256
        data[offset+6] = (c[3] >> 8) % 256
        data[offset+7] = c[3] % 256
        data[offset+8] = (c[4] >> 8) % 256
        data[offset+9] = c[4] % 256
        data[offset+10] = (c[5] >> 8) % 256
        data[offset+11] = c[5] % 256
      }
    }
  }
  return { data, width: w, height: h }
}

QBZF.prototype.estimate = function (opts) {
  // calculate parameters for write(): grid, n, size
  throw new Error('not implemented')
}

QBZF.prototype.write = function (opts) {
  var size = opts.size
  var grid = opts.grid
  var n = opts.n
  var text = opts.text
  var length = grid[0]*grid[1]*n*2*4
  var data = opts.data ?? new Uint8Array(length)
  this._matches.clear()
  if (data.length < length) {
    throw new Error(`insufficient supplied data in qbzf.write. required: ${length} received: ${data.length}`)
  }
  if (data.length > length) {
    data = data.subarray(0,length)
  }
  var x = 0
  for (var i = 0; i < text.length; i++) {
    // todo: lookahead for multi-codepoint
    var c = text.charCodeAt(i)
    x += this._stamp(c, x, 0, size, grid, n, data)
  }
  return data
}

QBZF.prototype._stamp = function (code, px, py, size, grid, n, data) {
  var g = this._glyphs.get(String(code))
  if (g === undefined) throw new Error('todo: glyph or hook for code not found')
  var xstart = Math.floor((px + g.bbox[0] - g.leftSideBearing) / size[0] * grid[0])
  var xend = Math.floor((px + g.bbox[2] - g.leftSideBearing) / size[0] * grid[0])
  var ystart = Math.floor((py + g.bbox[1]) / size[1] * grid[1])
  var yend = Math.floor((py + g.bbox[3]) / size[1] * grid[1])
  for (var y = ystart; y < yend; y++) {
    for (var x = xstart; x < xend; x++) {
      for (var i = 0; i < g.curves.length; i++) {
        var c = g.curves[i]
        rect[0] = x/grid[0]*size[0]
        rect[1] = y/grid[1]*size[1]
        rect[2] = (x+1)/grid[0]*size[1]
        rect[3] = (y+1)/grid[1]*size[1]
        if (!curveRectIntersect(c,rect)) continue
        var m = this._matches.get(x+y*size[0]) ?? 0
        if (m >= n) throw new Error(`grid density overflow from n=${n} grid=[${grid[0]},${grid[1]}]`)
        this._matches.set(x+y*size[0], m+1)
        var offset = ((x+y*size[0])*n+m)*2*4
        var index = g.indexes[i]
        data[offset+0] = (index >> 16) % 256
        data[offset+1] = (index >> 8) % 256
        data[offset+2] = index % 256
        data[offset+3] = 0
        data[offset+4] = ((px - x) >> 8) % 256
        data[offset+5] = (px - x) % 256
        data[offset+6] = ((py - y) >> 8) % 256
        data[offset+7] = (py - y) % 256
      }
    }
  }
  return x + g.advanceWidth
}

function decode(src, offset) {
  var x = varint.decode(src, offset)
  return x % 2 === 1 ? -(x-1)/2-1 : x/2
}

function vcmp(a,astart,aend,b,bstart,bend) {
  if (bend-bstart !== aend-astart) return false
  for (var i = 0; i < aend-astart; i++) {
    if (a[i+astart] !== b[i+bstart]) return false
  }
  return true
}

function curveRectIntersect(c, rect) {
  if (c.length === 4) {
    if (rect[0] <= c[0] && c[0] <= rect[2] && rect[1] <= c[1] && c[1] <= rect[3]) return true
    vec2set(v1, c[0], c[1])
    vec2set(v2, c[2], c[3])
    if (lsi(v0, v1, v2, vec2set(v3,rect[0],rect[1]), vec2set(v4,rect[0],rect[3]))) return true
    if (lsi(v0, v1, v2, vec2set(v3,rect[0],rect[3]), vec2set(v4,rect[2],rect[3]))) return true
    if (lsi(v0, v1, v2, vec2set(v3,rect[2],rect[3]), vec2set(v4,rect[2],rect[1]))) return true
    if (lsi(v0, v1, v2, vec2set(v3,rect[2],rect[1]), vec2set(v4,rect[0],rect[1]))) return true
  } else if (c.length === 6) { // actually the triangle but close enough approximation
    if (rect[0] <= c[0] && c[0] <= rect[2] && rect[1] <= c[1] && c[1] <= rect[3]) return true
    vec2set(tri[0], c[0], c[1])
    vec2set(tri[1], c[2], c[3])
    vec2set(tri[2], c[4], c[5])
    if (pointInTriangle(vec2set(v0,rect[0],rect[1]),tri)) return true
    for (var i = 0; i < 3; i++) {
      if (lsi(v0, tri[i], tri[(i+1)%3], vec2set(v1,rect[0],rect[1]), vec2set(v2,rect[0],rect[3]))) return true
      if (lsi(v0, tri[i], tri[(i+1)%3], vec2set(v1,rect[0],rect[3]), vec2set(v2,rect[2],rect[3]))) return true
      if (lsi(v0, tri[i], tri[(i+1)%3], vec2set(v1,rect[2],rect[3]), vec2set(v2,rect[2],rect[1]))) return true
      if (lsi(v0, tri[i], tri[(i+1)%3], vec2set(v1,rect[2],rect[1]), vec2set(v2,rect[0],rect[1]))) return true
    }
  }
  return false
}
