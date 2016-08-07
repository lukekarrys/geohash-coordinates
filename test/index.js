import test from 'tape'
import async from 'async'
import path from 'path'

import map from 'lodash/map'
import compact from 'lodash/compact'

import {global, graticule, neighbors, latest} from '../src/index'

const fixed5 = (arr) => arr.map(Number).map((num) => num.toFixed(5))
const fixed6 = (arr) => arr.map(Number).map((num) => num.toFixed(6))
const cache = path.join(path.resolve(__dirname, '..'), 'djia_cache.json')

test('W30 logic works west of W30', (t) => {
  // http://wiki.xkcd.com/geohashing/30W_Time_Zone_Rule
  const data = {
    '2008-05-20': [68.63099, -30.61895],
    '2008-05-21': [68.17947, -30.86154],
    '2008-05-22': [68.97287, -30.23870],
    '2008-05-23': [68.40025, -30.72277],
    '2008-05-24': [68.12665, -30.54753],
    '2008-05-25': [68.94177, -30.18287],
    '2008-05-26': [68.67313, -30.60731],
    '2008-05-27': [68.20968, -30.10144],
    '2008-05-28': [68.68745, -30.21221],
    '2008-05-29': [68.46470, -30.03412],
    '2008-05-30': [68.85310, -30.24460]
  }

  async.eachSeries(Object.keys(data), (date, cb) => {
    graticule({date, location: '68.5,-30.5', cache}, (err, results) => {
      t.equal(err, null, `${date} no error`)
      t.deepEqual(fixed5(results), fixed5(data[date]), `${date} results`)
      cb()
    })
  }, t.end)
})

test('W30 logic works east of W30', (t) => {
  // http://wiki.xkcd.com/geohashing/30W_Time_Zone_Rule
  const data = {
    '2008-05-20': [68.63099, -29.61895],
    '2008-05-21': [68.17947, -29.86154],
    '2008-05-22': [68.97287, -29.23870],
    '2008-05-23': [68.40025, -29.72277],
    '2008-05-24': [68.12665, -29.54753],
    '2008-05-25': [68.94177, -29.18287],
    '2008-05-26': [68.67313, -29.60731],
    '2008-05-27': [68.12537, -29.57711],
    '2008-05-28': [68.71044, -29.11273],
    '2008-05-29': [68.27833, -29.74114],
    '2008-05-30': [68.32272, -29.70458]
  }

  async.eachSeries(Object.keys(data), (date, cb) => {
    graticule({date, location: '68.5,-29.5', cache}, (err, results) => {
      t.equal(err, null, `${date} no error`)
      t.deepEqual(fixed5(results), fixed5(data[date]), `${date} results`)
      cb()
    })
  }, t.end)
})

test('Global hash', (t) => {
  // http://wiki.xkcd.com/geohashing/Globalhash
  const data = {
    '2008-09-10': [-42.426807304339135, -15.618631484260248]
  }

  async.eachSeries(Object.keys(data), (date, cb) => {
    global({date, cache}, (err, results) => {
      t.equal(err, null, `${date} no error`)
      t.deepEqual(results, data[date], `${date} results`)
      cb()
    })
  }, t.end)
})

test('Neighbors', (t) => {
  const date = '2008-05-20'
  const expected = [
    [69.63099058539201, -28.618945982091276],
    [69.63099058539201, -29.618945982091276],
    [69.63099058539201, -30.618945982091276],
    [68.63099058539201, -30.618945982091276],
    [68.63099058539201, -29.618945982091276],
    [68.63099058539201, -28.618945982091276],
    [67.63099058539201, -28.618945982091276],
    [67.63099058539201, -29.618945982091276],
    [67.63099058539201, -30.618945982091276]
  ]
  neighbors({date, location: '68.5,-29.5', cache}, (err, results) => {
    t.equal(err, null, `${date} no error`)
    t.deepEqual(results, expected, `${date} has correct results`)
    t.end()
  })
})

test('From each quadrant', (t) => {
  const date = '2015-05-06'
  const locations = {
    '34.5,113.5': [34.767055, 113.141584],
    '-37.5,145.5': [-37.767055, 145.141584],
    '-34.5,-58.5': [-34.874946, -58.043722],
    '33.5,-111.5': [33.874946, -111.043722]
  }

  async.eachSeries(Object.keys(locations), (location, cb) => {
    graticule({date, location, cache}, (err, results) => {
      t.equal(err, null, `${date} no error`)
      t.deepEqual(fixed6(results), fixed6(locations[location]), `${date} results`)
      cb()
    })
  }, t.end)
})

test('Latest', (t) => {
  const date = '2015-05-01'
  const location = '34.5,113.5'

  latest({
    date,
    location,
    cache,
    days: 5,
    getGlobal: false,
    getNeighbors: false
  }, (err, result) => {
    t.equal(err, null)
    t.equal(compact(map(result, 'graticule')).length, 5)
    t.equal(result.length, 5)
    t.end()
  })
})

test('Get 3 friday results in NW quadrant', (t) => {
  const date = '2015-05-01'
  const __now = date + 'T16:00:00-0400'
  const location = '34.5,-113.5'

  latest({
    date,
    __now,
    location,
    cache,
    days: 5,
    getGlobal: false,
    getNeighbors: false
  }, (err, result) => {
    t.equal(err, null, 'no error')
    t.equal(result.length, 3, '3 total results')
    t.equal(compact(map(result, 'graticule')).length, 3, 'has 3 graticule results (fri/sat/sun)')
    t.end()
  })
})

test('Get 4 friday results in NE quadrant', (t) => {
  const date = '2015-05-01'
  const __now = date + 'T16:00:00-0400'
  const location = '54.2,5.4'

  latest({
    date,
    __now,
    location,
    cache,
    days: 5,
    getGlobal: false,
    getNeighbors: false
  }, (err, result) => {
    t.equal(err, null)
    t.equal(result.length, 4, '4 total results')
    t.equal(compact(map(result, 'graticule')).length, 4, 'has 4 graticule results (fri/sat/sun/mon)')
    t.end()
  })
})
