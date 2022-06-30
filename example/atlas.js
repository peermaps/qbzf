var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')

var draw = null
window.addEventListener('resize', frame)

var data = {
  curves: {},
  grid: {},
}
fetch('/f/font').then(r => r.arrayBuffer()).then(r => fromData(new Uint8Array(r)))

function addText(qbzf, text, x, y, h, strokeWidth) {
  var m = qbzf.measure({ text, offset: [x,y] })
  var ux = h*m.units[0]/qbzf.unitsPerEm
  var uy = h*m.units[1]/qbzf.unitsPerEm
  var g = qbzf.write({ text, strokeWidth })
  if (!data.grid[g.n]) {
    data.grid[g.n] = {
      curves: data.curves,
      positions: [],
      uv: [],
      cells: [],
      offsets: [],
      units: [],
      size: [],
      dim: [],
      strokeWidth: [],
      grid: { texture: null },
      grids: [],
    }
  }
  var d = data.grid[g.n]
  console.log(g.n,text)
  var n = d.positions.length/2
  d.positions.push(x,y, x+ux,y, x+ux,y-uy, x,y-uy)
  d.uv.push(0,1, 1,1, 1,0, 0,0)
  d.cells.push(n+0, n+1, n+2, n+0, n+2, n+3)
  d.units.push(g.units,g.units,g.units,g.units)
  d.size.push(g.grid,g.grid,g.grid,g.grid)
  d.dim.push(g.dimension,g.dimension,g.dimension,g.dimension)
  d.strokeWidth.push(strokeWidth,strokeWidth,strokeWidth,strokeWidth)
  d.grids.push(g)

  var p = d.grids[d.grids.length-2]
  g.offset = p ? p.offset + p.grid[0]*p.grid[1]*(p.n*3+2) : 0
  d.offsets.push(g.offset, g.offset, g.offset, g.offset)
}

function fromData(buf) {
  var qbzf = new QBZF(buf)
  addText(qbzf, 'hello', -0.7, 0.8, 0.2, 40)
  addText(qbzf, 'ok...', -0.3, 0.2, 0.2, 40)
  addText(qbzf, 'hmmmmmmm', 0.2, -0.7, 0.1, 80)
  addText(qbzf, 'what', -0.8, -0.4, 0.15, 50)
  addText(qbzf, 'cooooool', 0.3, 0.6, 0.1, 100)
  Object.assign(data.curves, qbzf.curves)
  data.curves.texture = regl.texture(data.curves)

  var draws = []
  var ns = Object.keys(data.grid)
  for (var i = 0; i < ns.length; i++) {
    var n = ns[i], d = data.grid[n]
    Object.assign(d.grid, concat(d.grids))
    d.grid.texture = regl.texture(d.grid)
    draws.push(build(n))
  }
  draw = function (data) {
    for (var i = 0; i < ns.length; i++) {
      draws[i](data.grid[ns[i]])
    }
  }
  frame()
}

function frame() {
  regl.poll()
  regl.clear({ color: [0,0,0,1], depth: true })
  if (draw) draw(data)
}

function build(n) {
  return regl({
    frag: glsl`
      precision highp float;
      #pragma glslify: QBZF = require('../h')
      #pragma glslify: create_qbzf = require('../create')
      #pragma glslify: read_curve = require('../read')

      varying vec2 vpos, vuv, vunits, vsize;
      varying float vStrokeWidth, voffset;
      uniform sampler2D curveTex, gridTex;
      uniform vec2 curveSize, dim;
      uniform float gridN;

      void main() {
        QBZF qbzf = create_qbzf(
          vuv, gridN, vsize, vunits, vec3(dim,voffset),
          gridTex, curveSize
        );
        float ldist = 1e30;
        for (int i = 0; i < ${n}; i++) {
          vec4 curve = read_curve(qbzf, gridTex, curveTex, float(i));
          if (curve.x < 0.5) break;
          qbzf.count += curve.y;
          ldist = min(ldist,length(curve.zw));
        }
        float a = 5.0; // aliasing width in font units
        float outline = 1.0-smoothstep(vStrokeWidth-a,vStrokeWidth+a,ldist);

        vec3 fill = vec3(0,0,0);
        vec3 stroke = vec3(1,1,1);
        vec3 bg = vec3(0.5,0,1);

        vec3 c = mix(
          mix(bg,stroke,outline),
          mix(stroke,fill,smoothstep(ldist,0.0,a)),
          mod(qbzf.count,2.0)
        );
        gl_FragColor = vec4(c,1);
      }
    `,
    vert: `
      precision highp float;
      attribute vec2 position, uv, units, size;
      attribute float strokeWidth, offset;
      varying vec2 vpos, vuv, vunits, vsize;
      varying float vStrokeWidth, voffset;
      void main() {
        vpos = position;
        vuv = uv;
        vunits = units;
        vsize = size;
        voffset = offset;
        vStrokeWidth = strokeWidth;
        gl_Position = vec4(position,0,1);
      }
    `,
    uniforms: {
      curveTex: regl.prop('curves.texture'),
      curveSize: regl.prop('curves.size'),
      gridTex: regl.prop('grid.texture'),
      dim: regl.prop('grid.dimension'),
      gridN: Number(n),
    },
    attributes: {
      position: regl.prop('positions'),
      uv: regl.prop('uv'),
      offset: regl.prop('offsets'),
      units: regl.prop('units'),
      size: regl.prop('size'),
      strokeWidth: regl.prop('strokeWidth'),
    },
    elements: regl.prop('cells'),
  })
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
