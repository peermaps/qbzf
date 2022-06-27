#pragma glslify: export(read_bz)

float parse_i16be(vec2 v) {
  float a = 65280.0, b = 32640.0, s = step(b,v.x*a);
  return (mod(v.x*a,b) + v.y*255.0) * mix(1.0,-1.0,s) + mix(0.0,128.0,s);
}
vec2 read_bz(sampler2D texture, vec2 size, float index, float i) {
  vec4 c = texture2D(texture, vec2(
    (mod(index,size.x/3.0)*3.0+i+0.5)/size.x,
    (floor(index*3.0/size.x)+0.5)/size.y
  ));
  return vec2(parse_i16be(c.xy),parse_i16be(c.zw));
}
