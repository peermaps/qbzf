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
      #pragma glslify: raycast = require('../raycast.glsl')
      #pragma glslify: bdist = require('../bdist.glsl')
      #pragma glslify: read_bz = require('../read_bz.glsl')
      varying vec2 vpos;
      uniform sampler2D curveTex, gridTex;
      uniform vec2 curveSize, gridUnits, gridSize, gridDim;
      uniform float gridN, strokeWidth;

      float parseU16BE(vec2 v) {
        return v.x*65280.0 + v.y*255.0;
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
      vec2 px_coord(vec2 p, vec2 size, vec2 dim) {
        //return (p + vec2(0.5)) / size;
        float offset = floor(p.x+0.5) + floor(p.y+0.5)*size.x;
        float y = floor((offset+0.5) / dim.x);
        float x = floor(offset - y*dim.x + 0.5);
        return (vec2(x,y)+vec2(0.5)) / dim;
      }
      struct Grid {
        float n;
        float q;
        vec2 size;
        vec2 qsize;
        vec2 units;
        vec2 dim;
      };
      Grid create_grid(float n, vec2 size, vec2 units, vec2 dim) {
        Grid grid;
        grid.n = n;
        grid.q = 3.0*n+2.0;
        grid.size = size;
        grid.qsize = size*vec2(grid.q,1);
        grid.units = units;
        grid.dim = dim;
        return grid;
      }
      struct Cell {
        float x;
        vec2 p;
        vec2 pc;
        vec2 ra;
        vec2 fuv;
        vec4 bounds;
      };
      Cell read_cell(Grid grid, vec2 uv, sampler2D grid_tex) {
        Cell cell;
        cell.fuv = floor(uv*grid.size)/grid.size;
        vec2 rbuv = cell.fuv + vec2(1)/grid.size;
        cell.bounds = vec4(cell.fuv*grid.units, rbuv*grid.units);
        cell.p = (uv-cell.fuv)*grid.units;
        cell.pc = floor(uv*grid.size)*vec2(grid.q,1);

        vec2 i0 = px_coord(cell.pc + vec2(0,0), grid.qsize, grid.dim);
        vec2 i1 = px_coord(cell.pc + vec2(1,0), grid.qsize, grid.dim);
        vec4 g0 = texture2D(grid_tex, i0);
        vec4 g1 = texture2D(grid_tex, i1);
        vec2 ra = vec2(parseF32BE(g0), parseF32BE(g1));
        float rax = mix(
          1.0 - min(
            min(step(ra.y,cell.p.y),step(cell.p.y,ra.x)),
            step(1e-8,abs(ra.y-ra.x))
          ),
          min(
            min(step(ra.x,cell.p.y),step(cell.p.y,ra.y)),
            step(1e-8,abs(ra.x-ra.y))
          ),
          step(ra.x, ra.y)
        );
        cell.x = rax;
        return cell;
      }

      void main() {
        vec2 uv = vpos*0.5+0.5;
        Grid grid = create_grid(gridN, gridSize, gridUnits, gridDim);
        Cell cell = read_cell(grid, uv, gridTex);

        float line = 0.0;
        float match = 0.0;
        float blue = 0.0;
        for (int i = 0; i < ${n}; i++) {
          vec2 i2 = px_coord(cell.pc + vec2(2.0+float(i)*3.0,0.0), grid.qsize, grid.dim);
          vec4 g2 = texture2D(gridTex, i2);
          float index = parseU24BE(g2.xyz);
          if (index < 0.5) break;
          vec2 i3 = px_coord(cell.pc + vec2(3.0+float(i)*3.0,0.0), grid.qsize, grid.dim);
          vec2 i4 = px_coord(cell.pc + vec2(4.0+float(i)*3.0,0.0), grid.qsize, grid.dim);
          vec4 g3 = texture2D(gridTex, i3);
          vec4 g4 = texture2D(gridTex, i4);
          match += 1.0;
          vec2 d = vec2(parseF32BE(g3), parseF32BE(g4));
          vec2 b0 = read_bz(curveTex, curveSize, index-1.0, 0.0);
          vec2 b1 = read_bz(curveTex, curveSize, index-1.0, 1.0);
          vec2 b2 = read_bz(curveTex, curveSize, index-1.0, 2.0);
          vec2 fd = d-cell.fuv*gridUnits;
          cell.x += raycast(cell.p+d, b0, b1, b2, cell.bounds + vec4(fd,fd), 1e-4);
          if (abs(index-1309.0) < 0.5) {
            blue += min(
              distance(b0,cell.p+d)/50.0,
              distance(b2,cell.p+d)/50.0
            );
          }

          float bd = length(bdist(b0-(cell.p+d),b1-(cell.p+d),b2-(cell.p+d)));
          line = max(line, step(bd,strokeWidth));
        }
        //float b = step(0.95,(uv.x-cell.fuv.x)*grid.size.x) * rax;
        float f = max(
          step(0.98,(uv.y-cell.fuv.y)*gridSize.y),
          step(0.98,(uv.x-cell.fuv.x)*gridSize.x)
        )*0.1;
        //gl_FragColor = vec4(vec3(mod(cell.x,2.0),match*0.5,b)*f+(f-vec3(0.8)),1);
        //gl_FragColor = vec4(vec3(mod(cell.x,2.0)),1);
        //gl_FragColor = vec4(vec3(mod(cell.x,2.0),line,match/3.0)+f,1);
        gl_FragColor = vec4(vec3(mod(cell.x,2.0),line,blue)+f,1);
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
