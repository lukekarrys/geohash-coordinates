geohash-coordinates
===================

[![Greenkeeper badge](https://badges.greenkeeper.io/lukekarrys/geohash-coordinates.svg)](https://greenkeeper.io/)

Find the geohashing coordinates for a day and location.

I use this for [xkcd Geohashing](https://xkcd.com/426/).

[![NPM](https://nodei.co/npm/geohash-coordinates.png)](https://nodei.co/npm/geohash-coordinates/)
[![Build Status](https://travis-ci.org/lukekarrys/geohash-coordinates.png?branch=master)](https://travis-ci.org/lukekarrys/geohash-coordinates)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)


## Install

`npm install geohash-coordinates`


## Usage

```js
import geohash from 'geohash-coordinates'

geohash.graticule({
  date: '2015-03-27',
  location: '34.123,-111.456'
}, (err, result) => {
  console.log(result) // [ 34.520364031734495, -111.75641517793687 ]
})

geohash.global({
  date: '2008-09-10'
}, (err, result) => {
  console.log(result) // [ -42.426807304339135, -15.618631484260248 ]
})

geohash.all({
  date: '2008-09-10',
  location: '34.123,-111.456'
}, (err, result) => {
  console.log(result.graticule) // [ 34.380395695429435, -111.6951528305385 ]
  console.log(result.global)    // [ -42.426807304339135, -15.618631484260248 ]
})

geohash.latest({
  date: '2015-05-05', // Defaults to today
  days: 4 // Defaults to 4,
  location: '34.123,-111.456'
}, (err, results) => {
    // Results will be an array of results from `geohash.all` up to any date
    // that does not have Dow Jones opening data yet. So this is safe to call
    // on any date for any number of future dates.
    // It is designed so that by default it can be called on a Friday
    // and it will return the weekend (and the possible Monday holiday).
})
```


## API

### `geohash.all(options, cb(err, result))`
### `geohash.graticule(options, cb(err, result))`
### `geohash.global(options, cb(err, result))`

#### `options.date` (required, string or date)

The date of the geohash coordinates that you want. You can pass in a date string or a date object, [`moment`](http://momentjs.com/) will be used to format the date as `YYYY-MM-DD`.

#### `options.location` (required, string or array or object)

The coordinates within the graticule that you want the geohash within. Can be in the format `"latitude,longitude"`, `[latitude, longitude]`, or `{latitude, longitude}`. This **is not** required fro the global hash.

#### `options.cache` (optional, default is no cache)

You also have the option to cache the result of the Dow request to disk. Any subsequent requests for the date will return the cached value. This value takes a `path` as a `string` for the directory where you want to cache the values.


## Contributing

This is written in ES6 and compiled to ES5 using [`babel`](https://babeljs.io/). The code you require will come from the `lib/` directory which gets compiled from `src/` before each `npm publish`.


## Tests

`npm test`


## License

MIT
