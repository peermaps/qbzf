var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')

var draw = null
window.addEventListener('resize', frame)

var data = { curves: null, grid: null }
fromData(Uint8Array.from([ // hard-coded data for o and k glyphs
  113,98,122,102,49,10,128,16,24,107,196,18,244,2,244,2,0,184,18,168,24,220,8,0,
  2,168,24,216,8,0,2,173,14,224,25,198,7,132,11,0,233,27,151,8,132,29,167,9,157,
  11,0,211,26,198,8,2,197,8,211,8,0,52,111,202,19,226,1,226,1,57,234,17,246,17,
  178,29,190,15,2,0,243,6,0,211,3,231,1,255,3,229,1,171,1,247,4,2,0,4,145,3,170,
  1,249,4,136,4,229,1,214,3,229,1,2,0,246,6,0,210,3,232,1,136,4,232,1,172,1,248,
  4,2,0,4,142,3,171,1,246,4,255,3,234,1,209,3,234,1,0,184,2,2,0,164,11,0,242,5,
  183,2,186,6,183,2,146,2,223,6,2,0,4,165,4,145,2,223,6,177,6,183,2,241,5,183,2,
  2,0,161,11,0,243,5,184,2,171,6,186,2,143,2,224,6,2,0,4,168,4,144,2,224,6,186,
  6,184,2,244,5,184,2
]))
// or load from a file:
// fetch('djvsans').then(r => r.arrayBuffer()).then(r => fromData(new Uint8Array(r)))

function fromData(buf) {
  var qbzf = new QBZF(buf)
  data.curves = qbzf.curves
  data.curves.texture = regl.texture(data.curves)
  data.grid = qbzf.write({
    text: 'ok',
    strokeWidth: 10, // in units
  })
  data.grid.texture = regl.texture(data.grid)
  draw = build(data.grid.n)
  frame()
}

function frame() {
  regl.poll()
  regl.clear({ color: [0,0,0,1], depth: true })
  if (data) draw(data)
}

function build(n) {
  return regl({
    frag: glsl`
      precision highp float;
      #pragma glslify: QBZF = require('../h')
      #pragma glslify: create_qbzf = require('../create')
      #pragma glslify: read_curve = require('../read')

      varying vec2 vpos;
      uniform sampler2D curveTex, gridTex;
      uniform vec2 curveSize, gridUnits, gridSize, gridDim;
      uniform float gridN, strokeWidth;

      void main() {
        vec2 uv = vpos*0.5+0.5;
        QBZF qbzf = create_qbzf(
          uv, gridN, gridSize, gridUnits, gridDim,
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
        float outline = 1.0-smoothstep(strokeWidth-a,strokeWidth+a,ldist);

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
      attribute vec2 position;
      varying vec2 vpos;
      void main() {
        vpos = position;
        gl_Position = vec4(position,0,1);
      }
    `,
    uniforms: {
      curveTex: regl.prop('curves.texture'),
      curveSize: regl.prop('curves.size'),
      gridTex: regl.prop('grid.texture'),
      gridUnits: regl.prop('grid.units'),
      gridSize: regl.prop('grid.grid'),
      gridDim: regl.prop('grid.dimension'),
      gridN: n,
      strokeWidth: regl.prop('grid.strokeWidth'),
    },
    attributes: { position: [-4,-4,-4,+4,+4,+0] },
    elements: [0,1,2],
  })
}
