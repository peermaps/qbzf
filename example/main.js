var glsl = require('glslify')
var regl = require('regl')()
var draw = regl({
  frag: glsl`
    precision highp float;
    #pragma glslify: raycast = require('../raycast.glsl')
    varying vec2 vpos;
    void main() {
      vec2 b0_0 = vec2(-0.5, -0.5);
      vec2 b0_1 = vec2(-0.4, 0.6);
      vec2 b0_2 = vec2(0.5, 0.5);
      vec2 b1_0 = vec2(0.5, 0.5);
      vec2 b1_1 = vec2(0.8, 0.3);
      vec2 b1_2 = vec2(0.6, -0.7);
      vec2 b2_0 = vec2(0.6, -0.7);
      vec2 b2_1 = vec2(0.2, 0.6);
      vec2 b2_2 = vec2(-0.5, -0.5);
      float x = 0.0;
      x += raycast(vpos, b0_0, b0_1, b0_2);
      x += raycast(vpos, b1_0, b1_1, b1_2);
      x += raycast(vpos, b2_0, b2_1, b2_2);
      gl_FragColor = vec4(vpos,mod(x,2.0),1);
    }
  `,
  vert: `
    precision highp float;
    attribute vec2 position;
    varying vec2 vpos;
    void main() {
      vpos = position;
      gl_Position = vec4(position,0,1);
    }
  `,
  attributes: {
    position: [-4,-4,-4,+4,+4,+0],
  },
  elements: [0,1,2],
})
window.addEventListener('resize', frame)
frame()

function frame() {
  regl.poll()
  regl.clear({ color: [0,0,0,1], depth: true })
  draw()
}
