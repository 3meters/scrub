#scrub [![NPM version](https://badge.fury.io/js/scrub.png)](http://badge.fury.io/js/scrub)

  The world's only javascript argument scrubber.

## Why Scrub?
  Scrub aims to solve this problem:
```js
function fn(v) {
  // what the heck is v?
}
```
## Install for nodejs
```
npm install scrub
```
### Basic Use
```js
var scrub = require('scrub')

function fn(v) {

  var spec = {type: 'string'}
  var err = scrub(v, spec)
  if (err) return err

  // I now know absolutely everything I could ever want to know about v
  ...
}
fn(1)         // Error: 'Invalid type'
fn('foo')     // 3
```
With scrub I define all my assumptions about a value with a succint spec.  If the value fails my spec, scub crafts a detailed error explaining where things went wrong.  Scrub is particularly well-suited for checking data between a public api, like a web service, and a schemaless store, like mongodb.  It lets you remove virtually all the type and value checking from the body of your functions, and move them to a single, easy-to-read spec at the top of the file.

### Scrub specs
Scrub specs are ordinary objects that you craft. Here is the bootstrap spec for a spec. The most important properties are type, value, required, and default.  Scrub recurses on the value property for nested specs, and iterates the scrub over arrays.
```js
var _spec = {
  type: 'object',
  value: {
    init:       {type: 'function'},
    default:    {},
    required:   {type: 'boolean'},
    type:       {type: 'string'},
    value:      {},
    validate:   {type: 'function'},
    finish:     {type: 'function'},
  }
}
```

### Default
```js
spec = {
  s1: {type: 'string'}
  s2: {type: 'string', default: 'goodbye'}
}
val = {s1: 'hello'}
err = scrub(val, spec)  // null
console.log(val)        // {s1: 'hello', s2: 'goodbye'}
```

### Required
```js
spec = {s1: {type: 'string', required: true}}
scrub({s1: 'foo', s2: 'bar'}, spec)   // null
scrub({s2: 'bar'}, spec)              // Error with code 'missingParam'
```

### Type
The type property is string with the following supported values:

    'undefined'
    'null'
    'string'
    'boolean'
    'number'
    'object'
    'array'
    'error'
    'function'
    'arguments'


Specify multiple valid types for a value like so:

    type: 'string|number|boolean'

The type of any value is determied by the tipe module: https://github.com/3meters/tipe.  Tipe supports custom types, enabling you to extend the type list.

```js
spec = {
  str1: {type: 'string'},
  num1: {type: 'number'}
}
err = scrub({str1: 'foo', num1: 2}, spec)  // null
err = scrub({str1: 2}, spec)               // Error with code 'badType'
```

### Value checking with delimted string enums
```js
spec = {type: 'string', value: 'one|or|another'}
scrub('or', spec)      // null
scrub('notOne', spec)  // Error wtih code 'badValue'
```

### Optionally fail on unknown object keys with option strict
```js
spec = {foo: {type: 'string'}}
scrub({foo: 'hello', bar: 'goodbye'}, spec)  // null
scrub({foo: 'hello', bar: 'goodbye'}, spec, {strict: true})  // Error with code 'badParam'
```

### Custom Setters
The init, default, value, and finish properties of a spec accept a setter function.  Setters are passed the curent value being scrubed and the options object.  Setters should return the new value or an error.
```js
spec = {n1: {
  type: 'number',
  default: function(v, options) {
    if (options.foo) return 2
    else return 1
  },
  value: function(v, options) {
    return ({n1: v[n1], n2: v[n1] * v[n1]})
  }
}}
val = {}
err = scrub({}, spec}                 // null
val                                   // {n1:1, n2:1}
err = scrub({}, spec, {foo: true})    // null
val                                   // {n1:2, n2:4}
```

