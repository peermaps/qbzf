#pragma glslify: export(raycast)

float bz(float a, float b, float c, float t) {
  float t1 = 1.0-t;
  return t1*t1*a + 2.0*t1*t*b + t*t*c;
}

float raycast(vec2 p, vec2 b0, vec2 b1, vec2 b2, vec4 bounds, float epsilon) {
  float a = b0.y - 2.0*b1.y + b2.y;
  float b = -2.0*(b0.y - b1.y);
  float c = b0.y - p.y;
  float s = b*b - 4.0*a*c;
  if (s < 0.0 || abs(a) < epsilon) return 0.0;
  float sq = sqrt(s);
  float pt = (-b + sq) / (2.0*a);
  float px = bz(b0.x, b1.x, b2.x, pt);
  float nt = (-b - sq) / (2.0*a);
  float nx = bz(b0.x, b1.x, b2.x, nt);
  float s0 = min(min(step(0.0,pt),step(pt,1.0)),step(p.x,px));
  float s1 = min(min(step(0.0,nt),step(nt,1.0)),step(p.x,nx));
  s0 = min(s0,min(step(bounds.x-epsilon,px),step(px,bounds.z+epsilon)));
  s1 = min(s1,min(step(bounds.x-epsilon,nx),step(nx,bounds.z+epsilon)));
  return s0 + s1;
}

float raycast(vec2 p, vec2 b0, vec2 b1, vec2 b2, vec4 bounds) {
  return raycast(p, b0, b1, b2, bounds, 1e-8);
}
