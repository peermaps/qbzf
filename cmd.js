#!/usr/bin/env node
var fs = require('fs')
var opentype = require('opentype.js')
var commandsToCurves = require('./lib/commands-to-curves.js')
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
    c: ['code','codes']
  },
  boolean: [ 'help', 'version' ],
  default: { outfile: '-' },
})

var magic = Buffer.from('qbzf1\n')

var infile = argv.infile ?? argv._[0]
if (argv.version) return console.log(require('./package.json').version)
if (infile === undefined || argv.help) return usage()
var data = fs.readFileSync(infile).buffer
var font = opentype.parse(data)

var index = 0
var outstream = argv.outfile === '-' ? process.stdout : fs.createWriteStream(argv.outfile)
var isHeader = true

var codes = argv.code
  ? [].concat(argv.code).flatMap(c => c.split(',').map(Number))
  : Object.keys(font.glyphs.glyphs)

isHeader = false

pump(from(function (size, next) {
  if (index >= codes.length) return next(null, null)
  if (isHeader) {
    var header = Buffer.alloc(magic.length + varint.encodingLength(font.unitsPerEm))
    magic.copy(header, 0)
    varint.encode(font.unitsPerEm, header, magic.length)
    isHeader = false
    return next(null, header)
  }
  while (true) {
    if (index >= codes.length) break
    var g = font.glyphs.glyphs[codes[index++]]
    if (g.unicodes.length === 0) continue
    return next(null, pack(g))
  }
  next(null, null)
}), process.stdout, onerror)

function pack(g) {
  var curves = commandsToCurves(g.path.commands)
  var size = varint.encodingLength(curves.length)
    + varint.encodingLength(g.advanceWidth)
    + varint.encodingLength(g.leftSideBearing)
    + varint.encodingLength(g.xMin)
    + varint.encodingLength(g.yMin)
    + varint.encodingLength(g.xMax)
    + varint.encodingLength(g.yMax)
  for (var i = 0; i < curves.length; i++) {
    for (var j = 0; j < curves[i].length; j++) {
      size += varint.encodingLength(curves[i][j])
    }
  }
  var offset = 0
  var buf = Buffer.alloc(size)
  varint.encode(curves.length, buf, offset)
  offset += varint.encode.bytes
  varint.encode(g.advanceWidth, buf, offset)
  offset += varint.encode.bytes
  varint.encode(g.leftSideBearing, buf, offset)
  offset += varint.encode.bytes
  varint.encode(g.xMin, buf, offset)
  offset += varint.encode.bytes
  varint.encode(g.yMin, buf, offset)
  offset += varint.encode.bytes
  varint.encode(g.xMax, buf, offset)
  offset += varint.encode.bytes
  varint.encode(g.yMax, buf, offset)
  offset += varint.encode.bytes
  for (var i = 0; i < curves.length; i++) {
    for (var j = 0; j < curves[i].length; j++) {
      varint.encode(curves[i][j], buf, offset)
      offset += varint.encode.bytes
    }
  }
  return buf
}

function usage() {
  console.log(`
    usage: bezier-text (INFILE)

      -i INFILE     Read from this font file.
      -o OUTFILE    Write bezier text output to this file. Default: "-" (stdout)

      -h --help     Show this message.
      -v --version  Print software version (${require('./package.json').version}).
  `.trim().replace(/^ {4}/mg,'') + '\n')
}

function onerror(err) {
  if (err) {
    console.error(err)
    process.exit(1)
  }
}
