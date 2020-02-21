const fs = require( "fs" );
const Parser = require( "ok-blockparser" );
const filename = "example.wgs"
 
const parser = new Parser({ 
	blockBegin: "<:",
	blockEnd: ":>",
	trimContent: true,
	ignoreQuotes: true, 
	ignoreUnclosedStringErrors: true
});
   
parser.parse((e)=>{ console.log(e);}, (result)=>{
	console.log(require("util").inspect( result, {depth: 10 }));
}, fs.readFileSync( filename ).toString() );
      
