var test = require('tape')
var ivxor = require('../lib/ivxor.js')

test('interval xor', function (t) {
  var x
  x = []
  t.equal(ivxor(x,0,[0,1],0,[2,3],0), 4)
  t.deepEqual(x, [0,1,2,3])
  x = []
  t.equal(ivxor(x,0,[2,3],0,[0,1],0), 4)
  t.deepEqual(x, [0,1,2,3])
  x = []
  t.equal(ivxor(x,0,[0,2],0,[1,3],0), 4)
  t.deepEqual(x, [0,1,2,3])
  x = []
  t.equal(ivxor(x,0,[0,3],0,[1,2],0), 4)
  t.deepEqual(x, [0,1,2,3])
  x = []
  t.equal(ivxor(x,0,[1,2],0,[0,3],0), 4)
  t.deepEqual(x, [0,1,2,3])
  x = []
  t.equal(ivxor(x,0,[1,2],0,[2,3],0), 2)
  t.deepEqual(x, [1,3])
  x = []
  t.equal(ivxor(x,0,[2,3],0,[1,2],0), 2)
  t.deepEqual(x, [1,3])
  x = [0,1,2,3,4]
  t.equal(ivxor(x,5,[100,101,2,3],2,[102,103,104,1,2],3), 7)
  t.deepEqual(x, [0,1,2,3,4,1,3])
  t.end()
})
