module.exports = Atlas

function Atlas(qbzf, opts) {
  if (!(this instanceof Atlas)) return new Atlas(qbzf, opts)
  if (!opts) opts = {}
  this._qbzf = qbzf
  this._attributes = opts.attributes || []
  this._id = new Map
  this._nextId = 0
  this._data = {
    curves: qbzf.curves,
    grid: {},
  }
  this._gridSet = new Set
  this.grids = []
}

Atlas.prototype.add = function (opts) {
  var x = opts.offset ? opts.offset[0] : 0, y = opts.offset ? opts.offset[1] : 0
  var xopts = Object.assign({}, opts, { offset: undefined })
  var m = this._qbzf.measure(xopts)
  var h = opts.height || 0.1
  var ux = h*m.units[0]/this._qbzf.unitsPerEm
  var uy = h*m.units[1]/this._qbzf.unitsPerEm
  var g = this._qbzf.write(xopts)
  var d = this._getGrid(g.n)
  var n = d.positions.length/2
  d.positions.push(x,y, x+ux,y, x+ux,y-uy, x,y-uy)
  d.uv.push(0,1, 1,1, 1,0, 0,0)
  d.cells.push(n+0, n+1, n+2, n+0, n+2, n+3)
  d.units.push(g.units,g.units,g.units,g.units)
  d.size.push(g.grid,g.grid,g.grid,g.grid)
  d.dim.push(g.dimension,g.dimension,g.dimension,g.dimension)
  var sw = g.strokeWidth
  d.strokeWidth.push(sw,sw,sw,sw)
  for (var i = 0; i < this._attributes.length; i++) {
    var key = this._attributes[i]
    var v = opts[key]
    d[key].push(v,v,v,v)
  }
  d.grids.push(g)
  var p = d.grids[d.grids.length-2]
  g.offset = p ? p.offset + p.grid[0]*p.grid[1]*(p.n*3+2) : 0
  d.offsets.push(g.offset, g.offset, g.offset, g.offset)
  var id = opts.id
  if (id === undefined) {
    do {
      id = this._nextId++
    } while (this._id.has(id))
  }
  this._id.set(id, g.n)
  d.ids.push(id)
  if (!this._gridSet.has(g.n)) {
    this._gridSet.add(g.n)
    this.grids.push(g.n)
  }
  return id
}

Atlas.prototype.remove = function (id) {
  var n = this._id.get(id)
  if (n === undefined) return
  var g = this._data.grid[n]
  if (!g) return
  var ix = g.ids.indexOf(id)
  if (ix >= 0) {
    g.ids.splice(ix,1)
    g.grids.splice(ix,1)
  }
  if (g.ids.length === 0) {
    delete this._data.grid[n]
    this._gridSet.delete(n)
    var ix = this.grids.indexOf(n)
    if (ix >= 0) this.grids.splice(ix,1)
  }
}

Atlas.prototype.clear = function () {
  this.grids = []
  this._gridSet.clear()
  this._id.clear()
  this._data.grid = {}
}

Atlas.prototype._getGrid = function (n) {
  if (!this._data.grid[n]) {
    var data = {
      curves: this._data.curves,
      positions: [],
      uv: [],
      cells: [],
      offsets: [],
      units: [],
      size: [],
      dim: [],
      strokeWidth: [],
      fillColor: [],
      strokeColor: [],
      grid: {},
      grids: [],
      ids: [],
    }
    this._data.grid[n] = data
    for (var i = 0; i < this._attributes.length; i++) {
      data[this._attributes[i]] = []
    }
    this.grids.push(n)
    this._gridSet.add(n)
  }
  return this._data.grid[n]
}

Atlas.prototype.build = function () {
  var ns = Object.keys(this._data.grid)
  var data = {}
  for (var i = 0; i < ns.length; i++) {
    var n = ns[i]
    var d = this._getGrid(n)
    Object.assign(d.grid, concat(d.grids))
    data[n] = d
  }
  return data
}

function concat(grids) {
  var len = 0
  for (var i = 0; i < grids.length; i++) {
    var g = grids[i]
    len += g.grid[0]*g.grid[1]*(g.n*3+2)
  }
  var width = Math.ceil(Math.sqrt(len))
  var height = Math.ceil(len/width)
  var data = new Uint8Array(width*height*4)
  for (var offset = 0, i = 0; i < grids.length; i++) {
    var g = grids[i], l = g.grid[0]*g.grid[1]*(g.n*3+2)*4
    for (var j = 0; j < l; j++) {
      data[offset++] = g.data[j]
    }
  }
  return { width, height, data, dimension: [width,height] }
}
