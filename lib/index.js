'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _slicedToArray(arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

var _MD5 = require('MD5');

var _MD52 = _interopRequireDefault(_MD5);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _geoGraticule = require('geo-graticule');

var _geoGraticule2 = _interopRequireDefault(_geoGraticule);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _hexFracDecFrac = require('hex-frac-dec-frac');

var _hexFracDecFrac2 = _interopRequireDefault(_hexFracDecFrac);

var _djia = require('djia');

var _djia2 = _interopRequireDefault(_djia);

var _lodashObjectAssign = require('lodash/object/assign');

var _lodashObjectAssign2 = _interopRequireDefault(_lodashObjectAssign);

var _lodashUtilityIdentity = require('lodash/utility/identity');

var _lodashUtilityIdentity2 = _interopRequireDefault(_lodashUtilityIdentity);

var _lodashObjectPick = require('lodash/object/pick');

var _lodashObjectPick2 = _interopRequireDefault(_lodashObjectPick);

var _lodashFunctionPartial = require('lodash/function/partial');

var _lodashFunctionPartial2 = _interopRequireDefault(_lodashFunctionPartial);

var _packageJson = require('../package.json');

// Debug based on the name of the module
var debug = _debug2['default'](_packageJson.name);

// A simple pass through as a default task for async.parallel
var passThrough = function passThrough(cb) {
  return cb(null, null);
};

// Split a string at that index and return boths parts
var splitAt = function splitAt(str, index) {
  return [str.substring(0, index), str.substring(index)];
};

// Formatting helpers for dates and dow jones values
var formatDate = function formatDate(date) {
  return _moment2['default'](date).format('YYYY-MM-DD');
};
var getDayBefore = function getDayBefore(date) {
  return formatDate(_moment2['default'](date).subtract({ days: 1 }));
};
var formatDjia = function formatDjia(djia) {
  return typeof djia === 'number' ? djia.toFixed(2) : djia;
};

// Helpers for determining if locations or dates trigger the w30 rule
var useW30ForDate = function useW30ForDate(date) {
  return formatDate(date) > '2008-05-26';
};
var useW30ForLocation = function useW30ForLocation(loc) {
  return loc.isW30 ? loc.isW30() : new _geoGraticule2['default'](loc).isW30();
};
var useW30 = function useW30(options) {
  return useW30ForDate(options.date) && useW30ForLocation(options.location || options.geo);
};

// Taking an array of decimals and converting it to the global hash
var decimalsToGlobal = function decimalsToGlobal(decimals) {
  return [decimals[0] * 180 - 90, decimals[1] * 360 - 180];
};

// Convert date/location and east/west decimals to the correct
// geocode within that location's graticule
var locationWithDecimals = function locationWithDecimals(options) {
  var date = options.date;
  var location = options.location;
  var _options$decimals = options.decimals;
  var east = _options$decimals.east;
  var west = _options$decimals.west;

  var geo = new _geoGraticule2['default'](location);
  return geo.pointWithinGraticule(useW30({ date: date, geo: geo }) ? east : west);
};

// Convert date/location and east/west decimals to the correct
// geocode within all the neighboring graticules for that location
var neighborsWithDecimals = function neighborsWithDecimals(options) {
  var date = options.date;
  var location = options.location;
  var decimals = options.decimals;

  return new _geoGraticule2['default'](location).getNeighboringGraticules().map(function (row) {
    return row.map(function (graticule) {
      return locationWithDecimals({ date: date, decimals: decimals, location: graticule });
    });
  });
};

// Converts a date to the decimals for that date
// Will use w30 based on the flag passed in
var toDecimals = function toDecimals(_x, _x2, cb) {
  var w30 = arguments[0] === undefined ? false : arguments[0];

  var _ref = arguments[1] === undefined ? {} : arguments[1];

  var _ref$date = _ref.date;
  var date = _ref$date === undefined ? '' : _ref$date;
  var _ref$cache = _ref.cache;
  var cache = _ref$cache === undefined ? false : _ref$cache;

  _djia2['default']({
    cache: cache,
    date: w30 ? getDayBefore(date) : date
  }, function (err, djia) {
    if (err) return cb(err);

    var id = formatDate(date) + '-' + formatDjia(djia);
    var splitHashes = splitAt(_MD52['default'](id), 16);
    var decimals = splitHashes.map(_hexFracDecFrac2['default']);

    debug('w30: ' + w30);
    debug('id: ' + id);
    debug('hashes: ' + splitHashes);
    debug('decimals: ' + decimals);

    cb(null, decimals);
  });
};

