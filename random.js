var Horseman = require('node-horseman');


var url = "https://twitter.com/dril/status/796037882783928321";
var POLYURL = 'https://cdn.polyfill.io/v2/polyfill.min.js';

var tweetToPic = function(tweet_url, file) {
  var agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36";
  console.log("START " + tweet_url);

  var horseman = new Horseman({
    //  diskCache: true,
    //  diskCachePath: "/tmp",
    ignoreSSLErrors: true,
    //  phantomPath: "/usr/bin/phantomjs"
  });

  return horseman
       .userAgent()
       .then(function(useragent) { // Get Polyfill based on real UserAgent
         return this.download(POLYURL + '?ua=' + useragent);
       })
       .then(function(polyfill) {
         // Make polyfill into function
         var polyfun = new Function(polyfill);
         // Wrap function in evaluateJavaScript
         var onInit = new Function(
           'console.log("onInitialized");' +
           'page.evaluateJavaScript(' + polyfun.toString() + ')'
         );
         // Call before page loads
         return this.at('initialized', onInit);
       })
       .userAgent(agent)
       .viewport(3200, 2000)
       .open(tweet_url)
       .waitForSelector("body:not(.swift-loading)")
       .waitFor(function noAjax() {
         return $.active == 0
       },  true)
  
  //.wait(25000)
       .screenshot("full.png")
       .crop(".permalink-tweet-container", file)
       .finally(function() {
         console.log("bye!");
         horseman.close();
       });
};

tweetToPic(url, "big.png").then(() => tweetToPic("https://twitter.com/cshirky/status/787827040116363264", "shirky.png"))
                    .then(function() {
                      console.log("all the files were created");
                    });

console.log("lol");


/**
Promise.all([
  tweetToPic(url, "big.png"),
  tweetToPic("https://twitter.com/cshirky/status/787827040116363264", "shirky.png")
]).then(function() {
  console.log("all the files were created");
}).catch(function() { console.log("ugh"); });

console.log("lol");
*/
