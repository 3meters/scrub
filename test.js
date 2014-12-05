/**
 * scrub tests
 *
 * tests are synchronous and throw on first failure
 */

/* jshint asi: true */

// Dependencies
var scrub = require('./scrub')
var tipe  = require('tipe')        // https://github.com:3meters/tipe
var _assert = require('assert')
var inspect = require('util').inspect


// Module vars
var isError = tipe.isError
var isNull = tipe.isNull
var cAsserts = 0
var test = {}
var val, spec, err   // reset for each test


// Add corpse to failures
function assert(expr) {
  _assert.call(null, expr, 'test failed\ndump: \n' +
      inspect({val: val, spec: spec, err: err}, {depth:10}))
  cAsserts++
}


// Tests

test.minimalWorks = function() {

  err = scrub()
  assert(isNull(err))

  val = 1
  spec = {type: 'number', required: true}
  err = scrub(val, spec)
  assert(isNull(err))

  val = 'foo'
  err = scrub(val, spec)
  assert(isError(err))
  assert('badType' === err.code)

  val = 1
  spec = {value: 1}
  err = scrub(val, spec)
  assert(isNull(err))

  val = 2
  err = scrub(val, spec)
  assert(isError(err))

  val = 1
  spec = {value: true}
  err = scrub(val, spec)
  assert(isError(err))

  val = true
  err = scrub(val, spec)
  assert(isNull(err))

  val = {}
  spec = {}
  err = scrub(val, spec)
  assert(isNull(err))
}


test.basicRequired = function() {
  err = scrub(undefined, {required: true})
  assert(isError(err))
  assert('missingParam' === err.code)
}


test.undefinedValuesPassTypeCheck = function() {
  err = scrub({s1: undefined}, {s1: {type: 'string'}})
  assert(isNull(err))
}


test.nullValuesFailTypeCheck = function() {
  err = scrub({s1: null}, {s1: {type: 'string'}})
  assert(isError(err))
  assert('badType' === err.code)
}


test.nullValuesPassNullTypeCheck = function() {
  err = scrub({s1: null}, {s1: {type: 'string|null'}})
  assert(isNull(err))
}


test.basicDefault = function() {

  val = {}
  spec = {n1: {default: 1}}
  err = scrub(val, spec)
  assert(isNull(err))
  assert(1 === val.n1)

  val = {}
  spec = { n1: {default: function() {return 2}}}
  err = scrub(val, spec)
  assert(isNull(err))
  assert(2 === val.n1)

  val = {}
  spec = { n1: {default: function() {return new Error('My default is an error')}}}
  err = scrub(val, spec)
  assert(isError(err))

  val = undefined
  spec = {default: 1}
  err = scrub(val, spec)
  assert(isNull(err))

  val = undefined
  spec = {default: 1}
  err = scrub(val, spec, {returnValue: true})
  assert(1 === err)
}


test.basicArray = function() {
  spec = {type: 'array', value: {type: 'string'}}
  val = []
  err = scrub(val, spec)
  assert(isNull(err))
  val = ['foo', 'bar', 'baz']
  err = scrub(val, spec)
  assert(isNull(err))
  val.push(1)
  err = scrub(val, spec)
  assert(isError(err))
  assert('badType' === err.code)
  assert(err.details)
  assert(err.details.rootSpec)
  assert('array' === err.details.rootSpec.type)
  assert(err.details.options)
  assert(3 === err.details.key)
  assert(tipe.isUndefined(err.details.options.strict))
}


