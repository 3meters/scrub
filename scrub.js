/**
 * scrub.js
 *
 * var err = scrub(value, spec, options)
 * if (err) throw err
 * ...
 *
 * Scrub is a synchronous value checker. It returns null on
 * success or an error if the passsed-in value violates the
 * passed-in spec.
 *
 * Scrub may modify the passed-in value. It never modifies
 * the passed-in spec.
 *
 * Scrub iterates for fields of type array, and recurses for
 * fields of type object.
 *
 * Copyright (c) 2013 3meters.  All rights reserved.
 *
 * MIT Licensed
 */

/* jshint asi: true */

var inspect = require('util').inspect

var tipe = require('tipe')  // type checker, https://github.com:3meters/tipe

var isDefined   = tipe.isDefined,
    isUndefined = tipe.isUndefined,
    isNull      = tipe.isNull,
    isObject    = tipe.isObject,
    isFunction  = tipe.isFunction,
    isString    = tipe.isString,
    isArray     = tipe.isArray,
    isNumber    = tipe.isNumber,
    isScalar    = tipe.isScalar,
    isArguments = tipe.isArguments,
    isError     = tipe.isError,
    isTruthy    = tipe.isTruthy

var _options = {
  returnValue:    false,
  ignoreDefaults: false,
  ignoreRequired: false,
  doNotCoerce:    false,
  strict:         false,
  log:            false,
}

var _spec = {
  type: 'object',
  value: {
    init:       {type: 'function'},
    default:    {},
    required:   {type: 'boolean'},
    type:       {type: 'string|object'},
    value:      {},
    validate:   {type: 'function'},
    finish:     {type: 'function'},
  }
}


