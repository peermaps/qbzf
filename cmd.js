#!/usr/bin/env node
var fs = require('fs')
var opentype = require('opentype.js')
var pack = require('./lib/pack.js')
var from = require('from2')
var pump = require('stream').pipeline
var varint = require('varint')

var minimist = require('minimist')
var argv = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    v: 'version',
    i: 'infile',
    o: 'outfile',
    u: ['unicode','unicodes'],
    x: ['index','indexes'],
    l: 'ls',
  },
  boolean: [ 'help', 'version', 'ls' ],
  default: { outfile: '-' },
})

var magic = Buffer.from(require('./lib/magic.js').concat(0x0a))

var infile = argv.infile ?? argv._[0]
if (argv.version) return console.log(require('./package.json').version)
if (infile === undefined || argv.help) return usage()
var data = fs.readFileSync(infile).buffer
var font = opentype.parse(data)

var outstream = argv.outfile === '-' ? process.stdout : fs.createWriteStream(argv.outfile)
var isHeader = true
var indexes = []

if (argv.unicodes) {
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
} else if (argv.indexes) {
  indexes = [].concat(argv.indexes)
    .flatMap(c => String(c).split(',').map(Number))
} else {
  indexes = Object.keys(font.glyphs.glyphs)
}

var index = 0
if (argv.ls) {
  return pump(from(function (size, next) {
    if (index >= indexes.length) return next(null, null)
    while (true) {
      if (index >= indexes.length) break
      var g = font.glyphs.glyphs[indexes[index++]]
      if (g.unicodes.length === 0) continue
      return next(null, JSON.stringify(g)+'\n')
    }
    next(null, null)
  }), process.stdout, onerror)
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
}), process.stdout, onerror)

function usage() {
  console.log(`
    usage: bezier-text (INFILE)

      -i INFILE     Read from this font file.
      -o OUTFILE    Write bezier text output to this file. Default: "-" (stdout)

      -l --list     List all codes from the input font file.
      -u --unicode  Only include glyphs with these unicode values.
      -x --index    Only include glyphs with these indexes.

      -h --help     Show this message.
      -v --version  Print software version (${require('./package.json').version}).

      Unicode and index lists can be specified with multiple flags (-u 97 -u 98 -u 99)
      or with comma-separated lists (-u 97,98,99).

      Unicodes can be specified in hexadecimal with a leading "u": (-u u0061).

  `.trim().replace(/^ {4}/mg,'') + '\n')
}

function onerror(err) {
  if (err && err.code !== 'EPIPE') {
    console.error(err)
    process.exit(1)
  }
}
