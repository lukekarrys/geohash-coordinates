'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.neighbors = exports.graticule = exports.global = exports.latest = exports.all = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _md = require('md5');

var _md2 = _interopRequireDefault(_md);

var _parallel = require('async/parallel');

var _parallel2 = _interopRequireDefault(_parallel);

var _mapSeries = require('async/mapSeries');

var _mapSeries2 = _interopRequireDefault(_mapSeries);

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

var _assign2 = require('lodash/assign');

var _assign3 = _interopRequireDefault(_assign2);

var _identity = require('lodash/identity');

var _identity2 = _interopRequireDefault(_identity);

var _pickBy = require('lodash/pickBy');

var _pickBy2 = _interopRequireDefault(_pickBy);

var _omit = require('lodash/omit');

var _omit2 = _interopRequireDefault(_omit);

var _defaults = require('lodash/defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _partial = require('lodash/partial');

var _partial2 = _interopRequireDefault(_partial);

var _range = require('lodash/range');

var _range2 = _interopRequireDefault(_range);

var _compact = require('lodash/compact');

var _compact2 = _interopRequireDefault(_compact);

var _package = require('../package.json');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Debug based on the name of the module
var debug = (0, _debug2.default)(_package.name);

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
  return (0, _moment2.default)(date).format('YYYY-MM-DD');
};
var getDayBefore = function getDayBefore(date) {
  return formatDate((0, _moment2.default)(date).subtract({ days: 1 }));
};
var getDaysAfter = function getDaysAfter(date, days) {
  return formatDate((0, _moment2.default)(date).add({ days: days }));
};
var formatDjia = function formatDjia(djia) {
  return typeof djia === 'number' ? djia.toFixed(2) : djia;
};

// Helpers for determining if locations or dates trigger the w30 rule
var useW30ForDate = function useW30ForDate(date) {
  return formatDate(date) > '2008-05-26';
};
var useW30ForLocation = function useW30ForLocation(loc) {
  return loc.isW30 ? loc.isW30() : new _geoGraticule2.default(loc).isW30();
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

  var geo = new _geoGraticule2.default(location);
  return geo.pointWithinGraticule(useW30({ date: date, geo: geo }) ? east : west);
};

// Convert date/location and east/west decimals to the correct
// geocode within all the neighboring graticules for that location
var neighborsWithDecimals = function neighborsWithDecimals(options) {
  var date = options.date;
  var location = options.location;
  var decimals = options.decimals;

  var neighbors = new _geoGraticule2.default(location).neighboringGraticules();

  debug('Neighbors with decimals: ' + neighbors);

  return neighbors.map(function (graticule) {
    return locationWithDecimals({ date: date, decimals: decimals, location: graticule });
  });
};

// Converts a date to the decimals for that date
// Will use w30 based on the flag passed in
var toDecimals = function toDecimals() {
  var w30 = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

  var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var _ref$date = _ref.date;
  var date = _ref$date === undefined ? '' : _ref$date;
  var _ref$cache = _ref.cache;
  var cache = _ref$cache === undefined ? false : _ref$cache;
  var _ref$__now = _ref.__now;

  var __now = _ref$__now === undefined ? undefined : _ref$__now;

  var cb = arguments[2];

  (0, _djia2.default)({
    cache: cache,
    __now: __now,
    date: w30 ? getDayBefore(date) : date
  }, function (err, djia) {
    if (err) return cb(err);

    var id = formatDate(date) + '-' + formatDjia(djia);
    var splitHashes = splitAt((0, _md2.default)(id), 16);
    var decimals = splitHashes.map(_hexFracDecFrac2.default);

    debug('w30: ' + w30);
    debug('id: ' + id);
    debug('hashes: ' + splitHashes);
    debug('decimals: ' + decimals);

    cb(null, decimals);
  });
};