function scrub(rootValue, rootSpec, rootOptions) {

  rootOptions = override(_options, rootOptions, true)

  result = _scrub(rootValue, rootSpec, rootOptions)
  if (isError(result)) return result

  return (rootOptions.returnValue) ? result : null


  // Main worker
  function _scrub(value, spec, options) {

    var err, result

    if (!isObject(spec)) return value  // success

    options = override(options, spec, false)

    if (options.log) log(arguments)

    // Call init
    if (isFunction(spec.init)) {
      result = callSetter(spec.init, value, options)
      if (isError(result)) return fail(result, arguments)
      else value = result
    }

    // Set default
    if (isUndefined(value) &&
        isDefined(spec.default) &&
        !options.IgnoreDefaults) {
      result = setDefault(spec, options)
      if (isError(result)) return fail(result, arguments)
      else value = result
    }

    // Check required
    if (spec.required && !options.ignoreRequire &&
        (isUndefined(value) || isNull(value))) {
      return fail('missingParam', options.key, arguments)
    }

    // Check type.  If spec.type is an object we assume it is a field named 'type'
    if (isDefined(value) && isDefined(spec.type) && !isObject(spec.type)) {
      if (!isString(spec.type)) {
        return fail('badSpec', 'spec.type must be a string', arguments)
      }
      value = coerceType(value, spec, options)
      if (!match(tipe(value), spec.type)) {
        return fail('badType', tipe(value), arguments)
      }
    }

    // If spec.value is a setter call it
    if (isFunction(spec.value)) {
      result = callSetter(spec.value, value, options)
      if (isError(result)) return fail(result, arguments)
      else value = result
    }

    // Check value based on type
    switch (tipe(value)) {
      case 'object':
        result = checkObject(value, spec, options)
        break
      case 'array':
        result = checkArray(value, spec, options)
        break
      default:
        result = checkScalar(value, spec, options)
    }

    if (isError(result)) return result
    else value = result

    // Check final validator function
    if (isFunction(spec.validate)) {
      err = callValidator(spec.validate, value, options)
      if (err) return fail(err, arguments)
    }

    // Call finish
    if (isFunction(spec.finish)) {
      result = callSetter(spec.finish, value, options)
      if (isError(result)) return fail(result, arguments)
      else value = result
    }

    return value
  }


  // Check an object
  function checkObject(value, spec, options) {

    var key, result

    // Spec fields may be nested inside an object
    var specFields = spec
    if (match('object', spec.type) && isObject(spec.value)) {
      specFields = spec.value
    }

    // In strict mode check for unrecognized keys
    if (options.strict) {
      for (key in value) {
        if (isUndefined(specFields[key])) {
          return fail('badParam', key, arguments)
        }
      }
    }

    // Set defaults for undefined keys
    for (key in specFields) {
      if (isUndefined(value[key]) &&
          isDefined(specFields[key].default) &&
          !options.ignoreDefaults) {
        result = setDefault(specFields[key], options)
        if (isError(result)) {
          return fail(result, arguments)
        }
        else value[key] = result
      }
    }

    // Check for missing required
    if (!options.ignoreRequired) {
      for (key in specFields) {
        if (specFields[key].required &&
            (isUndefined(value[key]) || isNull(value[key]))) {
          return fail('missingParam', key, arguments)
        }
      }
    }

    // Recursively check the value's properties
    for (key in value) {
      if (isObject(specFields[key])) {
        options.key = key
        result = _scrub(value[key], specFields[key], options)  // recurse
        if (isError(result)) return fail(result, arguments)
        else value[key] = result
      }
    }
    return value
  }


  // Check an array
  function checkArray(value, spec, options) {
    if (isObject(spec.value)) {
      for (var i = 0; i < value.length; i++) {
        options.key = i
        result = _scrub(value[i], spec.value, options)
        if (isError(result)) return fail(result, arguments)
        else value[i] = result
      }
    }
    return value
  }


  // Check a scalar value against a simple rule, a specified validator
  // function, or via a recusive nested spec call
  // returns the passed in value, which may be modified
  function checkScalar(value, spec, options) {

    var success

    if (!isObject(spec) ||
        isNull(value) ||
        isUndefined(value))
      return value  // success

    switch (tipe(spec.value)) {

      case 'undefined':
      case 'function':
        success = true
        break

      case 'string':
        success = match(value, spec.value)
        break

      case 'number':
      case 'boolean':
        success = (spec.value === value)
        break

      default:
        return fail('badSpec', spec.value, arguments)
    }

    if (success) return value
    else return fail('badValue', options.key + ': ' + spec.value, arguments)
  }


  // Set default
  function setDefault(spec, options) {
    if (isFunction(spec.default)) {
      return callSetter(spec.default, undefined, options)
    }
    else {
      return clone(spec.default)
    }
  }


  // Validator functions return null on success or
  // an error or string on failure
  function callValidator(fn, value, options) {
    var err = callClientFunction(fn, value, options)
    if (err) {
      if (!isError(err)) err = new Error(err)
      err.code = err.code || 'badValue'
      return err
    }
    return null
  }


  // Setters return new valid value or an error
  function callSetter(fn, value, options) {
    return callClientFunction(fn, value, options)
  }


  // Call a spec-defined function, setting the this
  // object to the root value.
  // WARNING: this is only for trusted code.
  function callClientFunction(fn, value, options) {
    var result
    try { result = fn.call(rootValue, value, options) }
    catch(specErr) {
      specErr.message = 'Spec function threw exception: ' + specErr.message
      specErr.code = 'badSpec'
      return specErr
    }
    return result
  }


  // Replace old object's values with new objects only if
  // they match on type.  Optially allow new properties.
  function override(obj1, obj2, allowNew) {
    var key, newObj = {}
    if (!(isObject(obj1) && isObject(obj2))) return obj1
    for (key in obj1) { newObj[key] = obj1[key] }
    for (key in obj2) {
      if (allowNew && isUndefined(obj1[key])) {
        newObj[key] = obj2[key]
      }
      else {
        if (tipe(obj1[key]) === tipe(obj2[key])) {
          newObj[key] = obj2[key]
        }
      }
    }
    return newObj
  }


  // Query string params arrive parsed as strings
  // If the spec type is number or boolean try to cooerce
  function coerceType(value, spec, options) {
    if (options.doNotCoerce) return value
    if (!isString(value)) return value
    switch(spec.type) {
      case 'number':
        var f = parseFloat(value)
        var i = parseInt(value)
        if (Math.abs(f) > Math.abs(i)) value = f
        else if (i) value = i
        if (value === '0') value = 0
        break
      case 'boolean':
        value = isTruthy(value)
        break
    }
    return value
  }


  // Compose a useful error from a failure
  //
  // fail(error, args)
  // fail(errCode, errMsg, args)
  //
  // args is the arguments that were passed to the
  // calling function that subsequently failed
  function fail() {

    var err, code, msg, args, options

    var codeMap = {
      missingParam: 'Missing Required Parameter',
      badParam: 'Unrecognized Parameter',
      badType: 'Invalid Type',
      badValue: 'Invalid Value',
      badSpec: 'Invalid Spec',
    }

    if (arguments.length === 2) {
      // fail(error, args)
      err = arguments[0]
      args = arguments[1]
    }
    else {
      // fail(code, msg, args)
      code = arguments[0]
      msg = arguments[1]
      args = arguments[2]
      err = new Error(codeMap[code] + ': ' + msg)
      err.code = code
    }

    // undertake
    err.details = {
      value: args[0],
      spec: args[1],
    }
    options = prune(args[2])
    if (options.key) {
      err.details.key = options.key
      delete options.key
    }
    err.details.options = options
    err.details.rootSpec = rootSpec

    return err
  }
}


// Helpers


// Pipe-delimited enum: returns true if 'bar' equals any of 'foo|bar|baz'
function match(str, strEnum) {
  if (!isString(strEnum)) return false
  return strEnum.split('|').some(function(member) {
    return (member === str)
  })
}


// Returns an error, rather than throws, for objects that JSON can't serialize
function clone(obj) {
  var clonedObj
  if (isScalar(obj)) return obj
  try { clonedObj = JSON.parse(JSON.stringify(obj)) }
  catch(err) {
    err.code = 'badSpec'
    err.message = 'Default value could not be cloned: ' + err.message
    return err
  }
  return clonedObj
}


// Debugging helper
function log(s, o) {
  o = o || ''
  if (isArguments(s)) {
    return log('scrub arguments:', {
      value: s[0],
      spec: s[1],
      options: prune(s[2]),
    })
  }
  console.log(s += '\n' + inspect(o, {depth: 10}))
}


// Return a new object with all of the falsey values removed
function prune(obj) {
  var pruned = {}
  for (var key in obj) {
    if (obj[key]) pruned[key] = obj[key]
  }
  return pruned
}


module.exports = scrub
