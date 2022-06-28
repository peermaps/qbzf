// generate font with (or similar):
// qbzf /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf > example/font
// dev server: budo param.js -d example -- -t glslify

var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')

var draw = null
var q = new URLSearchParams(location.hash.replace(/^#/,''))
window.addEventListener('resize', frame)

var data = { curves: null, grid: null }
fetch(q.get('font') || '/font')
  .then(r => r.arrayBuffer())
  .then(r => fromData(new Uint8Array(r)))

function fromData(buf) {
  var qbzf = new QBZF(buf)
  data.curves = qbzf.curves
  data.curves.texture = regl.texture(data.curves)
  data.grid = qbzf.write({
    text: q.get('text') || 'ok',
    padding: (q.get('padding') || '0,0').split(',').map(Number),
    offset: (q.get('offset') || '0,0').split(',').map(Number),
    strokeWidth: 1, // in units
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
