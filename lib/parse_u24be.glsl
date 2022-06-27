#pragma glslify: export(parse_u24be)

float parse_u24be(vec3 v) {
  return v.x*16711680.0 + v.y*65280.0 + v.z*255.0;
}
