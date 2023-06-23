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

module.exports = {
   getNamespace : getNamespace
};