var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')

var draw = null
var q = new URLSearchParams(location.search)
var grid = (q.get('grid') || '6,6').split(',').map(Number)
window.addEventListener('resize', frame)

var data = { curves: null, grid: null }
;(async function () {
  //var qbzf = new QBZF(new Uint8Array(await (await fetch('/test-e')).arrayBuffer()))
  var qbzf = new QBZF(Uint8Array.from([
    113,98,122,102,49,10,128,16,60,101,216,19,226,1,226,1,57,254,17,246,17,250,53,188,9,2,0,2,179,1,209,39,0,76,251,2,228,1,195,4,238,4,197,1,188,4,197,1,2,0,128,5,0,154,3,52,220,4,52,140,3,156,1,2,0,2,219,2,205,4,83,149,3,127,235,4,43,165,3,43,2,0,195,12,0,209,6,184,2,163,7,184,2,183,2,204,6,2,0,4,166,4,168,2,232,6,130,7,196,2,162,6,196,2,2,0,208,10,0,202,5,163,2,156,6,161,2,136,2,149,6,175,39,106,226,30,2,7,174,2,169,1,226,3,231,3,180,1,179,3,180,1,2,0,151,7,0,237,3,173,1,163,4,173,1,211,1,233,3,2,0
    //113,98,122,102,49,10,220,11,8,119,208,15,0,0,0,136,14,224,18,216,4,200,1,140,14,216,29,192,12,160,6,179,23,160,6,215,4,215,4,180,9,159,6,231,7,199,1
  ]))
  /*
  var qbzf = new QBZF(Uint8Array.from([
    //113,98,122,102,49,10,220,11,8,119,208,15,0,0,0,136,14,224,18,216,4,200,1,
    //140,14,216,29,192,12,160,6,179,23,160,6,215,4,215,4,180,9,159,6,231,7,199,1
    113,98,122,102,49,10,220,11,6,119,208,15,0,0,0,136,14,224,18,216,4,200,1,
    140,14,216,29,192,12,160,6,211,4,231,7,191,12,159,6
  ]))
  */
  data.curves = qbzf.curves
  data.curves.texture = regl.texture(data.curves)
  data.grid = qbzf.write({
    text: 'e',
    size: [1200,1300],
    offset: [50,0],
    grid,
    n: 6,
  })
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
        float a = 65280.0, b = 32640.0, s = step(b,v.x*a);
        return (mod(v.x*a,b) + v.y*255.0) * mix(1.0,-1.0,s) + mix(0.0,128.0,s);
      }
      float parseU24BE(vec3 v) {
        return v.x*16711680.0 + v.y*65280.0 + v.z*255.0;
      }
      vec2 readBz(sampler2D texture, vec2 size, float index, float i) {
        vec4 c = texture2D(texture, vec2(
          (mod(index,size.x)*3.0+i+0.5)/(3.0*size.x),
          (floor(index/size.x)+0.5) / size.y
        ));
        return vec2(parseI16BE(c.xy),parseI16BE(c.zw));
      }

      void main() {
        float x = 0.0;
        vec2 uv = vpos*0.5+0.5;
        vec2 fuv = floor(uv*gridGrid)/gridGrid;
        vec2 rbuv = fuv + vec2(1)/gridGrid;
        vec2 p = (uv-fuv)*gridSize;
        vec4 bounds = vec4(fuv*gridSize, rbuv*gridSize);

        vec2 i0 = fuv + vec2(0.5/(gridGrid.x*(2.0*gridN+1.0)),0.5/gridGrid.y);
        vec4 g0 = texture2D(gridTex, i0);
        vec2 ra = vec2(parseU16BE(g0.xy), parseU16BE(g0.zw));
        float rax = mix(
          1.0 - min(
            min(step(ra.y,p.y),step(p.y,ra.x)),
            step(1e-8,abs(ra.y-ra.x))
          ),
          min(
            min(step(ra.x,p.y),step(p.y,ra.y)),
            step(1e-8,abs(ra.x-ra.y))
          ),
          step(ra.x, ra.y)
        );
        x += rax;

        float match = 0.0;
        for (int i = 0; i < ${n}; i++) {
          vec2 i1 = fuv + vec2((1.5+float(i)*2.0)/(gridGrid.x*(2.0*gridN+1.0)),0.5/gridGrid.y);
          vec2 i2 = fuv + vec2((2.5+float(i)*2.0)/(gridGrid.x*(2.0*gridN+1.0)),0.5/gridGrid.y);
          vec4 g1 = texture2D(gridTex, i1);
          vec4 g2 = texture2D(gridTex, i2);
          float index = parseU24BE(g1.xyz);
          if (index < 0.5) break;
          vec2 d = vec2(parseI16BE(g2.xy), parseI16BE(g2.zw));
          match += 1.0;
          vec2 b0 = readBz(curveTex, curveSize, index-1.0, 0.0);
          vec2 b1 = readBz(curveTex, curveSize, index-1.0, 1.0);
          vec2 b2 = readBz(curveTex, curveSize, index-1.0, 2.0);
          x += raycast(p+d, b0, b1, b2, bounds);
        }
        //if (match < 0.5) discard;
        float b = step(0.95,(uv.x-fuv.x)*gridGrid.x) * rax;
        float f = 1.0 - max(
          step(0.99,(uv.y-fuv.y)*gridGrid.y),
          step(0.99,(uv.x-fuv.x)*gridGrid.x)
        )*0.5;
        gl_FragColor = vec4(vec3(mod(x,2.0),match*0.5,b)*f,1);
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
