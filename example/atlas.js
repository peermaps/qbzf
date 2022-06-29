var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')

var draw = null
window.addEventListener('resize', frame)

var data = {
  curves: null,
  grid: {},
  grids: {},
  positions: [],
  uv: [],
  cells: [],
  offsets: [],
  units: [],
  size: [],
  dim: [],
  strokeWidth: [],
}

function addText(qbzf, text, x, y, h) {
  var m = qbzf.measure({ text, offset: [x,y] })
  var ux = h*m.units[0]/qbzf.unitsPerEm
  var uy = h*m.units[1]/qbzf.unitsPerEm
  var n = data.positions.length/2
  data.positions.push(x,y, x+ux,y, x+ux,y-uy, x,y-uy)
  data.uv.push(0,1, 1,1, 1,0, 0,0)
  data.cells.push(n+0, n+1, n+2, n+0, n+2, n+3)
  var g = qbzf.write({
    text,
    strokeWidth: 10,
  })
  console.log(g.n,text)
  data.units.push(g.units,g.units,g.units,g.units)
  data.size.push(g.grid,g.grid,g.grid,g.grid)
  data.dim.push(g.dimension,g.dimension,g.dimension,g.dimension)
  var sw = g.strokeWidth
  data.strokeWidth.push(sw,sw,sw,sw)
  if (!data.grids[g.n]) data.grids[g.n] = [g]
  else data.grids[g.n].push(g)

  var p = data.grids[g.n][data.grids[g.n].length-2]
  g.offset = p ? p.offset + p.grid[0]*p.grid[1]*(p.n*3+2) : 0
  data.offsets.push(g.offset, g.offset, g.offset, g.offset)
}

fetch('/f/font').then(r => r.arrayBuffer()).then(r => fromData(new Uint8Array(r)))

function fromData(buf) {
  var qbzf = new QBZF(buf)
  addText(qbzf, 'hello', -0.7, 0.8, 0.2)
  addText(qbzf, 'ok...', -0.3, 0.2, 0.2)
  addText(qbzf, 'hmmmmmmm', 0.2, -0.7, 0.1)
  addText(qbzf, 'what', -0.8, -0.4, 0.15)
  data.curves = qbzf.curves
  data.curves.texture = regl.texture(data.curves)

  var draws = []
  var ns = Object.keys(data.grids)
  for (var i = 0; i < ns.length; i++) {
    var n = ns[i]
    data.grid[n] = concat(data.grids[n])
    data.grid[n].texture = regl.texture(data.grid[n])
    draws.push(build(n))
  }
  draw = function (data) {
    for (var i = 0; i < draws.length; i++) {
      draws[i](data)
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
      gridTex: (c,props) => props.grid[n].texture,
      dim: (c,props) => props.grid[n].dimension,
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
    var buf = grids[i].data, l = buf.length
    for (var j = 0; j < l; j++) {
      data[offset++] = buf[j]
    }
  }
  return { width, height, data, grids, dimension: [width,height] }
}
