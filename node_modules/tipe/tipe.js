/**
 *  tipe.js
 *
 *  Simple javascript typeof replacement with sane handling
 *  of semi-primitives and easily configurable list of known
 *  constructors. Provides .string(v), .number(v), etc. for
 *  all tipes as convenience methods.
 *
 *  Copyright (c) 2013 3meters
 *  MIT Licensed
 */

var toString = Object.prototype.toString

// Main
function tipe(v) {

  var result, className

  // Give typeof first crack
  result = tipeMap[typeof(v)]
  if (result) return result

  // Fix the infamous bug in typeof
  if (null === v) return 'null'

  // Check for custom classes
  if (v.constructor) {
    result = tipeMap[v.constructor.name]
    if (result) return result
  }

  // We have some kind of object, but what kind?
  className = toString.call(v).slice(8, -1)

  return tipeMap[className] || 'object'
}


// Map of value types to their tipes
var tipeMap = {
  'undefined': 'undefined',
  'boolean': 'boolean',
  'number': 'number',
  'string': 'string',
  'function': 'function',
  'Arguments': 'arguments',
  'Number': 'number',
  'String': 'string',
  'RegExp': 'regexp',
  'Array': 'array',
  'Date': 'date',
  'Error': 'error',
}


// Handy for determining pass-by-value versus pass-by-reference
tipe.scalar = tipe.isScalar = function(v) {
  return !(v instanceof Object)
}


// True for positive numbers, strings castable to positive numbers,
// or the strings 'true' or 'yes'.  Handy for booleans set from
// query strings
tipe.truthy = tipe.isTruthy = function(v) {
  if ('number' === typeof(v)) return (v > 0)  // negative numbers are false
  if ('string' !== typeof(v)) return (v)      // fall back to javascript
  v = v.toLowerCase()
  if ('true' === v || 'yes' === v) return true
  if (parseInt(v) > 0) return true
  return false
}


// Add a user-specfied tipe to the tipeMap
// The className must be the name of the constructor
tipe.add = tipe.addTipe = function(className, tipeName) {
  if ('null' === className
      || 'Object' === className
      || tipeMap[className]) {
    return // ddt
  }
  tipeMap[className] = tipeName
  addMethod(tipeName)
}


// Add two boolean test methods for a type, the type name itself and
// is<typename>, e.g. tipe.array() and tipe.isArray()
function addMethod(tipeName) {
  var upperCaseTipeName = tipeName.charAt(0).toUpperCase() + tipeName.slice(1)
  tipe['is' + upperCaseTipeName] = function(v) {
    return tipe(v) === tipeName
  }
  tipe[tipeName] = function(v) {
    return tipe(v) === tipeName
  }
}


// Replace the two-step map lookup function in cases
// where there is a faster means of a boolean type test
// This method can be skipped and tipe will still run.
// For fun run node bench with and without it.
function addOptimizedMethods() {
  tipe['undefined'] = tipe.isUndefined = function(v) {
    return undefined === v;
  }
  tipe.defined = tipe.isDefined = function(v) {
    return undefined !== v;
  }
  tipe['null'] = tipe.isNull = function(v) {
    return null === v;
  }
  tipe.string = tipe.isString = function(v) {
    return 'string' === typeof(v);
  }
  tipe.number = tipe.isNumber = function(v) {
    return 'number' === typeof(v);
  }
  tipe['boolean'] = tipe.isBoolean = function(v) {
    return 'boolean' === typeof(v);
  }
  tipe['function'] = tipe.isFunction = function(v) {
    return 'function' === typeof(v);
  }
  tipe.array = tipe.isArray = function(v) {
    return Array.isArray(v);
  }
  tipe.regexp = tipe.isRegexp = function(v) {
    return (v instanceof RegExp);
  }
  tipe.error = tipe.isError = function(v) {
    return (v instanceof Error);
  }
  tipe.date = tipe.isDate = function(v) {
    return v instanceof Date;
  }
  tipe.object = tipe.isObject = function(v) {
    return (v && '[object Object]' === toString.call(v)
        && !(v.constructor && tipeMap[v.constructor.name]));
  }
  // arguments is a no-op as a function property
  tipe.args = tipe.isArgs = tipe.isArguments = function(v) {
    return '[object Arguments]' === toString.call(v);
  }
}

// Add submethods on require
(function() {
  for (var key in tipeMap) {
    addMethod(tipeMap[key])
  }
  addMethod('null')
  addMethod('object')
  addOptimizedMethods() // can be commented out
})()


// Export
module.exports = tipe
