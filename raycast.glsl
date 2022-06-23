#pragma glslify: export(raycast)

float bz(float a, float b, float c, float t) {
  float t1 = 1.0-t;
  return t1*t1*a + 2.0*t1*t*b + t*t*c;
}

float line_intersect(vec2 a0, vec2 a1, vec2 b0, vec2 b1, float epsilon) {
  vec2 da = a1-a0;
  vec2 db = b1-b0;
  float d = da.x*db.y - db.x*da.y;
  if (abs(d) < epsilon) return 0.0;
  vec2 c = a0-b0;
  float sn = da.x*c.y - da.y*c.x;
  if (abs(step(sn,0.0)-step(0.0,d)) < epsilon) return 0.0;
  if (abs(step(sn,0.0)-step(0.0,d)) < epsilon) return 0.0;
  float tn = db.x*c.y - db.y*c.x;
  if (abs(step(tn,0.0)-step(0.0,d)) < epsilon) return 0.0;
  if (abs(step(d,sn)-step(0.0,d)) < epsilon) return 0.0;
  if (abs(step(d,tn)-step(0.0,d)) < epsilon) return 0.0;
  float t = tn / d;
  return 1.0;
}

float raycast(vec2 p, vec2 b0, vec2 b1, vec2 b2, vec4 bounds, float epsilon) {
  /*
  if (max(distance(b0,b1),abs(b0.x-b2.x)) < epsilon) {
    //if (p.x < b0.x && min(b0.y,b2.y) <= p.y && p.y <= max(b0.y,b2.y)) return 1.0;
    if (p.x > b0.x) return 0.0;
    if (p.y > max(b0.y,b2.y)) return 0.0;
    if (p.y < min(b0.y,b2.y)) return 0.0;
    return 1.0;
    //b1 = (b0+b2)*0.5 + vec2(0.1,0.1);
    //return p.x > b0.x && b0.y <= p.y && p.y <= b2.y ? 1.0 : 0.0;
    //return line_intersect(p, vec2(bounds.z,p.y), b0, b2, epsilon);
  }
  */
  float a = b0.y - 2.0*b1.y + b2.y;
  float b = -2.0*(b0.y - b1.y);
  float c = b0.y - p.y;
  float s = b*b - 4.0*a*c;
  if (s < 0.0 || abs(a) < epsilon) return 0.0;
  float sq = sqrt(s);
  float pt = (-b + sq) / (2.0*a);
  float px = bz(b0.x, b1.x, b2.x, pt);
  float py = bz(b0.y, b1.y, b2.y, pt);
  float nt = (-b - sq) / (2.0*a);
  float nx = bz(b0.x, b1.x, b2.x, nt);
  float ny = bz(b0.y, b1.y, b2.y, nt);
  float s0 = min(min(step(0.0,pt),step(pt,1.0)),step(p.x,px));
  float s1 = min(min(step(0.0,nt),step(nt,1.0)),step(p.x,nx));
  s0 = min(s0,min(step(bounds.x-epsilon,px),step(px,bounds.z+epsilon)));
  s1 = min(s1,min(step(bounds.x-epsilon,nx),step(nx,bounds.z+epsilon)));
  s0 = min(s0,min(step(bounds.y-epsilon,py),step(py,bounds.w+epsilon)));
  s1 = min(s1,min(step(bounds.y-epsilon,ny),step(ny,bounds.w+epsilon)));
  return s0 + s1;
}

float raycast(vec2 p, vec2 b0, vec2 b1, vec2 b2, vec4 bounds) {
  return raycast(p, b0, b1, b2, bounds, 1e-4);
}
