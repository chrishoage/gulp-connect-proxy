var url    = require('url');
var http   = require('http');
var fs     = require('fs');
var path   = require('path');
var extend = require('extend');


function proxyRequest (localRequest, localResponse, next) {

  var parts = url.parse('http://' + localRequest.url.slice(1));

  var options = {
    host: parts.host,
    path: parts.path
  };
  http.request(options, function (remoteRequest) {
    if (remoteRequest.statusCode === 200) {
      localResponse.writeHead(200, {
          'Content-Type': remoteRequest.headers['content-type']
      });
      remoteRequest.pipe(localResponse);
    } else {
      localResponse.writeHead(remoteRequest.statusCode);
      localResponse.end();
    }
  }).on('error', function(e) {
    next();
  }).end();
};

function Proxy (options) {
  var config = extend({}, {
    proxyBasePath: false
  }, options);

  return function (localRequest, localResponse, next) {
    if (typeof config.root === 'string') {
      config.root = [config.root]
    } else if (!Array.isArray(config.root)) {
      throw new Error('No root specified')
    }

    var pathChecks = []
    config.root.forEach(function(root, i) {
      var p = path.resolve(root)+localRequest.url;

      fs.access(p, function(err) {
        pathChecks.push(err ? false : true)
        if (config.root.length == ++i) {
          var pathExists = pathChecks.some(function (p) {
            return p;
          });
          if (pathExists) {
            next();
          } else {
            if (config.proxyBasePath && localRequest.url.indexOf(config.proxyBasePath) === 0) {
              localRequest.url = localRequest.url.replace(config.proxyBasePath, '');
            }

            proxyRequest(localRequest, localResponse, next)
          }
        }
      });
    })
  }
}

module.exports = Proxy;
