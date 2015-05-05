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

const debug = debugThe('geohash-coordinates')
const splitAt = (str, index) => [str.substring(0, index), str.substring(index)]
const decimalsToGlobal = (decimals) => [(decimals[0] * 180) - 90, (decimals[1] * 360) - 180]
const formatDate = (date) => moment(date).format('YYYY-MM-DD')
const getDayBefore = (date) => formatDate(moment(date).subtract({days: 1}))
const formatDjia = (djia) => typeof djia === 'number' ? djia.toFixed(2) : djia
const useW30ForDate = (date) => formatDate(date) > '2008-05-26'

const locationWithDecimals = (options) => {
  const {date, location, decimals} = options
  const {east, west} = decimals
  const geo = new Geo(location)
  return geo.pointWithinGraticule(useW30ForDate(date) && geo.isW30() ? east : west)
}

const neighborsWithDecimals = (options) => {
  const {date, location, decimals} = options
  return new Geo(location).getNeighboringGraticules().map((row) => {
    return row.map((graticule) => {
      return locationWithDecimals({date, decimals, location: graticule})
    })
  })
}

const toDecimals = ({
  date = '',
  cache = false,
  w30 = false
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

const geohashCoordinates = ({
  date = '',
  location = '',
  cache = false,
  _getGraticule = true,
  _getGlobal = true,
  _getNeighbors = true
} = {}, cb) => {
  const options = {cache, date: formatDate(date)}

  async.parallel([
    (cb) => toDecimals(assign({}, options, {w30: true}), cb),
    (cb) => toDecimals(assign({}, options, {w30: false}), cb)
  ], (err, [east, west] = []) => {
    if (err) return cb(err)

    let graticuleLocation, graticuleNeighbors
    const decimals = {east, west}
    const globalLocation = _getGlobal && decimalsToGlobal(east)

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
      west,
      east,
      graticule: graticuleLocation,
      global: globalLocation,
      neighbors: graticuleNeighbors
    }, identity))
  })
}

const coordinatesFor = (option, options, cb) => {
  const defaultOptions = assign({
    _getGlobal: false,
    _getGraticule: false,
    _getNeighbors: false
  }, {
    ['_get' + option.charAt(0).toUpperCase() + option.slice(1)]: true
  })

  geohashCoordinates(assign({}, options, defaultOptions), (err, result) => {
    if (err) return cb(err)
    cb(null, result[option])
  })
}

export default {
  all: geohashCoordinates,
  global: partial(coordinatesFor, 'global'),
  graticule: partial(coordinatesFor, 'graticule'),
  neighbors: partial(coordinatesFor, 'neighbors')
}
