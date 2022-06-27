#pragma glslify: export(read_curve)
#pragma glslify: QBZF = require('./qbzf.h')
#pragma glslify: px_coord = require('./lib/px_coord.glsl')
#pragma glslify: raycast = require('./lib/raycast.glsl')
#pragma glslify: bdist = require('./lib/bdist.glsl')
#pragma glslify: parse_f32be = require('./lib/parse_f32be.glsl')
#pragma glslify: parse_i16be = require('./lib/parse_i16be.glsl')
#pragma glslify: parse_u24be = require('./lib/parse_u24be.glsl')

vec2 read_bz(sampler2D texture, vec2 size, float index, float i) {
  vec4 c = texture2D(texture, vec2(
    (mod(index,size.x/3.0)*3.0+i+0.5)/size.x,
    (floor(index*3.0/size.x)+0.5)/size.y
  ));
  return vec2(parse_i16be(c.xy),parse_i16be(c.zw));
}

vec4 read_curve(QBZF qbzf, sampler2D grid_tex, sampler2D curve_tex, float i) {
  vec2 i2 = px_coord(qbzf.pc + vec2(2.0+float(i)*3.0,0.0), qbzf.qsize, qbzf.dim);
  vec4 g2 = texture2D(grid_tex, i2);
  float index = parse_u24be(g2.xyz);
  if (index < 0.5) return vec4(0);
  vec2 i3 = px_coord(qbzf.pc + vec2(3.0+float(i)*3.0,0.0), qbzf.qsize, qbzf.dim);
  vec2 i4 = px_coord(qbzf.pc + vec2(4.0+float(i)*3.0,0.0), qbzf.qsize, qbzf.dim);
  vec4 g3 = texture2D(grid_tex, i3);
  vec4 g4 = texture2D(grid_tex, i4);
  vec2 d = vec2(parse_f32be(g3),parse_f32be(g4));
  vec2 b0 = read_bz(curve_tex, qbzf.curve_size, index-1.0, 0.0);
  vec2 b1 = read_bz(curve_tex, qbzf.curve_size, index-1.0, 1.0);
  vec2 b2 = read_bz(curve_tex, qbzf.curve_size, index-1.0, 2.0);
  vec2 fd = d - qbzf.fuv*qbzf.units;
  vec2 pd = qbzf.p+d;
  float rc = raycast(pd, b0, b1, b2, qbzf.bounds + vec4(fd,fd), 1e-4);
  return vec4(index,rc,bdist(b0-pd,b1-pd,b2-pd));
}
