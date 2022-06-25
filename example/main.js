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
    n: 6,
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
      #pragma glslify: raycast = require('../raycast.glsl')
      varying vec2 vpos;
      uniform sampler2D curveTex, gridTex;
      uniform vec2 curveSize, gridUnits, gridSize, gridDim;
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
          (mod(index,size.x/3.0)*3.0+i+0.5)/size.x,
          (floor(index*3.0/size.x)+0.5) / size.y
        ));
        return vec2(parseI16BE(c.xy),parseI16BE(c.zw));
      }
      vec2 pxCoord(vec2 p, vec2 size, vec2 dim) {
        //return (p + vec2(0.5)) / size;
        float offset = floor(p.x+0.5) + floor(p.y+0.5)*size.x;
        float y = floor((offset+0.5) / dim.x);
        float x = floor(offset - y*dim.x + 0.5);
        return (vec2(x,y)+vec2(0.5)) / dim;
      }

      float det(vec2 a, vec2 b) {
        return a.x*b.y-b.x*a.y;
      }
      vec2 bz(vec2 b0, vec2 b1, vec2 b2, float t) {
        return mix(mix(b0,b1,t),mix(b1,b2,t),t);
      }
      float ldist(vec2 p, vec2 l1, vec2 l2) {
        vec2 ld = l2 -l1;
        float t = ((p.x - l1.x) * ld.x + (p.y - l1.y) * ld.y) / (ld.x*ld.x + ld.y*ld.y);
        t = max(0.0,min(1.0,t));
        return length(p - l1 - t*ld);
      }
      vec2 bdist(vec2 b0, vec2 b1, vec2 b2) {
        if (distance(b0,b1) < 1e-8) {
          return vec2(ldist(vec2(0,0), b0, b2));
        }
        float epsilon = 0.01;
        float a = det(b0,b2), b = 2.0*det(b1,b0), d = 2.0*det(b2,b1);
        float f = b*d-a*a;
        vec2 d21 = b2-b1, d10 = b1-b0, d20 = b2-b0;
        vec2 gf = 2.0*(b*d21+d*d10+a*d20);
        gf = vec2(gf.y,-gf.x);
        vec2 pp = -f*gf/dot(gf,gf);
        vec2 d0p = b0-pp;
        float ap = det(d0p,d20), bp = 2.0*det(d10,d0p);
        float t = clamp((ap+bp)/(2.0*a+b+d), 0.0, 1.0);
        return bz(b0,b1,b2,t);
      }

      void main() {
        float x = 0.0;
        vec2 uv = vpos*0.5+0.5;
        vec2 fuv = floor(uv*gridSize)/gridSize;
        vec2 rbuv = fuv + vec2(1)/gridSize;
        vec2 p = (uv-fuv)*gridUnits;
        vec4 bounds = vec4(fuv*gridUnits, rbuv*gridUnits);
        float q = 3.0*gridN+2.0;
        vec2 pc = floor(uv*gridSize)*vec2(q,1);
        vec2 gq = gridSize*vec2(q,1);
        vec2 gd = gridDim;

        vec2 i0 = pxCoord(pc + vec2(0,0), gq, gd);
        vec2 i1 = pxCoord(pc + vec2(1,0), gq, gd);
        vec4 g0 = texture2D(gridTex, i0);
        vec4 g1 = texture2D(gridTex, i1);
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

        float line = 0.0;
        float match = 0.0;
        for (int i = 0; i < ${n}; i++) {
          vec2 i2 = pxCoord(pc + vec2(2.0+float(i)*3.0,0), gq, gd);
          vec2 i3 = pxCoord(pc + vec2(3.0+float(i)*3.0, 0), gq, gd);
          vec2 i4 = pxCoord(pc + vec2(4.0+float(i)*3.0, 0), gq, gd);
          vec4 g2 = texture2D(gridTex, i2);
          vec4 g3 = texture2D(gridTex, i3);
          vec4 g4 = texture2D(gridTex, i4);
          float index = parseU24BE(g2.xyz);
          if (index < 0.5) break;
          match += 1.0;
          vec2 d = vec2(parseF32BE(g3), parseF32BE(g4));
          vec2 b0 = readBz(curveTex, curveSize, index-1.0, 0.0);
          vec2 b1 = readBz(curveTex, curveSize, index-1.0, 1.0);
          vec2 b2 = readBz(curveTex, curveSize, index-1.0, 2.0);
          vec2 fd = d-fuv*gridUnits;
          x += raycast(p+d, b0, b1, b2, bounds + vec4(fd,fd));

          float bd = length(bdist(b0-(p+d),b1-(p+d),b2-(p+d)));
          //line += step(bd,10.0);
          //line += step(50.0,bd);
        }
        float b = step(0.95,(uv.x-fuv.x)*gridSize.x) * rax;
        float f = max(
          step(0.98,(uv.y-fuv.y)*gridSize.y),
          step(0.98,(uv.x-fuv.x)*gridSize.x)
        )*0.1;
        //gl_FragColor = vec4(vec3(mod(x,2.0),match*0.5,b)*f+(f-vec3(0.8)),1);
        //gl_FragColor = vec4(vec3(mod(x,2.0)),1);
        gl_FragColor = vec4(vec3(mod(x,2.0),line,match*0.5)+f,1);
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
      unitsPerEm: regl.prop('unitsPerEm'),
    },
    attributes: {
      position: [-4,-4,-4,+4,+4,+0],
    },
    elements: [0,1,2],
  })
}
