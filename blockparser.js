/*
-----------------------------------------------------------------------------------------
 ok-blockparser.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen, Rajahyöty Oy
 





 20200221
-----------------------------------------------------------------------------------------
*/

class BlockParser {
	constructor (options={}) {

		this._params = {};
		this.blockBeginLength = undefined;
		this.blockEndLength = undefined;
		this.blockBeginRow = undefined;
		this.doubleQuoteOn = false;
		this.singleQuoteOn = false;
		this.backTickOn = false;
		this.offset = 0;
		this.level = 0;
		this.row = 0;
		this.handler = new BlockArrifier(this);

		this.blockBegin = options.blockBegin || "<:";
		this.blockEnd = options.blockEnd || ":>";
		this.trimContent = typeof options.trimContent == "boolean" ? options.trimContent : true;
		this.ignoreQuotes = typeof options.ignoreQuotes == "boolean" ? options.ignoreQuotes : false;
		this.ignoreUnclosedStringErrors = typeof options.ignoreUnclosedStringErrors == "boolean" 
			? options.ignoreUnclosedStringErrors : false;
	}

	get blockBegin() {
		return this._params.blockBegin;
	}

	set blockBegin(value) {
		this._params.blockBegin = value;
		this.blockBeginLength = this._params.blockBegin.length;
		return this._params.blockBegin;
	}

	get blockEnd() {
		return this._params.blockEnd;
	}

	set blockEnd(value) {
		this._params.blockEnd = value;
		this.blockEndLength = this._params.blockEnd.length;
		return this._params.blockEnd;
	}

	get handler() {
		return this._params.handler;
	}

	set handler(value) {
		if (typeof value !== "object") {
			throw new Error( "E_INVALID_HANDLER" );
		}
		if (!"result" in value) {
			throw new Error( "E_MISSING_HANDLER_RESULT" );
		}
		if (typeof value.handle !== "function") {
			throw new Error( "E_NO_HANDLER_HANDLE_METHOD" );
		}
		this._params.handler = value;
		this._params.handler.parser || (this._params.handler.parser = this);
		return value;
	}

	get ignoreQuotes() {
		return this._params.ignoreQuotes
	}

	set ignoreQuotes(value) {
		this._params.ignoreQuotes = value;
		return value;
	}

	get ignoreUnclosedStringErrors() {
		return this._params.ignoreUnclosedStringErrors;
	}

	set ignoreUnclosedStringErrors(value) {
		this._params.ignoreUnclosedStringErrors = value;
		return value;
	}

	get trimContent() {
		return this._params.trimContent;
	}

	set trimContent(value) {
		this._params.trimContent = value;
		return value;
	}

	parse( onError, onSuccess, source ) {

		this.offset = 0;
		this.level = 0;
		this.row = 0;
		this.doubleQuoteOn = false;
		this.singleQuoteOn = false;
		this.backTickOn = false;
		this.blockBeginRow = undefined;

		const state = {
			unclosedQuote: false,
			backTickErrorRow: undefined
		};

		this.__parse( source, state );

		if (this.singleQuoteOn && !this.ignoreUnclosedStringErrors) {
			onError( new Error( "E_UNCLOSEDSINGLEQUOTE (row: " + this.row + ")" ));
			return;
		}
		else if (this.doubleQuoteOn && !this.ignoreUnclosedStringErrors) {
			onError( new Error( "E_UNCLOSEDDOUBLEQUOTE (row: " + this.row + ")" ));
			return;
		}
		else if (this.backTickOn && !this.ignoreUnclosedStringErrors) {
			onError( new Error( "E_UNCLOSEDBACKTICK (row: " + state.backTickErrorRow + ")" ));
			return;
		}
		if (this.level < 0) {
			onError( new Error( "E_TOOMENYBLOCKENDS" ));
			return;
		}
		else if (this.level > 0 ) {
			onError( new Error( "E_UNCLOSEDBLOCK" ));
			return;
		}
		else {
			onSuccess( this.handler.result );
		}
		return;
	}

	__parse( source, state ) {
		const length = source.length;
		let content = "";
		while (this.offset < length) {
			if (state.unclosedQuote) {
				return;
			}
			else if (source[this.offset] == "\n") {
				++this.row;
				if ((this.doubleQuoteOn || this.singleQuoteOn) && !this.ignoreUnclosedStringErrors) {
					state.unclosedQuote = true;
					return;
				}
			}
			else if (source[this.offset] == '"' && source[this.offset-1] !== "\\" 
			  && !this._params.ignoreQuotes && !this.singleQuoteOn && !this.backTickOn) {
				this.doubleQuoteOn = !this.doubleQuoteOn;
			}
			else if (source[this.offset] == "'" && source[this.offset-1] !== "\\" 
			  && !this._params.ignoreQuotes && !this.doubleQuoteOn && !this.backTickOn) {
				this.singleQuoteOn = !this.singleQuoteOn;
			}
			else if (source[this.offset] == "`" && source[this.offset-1] !== "\\" 
			  && !this._params.ignoreQuotes && !this.doubleQuoteOn && !this.singleQuoteOn) {
				this.backTickOn = !this.backTickOn;
				state.backTickErrorRow = this.backTickOn ? this.row : undefined;
			}
			else if (!(this.doubleQuoteOn || this.singleQuoteOn || this.backTickOn)) {
				// block begin
				if (length-this.offset >= this.blockBeginLength 
				  && source.substr(this.offset,this.blockBeginLength) == this._params.blockBegin) {
					this.blockBeginRow = this.row;
					this.trimContent && (content = content.trim());
					this.offset += this.blockBeginLength
					++this.level;
					this._params.handler.handle( content, 1 );
					content = "";
					this.__parse( source, state );
					continue;
				}
				// block end
				else if (length-this.offset >= this.blockEndLength 
				  && source.substr( this.offset, this.blockEndLength ) == this._params.blockEnd) {
					this.trimContent && (content = content.trim());
					this.offset += this.blockEndLength;
					--this.level;
					this.handler.handle( content, -1 );
					return;
				}
			}
			content += source[this.offset];
			++this.offset;
		}
		this.trimContent && (content = content.trim());
		this._params.handler.handle( content, 0 );
		return;
	}
}

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

module.exports = BlockParser;