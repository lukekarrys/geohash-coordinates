import md5 from 'md5'
import parallel from 'async/parallel'
import mapSeries from 'async/mapSeries'
import debugThe from 'debug'
import Geo from 'geo-graticule'
import moment from 'moment'
import hexToDec from 'hex-frac-dec-frac'
import fetchDjia from 'djia'

import assign from 'lodash/assign'
import identity from 'lodash/identity'
import pickBy from 'lodash/pickBy'
import omit from 'lodash/omit'
import defaults from 'lodash/defaults'
import partial from 'lodash/partial'
import range from 'lodash/range'
import compact from 'lodash/compact'
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
const getDaysAfter = (date, days) => formatDate(moment(date).add({days}))
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
  const neighbors = new Geo(location).neighboringGraticules()

  debug(`Neighbors with decimals: ${neighbors}`)

  return neighbors.map((graticule) => locationWithDecimals({date, decimals, location: graticule}))
}

// Converts a date to the decimals for that date
// Will use w30 based on the flag passed in
const toDecimals = (w30 = false, {
  date = '',
  cache = false,
  __now = undefined
} = {}, cb) => {
  fetchDjia({
    cache,
    __now,
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
  getGraticule = true,
  getGlobal = true,
  getNeighbors = true,
  __now = undefined
} = {}, cb) => {
  const options = {cache, date: formatDate(date), __now}

  // Partially applied helpers for getting the decimals east and west of w30
  const eastDecimals = partial(toDecimals, true, options)
  const westDecimals = partial(toDecimals, false, options)

  // This function can be used to fetch any combination of global or graticule hashes
  // for a specific date. The global hash and some dates/location combos require
  // the east decimals. Everything else requires the west ones.
  const fetchEast = getGlobal || !location || (location && useW30({date, location}))
  const fetchWest = location && !useW30({date, location})

  parallel([
    fetchEast ? eastDecimals : passThrough,
    fetchWest ? westDecimals : passThrough
  ], (err, results) => {
    if (err) return cb(err)

    let graticuleLocation, graticuleNeighbors

    const [east, west] = results
    const decimals = {east, west}

    // If requested calculate the global hash
    const globalLocation = getGlobal && east && decimalsToGlobal(east)

    // If a location was passed in, attempt to calculate graticule/neighbors
    if (location) {
      const graticuleOptions = {date, location, decimals}
      graticuleLocation = getGraticule && locationWithDecimals(graticuleOptions)
      graticuleNeighbors = getNeighbors && neighborsWithDecimals(graticuleOptions)
    }

    debug(`east: ${east}`)
    debug(`west: ${west}`)
    debug(`global: ${globalLocation}`)
    debug(`graticule: ${graticuleLocation}`)
    debug(`neighbors: ${graticuleNeighbors}`)

    // Removes all falsy key/values from the return object
    cb(null, pickBy({
      west,
      east,
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
    getGlobal: false,
    getGraticule: false,
    getNeighbors: false
  }, { [option]: true })

  geohashCoordinates(assign({}, options, defaultOptions), (err, result) => {
    if (err) return cb(err)
    cb(null, result[option.replace('get', '').toLowerCase()])
  })
}

// Get the latest geohashes
// Defaults to today and 4 days ahead but can be used to get any date
// plus any number of future days
export const latest = (options, cb) => {
  const optsWithDefaults = defaults(options, {
    date: formatDate(),
    days: 4
  })
  const {days, date: startDate} = optsWithDefaults
  const dates = range(days).map((index) => getDaysAfter(startDate, index))

  debug(`dates: ${dates}`)

  mapSeries(dates, (date, cb) => {
    geohashCoordinates(assign({}, omit(options, 'days'), {date}), (err, result) => {
      cb(err, result ? assign({}, result, {date}) : null)
    })
  }, (err, results) => {
    // We are completing iterations up to a possible error which we are
    // expecting in some cases, so we strip falsy values from results
    // and treat 'data not available yet' as an ok error
    const validResults = results && compact(results)
    const okError = !err || err.message === 'data not available yet'

    if (err && !okError) return cb(err)
    if (!validResults || !validResults.length) return cb(new Error('No results'))

    cb(null, validResults)
  })
}

export default geohashCoordinates
export {geohashCoordinates as all}

export const global = partial(geohashCoordinatesFor, 'getGlobal')
export const graticule = partial(geohashCoordinatesFor, 'getGraticule')
export const neighbors = partial(geohashCoordinatesFor, 'getNeighbors')
