// Lookup namespaces for A5
var symbols = {};
var topnamespace = require("./topnamespace.json");
var globals = require("./global.json");

var functionPrototype = function(src,name,optionals) {
    var proto = src.insertText;
    if( optionals )
        proto = null;
    if( !proto ) {

        if( src.name )
            proto = src.name;
        else 
            proto = name;
        if( src.arguments ) {
            var afterProto = "";
            proto = proto + "(";
            for( var i = 0 ; i < src.arguments.length ; ++i ) {
                if( src.arguments[i].optional && !optionals ) {
                    break;
                }
                if( src.arguments[i].optional ) {
                    proto = proto + "[";
                    afterProto = afterProto + "]";
                }
                if( i > 0 ) {
                    proto = proto + " , ";
                }
                proto = proto + src.arguments[i].name;
            }
            proto = proto + afterProto + ")";
        } else {
            proto = proto + "()";
        }
    }
    return proto;
};

var getXBIdent = function(text) {
    var end = text.length;
    while( end > 0 && (
         ('0' <= text[end-1] && text[end-1] <= '9') ||
         ('a' <= text[end-1] && text[end-1] <= 'z') ||
         ('A' <= text[end-1] && text[end-1] <= 'Z')||
          text[end-1] == "_"
         ) ) {
       end = end - 1;
    }
    if( end == 0 ) {
        return text;
    }
    if( end < text.length && text[end-1].indexOf(".") < 0 ) {            
        return text.substring(end);
    }
    return null;
};

var lookupGlobalSymbols = function(ident) {
    var end = 0;
    var syms = globals;
    while( syms && syms.__index__ && end < ident.length ) {
        syms = syms.__index__[ident[end]];
        end = end+1;
    }
    return syms;
};

var createCompletion = function(_namespace,_parent) {
    var autocomplete = [];
    var populate = function( ns , parent ) {
        for( var name in ns ) {
            if( name != "__functions__" 
             && name != "__methods__" 
             && name != "__metadata__"
             && name != "__properties__"
             && name != "__enumeration__"
             && name != "__name__"
                ) {
                var src = ns[name];
                var kind = "snippet";
                if (
                    typeof src === 'object' &&
                    !Array.isArray(src) &&
                    src !== null
                ) {
                    if( src.__metadata__ ) {
                        src = src.__metadata__;
                    } else if( !parent || parent[0] != '_' ) {
                        src.__metadata__ = {};
                        src = src.__metadata__;
                    }
                    if( !src.documentation && !src.description ) {
                        src.documentation = name+" property";
                    }
                    if( !src.insertText ) {
                        var isFunc = true;
                        if( parent == "__methods__")
                            kind = "method";
                        else if( parent == "__functions__")
                            kind = "function";
                        else
                            isFunc = false;

                        if( isFunc ) {
                            src.insertText = functionPrototype(src,name);
                        } else if( src.name ) {
                            src.insertText = src.name;
                        } else if( ns[name].__name__ ) {
                            src.insertText = ns[name].__name__;
                        } else 
                            src.insertText = name;
                    }
                    if( src.name  ) {
                        name = src.name;
                    } else if( ns[name].__name__  ) {
                        name = ns[name].__name__;
                    }
                    var complete = { label : name , kind: kind , documentation: (src.documentation || src.description) , insertText: src.insertText };
                    autocomplete.push(complete);
                } else {
                    name = ns[name];
                    var complete = { label : name , kind: kind , insertText: name };
                    autocomplete.push(complete);
                }
            }
        }
    };
    if( _parent == "__instance__" ) {
        if(  _namespace.__properties__) {
            populate(_namespace.__properties__,"__properties__");
        }
        if(  _namespace.__methods__ ) {
            populate(_namespace.__methods__,"__methods__");
        }
        if(  _namespace.__functions__ ) {
            populate(_namespace.__functions__,"__functions__");
        }
    } else {
        populate(_namespace);
        if(  _namespace.__functions__ ) {
            populate(_namespace.__functions__,"__functions__");
        }
    }
    return autocomplete;
};

