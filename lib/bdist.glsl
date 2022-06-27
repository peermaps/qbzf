#pragma glslify: export(bdist)

float det(vec2 a, vec2 b) {
  return a.x*b.y-b.x*a.y;
}

vec2 bz(vec2 b0, vec2 b1, vec2 b2, float t) {
  return mix(mix(b0,b1,t),mix(b1,b2,t),t);
}

vec2 ldist(vec2 p, vec2 l1, vec2 l2) {
  vec2 ld = l2 - l1;
  float d = ld.x*ld.x + ld.y*ld.y;
  float t = ((p.x - l1.x) * ld.x + (p.y - l1.y) * ld.y) / d;
  t = max(0.0,min(1.0,t));
  return p - l1 - t*ld;
}

float collinear(vec2 a, vec2 b, vec2 c) {
  float ab = distance(a,b);
  float bc = distance(b,c);
  float ac = distance(a,c);
  return abs(ac - ab - bc);
}

vec2 bdist(vec2 b0, vec2 b1, vec2 b2) {
  if (min(distance(b0,b1),collinear(b0,b1,b2)) < 0.5) {
    return vec2(ldist(vec2(0),b0,b2));
  }
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
