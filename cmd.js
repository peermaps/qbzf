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

var offset = 0
pump(from(function (size, next) {
  if (isHeader) {
    var header = Buffer.alloc(magic.length + varint.encodingLength(font.unitsPerEm))
    magic.copy(header, 0)
    varint.encode(font.unitsPerEm, header, magic.length)
    isHeader = false
    offset += header.length
    console.error('offset=',offset)
    return next(null, header)
  }
  if (index >= codes.length) return next(null, null)
  while (true) {
    if (index >= codes.length) break
    var g = font.glyphs.glyphs[codes[index++]]
    if (g.unicodes.length === 0) continue
    var buf = pack(g)
    offset += buf.length
    console.error('offset=',offset)
    return next(null, buf)
    //return next(null, pack(g))
  }
  next(null, null)
}), process.stdout, onerror)

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
