var Promise = require("bluebird");
var Twit = require('twit')
var fs = require('fs');
var _ = require('lodash');
var Horseman = require('node-horseman');
var tmp = require('tmp');

var FAV_THRESHOLD = 250;

// load and filter dril tweets
var dril = _.map(
  _.filter(
    require('./dril.json'),
    function(t) {
      return t.retweeted === false &&
             t.in_reply_to_user_id === null &&
             t.retweet_count + t.favorite_count > FAV_THRESHOLD &&
             (typeof(t.entities) === "undefined" || t.entities.user_mentions.count === 0)
    }),
  function(t) {
    return t.id_str;
  });

console.log("Working with " + dril.length + " dril tweets");

var tweetToPic = function(url, dest) {
  var agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36";
  var horseman = new Horseman({
    phantomPath: "/Users/colin/bin/phantomjs",
    timeout: 50000
  });

  return horseman
         .userAgent(agent)
         .viewport(3200, 2000)
         .open(url)
         .waitForSelector("body:not(.swift-loading)")
         .waitFor(function noAjax() {
           return $.active == 0
         },  true) 
         .crop(".permalink-tweet-container", dest)
         .then(function() {
           return horseman.close();
         });

};

var conf = JSON.parse(fs.readFileSync('conf.json'));
var T = new Twit(conf.twitter);

var stream = T.stream('user', { stringify_friend_ids: true });

console.log("running");

stream.on('friends', function (friendsMsg) {
  console.log("i have friends!");
});
stream.on('connected', function (response) {
  console.log("connected!");
})

var handleMessage = function(dm) {
  // check for a valid user

  
  console.log(dm.text);

  // filter URLs by valid users?
  var urls = _.filter(
    _.map(dm.entities.urls, function(y) { return y.expanded_url; }),
    function(y) { return y.indexOf("https://twitter.com") === 0; });

  if ( urls.length == 0 ) {
    console.log("no urls, bye");
    return;
  }
  
  console.log("work from", urls);

  var url1 = _.sample(urls);
  var url2 = "https://twitter.com/dril/status/" + _.sample(dril);

  console.log(url1, url2);

  var tmp1 = tmp.fileSync({keep: true, postfix:".png"});
  var tmp2 = tmp.fileSync({keep: true, postfix:".png"});
  
  var dest1 = tmp1.name;
  var dest2 = tmp2.name;

  tweetToPic(url1, dest1).then(() => tweetToPic(url2, dest2)).then(function() {
    var ids = [];

    console.log("start uploads");
    // first we must post the media to Twitter
    var b64content = fs.readFileSync(dest1, { encoding: 'base64' })
    T.post('media/upload', { media_data: b64content }, function (err, data, response) {
      console.log("1 uploaded", data);
      ids.push(data.media_id_string);
      
      var b64content = fs.readFileSync(dest2, { encoding: 'base64' })
      T.post('media/upload', { media_data: b64content }, function (err, data, response) {
        console.log("2 uploaded", data);
        
        ids.push(data.media_id_string);
        console.log(ids);
        
        var params = { media_ids: ids }
        
        T.post('statuses/update', params, function (err, data, response) {
          console.log(data)
        })
        
      }); // media/upload 2
    }); // media/upload 1
  });


};

stream.on('direct_message', function (directMsg) {
  handleMessage(directMsg.direct_message);
});
