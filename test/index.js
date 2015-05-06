import test from 'tape'
import async from 'async'
import path from 'path'

import {all, global, graticule, neighbors} from '../src/index'

const fixed5 = (arr) => arr.map(Number).map((num) => num.toFixed(5))
const CACHE_DIR = path.resolve(__dirname, '..')

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
    graticule({date, location: '68.5,-30.5', cache: CACHE_DIR}, (err, results) => {
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
    graticule({date, location: '68.5,-29.5', cache: CACHE_DIR}, (err, results) => {
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
    global({date, cache: CACHE_DIR}, (err, results) => {
      t.equal(err, null, `${date} no error`)
      t.deepEqual(results, data[date], `${date} results`)
      cb()
    })
  }, t.end)
})

test('Neighbors', (t) => {
  const date = '2008-05-20'
  neighbors({date, location: '68.5,-29.5', cache: CACHE_DIR}, (err, results) => {
    t.equal(err, null, `${date} no error`)
    t.equal(results.length, 9, `${date} has 9 results`)
    t.end()
  })
})
