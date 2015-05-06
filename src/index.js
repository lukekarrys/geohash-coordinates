import md5 from 'MD5'
import async from 'async'
import debugThe from 'debug'
import Geo from 'geo-graticule'
import moment from 'moment'
import hexToDec from 'hex-frac-dec-frac'
import fetchDjia from 'djia'

import assign from 'lodash/object/assign'
import identity from 'lodash/utility/identity'
import pick from 'lodash/object/pick'
import partial from 'lodash/function/partial'
import {name} from '../package.json'

// Debug based on the name of the module
const debug = debugThe(name)

// A simple pass through as a default task for async.parallel
const passThrough = (cb) => cb(null, null)

// Split a string at that index and return boths parts
const splitAt = (str, index) => [str.substring(0, index), str.substring(index)]

// Formatting helpers for dates and dow jones values
const formatDate = (date) => moment(date).format('YYYY-MM-DD')
const getDayBefore = (date) => formatDate(moment(date).subtract({days: 1}))
const formatDjia = (djia) => typeof djia === 'number' ? djia.toFixed(2) : djia

// Helpers for determining if locations or dates trigger the w30 rule
const useW30ForDate = (date) => formatDate(date) > '2008-05-26'
const useW30ForLocation = (loc) => loc.isW30 ? loc.isW30() : new Geo(loc).isW30()
const useW30 = (options) => useW30ForDate(options.date) && useW30ForLocation(options.location || options.geo)

// Taking an array of decimals and converting it to the global hash
const decimalsToGlobal = (decimals) => [(decimals[0] * 180) - 90, (decimals[1] * 360) - 180]

// Convert date/location and east/west decimals to the correct
// geocode within that location's graticule
const locationWithDecimals = (options) => {
  const {date, location} = options
  const {east, west} = options.decimals
  const geo = new Geo(location)
  return geo.pointWithinGraticule(useW30({date, geo}) ? east : west)
}

// Convert date/location and east/west decimals to the correct
// geocode within all the neighboring graticules for that location
const neighborsWithDecimals = (options) => {
  const {date, location, decimals} = options
  return new Geo(location).neighboringGraticules().map((row) => {
    return row.map((graticule) => {
      return locationWithDecimals({date, decimals, location: graticule})
    })
  })
}

// Converts a date to the decimals for that date
// Will use w30 based on the flag passed in
const toDecimals = (w30 = false, {
  date = '',
  cache = false,
} = {}, cb) => {
  fetchDjia({
    cache,
    date: w30 ? getDayBefore(date) : date
  }, (err, djia) => {
    if (err) return cb(err)

    const id = formatDate(date) + '-' + formatDjia(djia)
    const splitHashes = splitAt(md5(id), 16)
    const decimals = splitHashes.map(hexToDec)

    debug(`w30: ${w30}`)
    debug(`id: ${id}`)
    debug(`hashes: ${splitHashes}`)
    debug(`decimals: ${decimals}`)

    cb(null, decimals)
  })
}

// The money maker
// Used to get the graticule, global, and/or neighboring locations
const geohashCoordinates = ({
  date = '',
  location = '',
  cache = false,
  _getGraticule = true,
  _getGlobal = true,
  _getNeighbors = true
} = {}, cb) => {
  const options = {cache, date: formatDate(date)}

  // Partially applied helpers for getting the decimals east and west of w30
  const eastDecimals = partial(toDecimals, true, options)
  const westDecimals = partial(toDecimals, false, options)

  // This function can be used to fetch any combination of global or graticule hashes
  // for a specific date. The global hash and some dates/location combos require
  // the east decimals. Everything else requires the west ones.
  const fetchEast = _getGlobal || !location || (location && useW30({date, location}))
  const fetchWest = location && !useW30({date, location})

  async.parallel([
    fetchEast ? eastDecimals : passThrough,
    fetchWest ? westDecimals : passThrough
  ], (err, results) => {
    if (err) return cb(err)

    let graticuleLocation, graticuleNeighbors

    const [east, west] = results
    const decimals = {east, west}

    // If requested calculate the global hash
    const globalLocation = _getGlobal && east && decimalsToGlobal(east)

    // If a location was passed in, attempt to calculate graticule/neighbors
    if (location) {
      const graticuleOptions = {date, location, decimals}
      graticuleLocation = _getGraticule && locationWithDecimals(graticuleOptions)
      graticuleNeighbors = _getNeighbors && neighborsWithDecimals(graticuleOptions)
    }

    debug(`east: ${east}`)
    debug(`west: ${west}`)
    debug(`global: ${globalLocation}`)
    debug(`graticule: ${graticuleLocation}`)
    debug(`neighbors: ${graticuleNeighbors}`)

    // Removes all falsy key/values from the return object
    cb(null, pick({
      west, east,
      graticule: graticuleLocation,
      global: globalLocation,
      neighbors: graticuleNeighbors
    }, identity))
  })
}

// Calls the above function but only returns the requested value
// as a single return value, not an object
const geohashCoordinatesFor = (option, options, cb) => {
  const defaultOptions = assign({
    _getGlobal: false,
    _getGraticule: false,
    _getNeighbors: false
  }, { ['_' + option]: true })

  geohashCoordinates(assign({}, options, defaultOptions), (err, result) => {
    if (err) return cb(err)
    cb(null, result[option.replace('get', '').toLowerCase()])
  })
}

export default {
  all: geohashCoordinates,
  global: partial(geohashCoordinatesFor, 'getGlobal'),
  graticule: partial(geohashCoordinatesFor, 'getGraticule'),
  neighbors: partial(geohashCoordinatesFor, 'getNeighbors')
}
