var test = require('tape')
var QBZF = require('../')

var grids = []
for (var y = 1; y <= 6; y++) {
  for (var x = 1; x <= 6; x++) {
    grids.push([x,y])
  }
}

test('hard-coded output for grid of outputs against curve 1', function (t) {
  var data = {}
  var expected = require('./data/curve1.json')
  grids.forEach(function (grid) {
    var qbzf = new QBZF(Uint8Array.from([
      113,98,122,102,49,10,220,11,8,119,208,15,0,0,0,136,14,224,18,216,4,200,1,
      140,14,216,29,192,12,160,6,179,23,160,6,215,4,215,4,180,9,159,6,231,7,199,1
    ]))
    var output = qbzf.write({ text: 'w', size: [1000,1000], grid, n: 4 })
    var key = grid.join(',')
    t.equal(expected[key], Buffer.from(output.data).toString('base64'), `grid ${key}`)
  })
  t.end()
})
