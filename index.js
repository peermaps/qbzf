var lsi = require('line-segment-intersect-2d')
var vec2set = require('gl-vec2/set')
var vec2dist = require('gl-vec2/distance')
var varint = require('varint')
var magic = require('./lib/magic.js')
var bzri = require('./lib/bzri.js')
var mivxa = require('./lib/mivxa.js')
var raycast = require('./lib/raycast.js')
var bz = require('./lib/bz.js')
var bzli = require('./lib/bzli.js')
var ieee754 = require('ieee754')

var tri = [[0,0],[0,0],[0,0]]
var rect = [0,0,0,0]
var v0 = [0,0], v1 = [0,0], v2 = [0,0], v3 = [0,0], v4 = [0,0]
var l0 = [0,0,0,0], l1 = [0,0,0,0]
var origin = [0,0]

module.exports = QBZF

function QBZF(src, opts) {
  if (!(this instanceof QBZF)) return new QBZF(src, opts)
  if (!opts) opts = {}
  this._glyphs = new Map
  this._matches = new Map
  this._iv = new Map
  this._offsets = new Map
  this._index = 0
  this.unitsPerEm = 0
  this._epsilon = opts.epsilon ?? 1e-8
  this._parse(src)
  this.curves = this._buildCurves()
}

QBZF.prototype._parse = function (src) {
  var offset = 0
  for (; offset < src.length && src[offset] !== 0x0a; offset++);
  if (!(vcmp(src,0,offset,magic,0,magic.length))) {
    throw new Error('magic number not found. not a valid qbzf1 file.')
  }
  offset++
  this.unitsPerEm = varint.decode(src, offset)
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
    var advanceWidth = decode(src, offset)
    offset += varint.decode.bytes
    var leftSideBearing = decode(src, offset)
    offset += varint.decode.bytes
    var xmin = decode(src, offset)
    offset += varint.decode.bytes
    var ymin = decode(src, offset)
    offset += varint.decode.bytes
    var xmax = decode(src, offset)
    offset += varint.decode.bytes
    var ymax = decode(src, offset)
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
        var c0 = px, c1 = py, c2 = cx+px, c3 = cy+py
        if (Math.abs(c0-c2) < this._epsilon && Math.abs(c1-c3) < this._epsilon) continue
        curves.push([c0,c1,c2,c3])
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
  var w = Math.ceil(Math.sqrt(this._index/3))
  var h = Math.ceil(this._index/w)
  var data = new Uint8Array(w*h*3*4)
  for (var [key,g] of this._glyphs) {
    for (var i = 0; i < g.curves.length; i++) {
      var c = g.curves[i]
      var offset = g.indexes[i]*3*4
      if (c.length === 4) {
        writeI16(data, offset+0, c[0]-g.bbox[0])
        writeI16(data, offset+2, c[1]-g.bbox[1])
        writeI16(data, offset+4, c[0]-g.bbox[0])
        writeI16(data, offset+6, c[1]-g.bbox[1])
        writeI16(data, offset+8, c[2]-g.bbox[0])
        writeI16(data, offset+10, c[3]-g.bbox[1])
      } else if (c.length === 6) {
        writeI16(data, offset+0, c[0]-g.bbox[0])
        writeI16(data, offset+2, c[1]-g.bbox[1])
        writeI16(data, offset+4, c[2]-g.bbox[0])
        writeI16(data, offset+6, c[3]-g.bbox[1])
        writeI16(data, offset+8, c[4]-g.bbox[0])
        writeI16(data, offset+10, c[5]-g.bbox[1])
      }
    }
  }
  return { data, width: w*3, height: h, size: [w,h] }
}

QBZF.prototype.measure = function (opts) {
  // calculate parameters for write(): grid, n, size
  throw new Error('not implemented')
}

QBZF.prototype.write = function (opts) {
  var size = opts.size
  var grid = opts.grid
  var n = opts.n
  var text = opts.text
  var length = grid[0]*grid[1]*(n*3+2)*4
  var data = opts.data ?? new Uint8Array(length)
  this._matches.clear()
  if (data.length < length) {
    throw new Error(`insufficient supplied data in qbzf.write. required: ${length} received: ${data.length}`)
  }
  if (data.length > length) {
    data = data.subarray(0,length)
  }
  var offset = opts.offset || origin
  var x = offset[0]
  var y = offset[1]
  for (var i = 0; i < text.length; i++) {
    // todo: lookahead for multi-codepoint
    var c = text.charCodeAt(i)
    x += this._stamp(c, x, y, size, grid, n, data)
  }
  return { data, width: grid[0]*(n*3+2), height: grid[1], size, grid, n }
}

