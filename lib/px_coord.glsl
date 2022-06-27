#pragma glslify: export(px_coord)
vec2 px_coord(vec2 p, vec2 size, vec2 dim) {
  float offset = floor(p.x+0.5) + floor(p.y+0.5)*size.x;
  float y = floor((offset+0.5) / dim.x);
  float x = floor(offset - y*dim.x + 0.5);
  return (vec2(x,y)+vec2(0.5)) / dim;
}
