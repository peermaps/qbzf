#pragma glslify: export(parse_f32be)
float parse_f32be(vec4 rgba) {
  vec4 v = rgba*255.0;
  float s = floor(v.x/128.0);
  float e = mod(v.x,128.0)*2.0 + floor(v.y/128.0) - 127.0;
  float f = mod(v.y,128.0)*65536.0 + v.z*256.0 + v.w;
  return mix(1.0,-1.0,s)*pow(2.0,e)*(1.0+f*pow(2.0,-23.0));
}
