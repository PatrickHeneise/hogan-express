'use strict';

var
  $,
  cache,
  ctx,
  customContent,
  hogan = require('hogan.js'),
  read,
  render,
  renderLayout,
  renderPartials,
  __hasProp = {}.hasOwnProperty,
  __extends = function (child, parent) {
    for (var key in parent) {
      if (__hasProp.call(parent, key)) {
        child[key] = parent[key];
      }
    }

    function Ctor() {
      this.constructor = child;
    }
    Ctor.prototype = parent.prototype;
    child.prototype = new Ctor();
    child.__super__ = parent.prototype;
    return child;
  };

$ = {};

__extends($, require('fs'));
__extends($, require('util'));
__extends($, require('path'));

cache = {};
ctx = {};

read = function (path, options, fn) {
  var str;
  str = cache[path];
  if (options.cache && str) {
    return fn(null, str);
  }
  return $.readFile(path, 'utf8', function (err, str) {
    if (err) {
      return fn(err);
    }
    str = str.replace(/^\uFEFF/, '');
    if (options.cache) {
      cache[path] = str;
    }
    return fn(null, str);
  });
};

renderPartials = function (partials, opt, fn) {
  var count, name, path, result;
  count = 1;
  result = {};
  for (name in partials) {
    path = partials[name];
    if (typeof path !== 'string') {
      continue;
    }
    if (!$.extname(path)) {
      path += ctx.ext;
    }
    path = ctx.lookup(path);
    count++;
    read(path, opt, (function (name, path) {
      return function (err, str) {
        if (!count) {
          return;
        }
        if (err) {
          count = 0;
          fn(err);
        }
        result[name] = str;
        if (!--count) {
          return fn(null, result);
        }
      };
    })(name, path));
  }
  if (!--count) {
    return fn(null, result);
  }
};

renderLayout = function (path, opt, fn) {
  if (!path) {
    return fn(null, false);
  }
  if (!$.extname(path)) {
    path += ctx.ext;
  }
  path = ctx.lookup(path);
  if (!path) {
    return fn(null, false);
  }
  return read(path, opt, function (err, str) {
    if (err) {
      return fn(err);
    }
    return fn(null, str);
  });
};

customContent = function (str, tag, opt, partials) {
  var cTag, oTag, text;
  oTag = '{{#' + tag + '}}';
  cTag = '{{/' + tag + '}}';
  text = str.substring(str.indexOf(oTag) + oTag.length, str.indexOf(cTag));
  return hogan.compile(text, opt).render(opt, partials);
};

render = function (path, opt, fn) {
  var lambda, lambdas, name, partials, _fn;
  ctx = this;
  partials = opt.settings.partials || {};
  if (opt.partials) {
    partials = __extends(partials, opt.partials);
  }
  lambdas = opt.settings.lambdas || {};
  if (opt.lambdas) {
    lambdas = __extends(lambdas, opt.lambdas);
  }
  delete lambdas.prototype;
  delete lambdas.__super__;
  opt.lambdas = {};
  _fn = function (name, lambda) {
    return opt.lambdas[name] = function () {
      var lcontext;
      lcontext = this;
      return function (text) {
        var lctx;
        lctx = {};
        if (opt._locals) {
          lctx = __extends(lctx, opt._locals);
        }
        lctx = __extends(lctx, lcontext);
        return lambda(hogan.compile(text).render(lctx));
      };
    };
  };
  for (name in lambdas) {
    lambda = lambdas[name];
    _fn(name, lambda);
  }
  return renderPartials(partials, opt, function (err, partials) {
    var layout;
    if (err) {
      return fn(err);
    }
    layout = opt.layout === void 0 ? opt.settings.layout : layout = opt.layout;
    return renderLayout(layout, opt, function (err, layout) {
      return read(path, opt, function (err, str) {
        var customTag, customTags, result, tag, tmpl, _i, _len;
        if (err) {
          return fn(err);
        }
        try {
          tmpl = hogan.compile(str, opt);
          result = tmpl.render(opt, partials);
          customTags = str.match(/({{#yield-\w+}})/g);
          if (layout) {
            if (customTags) {
              for (_i = 0, _len = customTags.length; _i < _len; _i++) {
                customTag = customTags[_i];
                tag = customTag.match(/{{#([\w-]+)}}/)[1];
                if (tag) {
                  opt[tag] = customContent(str, tag, opt, partials);
                }
              }
            }
            opt['yield'] = result;
            tmpl = hogan.compile(layout, opt);
            result = tmpl.render(opt, partials);
          }
          return fn(null, result);
        } catch (_error) {
          err = _error;
          return fn(err);
        }
      });
    });
  });
};

module.exports = render;
