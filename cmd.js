#!/usr/bin/env node
var fs = require('fs')
var opentype = require('opentype.js')
var pack = require('./lib/pack.js')
var from = require('from2')
var pump = require('stream').pipeline
var varint = require('varint')
var uniq = require('uniq')

var minimist = require('minimist')
var argv = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    v: 'version',
    i: 'infile',
    o: 'outfile',
    u: ['unicode','unicodes'],
    c: ['char','chars'],
    x: ['index','indexes'],
    l: ['ls','list'],
    m: ['meta'],
  },
  boolean: [ 'help', 'version', 'list', 'meta' ],
  default: { outfile: '-' },
})

var magic = Buffer.from(require('./lib/magic.js').concat(0x0a))
var outstream = argv.outfile === '-' ? process.stdout : fs.createWriteStream(argv.outfile)

if (argv.meta) {
  var compare = require('./lib/compare.js')
  var infiles = [].concat(argv.infile || []).concat(argv._)
  var index = 0
  return pump(from(function (size, next) {
    if (index >= infiles.length) return next(null, null)
    var infile = infiles[index++]
    fs.readFile(infile, function (err, buf) {
      var data = buf.buffer
      var fileType = compare(magic, buf.slice(0,magic.length)) === 0 ? 'qbzf' : 'ttf'
      if (fileType === 'ttf') {
        var font = opentype.parse(data)
        var keys = Object.keys(font.glyphs.glyphs)
        var unicodes = keys.map(k => font.glyphs.glyphs[k].unicodes)
          .filter(u => u.length > 0).sort(cmpu)
        var ranges = [], range = [null,null]
        var prev = []
        for (var i = 0; i < unicodes.length; i++) {
          var u = unicodes[i]
          if (range[0] === null) {
            range[0] = u.length === 1 ? u[0] : u
          } else if (diffu(prev,u) > 1) {
            range[1] = prev.length === 1 ? prev[0]+1 : [prev[0],prev[1]+1]
            ranges.push(range[1]-range[0] === 1 ? range[0] : range)
            range = [ u.length === 1 ? u[0] : u, null ]
          }
          prev = u
        }
        if (range[0] !== null) {
          range[1] = prev.length === 1 ? prev[0] : prev
          ranges.push(range[1]-range[0] === 1 ? range[0] : range)
        }
        next(null, JSON.stringify({ file: infile, unicodes: ranges })+'\n')
      } else {
      }
    })
  }), outstream, onerror)
  return
}

var infile = argv.infile ?? argv._[0]
if (argv.version) return console.log(require('./package.json').version)
if (infile === undefined || argv.help) return usage()
var data = fs.readFileSync(infile).buffer
var font = opentype.parse(data)

var isHeader = true
var indexes = []

if (argv.unicodes !== undefined) {
  var codes = new Set
  var ucodes = [].concat(argv.unicodes)
    .flatMap(c => String(c).split(','))
  for (var i = 0; i < ucodes.length; i++) {
    var u = ucodes[i]
    var m = /^\\?u\+?([0-9A-Fa-f]+)/i.exec(u)
    codes.add(m ? parseInt(m[1],16) : Number(u))
  }
  for (var [index,g] of Object.entries(font.glyphs.glyphs)) {
    if (codes.has(g.unicode)) {
      indexes.push(Number(index))
    }
  }
}
if (argv.chars !== undefined) {
  var codes = new Set
  var chars = [].concat(argv.chars)
    .flatMap(c => c === ',' ? c : String(c).split(','))
  for (var i = 0; i < chars.length; i++) {
    codes.add(chars[i].charCodeAt(0))
  }
  for (var [index,g] of Object.entries(font.glyphs.glyphs)) {
    if (codes.has(g.unicode)) {
      indexes.push(Number(index))
    }
  }
}
if (argv.indexes !== undefined) {
  indexes = indexes.concat(argv.indexes)
    .flatMap(c => String(c).split(',').map(Number))
}

if (indexes.length === 0) {
  indexes = Object.keys(font.glyphs.glyphs).map(Number)
}
uniq(indexes)
indexes.sort((a,b) => a < b ? -1 : +1)

var index = 0
if (argv.list) {
  return pump(from(function (size, next) {
    if (index >= indexes.length) return next(null, null)
    while (true) {
      if (index >= indexes.length) break
      var g = font.glyphs.glyphs[indexes[index++]]
      if (g.unicodes.length === 0) continue
      return next(null, JSON.stringify(g)+'\n')
    }
    next(null, null)
  }), outstream, onerror)
}

pump(from(function (size, next) {
  if (isHeader) {
    var header = Buffer.alloc(magic.length + varint.encodingLength(font.unitsPerEm))
    magic.copy(header, 0)
    varint.encode(font.unitsPerEm, header, magic.length)
    isHeader = false
    return next(null, header)
  }
  if (index >= indexes.length) return next(null, null)
  while (true) {
    if (index >= indexes.length) break
    var g = font.glyphs.glyphs[indexes[index++]]
    if (g.unicodes.length === 0) continue
    return next(null, pack(g))
  }
  next(null, null)
}), outstream, onerror)

function usage() {
  console.log(`
    usage: qbzf (INFILE)

      -i INFILE     Read from this font file.
      -o OUTFILE    Write bezier text output to this file. Default: "-" (stdout)

      -l --list     List all codes from the input ttf font file.
      -m --meta     List unitsPerEm and glyph unicodes as ranges for each INFILE,
                    which can be a ttf or qbzf font file.

      -u --unicode  Only include glyphs with these unicode values.
      -c --char     Only include glyphs with these character values.
      -x --index    Only include glyphs with these indexes.

      -h --help     Show this message.
      -v --version  Print software version (${require('./package.json').version}).

      Unicode and index lists can be specified with multiple flags (-u 97 -u 98 -u 99)
      or with comma-separated lists (-u 97,98,99).

      Char lists can be specified with multiple flags or comma-separated lists.
      For a literal comma, use "-c,".

      Unicodes can be specified in hexadecimal with a leading "u": (-u u0061).

  `.trim().replace(/^ {4}/mg,'') + '\n')
}

function onerror(err) {
  if (err && err.code !== 'EPIPE') {
    console.error(err)
    process.exit(1)
  }
}

function cmpu(a,b) {
  if (a[0] === b[0] && a.length === b.length) {
    return a[1] < b[1] ? -1 : + 1
  } else if (a[0] === b[0]) {
    return a.length < b.length ? -1 : +1
  }
  return a[0] < b[0] ? -1 : +1
}

function diffu(a,b) {
  if (a.length === 1 && b.length === 1) return b[0]-a[0]
  if (a.length !== b.length) return 100
  if (a[0] === b[0] && a[1]+1 === b[0]) return 0
  return 100
}