// The money maker
// Used to get the graticule, global, and/or neighboring locations
var geohashCoordinates = function geohashCoordinates() {
  var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _ref2$date = _ref2.date;
  var date = _ref2$date === undefined ? '' : _ref2$date;
  var _ref2$location = _ref2.location;
  var location = _ref2$location === undefined ? '' : _ref2$location;
  var _ref2$cache = _ref2.cache;
  var cache = _ref2$cache === undefined ? false : _ref2$cache;
  var _ref2$getGraticule = _ref2.getGraticule;
  var getGraticule = _ref2$getGraticule === undefined ? true : _ref2$getGraticule;
  var _ref2$getGlobal = _ref2.getGlobal;
  var getGlobal = _ref2$getGlobal === undefined ? true : _ref2$getGlobal;
  var _ref2$getNeighbors = _ref2.getNeighbors;
  var getNeighbors = _ref2$getNeighbors === undefined ? true : _ref2$getNeighbors;
  var _ref2$__now = _ref2.__now;

  var __now = _ref2$__now === undefined ? undefined : _ref2$__now;

  var cb = arguments[1];

  var options = { cache: cache, date: formatDate(date), __now: __now };

  // Partially applied helpers for getting the decimals east and west of w30
  var eastDecimals = (0, _partial2.default)(toDecimals, true, options);
  var westDecimals = (0, _partial2.default)(toDecimals, false, options);

  // This function can be used to fetch any combination of global or graticule hashes
  // for a specific date. The global hash and some dates/location combos require
  // the east decimals. Everything else requires the west ones.
  var fetchEast = getGlobal || !location || location && useW30({ date: date, location: location });
  var fetchWest = location && !useW30({ date: date, location: location });

  (0, _parallel2.default)([fetchEast ? eastDecimals : passThrough, fetchWest ? westDecimals : passThrough], function (err, results) {
    if (err) return cb(err);

    var graticuleLocation = void 0,
        graticuleNeighbors = void 0;

    var _results = _slicedToArray(results, 2);

    var east = _results[0];
    var west = _results[1];

    var decimals = { east: east, west: west };

    // If requested calculate the global hash
    var globalLocation = getGlobal && east && decimalsToGlobal(east);

    // If a location was passed in, attempt to calculate graticule/neighbors
    if (location) {
      var graticuleOptions = { date: date, location: location, decimals: decimals };
      graticuleLocation = getGraticule && locationWithDecimals(graticuleOptions);
      graticuleNeighbors = getNeighbors && neighborsWithDecimals(graticuleOptions);
    }

    debug('east: ' + east);
    debug('west: ' + west);
    debug('global: ' + globalLocation);
    debug('graticule: ' + graticuleLocation);
    debug('neighbors: ' + graticuleNeighbors);

    // Removes all falsy key/values from the return object
    cb(null, (0, _pickBy2.default)({
      west: west,
      east: east,
      graticule: graticuleLocation,
      global: globalLocation,
      neighbors: graticuleNeighbors
    }, _identity2.default));
  });
};

// Calls the above function but only returns the requested value
// as a single return value, not an object
var geohashCoordinatesFor = function geohashCoordinatesFor(option, options, cb) {
  var defaultOptions = (0, _assign3.default)({
    getGlobal: false,
    getGraticule: false,
    getNeighbors: false
  }, _defineProperty({}, option, true));

  geohashCoordinates((0, _assign3.default)({}, options, defaultOptions), function (err, result) {
    if (err) return cb(err);
    cb(null, result[option.replace('get', '').toLowerCase()]);
  });
};

// Get the latest geohashes
// Defaults to today and 4 days ahead but can be used to get any date
// plus any number of future days
var latest = function latest(options, cb) {
  var optsWithDefaults = (0, _defaults2.default)(options, {
    date: formatDate(),
    days: 4
  });
  var days = optsWithDefaults.days;
  var startDate = optsWithDefaults.date;

  var dates = (0, _range2.default)(days).map(function (index) {
    return getDaysAfter(startDate, index);
  });

  (0, _mapSeries2.default)(dates, function (date, cb) {
    geohashCoordinates((0, _assign3.default)({}, (0, _omit2.default)(options, 'days'), { date: date }), function (err, result) {
      cb(err, result ? (0, _assign3.default)({}, result, { date: date }) : null);
    });
  }, function (err, results) {
    // We are completing iterations up to a possible error which we are
    // expecting in some cases, so we strip falsy values from results
    // and treat 'data not available yet' as an ok error
    var validResults = results && (0, _compact2.default)(results);
    var okError = !err || err.message === 'data not available yet';

    if (err && !okError) return cb(err);
    if (!validResults || !validResults.length) return cb(new Error('No results'));

    cb(null, validResults);
  });
};

exports.default = geohashCoordinates;
exports.all = geohashCoordinates;
exports.latest = latest;
var global = exports.global = (0, _partial2.default)(geohashCoordinatesFor, 'getGlobal');
var graticule = exports.graticule = (0, _partial2.default)(geohashCoordinatesFor, 'getGraticule');
var neighbors = exports.neighbors = (0, _partial2.default)(geohashCoordinatesFor, 'getNeighbors');