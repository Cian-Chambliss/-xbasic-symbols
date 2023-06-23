# xbasic-symbols
Alpha Anywhere Xbasic Symbol Loader

Example code - dump all the namespaces under the top level SQL namespace

```javascript
const  xb = require("xbasic-symbols");

xb.getNamespace("sql",function(err,data) {
   if( data ) {
     console.log("names in "+data.__name__+"\n")
     for(var name in data ) {
        if( name != "__name__")
        console.log(data[name].__name__);
     }
   }
});
```
