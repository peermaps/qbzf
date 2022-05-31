var test = require('tape')
var ivxor = require('../lib/ivxor.js')
var mivxor = require('../lib/mivxor.js')
var ivand = require('../lib/ivand.js')
var mivxa = require('../lib/mivxa.js')

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

test('interval and', function (t) {
  var x
  x = []
  t.equal(ivand(x,0,[0,1],0,[2,3],0), 0)
  t.deepEqual(x, [])
  x = []
  t.equal(ivand(x,0,[2,3],0,[0,1],0), 0)
  t.deepEqual(x, [])
  x = []
  t.equal(ivand(x,0,[0,2],0,[1,3],0), 2)
  t.deepEqual(x, [1,2])
  x = []
  t.equal(ivand(x,0,[0,3],0,[1,2],0), 2)
  t.deepEqual(x, [1,2])
  x = []
  t.equal(ivand(x,0,[1,2],0,[0,3],0), 2)
  t.deepEqual(x, [1,2])
  x = []
  t.equal(ivand(x,0,[1,2],0,[2,3],0), 0)
  t.deepEqual(x, [])
  x = []
  t.equal(ivand(x,0,[2,3],0,[1,2],0), 0)
  t.deepEqual(x, [])
  x = [0,1,2,3,4]
  t.equal(ivand(x,5,[100,101,2,3],2,[102,103,104,1,2],3), 5)
  t.deepEqual(x, [0,1,2,3,4])
  t.end()
})

test('multi interval xor', function (t) {
  t.deepEqual(mivxor([], [0,1,2,3]), [0,1,2,3])
  t.deepEqual(mivxor([], [2,3,0,1]), [0,1,2,3])
  t.deepEqual(mivxor([], [0,2,1,3]), [0,1,2,3])
  t.deepEqual(mivxor([], [0,3,1,2]), [0,1,2,3])
  t.deepEqual(mivxor([], [1,2,0,3]), [0,1,2,3])
  t.deepEqual(mivxor([], [1,2,2,3]), [1,3])
  t.deepEqual(mivxor([], [2,3,1,2]), [1,3])
  t.end()
})

test('in-place multi interval xor', function (t) {
  var x
  x = [0,1,2,3]
  t.deepEqual(mivxor(x, x), [0,1,2,3])
  x = [2,3,0,1]
  t.deepEqual(mivxor(x, x), [0,1,2,3])
  x = [0,2,1,3]
  t.deepEqual(mivxor(x, x), [0,1,2,3])
  x = [0,3,1,2]
  t.deepEqual(mivxor(x, x), [0,1,2,3])
  x = [1,2,0,3]
  t.deepEqual(mivxor(x, x), [0,1,2,3])
  x = [1,2,2,3]
  t.deepEqual(mivxor(x, x), [1,3])
  x = [2,3,1,2]
  t.deepEqual(mivxor(x, x), [1,3])
  t.end()
})

test.only('multi interval xor+and', function (t) {
  t.deepEqual(mivxa([], [0,1,2,3], [0,1]), [0,1])
  t.deepEqual(mivxa([], [0,1,2,3], [0.5,2.5]), [0.5,1,2,2.5])
  t.deepEqual(mivxa([], [0,1,1,2,1,4], [1,3]), [2,3])
  t.deepEqual(mivxa([], [0,0.5,1,2,1,4], [1,3]), [2,3])
  t.deepEqual(mivxa([], [0,1.1,1,2,1,4], [1,3]), [1,1.1,2,3])
  t.end()
})
