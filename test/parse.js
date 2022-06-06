var test = require('tape')
test('{write,parse}I16', function (t) {
  var buf = [0,0]
  var xs = [
    0,1,2,10,50,127,128,250,254,255,256,257,500,511,512,513,600,700,1_200,15_000,
    -1,-2,-10,-50,-127,-128,-250,-254,-255,-256,-257,-500,-511,-512,-513,-600,-700,-1_200,-15_000
  ]
  for (var i = 0; i < xs.length; i++) {
    var x = parseI16(writeI16(buf, 0, xs[i]))
    t.equal(x, xs[i])
  }
  t.end()
})

function writeI16(out, offset, x) {
  var ax = Math.abs(x)
  out[offset+0] = (ax >> 8) % 128 + (x < 0 ? 128 : 0)
  out[offset+1] = ax % 256
  return out
}

function parseI16(v) { 
  var x = v[0]/255, y = v[1]/255
  return ((x*65280)%32640 + y*255) * (x*32640<16384?+1:-1) + (x*32640<16384?0:128)
}
