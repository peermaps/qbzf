var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')

var draw = null
window.addEventListener('resize', frame)

var data = { curves: null, grid: null }
;(async function () {
  var qbzf = new QBZF(new Uint8Array(await (await fetch('/test11')).arrayBuffer()))
  data.curves = qbzf.curves
  data.curves.texture = regl.texture(data.curves)
  data.grid = qbzf.write({ text: 'w', size: [1000,1000], grid: [4,4], n: 4 })
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
      #pragma glslify: raycast = require('../raycast.glsl')
      varying vec2 vpos;
      uniform sampler2D curveTex, gridTex;
      uniform vec2 curveSize, gridSize, gridGrid;
      uniform float gridN;

      float parseU16BE(vec2 v) {
        return v.x*65280.0 + v.y*255.0;
      }
      float parseI16BE(vec2 v) {
        float a = 65280.0, b = 32640.0, s = step(b,v.x*a);;
        return (mod(v.x*a,b) + v.y*255.0) * mix(-1.0,1.0,s) - mix(0.0,128.0,s);
      }
      float parseU24BE(vec3 v) {
        return v.x*16711680.0 + v.y*65280.0 + v.z*255.0;
      }
      vec2 readBz(sampler2D texture, vec2 size, float index, float i) {
        vec4 c = texture2D(texture, vec2(
          (mod(index,size.x)*3.0+i+0.5)/(3.0*size.x),
          floor(index/size.x) / (size.y-1.0)
        ));
        return vec2(parseU16BE(c.xy),parseU16BE(c.zw));
      }

      void main() {
        float x = 0.0;
        vec2 uv = vpos*0.5+0.5;
        vec2 fuv = floor(uv*gridGrid)/gridGrid;
        float match = 0.0;
        for (int i = 0; i < ${n}; i++) {
          vec2 i0 = fuv + vec2((0.5+float(i)*2.0)/(gridGrid.x*2.0*gridN),0.5/gridGrid.y);
          vec2 i1 = fuv + vec2((1.5+float(i)*2.0)/(gridGrid.x*2.0*gridN),0.5/gridGrid.y);
          vec4 g0 = texture2D(gridTex, i0);
          vec4 g1 = texture2D(gridTex, i1);
          float index = parseU24BE(g0.xyz);
          if (index < 0.5) break;
          vec2 d = vec2(parseI16BE(g1.xy), parseI16BE(g1.zw));
          match += 1.0;
          vec2 b0 = readBz(curveTex, curveSize, index-1.0, 0.0);
          vec2 b1 = readBz(curveTex, curveSize, index-1.0, 1.0);
          vec2 b2 = readBz(curveTex, curveSize, index-1.0, 2.0);
          x += raycast((uv-fuv)*gridSize+d, b0, b1, b2);
        }
        if (match < 0.5) discard;
        gl_FragColor = vec4(mod(x,2.0),match*0.5,0,1);
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
      gridSize: regl.prop('grid.size'),
      gridGrid: regl.prop('grid.grid'),
      gridN: n,
      unitsPerEm: regl.prop('unitsPerEm'),
    },
    attributes: {
      position: [-4,-4,-4,+4,+4,+0],
    },
    elements: [0,1,2],
  })
}