QBZF.prototype._stamp = function (code, sx, sy, size, grid, n, data) {
  var g = this._glyphs.get(String(code))
  if (g === undefined) throw new Error(`todo: glyph or hook for code not found: ${code}`)
  var px = sx + g.bbox[0], py = sy + g.bbox[1]
  var xstart = Math.max(0, Math.floor((px + g.bbox[0] - g.leftSideBearing) / size[0] * grid[0]))
  var xend = Math.ceil((px + g.bbox[2] - g.leftSideBearing) / size[0] * grid[0])
  var ystart = Math.max(0, Math.floor((sy + g.bbox[1]) / size[1] * grid[1]))
  var yend = Math.min(grid[1],Math.ceil((sy + g.bbox[3]) / size[1] * grid[1]))
  var sg0 = size[0]/grid[0]
  var sg1 = size[1]/grid[1]
  for (var gy = ystart; gy < yend; gy++) {
    for (var gx = xstart; gx < xend; gx++) {
      rect[0] = gx/grid[0]*size[0]
      rect[1] = gy/grid[1]*size[1]
      rect[2] = (gx+1)/grid[0]*size[0]
      rect[3] = (gy+1)/grid[1]*size[1]
      var r0 = rect[0] - px + g.bbox[0]
      var r1 = rect[1] - py + g.bbox[1]
      var r2 = rect[2] - px + g.bbox[0]
      var r3 = rect[3] - py + g.bbox[1]
      var gk = gx+gy*grid[0]
      var m = this._matches.get(gk) ?? 0

      var urc = 0
      for (var i = 0; i < g.curves.length; i++) {
        var c = g.curves[i]
        urc += this._countRaycast(r2,r3,c,size[1])
      }
      var rc = []
      for (var i = 0; i < g.curves.length; i++) {
        var c = g.curves[i]
        if (c.length === 4) {
          vec2set(v1,c[0],c[1])
          vec2set(v2,c[2],c[3])
          vec2set(v3,r2,r1)
          vec2set(v4,r2,r3)
          if (Math.abs(r2-c[0]) < this._epsilon || Math.abs(r2-c[2]) < this._epsilon) {
            v3[0] += this._epsilon
            v4[0] += this._epsilon
          }
          if (lsi(v0,v1,v2,v3,v4)) {
            rc.push(v0[1]+py-g.bbox[1])
          }
        } else {
          vec4set(l0, r2, r1, r2, r3)
          if (Math.abs(r2-c[0]) < this._epsilon || Math.abs(r2-c[4]) < this._epsilon) {
            l0[0] += this._epsilon
            l0[2] += this._epsilon
          }
          var ln = bzli(l1,c,l0,1e-8)
          for (var j = 0; j < ln; j++) {
            rc.push(l1[j*2+1]+py-g.bbox[1])
          }
        }
      }
      rc.sort(cmp)
      var iv = this._iv.get(gk) ?? []
      var q = 0
      if (urc % 2 === 0 && rc.length === 0) {
        q = 1
      } else if (urc % 2 === 1 && rc.length === 0) {
        q = 2
        iv.push(rect[1],rect[3])
      } else if (urc % 2 === 0 && rc.length % 2 === 0) {
        q = 3
        iv = iv.concat(rc)
      } else if (urc % 2 === 0 && rc.length % 2 === 1) {
        q = 4
        iv.push(rect[1])
        iv = iv.concat(rc)
      } else if (urc % 2 === 1 && rc.length % 2 === 0) {
        q = 5
        iv = iv.concat(rc)
        iv.push(rect[1],rect[3])
      } else if (urc % 2 === 1 && rc.length % 2 === 1) {
        q = 6
        iv = iv.concat(rc)
        iv.push(rect[3])
      }

      for (var i = 0; i < g.curves.length; i++) {
        var c = g.curves[i]
        if (!curveRectIntersect(c,rect,px-g.bbox[0],py-g.bbox[1])) {
          continue
        }
        if (m >= n) throw new Error(`grid density overflow from n=${n} grid=[${grid[0]},${grid[1]}]`)
        var offset = (gk*(n*3+2)+2+m*3)*4
        var index = g.indexes[i]+1
        writeU24(data, offset+0, index)
        writeF32(data, offset+4, rect[0]-px)
        writeF32(data, offset+8, rect[1]-py)
        m++
      }
      this._matches.set(gk, m)
      var y0 = 0, y1 = 0
      if (iv.length > 0) {
        mivxa(iv, iv, vec2set(v0, rect[1], rect[3]), 1e-8)
        if (iv.length === 2) {
          y0 = iv[0] ?? rect[1]
          y1 = iv[1] ?? rect[1]
        } else if (iv.length === 4) {
          iv.push(rect[1], rect[3])
          mivxa(iv, iv, vec2set(v0, rect[1], rect[3]), 1e-8)
          y1 = iv[0] ?? rect[1]
          y0 = iv[1] ?? rect[1]
        } else if (iv.length > 0) {
          console.log('TODO',gx,gy,iv)
        }
      }

      this._iv.set(gk, iv)
      var offset = (gx+gy*grid[0])*(n*3+2)*4
      writeF32(data, offset+0, y0-rect[1])
      writeF32(data, offset+4, y1-rect[1])
    }
  }
  return g.advanceWidth - g.leftSideBearing
}