var getNamespace = function(name,callback) {
    var remainder = null;
    var result = null;
    if(name) {
        while(name.substr(0,1) == ":") {
            name = name.substr(1);
        }
        while(name.length > 1 && name.substr(name.length-1) == ":")
             name = name.substr(0,name.length-1);
    }
    remainder = name.split("::");
    if( remainder.length > 1 ) {
        name = remainder[0];
        remainder[0] = "";
        remainder = remainder.join("::");
        while(remainder.substr(0,1) == ":") {
            remainder = remainder.substr(1);
        }
    } else {
        remainder = null;
    }
    name = name.toLowerCase();
    var resolveRemainder = function(ptr,remainder) {
        if( remainder ) {
            remainder = remainder.split("::");
            for( var i = 0 ; i < remainder.length ; ++i ) {
               ptr = ptr[remainder[i]];
               if( !ptr ) {
                   break;
               }
            }
         }
         if( ptr ) {
            result = ptr;
            callback(null,ptr);
         } else {
            callback("Namespace not found",null);
         }
    };
    if( !symbols[name] ) {
        if( topnamespace[name] )
        {
            try {
                symbols[name] = require("./symbols/"+name+".json");
                resolveRemainder(symbols[name],remainder);
            } catch (error) {
                callback("Namespace not found",null);
            }
        }
        else
        {
            callback("Namespace not found",null);
        }
    } else {
        resolveRemainder(symbols[name],remainder);
    }
    return result;
};

var resolveName = function(name) {
    if(name) {
        name = name.toLowerCase();
        return getNamespace(name,function(err,data) { resultData = data; });
    }
    return null;
};

