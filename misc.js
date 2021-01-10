var crypto = require('crypto');

var helper = {
  getTimestamp: function() {
    return Math.floor(Date.now() / 1000)
  },
  generateSHA256: function(string) {
    return crypto.createHash('sha256').update(string).digest('hex')
  },
  generateSeed: function() {
    return crypto.createHash('sha256').update(crypto.randomBytes(100).toString('hex')).digest('hex')
  },
  shuffleArray: function(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  getRandomInt: function(max) {
    return Math.floor(Math.random() * Math.floor(max));
  },
  byteCount: function(s) {
      return encodeURI(s).split(/%..|./).length - 1;
  }

}

global.helper = helper;
