# qbzf

quadratic bezier font format designed to render in a fragment shader

status: somewhat usable but many numeric stability issues

This package comes with 3 sections: a javascript library, glsl shader code, and a command-line tool.

Use the command-line tool to generate font data from a ttf file to pass into the javascript api.

The javascript api generates textures that can be read by the shader code.

# example

To run this example: `budo ok.js -- -t glslify`

``` js
var glsl = require('glslify')
var regl = require('regl')()
var QBZF = require('qbzf')

var draw = null
window.addEventListener('resize', frame)

var data = { curves: null, grid: null }
fromData(Uint8Array.from([ // hard-coded data for o and k glyphs
  113,98,122,102,49,10,128,16,24,107,196,18,244,2,244,2,0,184,18,168,24,220,8,0,
  2,168,24,216,8,0,2,173,14,224,25,198,7,132,11,0,233,27,151,8,132,29,167,9,157,
  11,0,211,26,198,8,2,197,8,211,8,0,52,111,202,19,226,1,226,1,57,234,17,246,17,
  178,29,190,15,2,0,243,6,0,211,3,231,1,255,3,229,1,171,1,247,4,2,0,4,145,3,170,
  1,249,4,136,4,229,1,214,3,229,1,2,0,246,6,0,210,3,232,1,136,4,232,1,172,1,248,
  4,2,0,4,142,3,171,1,246,4,255,3,234,1,209,3,234,1,0,184,2,2,0,164,11,0,242,5,
  183,2,186,6,183,2,146,2,223,6,2,0,4,165,4,145,2,223,6,177,6,183,2,241,5,183,2,
  2,0,161,11,0,243,5,184,2,171,6,186,2,143,2,224,6,2,0,4,168,4,144,2,224,6,186,
  6,184,2,244,5,184,2
]))
// or load from a file:
// fetch('djvsans').then(r => r.arrayBuffer()).then(r => fromData(new Uint8Array(r)))

function fromData(buf) {
  var qbzf = new QBZF(buf)
  data.curves = qbzf.curves
  data.curves.texture = regl.texture(data.curves)
  data.grid = qbzf.write({
    text: 'ok',
    strokeWidth: 10, // in units
  })
  data.grid.texture = regl.texture(data.grid)
  draw = build(data.grid.n)
  frame()
}

function frame() {
  regl.poll()
  regl.clear({ color: [0,0,0,1], depth: true })
  if (data) draw(data)
}

function build(n) {
  return regl({
    frag: glsl`
      precision highp float;
      #pragma glslify: QBZF = require('qbzf/h')
      #pragma glslify: create_qbzf = require('qbzf/create')
      #pragma glslify: read_curve = require('qbzf/read')

      varying vec2 vpos;
      uniform sampler2D curveTex, gridTex;
      uniform vec2 curveSize, gridUnits, gridSize, gridDim;
      uniform float gridN, strokeWidth;

      void main() {
        vec2 uv = vpos*0.5+0.5;
        QBZF qbzf = create_qbzf(
          uv, gridN, gridSize, gridUnits, gridDim,
          gridTex, curveSize
        );
        float ldist = 1e30;
        for (int i = 0; i < ${n}; i++) {
          vec4 curve = read_curve(qbzf, gridTex, curveTex, float(i));
          if (curve.x < 0.5) break;
          qbzf.count += curve.y;
          ldist = min(ldist,length(curve.zw));
        }
        float a = 5.0; // aliasing width in font units
        float outline = 1.0-smoothstep(strokeWidth-a,strokeWidth+a,ldist);

        vec3 fill = vec3(0,0,0);
        vec3 stroke = vec3(1,1,1);
        vec3 bg = vec3(0.5,0,1);

        vec3 c = mix(
          mix(bg,stroke,outline),
          mix(stroke,fill,smoothstep(ldist,0.0,a)),
          mod(qbzf.count,2.0)
        );
        gl_FragColor = vec4(c,1);
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
    uniforms: {
      curveTex: regl.prop('curves.texture'),
      curveSize: regl.prop('curves.size'),
      gridTex: regl.prop('grid.texture'),
      gridUnits: regl.prop('grid.units'),
      gridSize: regl.prop('grid.grid'),
      gridDim: regl.prop('grid.dimension'),
      gridN: n,
      strokeWidth: regl.prop('grid.strokeWidth'),
    },
    attributes: { position: [-4,-4,-4,+4,+4,+0] },
    elements: [0,1,2],
  })
}
```

# api

``` js
var QBZF = require('qbzf')
var Atlas = require('qbzf/atlas')
```

``` glsl
#pragma glslify: QBZF = require('qbzf/qbzf.h')
#pragma glslify: create_qbzf = require('qbzf/create')
#pragma glslify: read_curve = require('qbzf/read')
```

## var qbzf = QBZF(fontSrc, opts)

Create a new `qbzf` instance from a `Uint8Array` of `fontSrc` (created by the qbzf command) and:

* `opts.density` - default `[200,200]`
* `opts.epsilon` - default `1e-8`

### qbzf.curves

Curve texture data with:

* `qbzf.curves.data` - Uint8Array of curve texture data
* `qbzf.curves.width` - width in pixels of the curve texture
* `qbzf.curves.height` - height in pixels of the curve texture
* `qbzf.curves.size` - 2-element array of `[width,height]`

### qbzf.unitsPerEm

Font unit measurement from the original font file.

### qbzf.measure(opts)

Return only the calculated `units`, `grid`, `offset` and `bbox` without writing to a grid texture.

### var grid = qbzf.write(opts)

Create a grid texture from `opts`:

* `opts.text` - string to stamp glyphs into output grid texture
* `opts.offset` - `[x,y]` translation in units
* `opts.padding` - padding in units as `[left,bottom,right,top]`
* `opts.strokeWidth` - width of stroke in units. default 0
* `opts.data` - `Uint8Array` to write data into. created if not provided.

The resulting `grid` object has:

* `grid.data` - uint8array of grid texture data to read from
* `grid.width` - width of grid texture in pixels
* `grid.height` - height of grid texture in pixels
* `grid.dimension` - 2-element array of `[grid.width,grid.height]`
* `grid.units` - size of font data in font units
* `grid.grid` - dimensions of logical grid
* `grid.n` - number of curves stored in each cell

## var atlas = Atlas(qbzf, opts)

Create an `atlas` to manage multiple labels at once using one texture per each `n` and so one draw
call per `n` along with corresponding label geometry.

* `opts.attributes` - array of strings to set additional attributes in `atlas.add()` which will also
appear alongside other records in `atlas.build()`

### var id = atlas.add(opts)

Add a text label with all the arguments to `qbzf.write()` plus:

* `opts.height` - height of 1 em in output coordinate scale
* `opts.location` - translation in output coordinate scale (default: `[0,0]`)
* `opts.id` - set the id directly. must be unique

Returns the id provided or an assigned unique `id` if none was provided.

### atlas.remove(id)

### var data = atlas.build()

`data` is an object mapping `n` keys to a grid `g` with:

* `g.curves` - reference to `qbzf.curves`
* `g.positions` - vec2 attribute for coordinates in output coordinate scale
* `g.uv` - vec2 attribute for each label's coordinates (0 to 1 in x and y)
* `g.cells` - element indexes for triangle geometry
* `g.offsets` - float attribute for pixel offset
* `g.units` - vec2 attribute for size of label in font units
* `g.size` - vec2 attribute for grid dimensions in number of cells
* `g.id` - id assigned to label (float unless set to something else)

These are merged with everything set in `opts.attributes`.

## `QBZF qbzf = create(vec2 uv, float n, vec2 size, vec2 units, vec3 dim, sampler2D grid_tex, vec2 curve_size)`

Create a glsl `QBZF` struct from the given parameters:

* `vec2 uv` -  texture coordinates for lookup (0 to 1 in each dimension)
* `float n` - number of curves per cell
* `vec2 size` - dimensions of logical grid
* `vec3 dim` - dimensions of grid in pixels and pixel offset to start reading
* `sampler2D grid_tex` - grid texture data
* `vec2 curve_size` - dimensions of curve texture in pixels

The `qbzf.count` is initialized with the number of crossings for the right support for the given
`uv` (either 0 or 1).

## `QBZF qbzf = create(vec2 uv, float n, vec2 size, vec2 units, vec2 dim, sampler2D grid_tex, vec2 curve_size)`

Alias for `create(uv, n, size, units, vec3(dim,0), grid_tex, curve_size)`.

This sets the offset to `0`.

## `vec4 curve = read_curve(QBZF qbzf, sampler2D grid_tex, sampler2D curve_tex, float i)`

Read curve `i` referenced the current cell in `grid_tex` with a lookup into `curve_tex` and
calculate:

* `curve.x` - index of the curve plus one. `0.0` if there is no curve for this index.
* `curve.y` - number of raycast crossings
* `curve.z` - distance from the current point to the curve in x component
* `curve.w` - distance from the current point to the curve in y component

Sum every `curve.y` with `qbzf.count` to get the total number of crossings.

If the number of corssings is even, you're outside the polygon and if odd you're inside.

# usage

```
usage: bezier-text (INFILE)

  -i INFILE     Read from this font file.
  -o OUTFILE    Write bezier text output to this file. Default: "-" (stdout)

  -l --list     List all codes from the input font file.
  -u --unicode  Only include glyphs with these unicode values.
  -c --char     Only include glyphs with these character values.
  -x --index    Only include glyphs with these indexes.

  -h --help     Show this message.
  -v --version  Print software version (1.0.0).

  Unicode and index lists can be specified with multiple flags (-u 97 -u 98 -u 99)
  or with comma-separated lists (-u 97,98,99).

  Char lists can be specified with multiple flags or comma-separated lists.
  For a literal comma, use "-c,".

  Unicodes can be specified in hexadecimal with a leading "u": (-u u0061).

```

# install

For the `qbzf` command:

```
npm install -g qbzf
```

For the library:

```
npm install qbzf
```

# license

bsd