test.bigSuccedes = function() {
  spec = {
    s1: { type: 'string', required: true },
    s2: { type: 'string', default: 'hi' },
    o1: { type: 'object', value: {
      s1: { type: 'string' },
      s2: { type: 'string', default: 'hi' },
      s3: { type: 'string', default: '' },
      n1: { type: 'number' },
      n2: { type: 'number', default: 1 },
      n3: { type: 'number', default: 0 },
      b1: { type: 'boolean' },
    }},
    o2: {
      type: 'object', value: {
        no1: {type: 'object', value: {
          s1: { type: 'string', value: 'foo'}
        }}
      }
    },
    o3: {type: 'object', required: true, value: {
        s2: {type: 'string', required: true},
        a3: {type: 'array', required: true, value: {type: 'string'}}
      },
    },
    a1: {type: 'array', value: {type: 'string'}},
    a2: {type: 'array', value: {type: 'object', value: {
            s1: {type: 'string', required: true},
            s2: {type: 'string', default: 'hello'},
        }}
    },
  }
  val = {
    s1: 'hello',
    o1: { s1: 'foo', n1: 1, b1: true },
    o2: { no1: { s1: 'foo', } },
    o3: {s2: 'bla', a3: ['aaa', 'bbb', 'ccc']},
    a1: ['123', '456', '789'],
    a2: [{s1: 'foo'}, {s1: 'bar'}, {s1: 'baz'}, {s1: 'barney'}],
  }
  err = scrub(val, spec, {strict: true})
  assert(isNull(err))
  assert(val.s2)
  assert('hi' === val.s2)
  assert(val.o1)
  assert('hi' === val.o1.s2)
  assert(1 === val.o1.n2)
  assert(0 === val.o1.n3)
  assert(4 === val.a2.length)
  val.a2.forEach(function(elm) {
    assert(tipe.isString(elm.s1))
    assert('hello' === elm.s2)
  })

  val.o4 = {}
  err = scrub(val, spec)
  assert(isNull(err))

  val.a2.push({s2: 'I should fail'})
  err = scrub(val, spec)
  assert(isError(err))
  assert('missingParam' === err.code)
}


test.coerceStrings = function() {
  spec = {
    n1: {type: 'number'},
    n2: {type: 'number'},
    n3: {type: 'number'},
    n4: {type: 'number'},
    n5: {type: 'number'},
    b1: {type: 'boolean'},
    b2: {type: 'boolean'},
    b3: {type: 'boolean'},
    b4: {type: 'boolean'},
    b5: {type: 'boolean'},
  }
  val =  {
    n1: '100',
    n2: '-1',
    n3: '0.52',
    n4: '1.7',
    n5: '0',
    b1: 'true',
    b2: 'foo',
    b3: '1',
    b4: '0',
    b5: '-1',
  }
  err = scrub(val, spec)
  assert(isNull(err))
  assert(100 === val.n1)
  assert(-1 === val.n2)
  assert(0.52 === val.n3)
  assert(1.7 === val.n4)
  assert(0 === val.n5)
  assert(true === val.b1)
  assert(false === val.b2)
  assert(true === val.b3)
  assert(false === val.b4)
  assert(false === val.b5)

  val = {n1: '100'}
  err = scrub(val, spec, {doNotCoerce: true})
  assert(isError(err))
  assert('badType' === err.code)
}


test.missingRequiredScalar = function() {
  spec =  {type: 'number', required: true}
  val = undefined
  err = scrub(val, spec)
  assert(isError(err))
  assert('missingParam' === err.code)
}


test.missingRequiredObject = function() {
  spec = {
    s1: {type: 'string'},
    o1: {type: 'object', required: true}
  }
  val = { s1: 'foo' }
  err = scrub(val, spec)
  assert(isError(err))
  assert('missingParam' === err.code)
}


test.missingRequiredNested = function() {
  spec = {
    s1: {type: 'string'},
    o1: {type: 'object', required: true, value: {
        s1: {type: 'string', required: true}
      }
    }
  }
  val = {
    s1: 'foo',
    o1: {s1: 'I am nested s1'}
  }
  err = scrub(val, spec)
  assert(!err)
  val = {
    s1: 'foo',
    o1: {s2: 'I am not nested s1'}
  }
  err = scrub(val, spec)
  assert(isError(err))
  assert('missingParam' === err.code)
}


test.topLevelArrays = function() {
  spec = {type: 'array', value: {
    type: 'object', value: {
      n1: {type: 'number', required: true},
      s1: {type: 'string', default: 'foo'}
    }
  }}
  val = [{n1: 1}, {n1: 2}]
  err = scrub(val, spec)
  assert(!err)
  assert('foo' === val[0].s1)
  assert('foo' === val[1].s1)
  val = [{n1: 1}, {s1: 'bar'}]
  err = scrub(val, spec)
  assert(isError(err))
  assert('missingParam' === err.code)
}


