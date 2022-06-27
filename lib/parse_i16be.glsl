#pragma glslify: export(parse_i16be)

float parse_i16be(vec2 v) {
  float a = 65280.0, b = 32640.0, s = step(b,v.x*a);
  return (mod(v.x*a,b) + v.y*255.0) * mix(1.0,-1.0,s) + mix(0.0,128.0,s);
}
