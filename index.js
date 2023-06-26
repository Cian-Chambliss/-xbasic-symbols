// Lookup namespaces for A5
var symbols = {};
var topnamespace = require("./topnamespace.json");

var getNamespace = function(name,callback) {
    name = name.toLowerCase();
    if( !symbols[name] ) {
        if( topnamespace[name] )
        {
            try {
                symbols[name] = require("./symbols/"+name+".json");
                callback(null,symbols[name]);
            } catch (error) {
                callback("Symbol not found",null);
            }
        }
        else
        {
            callback("Symbol not found",null);
        }
    } else {
        callback(null,symbols[name]);
    }
};
var listNamespaces = function(prefix,detailed,callback) {
    var dumpNames = function(namespace,filter) {
        var names = [];
        if( filter ) {
            filter = filter.toLowerCase();
        }
        if( namespace.__properties__ ) {
            for( var name in namespace.__properties__ ) {
                var item = namespace.__properties__[name];
                if( filter && filter.length > 0 ) {
                    if( filter != name.substring(0,filter.length)) {
                        continue;
                    }
                }
                var propertyName = name;
                if( typeof item === 'string') {
                    propertyName = item;
                } else if( item.__name__ ) {
                    propertyName = item.__name__;
                } else if( item.name ) {
                    propertyName = item.name;
                }
                if(  detailed ) {
                    names.push({ type : "property" , name : propertyName } );
                } else {
                    names.push("."+propertyName);
                }
            }
            for( var name in namespace.__methods__ ) {
                var item = namespace.__methods__[name];
                if( filter && filter.length > 0 ) {
                    if( filter != name.substring(0,filter.length)) {
                        continue;
                    }
                }
                var proto = "()";
                var methodName = name;
                var description = null;
                if( typeof item === 'string') {
                    methodName = item;
                } else {
                    if( item.description ) {
                        description = item.description;
                    }
                    if( item.__name__ ) {
                        methodName = item.__name__;
                    } else if( item.name ) {
                        methodName = item.name;
                    }
                }
                if( !description ) {
                    description = methodName + " method."
                }
                if(  detailed ) {
                    names.push({ type : "method" , name : methodName , prototype : methodName + proto , description : description });
                } else {
                    names.push(methodName+proto);
                }
            }
        }
        for(var name in namespace ) {
            var item =namespace[name];
            if( name != "__name__" &&  name != "__methods__" && name != "__properties__" ) {
                if( filter && filter.length > 0 ) {
                    if( filter != name.substring(0,filter.length)) {
                        continue;
                    }
                }
                var namespaceName = name;
                if( typeof item === 'string') {
                    namespaceName = item;
                } else {
                    if( item.__name__ ) {
                        namespaceName = item.__name__;
                    }
                }
                if( detailed ) {
                    names.push({ type : "namespace" , name : namespaceName });
                } else {
                    names.push(namespaceName);
                }
            }
        }
       return names;
    };
    if(prefix) {
        while(prefix.substr(0,1) == ":") {
            prefix = prefix.substr(1);
        }
    }
    if( prefix && prefix != "" ) {
        prefix = prefix.toLowerCase();
        var parts = prefix.split("::");
        if( parts.length > 1 ) {
            if( topnamespace[parts[0]] ) {
                getNamespace(parts[0],function(err,data) {
                    if( data ) {
                        var filter = null;
                        for( var i = 1 ; i < parts.length ; ++i ) {
                            if( data[parts[i]] ) {
                                data = data[parts[i]];
                            } else if( i+1 < parts.length ) {
                                data = null;
                                break;
                            } else {
                                filter = data[i];
                                break;
                            }
                        }
                        if( data ) {
                            callback(null,dumpNames(data,filter));
                        }
                    } else {
                        callback(err,null);
                    }
                });
            }
        } else if( topnamespace[parts[0]] ) {
            getNamespace(parts[0],function(err,data) {
                if( data ) {
                    callback(null,dumpNames(data));
                } else {
                    callback(err,null);
                }
            });
        } else {
            callback(null,dumpNames(topnamespace,parts[0]));
        }
    } else {
        callback(null,dumpNames(topnamespace));
    }
};

module.exports = {
   getNamespace : getNamespace , listNamespaces : listNamespaces
};