# ok-blockparser

**ok-blockparser** is a parser implemented with javascript. It parses text blocks 
surrounded by special opening and closing characters. The parser passes the parsed 
text blocks to a special handler object that is designed to assemble the text blocks 
as desired. Default handler object assembles the blocks into a multi-dimensional array. 
Parser's opening and closing characters can be one or more characters long.


## Installation

npm install ok-blockparser


## Usage

	const Parser = require( "ok-blockparser" );
	const parser = new Parser();
	parser.parse(
		(error)=>{ console.log(error);},
		(result)=>{ console.log(result);},
		text
	);

## Reference

### Initialization

	const Parser = require( "ok-blockparser" );
	const parser = new Parser(options);


### Options

At the initalization of the parser can be passed a following object.

	{
		blockBegin: string,
		blockEnd: string,
		ignoreQuotes: boolean,
		ignoreUnclosedStringErrors: boolean,
		trimContent: boolean
	}

Descriptions for the option object's parameters are the same as the parser properties with the same name.

### Properties

#### Before the parsing

Following properties can be set as option object parameters or get/set as parser object's properties.

- 	**blockBegin** *string* - Block opening character or character combination. Default value is *"<:"*.

- 	**blockEnd** *string* - Block closing character or character combination. Default value is *":>"*.

- 	**ignoreQuotes** *boolean* - A boolean value that indicates whether the parser should take note of the double/single quotes 
	and backtick characters. Default value is *false*.

- 	**ignoreUnclosedStringErrors** *boolean* - A boolean value that indicates whether the parser should interrupt the parsing when the
	string literal surrounded by double/single quote is unclosed ie. the new line character is encountered 
	before the closing quote. This property value is meaninful only if the **ignoreQuotes** is set
	*false*.

- 	**trimContent** *boolean* - A boolean value that indicates whether the contents of the blocks 
	should be trimmed before it is passed to the handler.  Default value is *true*.


#### During the parsing

Following properties are usefull for the handler object within the parsing operation.

-	**backTickOn** *number* - A boolean value indicating whether the parser is just parsing the string literal surrounded by backtics.

-	**blockBeginRow** *number* - The row number of the current block's opening character(s).

-	**doubleQuoteOn** *boolean* - A boolean value indicating whether the parser is just parsing the string literal surrounded by double quotes.

- 	**handler** *object* - Handler object for assembling parsed text blocks.

-	**level** *number* - A numeric value that indicates the level of the current block in the block hierarchy.

-	**offset** *number* - A numeric value that indicates the index of the current character of the text to be parsed.

-	**row** *number* - A numeric value that indicates the current row of the parsed text.

-	**singleQuoteOn** *boolean* - A boolean value indicating whether the parser is just parsing the string literal surrounded by single quotes.


### Methods

-  **parse( onError, onSuccess, source )** - Starts parsing operation.
	- **onError** *function(error)* - Called in the case of error. Possible error messages are:
		- E_UNCLOSEDSINGLEQUOTE (row: *row_number*)
		- E_UNCLOSEDDOUBLEQUOTE (row: *row_number*)
		- E_UNCLOSEDBACKTICK (row: *row_number*)
		- E_TOOMENYBLOCKENDS
		- E_UNCLOSEDBLOCK


	- **onSuccess** *function(result)* - Called when the parsing is successfully finished. Parameter *result*
		contains the contents of the handler object's result property. For the default handler this, value is *array*.




## Handler object

In order to work **ok-blockparser** needs the handler object to assemble the parsed text blocks as desired.
The default handler converts the parsed text into an *array*.


### Properties and methods

First, the handler object assigned to the *handler* property of the parser should have a method called **handle**.
The prototype of the method is as follows:

**handle( content, mode )**
- **content** *string* - Contains parsed text. The passed sting may be trimmed according the value of parser's
	trimContent property. See the description of the *mode* parameter for more information
- **mode** *number* - May be one of the folliwing values:
	- **1**	- The parser is just detected the opening character(s) of the next text block. Here the **content**
		contains the text after the previous block's closing character(s) and before the next one's 
		opening character(s).
	- **-1** - The parser is just detected the closing character(s) of current text block. Here the **content**
		contains the text before this closing mark and after the possible inner block's closing character(s)
		or in case there exist any inner blocks, the whole text content of the block.
	- **0** - The parser is just reached the end of the text. Here the **content**
		contains the text after the closing character(s) of the last block.


Secondly, the handler should have the parameter (or getter/setter) called **result**. It should 
contain (or return in case of getter) the assembled value, which is in turn is passed as the parameter of the **parse** 
method's onSuccess function when the parsing is successfully completed.

Default handler also contains the **parser** property, which provides access to the parser object.



### BlockArrifier - the class of the default handler object

	    
	class BlockArrifier {
		constructor(parser) {
			this.resultStack = [[]];
			this.parser = parser;
		}
       
		get result() {
			return this.resultStack[this.resultStack.length-1];
		}
       
		handle( content, mode = 0 ) {
			content && this.result.push(content);
			this._changeLevel(mode);
		}
       
		_changeLevel(mode) {
			if (mode > 0) { // at block begin
				this.result.push([]);
				this.resultStack.push( this.result[this.result.length-1] );
			}
			else if (mode < 0) { // at block end
				this.resultStack.pop();
			}
		}
	}


### Replacing the default handler

In order to replace the default handler with your own handler, set the new
handler as a value of the parser's **handler** property.


	const Parser = require( "ok-blockparser" );
     
	class MyHandler {
		constructor(parser) {
			this.result = {};
			this.parser = parser;
		}
		handle( content, mode = 0 ) {
			// handle the current block content
			// and add it to the result way you like
		}
	}
       	
	const parser = new Parser();
	parser.handler = new MyHandler(parser);
     
	parser.parse((error)=>{ console.log(error);}, (result)=>{
		console.log(require("util").inspect( result, {depth: 10 }));
	}, fs.readFileSync( "example.txt" ).toString() );



## Example

      
	const fs = require( "fs" );
	const Parser = require( "ok-blockparser" );
	 
	const parser = new Parser({ 
		blockBegin: "<:",
		blockEnd: ":>",
		trimContent: true,
		ignoreQuotes: true, 
		ignoreUnclosedStringErrors: true
	});
       
	parser.parse((error)=>{ console.log(error);}, (result)=>{
		console.log(require("util").inspect( result, {depth: 10 }));
	}, fs.readFileSync( "example.wgs" ).toString() );
          
