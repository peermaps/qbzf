#pragma glslify: export(create_qbzf)
#pragma glslify: QBZF = require('./h.glsl')
#pragma glslify: px_coord = require('./lib/px_coord.glsl')
#pragma glslify: parse_f32be = require('./lib/parse_f32be.glsl')

QBZF create_qbzf(vec2 uv, float n, vec2 size, vec2 units, vec3 dim, sampler2D grid_tex, vec2 curve_size) {
  QBZF qbzf;
  qbzf.n = n;
  qbzf.q = 3.0*n+2.0;
  qbzf.size = size;
  qbzf.qsize = size*vec2(qbzf.q,1);
  qbzf.units = units;
  qbzf.dim = dim;
  qbzf.curve_size = curve_size;
  qbzf.fuv = floor(uv*qbzf.size.xy)/qbzf.size.xy;
  vec2 rbuv = qbzf.fuv + vec2(1)/qbzf.size.xy;
  qbzf.bounds = vec4(qbzf.fuv*qbzf.units, rbuv*qbzf.units);
  qbzf.p = (uv-qbzf.fuv)*qbzf.units;
  qbzf.pc = floor(uv*qbzf.size.xy)*vec2(qbzf.q,1);

  vec2 i0 = px_coord(qbzf.pc + vec2(0,0), qbzf.qsize, qbzf.dim);
  vec2 i1 = px_coord(qbzf.pc + vec2(1,0), qbzf.qsize, qbzf.dim);
  vec4 g0 = texture2D(grid_tex, i0);
  vec4 g1 = texture2D(grid_tex, i1);
  vec2 ra = vec2(parse_f32be(g0), parse_f32be(g1));
  float rax = mix(
    1.0 - min(
      min(step(ra.y,qbzf.p.y),step(qbzf.p.y,ra.x)),
      step(1e-8,abs(ra.y-ra.x))
    ),
    min(
      min(step(ra.x,qbzf.p.y),step(qbzf.p.y,ra.y)),
      step(1e-8,abs(ra.x-ra.y))
    ),
    step(ra.x, ra.y)
  );
  qbzf.count = rax;
  return qbzf;
}

QBZF create_qbzf(vec2 uv, float n, vec2 size, vec2 units, vec2 dim, sampler2D grid_tex, vec2 curve_size) {
  return create_qbzf(uv, n, size, units, vec3(dim,0), grid_tex, curve_size);
}