test.strictWorks = function() {
  spec = {
    s1: {type: 'string'},
    o1: {type: 'object', required: true, value: {
        s1: {type: 'string', required: true}
      }
    },
  }
  val = {
    s1: 'foo',
    o1: {
      s1: 'I am required',
      s2: 'I am not allowed with strict'
    }
  }
  err = scrub(val, spec)
  assert(isNull(err))
  err = scrub(val, spec, {strict: true})
  assert(isError(err))
  assert('badParam' === err.code)
  assert(err.details)
  assert(err.details.options)
  assert(err.details.options.strict)
}


test.nestedStrictWorks = function() {
  spec = {
    s1: {type: 'string'},
    o1: {
      type: 'object',
      required: true,
      strict: false,
      value: {s1: {type: 'string', required: true}}
    }
  }
  val = {
    s1: 'foo',
    o1: {
      s1: 'I am required',
      s2: 'I am not allowed with strict'
    }
  }
  err = scrub(val, spec)
  assert(isNull(err))
  err = scrub(val, spec, {strict: true})
  assert(isNull(err))  // local option overroad global options
  spec.o1.strict = true
  err = scrub(val, spec)
  assert(isError(err))
  assert('badParam' === err.code)
}

test.arrayTypesPass = function() {
  spec = {
    a1: {type: 'array', value: {type: 'string'}},
    a2: {type: 'array', value: {type: 'object', value: {
            s1: {type: 'string', required: true},
        }}
    },
    o1: {type: 'object', required: true, value: {
        s2: {type: 'string', required: true},
        a3: {type: 'array', required: true, value: {type: 'string'}}
      }
    },
  }
  val = {
    a1: ['123', '456', '789'],
    a2: [{s1: 'foo'}, {s1: 'bar'}, {s1: 'baz'}],
    o1: {s2: 'bla', a3: ['aaa', 'bbb', 'ccc']},
  }
  var options = { strict: true }
  err = scrub(val, spec, options)
  assert(isNull(err))
}


test.arrayBasicFailsProperly = function() {
  spec = {
    a1: {type: 'array', value: {type: 'string'}, required: true}
  }
  val = { a1: ['123', '456', '789', 11] }
  var options = { strict: true }
  err = scrub(val, spec, options)
  assert(isError(err))
  assert('badType' === err.code)
}


test.enumsWork = function() {
  spec = {s1: {type: 'string', value: 'foo|bar|baz'}}
  val = {s1: 'bar'}
  err = scrub(val, spec)
  assert(isNull(err))
  err = scrub({s1: 'notfoo'}, spec)
  assert(isError(err))
  assert('badValue' === err.code)
}


test.valueSettersWorkForScalars = function() {
  spec = {type: 'object', value: {
    s1: {
      type: 'string',
      value: function(v) {
        return (v+v)
      }
    }
  }}
  var o = {s1: 'foo'}
  err = scrub(o, spec)
  assert(isNull(err))
  assert('foofoo' === o.s1)
}


test.arrayDefaults = function() {
  spec = {
    a1: {type: 'array', default: []}
  }
  var o = {}
  var err = scrub(o, spec)
  assert(isNull(err))
  assert(o.a1)
  assert(0 === o.a1.length)
}


test.valueSettersWorkForObjects = function() {
  spec = {type: 'object',
    value: function(o) {
      for (var key in o) {
        o[key] = o[key] + 'bar'
      }
      return o
    }
  }
  var o = {s1: 'bar'}
  err = scrub(o, spec)
  assert(isNull(err))
  assert('barbar' === o.s1)
}


