// Declare thumbor-url-builder in JS
// Your encryption key is not required, but your link will be unsafe.

var Thumbor = require('thumbor');
var thumbor  = new Thumbor('rove.to', 'https://thumbor.rove.to');

// Generate your url :

var thumborUrl = thumbor.setImagePath('https://ipfs.rove.to/ipfs/QmbPPexxHPkWpdU4i1gaD2LHmVsz7BZ5f1DcF8WW3oZPvs').resize(300,300).buildUrl();

console.log(thumborUrl);