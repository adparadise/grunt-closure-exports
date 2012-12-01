# grunt-closure-exports

This [Grunt](http://gruntjs.com) task is a companion to Google's [Closure Compiler](https://developers.google.com/closure/compiler/) for building [exports](https://developers.google.com/closure/compiler/docs/api-tutorial3#export) exposing your classes to the browser.


## How it Works

This task works by scanning your chosen source directories, building up a tree of namespaces. Source files found are then scanned for strings that match `module.exports =`. This is assumed to be a declaration of an export, and will be declared in the Closure Way in the output file. By Closure Way, I mean a statement like `window["Namespace"] = Namespace;` will be inserted, assigning an optimized function or object to a human-readable name in the global scope. A tree of namespaces is formed, mirroring your directory structure.


## Example Configuration

    'closure-exports': {
        dist: {
            baseDir: "src/",
            source: ["client/**/*.js", "common/**/*.js"],
            namespace: "Wordgame",
            output: "src/exports.js"
        }
    }

### `baseDir`

This is the root of your source directory. Defaults to `'.'`. This path is omitted from the namespace tree.

### `source`

An array of globs, indicating the sourcefiles to scan for exports.

### `namespace`

The root namespace to attach your module tree to.

### `output`

The filepath to write the exports declarations to.

## Todo

* Support packages composed of many utility functions, rather than just an overridden `exports`
* Tests
* An 'except' list for omitting source files?