test.valueSettersWorkForArrays = function() {
  spec = {
    type: 'array',
    value: {
      type: 'object',
      value: function(o) {
        for (var key in o) {
          o[key] = o[key] + 'bar'
        }
        return o
      }
    }
  }
  var a = [{s1: 'foo'}, {s1: 'bar'}]
  err = scrub(a, spec)
  assert(isNull(err))
  assert('foobar' === a[0].s1)
  assert('barbar' === a[1].s1)
}


test.valueSettersThatThrowReturnBadSchemaError = function() {
  spec = {
    type: 'object', value: function(v) {
      throw new Error('I hurled')
    }
  }
  err = scrub({}, spec)
  assert(isError(err))
  assert('badSpec' === err.code)
}


test.validatorsWork = function() {
  spec = {
    type: 'string',
    validate: function(v) {
      if (v[0] && v[0] !== v[0].toUpperCase()) {
        return 'Must be uppercase'
      }
    }
  }
  err = scrub('Hello', spec)
  assert(!err)
  err = scrub('hello', spec)
  assert(isError(err))
  assert('badValue' === err.code)
}


test.namedValidatorsWork = function() {
  function valid(v) {
    if (v < 1) return 'fail'
  }
  spec = {
    validate: valid
  }
  err = scrub(0, spec)
  assert(isError(err))
  err = scrub(1, spec)
  assert(isNull(err))
}


test.functionValidatorsWorkWithCustomErrorCodes = function() {
  spec = {
    type: 'string',
    value: function(v) {
      // true if first char is uppercase
      if (v[0] && v[0] !== v[0].toUpperCase()) {
        err = new Error('Must be uppercase')
        err.code = 'mustBeUppercase'
        return err
      }
    }
  }
  err = scrub('Hello', spec)
  assert(!err)
  err = scrub('hello', spec)
  assert(isError(err))
  assert('mustBeUppercase' === err.code)
}


test.functionValidatorsGiveSpecErrIfTheyThrow = function() {
  spec = {
    type: 'string',
    value: function(v) {
      // will throw a runtime error
      foo.bar // jshint ignore:line
    }
  }
  err = scrub('Hello', spec)
  assert(isError(err))
  assert('badSpec' === err.code)
}


test.validatorsCanAccessThisObjectAndUserDefinedOptions = function() {
  spec = {
    n1: {type: 'number', default: 0},
    n2: {type: 'number', validate: n2Validate}
  }
  function n2Validate(v, options) {
    if (v !== this.n1) return 'n2 must equal n1'
    if (v !== options.n3)  return 'n2 must equal options.n3'
  }
  err = scrub({n1:1, n2:1}, spec, {n3: 1})
  assert(isNull(err))
  err = scrub({n1:1, n2:2}, spec, {n3: 1})
  assert(isError(err))
  assert('badValue' === err.code)
  assert('n2 must equal n1' === err.message)
  err = scrub({n1:2, n2:2}, spec)
  assert(isError(err))
  assert('n2 must equal options.n3' === err.message)
  err = scrub({n1:2, n2:2}, spec, {n3: 3})
  assert(isError(err))
  assert('n2 must equal options.n3' === err.message)
}


test.validatorsWithArrays = function() {
  function valid(v) {
    if (v.n1 <= v.n2) {
      err = new Error('n1 must be greater than n2')
      err.code = 'failedValidator'
      return err
    }
    return null
  }
  spec = {
    type: 'array', value: {
      type: 'object', value: {
        n1: {type: 'number'},
        n2: {type: 'number'},
      },
      validate: valid
    }
  }
  val = []
  err = scrub(val, spec)
  assert(isNull(err))
  val.push({n1: 2, n2: 1})
  err = scrub(val, spec)
  assert(isNull(err))
  val.push({n1: 1, n2: 2})
  err = scrub(val, spec)
  assert(isError(err))
  assert('failedValidator' === err.code)
}


