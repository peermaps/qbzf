var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('../')

var draw = null
var q = new URLSearchParams(location.hash.replace(/^#/,''))
var grid = (q.get('grid') || '20,12').split(',').map(Number)
window.addEventListener('resize', frame)

var data = { curves: null, grid: null }
;(async function () {
  //var qbzf = new QBZF(new Uint8Array(await (await fetch('/hello')).arrayBuffer()))
  var qbzf = new QBZF(Uint8Array.from([
    113,98,122,102,49,10,128,16,60,101,216,19,226,1,226,1,57,254,17,246,17,250,53,188,9,2,0,2,179,1,209,39,0,76,251,2,228,1,195,4,238,4,197,1,188,4,197,1,2,0,128,5,0,154,3,52,220,4,52,140,3,156,1,2,0,2,219,2,205,4,83,149,3,127,235,4,43,165,3,43,2,0,195,12,0,209,6,184,2,163,7,184,2,183,2,204,6,2,0,4,166,4,168,2,232,6,130,7,196,2,162,6,196,2,2,0,208,10,0,202,5,163,2,156,6,161,2,136,2,149,6,175,39,106,226,30,2,7,174,2,169,1,226,3,231,3,180,1,179,3,180,1,2,0,151,7,0,237,3,173,1,163,4,173,1,211,1,233,3,2,0,42,104,164,20,244,2,244,2,0,200,17,168,24,216,52,200,10,2,0,2,199,10,205,8,0,2,188,10,4,190,2,123,220,3,239,2,158,1,243,2,158,1,2,0,249,6,0,213,3,189,1,255,3,189,1,171,1,133,4,2,0,2,241,9,211,8,0,2,168,24,216,8,0,2,195,9,144,3,202,1,182,2,174,2,160,4,100,158,3,100,2,0,138,9,0,200,4,239,1,214,4,237,1,198,1,189,5,10,108,242,8,130,3,130,3,0,242,5,168,24,134,9,0,2,168,24,210,8,0,2,167,24,205,8,0,52,111,202,19,226,1,226,1,57,234,17,246,17,178,29,190,15,2,0,243,6,0,211,3,231,1,255,3,229,1,171,1,247,4,2,0,4,145,3,170,1,249,4,136,4,229,1,214,3,229,1,2,0,246,6,0,210,3,232,1,136,4,232,1,172,1,248,4,2,0,4,142,3,171,1,246,4,255,3,234,1,209,3,234,1,0,184,2,2,0,164,11,0,242,5,183,2,186,6,183,2,146,2,223,6,2,0,4,165,4,145,2,223,6,177,6,183,2,241,5,183,2,2,0,161,11,0,243,5,184,2,171,6,186,2,143,2,224,6,2,0,4,168,4,144,2,224,6,186,6,184,2,244,5,184,2
  ]))
  data.curves = qbzf.curves
  data.curves.texture = regl.texture(data.curves)
  data.grid = qbzf.write({
    text: 'hello',
    size: [4500,2000],
    offset: [50,50],
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

      const float ivPrecision = 2048.0;
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
      float parseI24BE(vec3 v) {
        float a = 16711680.0, b = 8388608.0, c = 65280.0, s = step(b,v.x*a);
        return (mod(v.x*a,b) + v.y*c + v.z*255.0) * mix(1.0,-1.0,s) + mix(0.0,128.0,s);
      }
      float parseI32BE(vec4 v) {
        float a = 16711680.0, b = 8388608.0, c = 65280.0, s = step(b,v.x*a);
        return (mod(v.x*a,b) + v.y*c + v.z*255.0) * mix(1.0,-1.0,s) + mix(0.0,128.0,s);
      }
      float parseF32BE(vec4 rgba) {
        vec4 v = rgba*255.0;
        float s = floor(v.x/128.0);
        float e = mod(v.x,128.0)*2.0 + floor(v.y/128.0) - 127.0;
        float f = mod(v.y,128.0)*65536.0 + v.z*256.0 + v.w;
        return mix(1.0,-1.0,s)*pow(2.0,e)*(1.0+f*pow(2.0,-23.0));
      }

      vec2 readBz(sampler2D texture, vec2 size, float index, float i) {
        vec4 c = texture2D(texture, vec2(
          (mod(index,size.x)*3.0+i+0.5)/(3.0*size.x),
          (floor(index/size.x)+0.5) / size.y
        ));
        return vec2(parseI16BE(c.xy),parseI16BE(c.zw));
      }
      vec2 round(vec2 v) { return floor(v+0.5); }
      vec3 round(vec3 v) { return floor(v+0.5); }
      vec4 round(vec4 v) { return floor(v+0.5); }

      void main() {
        float x = 0.0;
        vec2 uv = vpos*0.5+0.5;
        vec2 fuv = floor(uv*gridGrid)/gridGrid;
        vec2 rbuv = fuv + vec2(1)/gridGrid;
        vec2 p = (uv-fuv)*gridSize;
        vec4 bounds = vec4(fuv*gridSize, rbuv*gridSize);

        vec2 i0 = fuv + vec2(0.5/(gridGrid.x*(3.0*gridN+2.0)),0.5/gridGrid.y);
        vec2 i1 = fuv + vec2(1.5/(gridGrid.x*(3.0*gridN+2.0)),0.5/gridGrid.y);
        vec4 g0 = texture2D(gridTex, i0);
        vec4 g1 = texture2D(gridTex, i1);
        //vec2 ra = vec2(parseU24BE(g0.xyz), parseU24BE(g1.xyz)) / ivPrecision;
        vec2 ra = vec2(parseF32BE(g0), parseF32BE(g1));
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
          vec2 i2 = fuv + vec2((2.5+float(i)*3.0)/(gridGrid.x*(3.0*gridN+2.0)),0.5/gridGrid.y);
          vec2 i3 = fuv + vec2((3.5+float(i)*3.0)/(gridGrid.x*(3.0*gridN+2.0)),0.5/gridGrid.y);
          vec2 i4 = fuv + vec2((4.5+float(i)*3.0)/(gridGrid.x*(3.0*gridN+2.0)),0.5/gridGrid.y);
          vec4 g2 = texture2D(gridTex, i2);
          vec4 g3 = texture2D(gridTex, i3);
          vec4 g4 = texture2D(gridTex, i4);
          float index = parseU24BE(g2.xyz);
          if (index < 0.5) break;
          vec2 d = vec2(parseI24BE(g3.xyz), parseI24BE(g4.xyz)) / ivPrecision;
          match += 1.0;
          vec2 b0 = readBz(curveTex, curveSize, index-1.0, 0.0);
          vec2 b1 = readBz(curveTex, curveSize, index-1.0, 1.0);
          vec2 b2 = readBz(curveTex, curveSize, index-1.0, 2.0);
          vec2 fd = d-fuv*gridSize;
          x += raycast(p+d, b0, b1, b2, bounds + vec4(fd,fd));
        }
        float b = step(0.95,(uv.x-fuv.x)*gridGrid.x) * rax;
        float f = 1.0 - max(
          step(0.99,(uv.y-fuv.y)*gridGrid.y),
          step(0.99,(uv.x-fuv.x)*gridGrid.x)
        )*0.5;
        f = 1.0;
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