// The money maker
// Used to get the graticule, global, and/or neighboring locations
var geohashCoordinates = function geohashCoordinates(_x3, cb) {
  var _ref2 = arguments[0] === undefined ? {} : arguments[0];

  var _ref2$date = _ref2.date;
  var date = _ref2$date === undefined ? '' : _ref2$date;
  var _ref2$location = _ref2.location;
  var location = _ref2$location === undefined ? '' : _ref2$location;
  var _ref2$cache = _ref2.cache;
  var cache = _ref2$cache === undefined ? false : _ref2$cache;
  var _ref2$_getGraticule = _ref2._getGraticule;

  var _getGraticule = _ref2$_getGraticule === undefined ? true : _ref2$_getGraticule;

  var _ref2$_getGlobal = _ref2._getGlobal;

  var _getGlobal = _ref2$_getGlobal === undefined ? true : _ref2$_getGlobal;

  var _ref2$_getNeighbors = _ref2._getNeighbors;

  var _getNeighbors = _ref2$_getNeighbors === undefined ? true : _ref2$_getNeighbors;

  var options = { cache: cache, date: formatDate(date) };

  // Partially applied helpers for getting the decimals east and west of w30
  var eastDecimals = _lodashFunctionPartial2['default'](toDecimals, true, options);
  var westDecimals = _lodashFunctionPartial2['default'](toDecimals, false, options);

  // This function can be used to fetch any combination of global or graticule hashes
  // for a specific date. The global hash and some dates/location combos require
  // the east decimals. Everything else requires the west ones.
  var fetchEast = _getGlobal || !location || location && useW30({ date: date, location: location });
  var fetchWest = location && !useW30({ date: date, location: location });

  _async2['default'].parallel([fetchEast ? eastDecimals : passThrough, fetchWest ? westDecimals : passThrough], function (err, results) {
    if (err) return cb(err);

    var graticuleLocation = undefined,
        graticuleNeighbors = undefined;

    var _results = _slicedToArray(results, 2);

    var east = _results[0];
    var west = _results[1];

    var decimals = { east: east, west: west };

    // If requested calculate the global hash
    var globalLocation = _getGlobal && east && decimalsToGlobal(east);

    // If a location was passed in, attempt to calculate graticule/neighbors
    if (location) {
      var graticuleOptions = { date: date, location: location, decimals: decimals };
      graticuleLocation = _getGraticule && locationWithDecimals(graticuleOptions);
      graticuleNeighbors = _getNeighbors && neighborsWithDecimals(graticuleOptions);
    }

    debug('east: ' + east);
    debug('west: ' + west);
    debug('global: ' + globalLocation);
    debug('graticule: ' + graticuleLocation);
    debug('neighbors: ' + graticuleNeighbors);

    // Removes all falsy key/values from the return object
    cb(null, _lodashObjectPick2['default']({
      west: west, east: east,
      graticule: graticuleLocation,
      global: globalLocation,
      neighbors: graticuleNeighbors
    }, _lodashUtilityIdentity2['default']));
  });
};

// Calls the above function but only returns the requested value
// as a single return value, not an object
var geohashCoordinatesFor = function geohashCoordinatesFor(option, options, cb) {
  var defaultOptions = _lodashObjectAssign2['default']({
    _getGlobal: false,
    _getGraticule: false,
    _getNeighbors: false
  }, _defineProperty({}, '_' + option, true));

  geohashCoordinates(_lodashObjectAssign2['default']({}, options, defaultOptions), function (err, result) {
    if (err) return cb(err);
    cb(null, result[option.replace('get', '').toLowerCase()]);
  });
};

exports['default'] = {
  all: geohashCoordinates,
  global: _lodashFunctionPartial2['default'](geohashCoordinatesFor, 'getGlobal'),
  graticule: _lodashFunctionPartial2['default'](geohashCoordinatesFor, 'getGraticule'),
  neighbors: _lodashFunctionPartial2['default'](geohashCoordinatesFor, 'getNeighbors')
};
module.exports = exports['default'];