test.initAndFinishWork = function() {
  spec = {
    init: function(v, options) {
      if ('object' === tipe(v)) {
        options.initRan = true
        return [v]
      }
      else return (v)
    },
    type: 'array',
    finish: function(v, options) {
      if (options.initRan) {
        v.push({s1: 'bar'})
      }
      return v
    }
  }
  val = {s1: 'foo'}
  val = scrub(val, spec, {returnValue: true})
  assert(!isError(val))
  assert(2 === val.length)
  assert('bar' === val[1].s1)

  val = [1, 2, 3]
  val = scrub(val, spec, {returnValue: true})
  assert('array' === tipe(val))
  assert(3 === val.length)

  spec.finish = function(v, options) {
    return new Error('I always error')
  }
  val = {s1: 'foo'}
  val = scrub(val, spec, {returnValue: true})
  assert(isError(val))
  assert('I always error' === val.message)
}


test.specsCanHaveExtraFields = function() {
  spec = {
    s1: {type: 'string', foo: 'bar'}
  }
  val = {s1: 'hello'}
  err = scrub(val, spec)
  assert(isNull(err))
}


test.optionIgnoreRequired = function() {
  spec = {
    s1: {type: 'string', required: true},
  }
  val = {}
  err = scrub(val, spec)
  assert(isError(err))
  err = scrub(val, spec, {ignoreRequired: true})
  assert(isNull(err))
}


test.optionIgnoreDefaults = function() {
  spec = {
    s1: {type: 'string', default: 'hi'},
  }
  val = {}
  err = scrub(val, spec)
  assert(isNull(err))
  assert('hi' === val.s1)
  val = {}
  err = scrub(val, spec, {ignoreDefaults: true})
  assert(isNull(err))
  assert(!val.s1)
}


test.optionReturnValue = function() {
  spec = {
    value: function(v) {
      switch (tipe(v)) {
        case 'string': return {s1: v}
        case 'number': return {n1: v}
        case 'object': return v
        default: return null
      }
    }
  }

  val = 5
  err = scrub(val, spec)
  assert(isNull(err))
  assert(5 === val)

  val = scrub(val, spec, {returnValue: true})
  assert(tipe.isObject(val))
  assert(5 === val.n1)

  val = 'hello'
  val = scrub(val, spec, {returnValue: true})
  assert('hello' === val.s1)

  val = {foo: 'bar'}
  val = scrub(val, spec, {returnValue: true})
  assert('bar' === val.foo)

  val = /^foo/
  val = scrub(val, spec, {returnValue: true})
  assert(null === val)
}


test.canHaveFieldsNamedWithSpecKeywords = function() {
  spec = {
    type: {type: 'string'}
  }
  val = {
    type: 'I am a field named type of type string'
  }
  err = scrub(val, spec)
  assert(isNull(err))
}


test.initWords = function() {
  spec = {
    foo: {
      type: 'string',
      init: function(v) {
        if (v !== 'bar') return new Error('foo must be bar')
      }
    }
  }
  err = scrub({foo: 'bar'}, spec)
  assert(isNull(err))
  err = scrub({foo: 'not bar'}, spec)
  assert(isError(err))
}


test.badInputsFailProperly = function() {
  err = scrub(1, 1)
  assert(isNull(err))
  spec = {type: 1}    // type must be a string
  err = scrub(1, spec)
  assert(isError(err))
  assert(err.code === 'badSpec')
  val = 'foo'
  spec = {
    type: 'string',
    value: spec,      // illegal recursive spec definition
  }
  err = scrub(val, spec)
  assert(isError(err))
  assert(err.code === 'badSpec')
}

test.defaultsCannotBeCircular = function() {
  val = undefined
  var circularDefault = {
    type: 'object',
    value: {
      foo: {
        type: 'string',
        default: 'bar',
      }
    }
  }
  circularDefault.value.foo.default = circularDefault
  spec = {
    type: 'string',
    default: circularDefault,
  }
  err = scrub(val, spec)
  assert(isError(err))
  assert(err.code === 'badSpec')
}


test.loggingWorks = function() {
  spec = {type: 'string'}
  err = scrub('foo', spec, {log: true})
  assert(isNull(err))
}


function main() {
  console.log('\nscrub tests\n===========')
  for (var t in test) {
    console.log(t)
    val = spec = err = undefined // reset module vars
    test[t]()
  }
  console.log('\nscrub ok')
}

// Run tests
main()