QBZF.prototype._countRaycast = function (x, y, c, xfar) {
  vec2set(v0,x,y)
  if (Math.abs(c[1]-v0[1]) < this._epsilon) v0[1] += this._epsilon * (c[1] < c[5] ? 1 : -1)
  else if (Math.abs(c[5]-v0[1]) < this._epsilon) v0[1] += this._epsilon * (c[1] < c[5] ? -1 : 1)
  return countRaycast(v0, c, xfar, this._epsilon)
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

function curveRectIntersect(c, rect, dx, dy) {
  if (c.length === 4) { // line
    var c0 = c[0]+dx, c1 = c[1]+dy, c2 = c[2]+dx, c3 = c[3]+dy
    if (rect[0] <= c0 && c0 <= rect[2] && rect[1] <= c1 && c1 <= rect[3]) return true
    if (rect[0] <= c2 && c2 <= rect[2] && rect[1] <= c3 && c3 <= rect[3]) return true
    vec2set(v1, c0, c1)
    vec2set(v2, c2, c3)
    if (lsi(v0, v1, v2, vec2set(v3,rect[0],rect[1]), vec2set(v4,rect[0],rect[3]))) return true
    if (lsi(v0, v1, v2, vec2set(v3,rect[0],rect[3]), vec2set(v4,rect[2],rect[3]))) return true
    if (lsi(v0, v1, v2, vec2set(v3,rect[2],rect[3]), vec2set(v4,rect[2],rect[1]))) return true
    if (lsi(v0, v1, v2, vec2set(v3,rect[2],rect[1]), vec2set(v4,rect[0],rect[1]))) return true
  } else if (c.length === 6) { // quadratic bezier
    return bzri(rect, c, dx, dy, 1e-8) // todo: padding for border width
  }
  return false
}

function writeU16(out, offset, x) {
  out[offset+0] = (x >> 8) % 256
  out[offset+1] = x % 256
}
function writeI16(out, offset, x) {
  var ax = Math.abs(x)
  out[offset+0] = (ax >> 8) % 128 + (x < 0 ? 128 : 0)
  out[offset+1] = ax % 256
}
function writeU24(out, offset, x) {
  out[offset+0] = (x >> 16) % 256
  out[offset+1] = (x >> 8) % 256
  out[offset+2] = x % 256
}
function writeI24(out, offset, x) {
  var ax = Math.abs(x)
  out[offset+0] = (ax >> 16) % 128 + (x < 0 ? 128 : 0)
  out[offset+1] = ax >> 8
  out[offset+2] = ax % 256
}
function writeF32(out, offset, x) {
  ieee754.write(out, x, offset, false, 23, 4)
}

function countRaycast(p, c, xfar, epsilon) {
  var x = p[0], y = p[1]
  var count = 0
  if (c.length === 4) {
    vec2set(v1,c[0],c[1])
    vec2set(v2,c[2],c[3])
    vec2set(v3,p[0],p[1])
    vec2set(v4,xfar,p[1])
    if (collinear(v3,v4,v1,epsilon) || collinear(v3,v4,v2,epsilon)) {
      //console.log('collinear', p, c)
    } else if (lsi(v0,v1,v2,v3,v4)) count++
  } else {
    var n = raycast(v0, y, c[1], c[3], c[5])
    if (n > 0) {
      var x0 = bz(c[0],c[2],c[4],v0[0])
      if (x0 > x) count++
    }
    if (n > 1) {
      var x1 = bz(c[0],c[2],c[4],v0[1])
      if (x1 > x) count++
    }
  }
  return count
}

function collinear(a, b, c, epsilon) {
  var ab = vec2dist(a,b)
  var ac = vec2dist(a,c)
  var bc = vec2dist(b,c)
  return Math.abs(ab - ac - bc) < epsilon
}

function vec4set(out, a, b, c, d) {
  out[0] = a
  out[1] = b
  out[2] = c
  out[3] = d
  return out
}

function cmp(a,b) { return a < b ? -1 : +1 }
