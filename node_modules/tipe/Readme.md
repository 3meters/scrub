#tipe

Simple, fast, extensible javascript type checker.

## Install with nodejs

    npm install tipe
    
## Why tipe? 

See "is" for a popular, reliable, battle-tested type-checker:  https://github.com/enricomarino/is.
  
If you're unhappy with is, you should probably write your own type checker.  Tipe provides a few small features we found missing from is.  Feel free to rely on it as a module or to copy any ideas or source you find useful.  We certainly did.

## String names for all types
Tipe includes a base method, tipe(value) which always returns a string, like typeof, for all valid identifiers, including custom tipes. We find this useful in switch statements.  

```js
var tipe = require('tipe')
tipe()              // 'undefined'
tipe(null)          // 'null'
tipe('foo')         // 'string'
tipe(false)         // 'boolean'
tipe(1)             // 'number'
tipe({})            // 'object'
tipe([])            // 'array'
tipe(new Error())   // 'error'
var args, fn
fn = function(){args = arguments}
tipe(fn)            // 'function'
tipe(args)          // 'arguments'
```

## Boolean test methods for each type
For each tipe there are two boolean test methods: tipe.tipename(value), and tipe.isTipename(value).  Some prefer the shorter version, others perfer methods names that are not reserved words.  
```js
tipe.boolean(false)       // true
tipe.isBoolean(false)     // true
tipe.error(new Error())   // true
tipe.isError(new Error()) // true
```
etc...  These appear automatically for custom types as well.  

## Custom Types
Tipe lets you add your own custom types for any constructor. They work like any other type.  
```js
function Dog(){}
var fido = new Dog()
tipe(fido)              // 'object'
tipe.dog(fido)          // runtime exception: tipe has no method 'dog'
tipe.addTipe('Dog', 'dog')
tipe(fido)              // 'dog'
tipe.dog(fido)          // true
tipe.isDog(fido)        // true
```

## Performance
Tipe aims to be as fast as any pure javascript type checker can be.  For each internal type check, tipe chooses the fastest availble V8 expression to determine the result, no matter how strange that expresion may appear.  This is code you definitely don't want visible in your application :). Run "node bench" to see performance benchmarks vs is.  Tipe version 0.1.8 is roughly twice as fast as is version 0.2.6 in our admitted crude benchmark.

## Dogfood
We rely heavily on this public version of tipe in a large-scale web service using ordinary npm. We welcome any improvements via email, bugs, or PRs.

## Caveats
Tipe lacks many features of is and other type checkers such as equality tests and mathematical comparitors.  We use other libraries for those tasks.  At the margins, we have chosen performance over specificity for some types we consider edge cases, i.e. tipe(NaN) is 'number', not 'NaN'.

## Copyright
Copyright (c) 2013 3meters.  All rights reserverd.

## License
MIT
