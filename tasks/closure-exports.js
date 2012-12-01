var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var glob = require('glob');

module.exports = function (grunt) {
    var NAMESPACE_PATH_SEP = ".";

    function findAllSync (baseDir, patterns) {
        if (!Array.isArray(patterns)) {
            patterns = [patterns];
        }

        var globExpander = function(pattern) {
            return glob.sync(pattern, {cwd: baseDir, maxDepth: 1});
        };

        var files = _.chain(patterns).map(globExpander).flatten().uniq().value();
        return files;
    }

    function classnameify (fragment) {
        return fragment.replace (/(?:^|[-_\.])(\w)/g, function (_, c) {
            return c ? c.toUpperCase () : '';
        });
    }

    function removeExtension (source) {
        var extension;
        var regexp;
        extension = path.extname(source);
        if (extension.length === 0) {
            return source;
        }
        regexp = new RegExp(extension + "$");
        return source.replace(regexp, "");
    }

    function namespacesFromPath (source) {
        var index, fragments;

        source = removeExtension(source);
        fragments = source.split(path.sep);

        for (index = 0; index < fragments.length; index++) {
            fragments[index] = classnameify(fragments[index]);
        }
        return fragments;
    }

    function readNamespacePaths (baseDir, source) {
        var sourcePath, contents;
        var namespaces, moduleName, match;
        var namespacePath;

        sourcePath = path.join(baseDir, source);
        contents = fs.readFileSync(sourcePath).toString();

        namespaces = namespacesFromPath(source);

        match = /module.exports = ([^\W]+)/.exec(contents);
        if (match) {
            moduleName = match[1];
        }
        if (moduleName) {
            namespaces[namespaces.length - 1] = moduleName;
        }
        namespacePath = namespaces.join(NAMESPACE_PATH_SEP);

        return [namespacePath];
    }

    function buildNamespacePaths (baseDir, sources) {
        var namespacePaths = [];
        var index, source;

        for (index = 0; index < sources.length; index++) {
            source = sources[index];
            namespacePaths = namespacePaths.concat(readNamespacePaths(baseDir, source));
        }

        return namespacePaths;
    }

    function buildNamespaceTree (namespacePaths) {
        var namespaceFragments;
        var index, fragmentIndex, fragment;
        var namespaceTree = {};
        var currentNamespace, subtree;

        for (index = 0; index < namespacePaths.length; index++) {
            namespaceFragments = namespacePaths[index].split(NAMESPACE_PATH_SEP);
            currentNamespace = namespaceTree;
            for (fragmentIndex = 0; fragmentIndex < namespaceFragments.length; fragmentIndex++) {
                fragment = namespaceFragments[fragmentIndex];
                subtree = false;
                if (fragmentIndex !== namespaceFragments.length - 1) {
                    subtree = {};
                }
                if (!currentNamespace[fragment]) {
                    currentNamespace[fragment] = subtree;
                }
                currentNamespace = currentNamespace[fragment];
            }
        }

        return namespaceTree;
    }

    function buildExports (namespaceTree, prefix, exports) {
        var namespace, subtree;
        var fragments, isNamespace;
        var subPrefix;
        var index;
        if (!exports) {
            exports = [];
        }
        for (namespace in namespaceTree) {
            if (!namespaceTree.hasOwnProperty(namespace)) {
                continue;
            }
            fragments = ["window"];
            subtree = namespaceTree[namespace];
            isNamespace = !!subtree;
            if (prefix) {
                for (index = 0; index < prefix.length; index++) {
                    fragments.push("[\"" + prefix[index] + "\"]");
                }
            }
            fragments.push("[\"" + namespace + "\"]");
            if (isNamespace) {
                fragments.push(" = {};");
            } else {
                fragments.push(" = " + namespace + ";");
            }
            exports.push(fragments.join(""));

            if (isNamespace) {
                subPrefix = prefix && prefix.slice(0) || [];
                subPrefix.push(namespace);
                buildExports(subtree, subPrefix, exports);
            }
        }
        return exports;
    }

    function writeExports (outputPath, exportsString) {
        //fs.mkdirSync(path.dirname(outputPath));
        fs.writeFileSync(outputPath, exportsString, undefined, function (error) {
            if (error) {
                throw error;
            }
        });
    };

    grunt.registerMultiTask('closure-exports', 'Build Closure exports for dirs', function () {
        var baseDir, sources, namespace;
        var namespacePaths, namespaceTree;
        var exports;

        baseDir = this.data.baseDir || ".";
        namespace = this.data.namespace || "App";
        outputPath = this.data.output || "exports.js";
        sources = findAllSync(baseDir, this.data.source);

        namespacePaths = buildNamespacePaths(baseDir, sources);
        namespaceTree = {};
        namespaceTree[namespace] = buildNamespaceTree(namespacePaths);
        exports = buildExports(namespaceTree);

        writeExports(outputPath, exports.join("\n") + "\n");
    });
};




