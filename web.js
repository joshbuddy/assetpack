var express = require('express');
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;
var http = require('http');
var url = require('url');
var fs = require('fs');
var client = null;

if (process.env.REDISTOGO_URL) {
  var redis = require("redis");
  var rtg = url.parse(process.env.REDISTOGO_URL);
  client = redis.createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(":")[1]);
} else {
  client = null;
}

var	uglifycss = require('uglifycss');
var	cssOptions = { maxLineLen: 0, expandVars: false, cuteComments: true };

var app = express.createServer(express.logger());

var withCache = function(data, response, callback) {
  if (client) {
    var crypto = require('crypto');
    var key = crypto.createHash('md5').update(data).digest("hex");
    if (client.get(key, function(err, reply) {
      if (err) {
        response.statusCode = 500;
        response.setHeader("Content-type", "text/plain");
        response.end("ERROR: " + err);
      } else {
        if (reply == null) {
          console.log("Cached value for "+key+" did not exist ("+data.length+")");
          reply = callback();
          client.set(key, reply);
        }
        response.end(reply);
      }
    }));
  } else {
    response.end(callback());
  }
}

var processJs = function(data, response) {
  response.setHeader("Content-type", "text/javascript");
  withCache(data, response, function() {
    var ast = jsp.parse(data);
    ast = pro.ast_mangle(ast); // get a new AST with mangled names
    ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    return pro.gen_code(ast); // compressed code here
  });
};

var processCss = function(data, response) {
  response.setHeader("Content-type", "text/css");
  withCache(data, response, function() {
    return uglifycss.processString(data, cssOptions);
  });
};

app.get(/\/proxy\/(.*)/, function(request, response) {
  var data = '';
  var parsedUrl = url.parse(request.params[0])
  var opts = {host: parsedUrl.host, path: parsedUrl.pathname}
  var httpRequest = http.get(opts, function(res) {
    res.addListener('data', function(chunk) { data += chunk; });
    res.addListener('end', function() {
      if (request.params[0].match(/\.js$/)) {
        processJs(data, response);
      } else if (request.params[0].match(/\.css$/)) {
        processCss(data, response);
      } else {
        console.log("Can't understand "+request.params[0]);
        response.status = 500;
        response.end("Can't understand "+request.params[0]);
      }
    });
  });
});

app.put('/js', function(request, response) {
  var data = '';
  request.addListener('data', function(chunk) { data += chunk; });
  request.addListener('end', function() { processJs(data, response); });
});

app.put('/css', function(request, response) {
  var data = '';
  request.addListener('data', function(chunk) { data += chunk; })
  request.addListener('end', function() { processCss(data, response); });
});

app.get('/', function(request, response) {
  response.setHeader("Content-type", "text/plain")
  fs.readFile(__dirname+'/README.txt', function (err, data) {
    if (err) throw err;
    response.end(data);
  });
});


var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log("Listening on " + port);
});