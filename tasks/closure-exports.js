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

    function resolveRequirePath (source, outputDir) {
        return "./" + source;
    }

    function readNamespacePaths (baseDir, source, outputDir) {
        var sourcePath, contents;
        var namespacePathFragments, moduleName, match;
        var namespacePath;

        sourcePath = path.join(baseDir, source);
        contents = fs.readFileSync(sourcePath).toString();

        namespacePathFragments = namespacesFromPath(source);

        match = /module.exports = ([^\W]+)/.exec(contents);
        if (match) {
            moduleName = match[1];
        }
        if (moduleName) {
            namespacePathFragments[namespacePathFragments.length - 1] = moduleName;
        }
        requirePath = resolveRequirePath(source, outputDir);

        return {
            namespacePathFragments: namespacePathFragments,
            requirePath: requirePath
        };
    }

    function buildNamespacePaths (baseDir, sources, outputDir) {
        var namespacePaths = [];
        var index, source;

        for (index = 0; index < sources.length; index++) {
            source = sources[index];
            namespacePaths.push(readNamespacePaths(baseDir, source, outputDir));
        }

        return namespacePaths;
    }

    function buildNamespaceTree (namespacePaths) {
        var namespaceFragments;
        var index, fragmentIndex, fragment;
        var namespaceTree = {};
        var currentNamespace, subtree;

        for (index = 0; index < namespacePaths.length; index++) {
            namespaceInfo = namespacePaths[index];
            namespaceFragments = namespaceInfo.namespacePathFragments;
            currentNamespace = namespaceTree;
            for (fragmentIndex = 0; fragmentIndex < namespaceFragments.length; fragmentIndex++) {
                fragment = namespaceFragments[fragmentIndex];
                subtree = {}
                if (fragmentIndex === namespaceFragments.length - 1) {
                    subtree = namespaceInfo.requirePath;
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
            isNamespace = typeof subtree === "object";
            if (prefix) {
                for (index = 0; index < prefix.length; index++) {
                    fragments.push("[\"" + prefix[index] + "\"]");
                }
            }
            fragments.push("[\"" + namespace + "\"]");
            if (isNamespace) {
                fragments.push(" = {};");
            } else {
                fragments.push(" = require(\"" + subtree + "\");");
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

        namespacePaths = buildNamespacePaths(baseDir, sources, path.dirname(outputPath));
        namespaceTree = {};
        namespaceTree[namespace] = buildNamespaceTree(namespacePaths);
        exports = buildExports(namespaceTree);

        writeExports(outputPath, exports.join("\n") + "\n");
    });
};