### Custom Validators
Validators are similar to setters, except they return a positive value on failure, in most cases a simple string. Scrub will convert a string returned by validator into an error with the code property set to 'badValue'.  To override this code, return an Error with its code property set.  
```js
spec = {
  type: 'number',
  validate: function(v, options) {
    if (v < 0) return 'n1 must be greater than zero'
  }
}}

scrub({n1: 1}, spec)   // null
scrub({n1: -1}, spec)  // Error: 'n1 must be greater than zero', Error.code: 'badValue'
```
or
```js
spec = {
  type: 'number',
  validate: function(v, options) {
    if (v < 0) {
      err = new Error('n1 must be greater than zero')
      err.code = 'i_died'
      return err
    }
  }
}}

scrub({n1: 1}, spec)   // null
scrub({n1: -1}, spec)  // Error: 'n1 must be greater than zero', Error.code: 'i_died'
```
### Passing Data to Setters and Validators
Passing data to validators or setters is easy. Within your validator or setter, the this object refers to the top-level passed-in value, and any data you pass in on the options object is passed through.
```js
  spec = {
    n1: {type: 'number', default: 0},
    n2: {type: 'number', validate: n2Validate}
  }
  function n2Validate(v, options) {
    if (v !== this.n1) return 'n2 must equal n1'
    if (options.foo) return 'options.foo must not be'
  }
  scrub({n1:1, n2:1}, spec)  // null
  scrub({n1:1, n2:2}, spec)  // Error: 'n2 must equal n1'
  scrub({n1:1, n2:1}, spec, {foo:true})  // Error: 'options.foo must not be'

```
### Type coersion
For values with exected types of number or boolean, when fed a value of type string, by default scub will try to coerce the string to the spec'ed type before evalutating, converting '1' to 1 for a number, and 'true' to true for a boolean.  This is handy for accepting web query strings.  To turn this behavior off at any level, set options.doNotCoerce to true.
```js
spec = {n1: {type: 'number'}, b1: {type: 'boolean'}}
val = {n1: '12', b2: 'true'}
err = scrub(val, spec)  // null
val                         // {n1: 12, b2: true}  types have been coerced
val = {n1: '12', b2: 'true'}
err = scrub({n1: '12', b2: 'true'}, spec, {doNotCoerce: true}) // Error with code 'badType'
```

### Arrays
For arrays Scrub tests each element in the array against the spec
```js
spec = {a1: {type: 'array', value: {type: 'number'}}}
err = scrub({a1: [1,2,3]})  // err is null
err = scrub({a1: [1, 2, '3']})  // err is Error with code 'badType'
```
or with an array of objects
```js
spec = {
  {type: 'array' value: {type: 'object', value: {s1: {type: 'string'}, n1: {type: 'number'}}}
}
err = scrub([{s1: 'foo', n1: 1}, {s1: 'bar', n1: 2}])  // err is null
err = scrub([{s1: 'foo', n1: 1}, {s1: 'bar', n1: 'baz'}])  // err is Error with code 'badType'
```
### Options
The top level scurb call accepts
```js
scrub(val, spec, options)
```
Where options is a non-strict object with following supported properties and their defaults:
```js
  {
    strict: false,          // do not allow unspecified properties of objects
    ignoreDefaults: false,  // do not set default values, handy for db updates
    ignoreRequired: false,  // do not enforce required, handy for db updates
    doNotCoerce: false,     // do not coerce types
    returnValue: false,     // return the scrubed value, rather than null, on success
                            //    handy for scrubing scalars or for recasting scalars to objects
    log: false              // log the arguments to each recursive scrub call,
                            //    handy for debugging deeply nested spec
  }
```
Options can be set as an optional third argument to the top level call, or as properties of any spec or sub-spec.  They remain set for all children unless they are overridden.  For example, a top-level spec can be strict, meaning no unrecognized properties are allowed, except for one property, which can be unstrict, allowing un-specified sub-properties, except for one of its sub-properties, which must be strict, etc. For example: 
```js
spec = {
  o1: {type: 'object', value: {
    s1: {type: 'string'},
    s2: {type: 'string'},
  },
  o2: {type: 'object', strict: false, value: {
    s1: {type: 'string'},
    s2: {type: 'string'},
    o1: {type: 'object', strict: true: value: {
      n1: {type: 'number'}
    }
  }
}
val = {
  o1: {s1: 'foo', s2: 'bar'},
  o2: {s1: 'foo', s2: 'bar', s3: 'baz}
}
err = scrub(val, spec, {strict: true}) // err is null because o2 strict attribute overrode option
val.o2.o1 = {n2: 100}
err = scrub(val, spec, {strict: true}) // err is Error because spec.o2.o1 does not allow properties other than n1
```
## Contributing
Contributions welcome.
## Copyright
  Copyright (c) 2013 3meters.  All rights reserverd.
## License
  MIT
