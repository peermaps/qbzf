var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')

var draw = null
var q = new URLSearchParams(location.hash.replace(/^#/,''))
var grid = (q.get('grid') || '20,12').split(',').map(Number)
window.addEventListener('resize', frame)

var data = { curves: null, grid: null }
;(async function () {
  var qbzf = new QBZF(new Uint8Array(await (await fetch('/font0')).arrayBuffer()))
  //var qbzf = new QBZF(new Uint8Array(await (await fetch('/font/dvs.bzf')).arrayBuffer()))
  data.curves = qbzf.curves
  data.curves.texture = regl.texture(data.curves)
  data.grid = qbzf.write(qbzf.measure({
    text: q.get('text') || 'W',
    padding: (q.get('padding') || '0,0').split(',').map(Number),
    offset: (q.get('offset') || '0,0').split(',').map(Number),
    strokeWidth: 40,
  }))
  data.grid.texture = regl.texture(data.grid)
  data.unitsPerEm = qbzf.unitsPerEm
  draw = build(data.grid.n)
  frame()
})()

function frame() {
  regl.poll()
  regl.clear({ color: [0,0,0,1], depth: true })
  if (data) draw(data)
}

function build(n) {
  return regl({
    frag: glsl`
      precision highp float;
      #pragma glslify: QBZF = require('../qbzf.h')
      #pragma glslify: create_qbzf = require('../create_qbzf.glsl')
      #pragma glslify: read_curve = require('../read_curve.glsl')

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
        float match = 0.0;
        float b = step(0.95,(uv.x-qbzf.fuv.x)*qbzf.size.x) * qbzf.x;
        float ldist = 1e30;
        for (int i = 0; i < ${n}; i++) {
          vec4 curve = read_curve(qbzf, gridTex, curveTex, float(i));
          if (curve.x < 0.5) break;
          qbzf.x += curve.y;
          ldist = min(ldist,length(curve.zw));
          match += 1.0;
        }
        float line = step(ldist,strokeWidth);
        float f = max(
          step(0.98,(uv.y-qbzf.fuv.y)*gridSize.y),
          step(0.98,(uv.x-qbzf.fuv.x)*gridSize.x)
        )*0.1;
        //gl_FragColor = vec4(vec3(mod(qbzf.x,2.0),match/3.0,b)*f+(f-vec3(0.8)),1);
        //gl_FragColor = vec4(vec3(mod(qbzf.x,2.0)),1);
        gl_FragColor = vec4(vec3(mod(qbzf.x,2.0),line,match/3.0)+f,1);
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
      unitsPerEm: regl.prop('unitsPerEm'),
    },
    attributes: {
      position: [-4,-4,-4,+4,+4,+0],
    },
    elements: [0,1,2],
  })
}
