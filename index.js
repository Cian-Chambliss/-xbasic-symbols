// Lookup namespaces for A5
var symbols = {};
var topLevelNames = [];

var getNamespace = function(name,callback) {
    name = name.toLowerCase();
    if( !symbols[name] ) {
        try {
            symbols[name] = require("./symbols/"+name+".json");
            callback(symbols[name],null);
        } catch (error) {
            callback(null,"Symbol not found");
        }
    } else {
        callback(symbols[name],null);
    }
};

module.exports = {
   getNamespace : getNamespace
};