var listNamespaces = function(args,callback) {
    if( !args) {
        args = {};
    }
    var prefix = args.prefix;
    var detailed = args.detailed;
    var instanced = args.instanced;

    var buildPrototype = function(arguments) {
        var proto = "(";
        var isOptional = false;
        var suffix = "";
        for( var i = 0 ; i < arguments.length ; ++i ) {
            if( i > 0 ) {
                proto += ",";
            }
            if(  arguments[i].optional ) {
                isOptional = true;
            }
            if( isOptional ) {
                proto += "[";
                suffix += "]";
            }
            proto += arguments[i].name;
        }
        proto += suffix + ")";
        return proto;
    };
    var dumpNames = function(namespace,filter) {
        var names = [];
        var isFullMethodName = 0;
        if( !filter ) {
            filter = "";
        } else {
            if( filter.indexOf("(") > 0 ) {
                isFullMethodName = filter.indexOf("(");
            }
        }
        filter = filter.toLowerCase();
        if( namespace.__properties__ && instanced ) {
            for( var name in namespace.__properties__ ) {
                var item = namespace.__properties__[name];
                if( filter.length > 0 ) {
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
        }
        if(namespace.__functions__ ) {
            for( var name in namespace.__functions__ ) {
                var item = namespace.__functions__[name];
                if( filter.length > 0 ) {
                    if( isFullMethodName > 0 ) {
                        if( name.length != isFullMethodName || name != filter.substr(0,isFullMethodName)  ) {
                            continue;
                        }
                    } else if( filter != name.substring(0,filter.length)) {
                        continue;
                    }
                }
                var proto = "()";
                var methodName = name;
                var description = null;
                var arguments = [];
                if( typeof item === 'string') {
                    methodName = item;
                } else {
                    if( item.description ) {
                        description = item.description;
                    }
                    if( item.arguments ) {
                        arguments = item.arguments;
                        proto = buildPrototype(arguments);
                    }
                    if( item.__name__ ) {
                        methodName = item.__name__;
                    } else if( item.name ) {
                        methodName = item.name;
                    }
                }
                if( !description ) {
                    description = methodName + " function."
                }
                if(  detailed ) {
                    names.push({ type : "function" , name : methodName , prototype : methodName + proto , arguments : arguments, description : description });
                } else {
                    names.push(methodName+proto);
                }
            }
        }
        if( namespace.__methods__ && instanced ) {
            for( var name in namespace.__methods__ ) {
                var item = namespace.__methods__[name];
                if( filter.length > 0 ) {
                    if( isFullMethodName > 0 ) {
                        if( name.length != isFullMethodName || name != filter.substr(0,isFullMethodName)  ) {
                            continue;
                        }
                    } else if( filter != name.substring(0,filter.length)) {
                        continue;
                    }
                }
                var proto = "()";
                var methodName = name;
                var description = null;
                var arguments = [];
                if( typeof item === 'string') {
                    methodName = item;
                } else {
                    if( item.description ) {
                        description = item.description;
                    }
                    if( item.arguments ) {
                        arguments = item.arguments;
                        proto = buildPrototype(arguments);
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
                    names.push({ type : "method" , name : methodName , prototype : methodName + proto , arguments: arguments, description : description });
                } else {
                    names.push(methodName+proto);
                }
            }
        }
        for(var name in namespace ) {
            var item =namespace[name];
            if( name != "__name__" &&  name != "__methods__" &&  name != "__functions__" && name != "__properties__" ) {
                if( filter.length > 0 ) {
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
                            } else if( (i+1) < parts.length ) {
                                data = null;
                                break;
                            } else {
                                filter = parts[i];
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
                    callback(null,dumpNames(data,""));
                } else {
                    callback(err,null);
                }
            });
        } else {
            callback(null,dumpNames(topnamespace,parts[0]));
        }
    } else {
        callback(null,dumpNames(topnamespace,""));
    }
};

//----------------------- AutoComplete
var lookupVariableInstType = function (source,variable) {
    // find out if we are completing a property in the 'dependencies' object.
    var textUntilPosition = source.textUntilPosition;
    var varName = "dim "+variable+" as ";
    var  dimLoc = textUntilPosition.lastIndexOf(varName);
    if( dimLoc >= 0 ) {
        dimLoc = dimLoc + varName.length;
        var typeName = textUntilPosition.substring(dimLoc).split("\n")[0].trim().toLowerCase();
        if( typeName ) {
            return typeName;
        }
    }
    return null;
};

var autoComplete = function(source) {
    
    var harvestVariableTypes = function (source,varType) {
        // find out if we are completing a property in the 'dependencies' object.
        var textUntilPosition = source.textUntilPosition;
        var lCase = textUntilPosition;
        var items = null;
        lCase = lCase.toLowerCase();
        // Normalize white space...
        lCase = lCase.split("\n").join(" ");
        lCase = lCase.split("\r").join(" ");
        lCase = lCase.split("\t").join(" ");
        varType = varType.toLowerCase();
        varType = (" as "+varType+" ");                
        lCase = lCase.split(varType);
        if( lCase.length > 1 ) {
            var offset = 0;
            for( var i = 0 ; i < lCase.length-1 ; ++i ) {
                var loc = (" "+lCase[i]).lastIndexOf(" dim ");
                if( loc >= 0 ) {
                    var variable = textUntilPosition.substring(loc + 4 + offset,offset + lCase[i].length);
                    if( !items ) {
                        items = [];
                    }
                    items.push(variable);
                } 
                offset = offset + lCase[i].length + varType.length;
            }
        }
        return  { symbols : items };
    };
    // find out if we are completing a property in the 'dependencies' object.
    var textUntilPosition = source.textUntilPosition;
    if( textUntilPosition.substring(textUntilPosition.length-5,textUntilPosition.length-1) == " as " ) {
        return  createCompletion(topnamespace);
    }
    if( textUntilPosition.substring(textUntilPosition.length-2,textUntilPosition.length) == "::" ) {
        var lspace = textUntilPosition.lastIndexOf(" ");
        var altspace = textUntilPosition.lastIndexOf("\n");
        var varname = textUntilPosition;
        if( lspace < altspace ) {
            lspace = altspace;
        }
        altspace = textUntilPosition.lastIndexOf("\t");
        if( lspace < altspace ) {
            lspace = altspace;
        }
        if( lspace > 0 ) {
            varname = textUntilPosition.substring(lspace+1,textUntilPosition.length-2);
        } else {
            varname = varname.substring(0,varname.length-2);
        }
        var nsp = resolveName(varname);
        if( nsp ) {
            return createCompletion(nsp);
        }
        return  [ ] ;
    } else if( textUntilPosition.substring(textUntilPosition.length-1,textUntilPosition.length) == "." && source.lineNumber > 1) {
        var lspace = textUntilPosition.lastIndexOf(" ");
        var altspace = textUntilPosition.lastIndexOf("\n");
        var varname = textUntilPosition;
        if( altspace > lspace ) {
            lspace = altspace;
        }
        altspace = textUntilPosition.lastIndexOf("\t");
        if( altspace > lspace ) {
            lspace = altspace;
        }
        if( lspace > 0 ) {
            varname = textUntilPosition.substring(lspace+1,textUntilPosition.length-1);
        } else {
            varname = varname.substring(0,varname.length-1);
        }
        var typeName = lookupVariableInstType(source,varname);
        if( typeName ) {
            var nsp = resolveName(typeName);
            if( nsp ) {
                return createCompletion(nsp,"__instance__");
            }
        }                        
        return [ ];
    } else {
        var spacesAtEnd = 0;
        while( spacesAtEnd < textUntilPosition.length &&  textUntilPosition[textUntilPosition.length-spacesAtEnd-1] == ' ' ) {
            spacesAtEnd = spacesAtEnd + 1;
        }
        var spacesRemoved;
        if( spacesAtEnd > 0 ) {
            spacesRemoved = textUntilPosition.substring(0,textUntilPosition.length - spacesAtEnd);
        } else {
            spacesRemoved = textUntilPosition;
        }

        if( ",(".indexOf(spacesRemoved.substring(spacesRemoved.length-1,spacesRemoved.length)) >= 0 && source.lineNumber > 1) {                                                        
            var fullLine = source.fullLine();
            var startFunc = spacesRemoved.lastIndexOf("(");
            var endFunc = fullLine.lastIndexOf(")");
            var funcArg = fullLine.substring(startFunc,endFunc);
            funcArg = funcArg.split(",");

            var funcName = spacesRemoved.substring(0,startFunc).trim();
            var instFun = funcName.lastIndexOf(".");
            if( instFun < funcName.lastIndexOf("::") ) {
                instFun = funcName.lastIndexOf("::");
            }
            var funPtr = null;
            if( instFun > 0 ) {
                var typeName = lookupVariableInstType(source,funcName.substring(0,instFun).toLowerCase());
                var nsp = resolveName(typeName);
                if( nsp ) {
                    if( funcName[instFun] == ":" )
                        funcName = funcName.substring(instFun+2).toLowerCase();
                    else
                        funcName = funcName.substring(instFun+1).toLowerCase();
                    if( nsp.__functions__ ) {
                        funPtr = nsp.__functions__[funcName];
                    }
                    if( !funPtr && nsp.__methods__ ) {
                        funPtr = nsp.__methods__[funcName];
                    }
                }
            } else {
                // globals..
            }
            if( funPtr && funPtr.arguments && funPtr.arguments.length > 0 ) {
                var argumentName = null;
                var argumentNumber = 0;
                var autoComplete = null;                                
                var startCol = 0;
                var endCol = 0;
                var startLine = source.lineNumber;
                if( spacesRemoved.substring(spacesRemoved.length-1,spacesRemoved.length) == "(" ) {
                    argumentName = funPtr.arguments[0].name;
                    startCol = startFunc + 2;
                    endCol = startCol+funcArg[0].length;
                } else {
                    startCol = startFunc + funcArg[0].length + 3;
                    for( var i = 1 ; i < funPtr.arguments.length ; ++i ) {
                        endCol = startCol + funcArg[i].length;                          
                        if( source.column <=  endCol ) {
                            argumentName = funPtr.arguments[i].name;
                            argumentNumber = i;
                            break;
                        }
                        startCol = endCol+1; // advance to next argument...
                    }
                }
                if( argumentName && !autoComplete ) {
                    autoComplete = funPtr.arguments[argumentNumber].autocomplete;
                    if( !autoComplete && funPtr.arguments[argumentNumber].type ) {
                        autoComplete = registerEnumJIT(funPtr.arguments[argumentNumber]);
                        if( !autoComplete ) {
                            // find all dims of type
                            autoComplete =  harvestVariableTypes(source, funPtr.arguments[argumentNumber].type );
                        }
                    }
                }
                if( autoComplete ) {
                    return {
                        kind : "snippet",
                        name : funcName , 
                        argumentName : argumentName , 
                        argumentNumber : argumentNumber , 
                        completion : autoComplete , 
                        startCol : startCol,
                        endCol : endCol,
                        startLine : startLine 
                    };                                  
                }
            }
        } else if( spacesRemoved.substring(spacesRemoved.length-1,spacesRemoved.length) == "=" && source.lineNumber > 1) {
            var lspace = spacesRemoved.lastIndexOf("\n");
            var varname = spacesRemoved;
            if( lspace > 0 ) {
                varname = spacesRemoved.substring(lspace+1,spacesRemoved.length-1);
            } else {
                varname = varname.substring(0,varname.length-1);
            }
            var typeName = lookupVariableInstType(source,varname.trim());
            if( typeName ) {
                var nsp = resolveName(typeName);
                if( nsp ) {
                    if( nsp.__enumeration__ ) {
                        var completeSnippet = function(arr) {
                            var items = [];
                            for(var i = 0 ; i < arr.length ; ++i ) {
                                items.push({label:arr[i],insertText:arr[i]});
                            }
                            return items;
                        }
                        return completeSnippet( nsp.__enumeration__ );
                    }
                }
            }                        
            return { };
        }
    } 
    var items = [ {
        label: 'for',
        documentation: 'For loop.',
        insertText: [ 'for {{index}} = {{start}} to {{end}}', '   {{code}}','next' ].join('\n')
    },{
        label: 'if',
        documentation: 'If block',
        insertText: [ 'if {{condition}} then', '   {{code}}','end if'].join('\n')
    },{
        label: 'function',
        documentation: 'function block',
        insertText: [ 'function {{name}} as {{type}}()', '   {{code}}','end function'].join('\n')
    },{
        label: 'while',
        documentation: 'while loop',
        insertText: [ 'while {{condition}}', '   {{code}}','end while'].join('\n')
    },{
        label: 'dim',
        documentation: 'dim statement',
        insertText: 'dim {{name}} as {{type}}',
    }
    ];
    for( var name in topnamespace ) {
        var ns = topnamespace[name];
        if( ns ) {
            if( typeof ns === 'string' ) 
                name = ns;
            else if( ns.__name__ )
                name = ns.__name__;   
            items.push({
                label: name,
                documentation: name+' namespace',
                insertText: name
            });
        }
    }
    var ident = getXBIdent( textUntilPosition );
    if( ident ) {
        ident = ident.toLowerCase();
        var syms = lookupGlobalSymbols(ident);                      
        if( syms && !syms.__index__) {
            for( var name in syms ) {
                var  sym = syms[name];
                if( sym.name ) {
                    name = sym.name;
                }
                var prototype = name + "(";
                if( sym.arguments ) {
                    for( var i = 0 ; i < sym.arguments.length ; ++i ) {
                        if( sym.arguments[i].optional ) {
                            break;
                        }
                        if( i > 0 ) {
                            prototype = prototype + " , ";
                        }
                        prototype = prototype + sym.arguments[i].name;
                    }
                }
                prototype = prototype + ")"
                items.push({
                    label: name,
                    kind: "function",
                    documentation: sym.description || (name+' function'),
                    insertText: prototype
                });
            }
        }
    }
    return items;
};

var autoHelp = function(source) {
    var textUntilPosition = source.textUntilPosition;
    var leadingPos = textUntilPosition.length;
    textUntilPosition = textUntilPosition.trim();
    leadingPos = leadingPos - textUntilPosition.length;
    var parenPos = textUntilPosition.lastIndexOf("(");
    if( parenPos > 0 ) {
        var endParenPos = textUntilPosition.indexOf(")",parenPos);
        if( endParenPos > parenPos && endParenPos != (textUntilPosition.length-1) ) {
            ;
        } else {
            var funcName = textUntilPosition.substring( 0 , parenPos );
            var subExprPos = -1;
            var separators = "()+-=<>*/? ";
            for( var i = 0 ; i < separators.length ; ++i ) {
                if( subExprPos < funcName.lastIndexOf(separators[i]) ) {
                    subExprPos = funcName.lastIndexOf(separators[i]);
                }
            }
            if( subExprPos >= 0 ) {
                funcName = funcName.substring(subExprPos+1).trim();
            }
            var instFun = funcName.lastIndexOf(".");
            if( instFun < funcName.lastIndexOf("::") ) {
                instFun = funcName.lastIndexOf("::");
            }
            var funPtr = null;
            if( instFun > 0 ) {
                var typeName = funcName.substring(0,instFun).toLowerCase();
                var nsp = resolveName(typeName);
                if( nsp ) {
                    if( funcName[instFun] == ":" )
                        funcName = funcName.substring(instFun+2).toLowerCase();
                    else
                        funcName = funcName.substring(instFun+1).toLowerCase();
                    if( nsp.__functions__ ) {
                        funPtr = nsp.__functions__[funcName];
                    }
                } else if( funcName.indexOf("::") < 0 ) {
                    console.log("Lookup inst "+funcName);
                    var typeName = lookupVariableInstType(source,funcName.substring(0,instFun));
                    if( typeName ) {
                        var nsp = resolveName(typeName);
                        if( nsp ) {
                            funcName = funcName.substring(instFun+1).toLowerCase()
                            if( nsp.__functions__ ) {
                                funPtr = nsp.__functions__[funcName];
                            }                                            
                            if( nsp.__methods__ ) {
                                funPtr = nsp.__methods__[funcName];
                            }                                            
                        }
                    }
                }
            } else {
                var ident = getXBIdent( funcName );
                if( ident ) {
                    ident = ident.toLowerCase();
                    var syms = lookupGlobalSymbols(ident);                        
                    if( syms ) {
                        funPtr = syms[ident];
                        typeName = null;
                    }
                }            
            }
            if( funPtr ) {
                if( typeName ) {
                    typeName = typeName + ".";
                } else {
                    typeName = "";
                }
                var runCommand = null;
                var argumentNumber = 0;
                var argumentName = null;
                var startCol = 0;
                var endCol = 0;
                var startLine = source.line;

                if( funPtr.arguments && funPtr.arguments.length ) {
                    var startArgs = textUntilPosition.indexOf("(");
                    if( startArgs > 0 ) {
                        var argList = textUntilPosition.substring(startArgs+1).split(',');
                        var toArgs = argList.length;

                        var lastHLArg = argList[argList.length-1];

                        var fullLine = source.fullLine();
                        lastHLArg =  lastHLArg +  fullLine.substr(source.textUntilPosition.length).split(",")[0];
                        if( lastHLArg.length > 1 && lastHLArg[lastHLArg.length-1] == ')' ) {
                            lastHLArg = lastHLArg.substring(0,lastHLArg.length-1);
                        }                                        
                        argList[argList.length-1] = lastHLArg;

                        if( toArgs <= funPtr.arguments.length )  {
                            argumentNumber = toArgs-1;
                            startCol = parenPos + 2 + leadingPos;
                            for( var i = 0 ; i < argumentNumber ; ++i ) {
                                startCol = startCol + argList[i].length + 1;
                            }
                            if( argList[argumentNumber].length > 1 ) {
                                if( argList[argumentNumber][argList[argumentNumber].length-1] == ")" ) { 
                                    argList[argumentNumber] = argList[argumentNumber].substring(0,argList[argumentNumber].length-1);
                                }
                            }
                            endCol = startCol + argList[argumentNumber].length;
                            argumentName = funPtr.arguments[argumentNumber].name;
                        } else {
                            runCommand = null;
                        }
                    } else {
                        runCommand = null;
                    }
                }
                return { prototype : typeName + functionPrototype(funPtr,funcName,true),
                         documentation : funPtr.documentation || funPtr.description
                };
            }
        }
    }
    return null;
};


module.exports = {
   getNamespace : getNamespace , listNamespaces : listNamespaces , autoComplete : autoComplete , autoHelp : autoHelp
};