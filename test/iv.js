var test = require('tape')
var mivxa = require('../lib/mivxa.js')

test.only('multi interval xor+and', function (t) {
  t.deepEqual(mivxa([], [0,1,2,3], [0,1]), [0,1])
  t.deepEqual(mivxa([], [0,1,2,3], [0.5,2.5]), [0.5,1,2,2.5])
  t.deepEqual(mivxa([], [0,1,1,2,1,4], [1,3]), [2,3])
  t.deepEqual(mivxa([], [0,0.5,1,2,1,4], [1,3]), [2,3])
  t.deepEqual(mivxa([], [0,1.1,1,2,1,4], [1,3]), [1,1.1,2,3])
  t.end()
})
