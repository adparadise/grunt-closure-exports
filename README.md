# grunt-closure-exports

This [Grunt](http://gruntjs.com) task is a companion to Google's [Closure Compiler](https://developers.google.com/closure/compiler/) for building [exports](https://developers.google.com/closure/compiler/docs/api-tutorial3#export) exposing your classes to the browser.

I built this primarily to support the use of JSHint in a project assembled by the Closure Compiler. The recommended way to export objects to the global namespace is a JSHint alert which I wanted to preserve: `window["Namespace"] = Namespace`. By having this declaration managed in another file, I can skip linting it, leaving my source code clean. Moreover, this removes a bit of boilerplate from every file, and gives the option of omitting it in production builds.

## How it Works

This task works by scanning your chosen source directories, building up a tree of namespaces. Source files found are then scanned for strings that match `module.exports =`. This is assumed to be a declaration of an export, and will be declared in the Closure Way in the output file. By Closure Way, I mean a statement like `window["Namespace"] = Namespace;` will be inserted, assigning an optimized function or object to a human-readable name in the global scope. A tree of namespaces is formed, mirroring your directory structure.

## Example Configuration

    'closure-exports': {
        dist: {
            baseDir: "src/",
            source: ["client/**/*.js", "common/**/*.js"],
            namespace: "App",
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

## How to use it

The output of this task should be declared as the `common_js_entry_module` argument of your Closure Compiler build command. This is to prevent Closure from optimizing away the assignments to the global scope which is the effect of externalizing the modules of interest. When using the `grunt-closure-compiler` task, this becomes a property of the `options` collection. Here is an example:

    'closure-compiler': {
        frontend: {
            closurePath: '.',
            js: sourceFiles,
            jsOutputFile: 'dist/js/app.min.js',
            maxBuffer: 500,
            options: {
                compilation_level: 'ADVANCED_OPTIMIZATIONS',
                language_in: 'ECMASCRIPT5_STRICT',
                process_common_js_modules: undefined,
                common_js_entry_module: 'src/exports.js',
                create_source_map: 'dist/js/app.min.js.map'
            }
        }
    }

## Todo

* Support output files placed in folders other than original source directory
* Support packages composed of many utility functions, rather than just an overridden `exports`
* Tests
* An 'except' list for omitting source files?