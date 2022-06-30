var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')
var Atlas = require('../atlas')

var draw = null, data = null
window.addEventListener('resize', frame)

//fetch('/font/dvs.bzf').then(r => r.arrayBuffer()).then(r => fromData(new Uint8Array(r)))
fetch('/f/font').then(r => r.arrayBuffer()).then(r => fromData(new Uint8Array(r)))

function fromData(buf) {
  var atlas = new Atlas(new QBZF(buf), {
    attributes: [ 'fillColor', 'strokeColor' ]
  })
  atlas.add({
    text: 'hello', offset: [-0.9,0.8], height: 0.4,
    strokeWidth: 10, strokeColor: [0,1,1], fillColor: [0,0,1],
  })
  atlas.add({
    text: 'ok...', offset: [-0.3,0.2], height: 0.2,
    strokeWidth: 40, strokeColor: [1,1,0], fillColor: [1,0,1],
  })
  atlas.add({
    text: 'hmmmmmmmmmmmmmm', offset: [0.2,-0.7], height: 0.05,
    strokeWidth: 80, strokeColor: [1,0,0], fillColor: [1,1,0],
  })
  atlas.add({
    text: 'what', offset: [-0.8,-0.4], height: 0.15,
    strokeWidth: 50, strokeColor: [1,1,1], fillColor: [0.25,0,0.75],
  })
  atlas.add({
    text: 'cooooool', offset: [0.3,0.6], height: 0.1,
    strokeWidth: 100, strokeColor: [0,1,0], fillColor: [0,0.5,0],
  })
  var id = atlas.add({
    text: 'meow', offset: [-0.2,-0.2], height: 0.3,
    strokeWidth: 80, strokeColor: [0.9,0.9,0.9], fillColor: [0.2,0.2,0.2],
  })
  setTimeout(() => {
    atlas.remove(id)
    build(atlas)
    frame()
  }, 1000)

  build(atlas)
  var draws = {}
  atlas.grids.forEach(n => {
    draws[n] = drawCurves(n)
  })
  draw = function (data) {
    for (var i = 0; i < atlas.grids.length; i++) {
      var n = atlas.grids[i]
      draws[n](data[n])
    }
  }
  frame()
}

function build (atlas) {
  data = atlas.build()
  atlas.grids.forEach(n => {
    var d = data[n]
    d.curves.texture = regl.texture(d.curves)
    d.grid.texture = regl.texture(d.grid)
  })
}

function frame() {
  regl.poll()
  regl.clear({ color: [0,0,0,1], depth: true })
  if (draw) draw(data)
}

function drawCurves(n) {
  return regl({
    frag: glsl`
      precision highp float;
      #pragma glslify: QBZF = require('../h')
      #pragma glslify: create_qbzf = require('../create')
      #pragma glslify: read_curve = require('../read')

      varying vec2 vpos, vuv, vunits, vsize;
      varying float vStrokeWidth, voffset;
      varying vec3 vFillColor, vStrokeColor;
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

        vec3 fill = vFillColor;
        vec3 stroke = vStrokeColor;
        vec3 bg = vec3(0);

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
      attribute vec3 fillColor, strokeColor;
      attribute float strokeWidth, offset;
      varying vec2 vpos, vuv, vunits, vsize;
      varying vec3 vFillColor, vStrokeColor;
      varying float vStrokeWidth, voffset;
      void main() {
        vpos = position;
        vuv = uv;
        vunits = units;
        vsize = size;
        voffset = offset;
        vFillColor = fillColor;
        vStrokeColor = strokeColor;
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
      fillColor: regl.prop('fillColor'),
      strokeWidth: regl.prop('strokeWidth'),
      strokeColor: regl.prop('strokeColor'),
    },
    elements: regl.prop('cells'),
  })
}
