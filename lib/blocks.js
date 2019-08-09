

// Matches any leading spaces, then -+*, or numbers, followed by space, then anything
const reList = /^( {0,3}[-+*]|[0-9]{1,9}[\.\)])(  *?)( {4})?(.*)$/

// Matches |----|----| with optional opening and closing pipes
const reTable = /^\|?-+(\|-+)+\|?$/

// Up to 3 leading spaces, then three or more of -_*, split by any number of spaces
const reHR = /^ {0,3}((- *){3,}|(_ *){3,}|(\* *){3,})$/

// up to 3 leading spaces.
// 1-6 # characters
// either:
	// space + Anything
	// nothing
// Optional any number of #, but only after a space
// Optional any number of space
const reATXHeading = /^ {0,3}(#{1,6})( .*?)??( #*)? *$/


// 3 or more - or =
// optional prefix up to 3 spaces
// optioanl suffix of spaces
const reSetextHeading = /^ {0,3}[-=]+ *$/;

const reBlockquote = /^ {0,3}> ?(.*)$/;

class LineSource {
	constructor(src) {
		this.lines = src.split("\n")
	}
	
	[Symbol.iterator]() {
		return this;
	}

	next() {
		return {
			done: this.lines.length < 1,
			value: this.lines.shift(),
		}
	}

	peek() {
		return {
			done: this.lines.length < 1,
			value: this.lines[0],
		}
	}
}

class Transformer {
	constructor(src, transformer ) {
		this.src = src
		this.transformer = transformer
	}
	
	[Symbol.iterator]() {
		return this;
	}

	next() {
		let {value, done} = this.peek()
		if (done) {
			return {
				done: true,
			}
		}
		// consume the line
		this.src.next();
		return {
			done: false,
			value: value,
		}
	}

	peek() {
		var {value, done} = this.src.peek()
		if (done) {
			return {
				done: true,
			}
		}
		var txValue = this.transformer(value)
		if (txValue === false) {
			return {
				done: true,
			}
		}
		return {
			done: false,
			value: txValue,
		}
	}
}


class ReplaySource {
	constructor(src, replay) {
		this.src = src;
		this.replay = replay;
	}
	
	[Symbol.iterator]() {
		return this;
	}

	next() {
		if (this.replay.length > 0) {
			return {
				value: this.replay.shift(),
				done: false,
			}
		}
		return this.src.next()
	}
	

	peek() {
		if (this.replay.length > 0) {
			return {
				value: this.replay[0],
				done: false,
			}
		}
		return this.src.peek()
	}
}


function* parseParts(lineSource) {
	
	let plainLines = null;

	lines:
	for (let str of lineSource) {
		console.log(`LINE '${str}'`);
		
		if (str.trim() === "") {
			if (plainLines) {
				yield paragraph(plainLines)
				plainLines = null;
			}
			continue lines
		}

		// ATX (Hash) Heading
		let headingMatch = reATXHeading.exec(str)
		if (headingMatch) {
			context.building = null;
			yield {
				type: "h" + headingMatch[1].length,
				content: (headingMatch[2]||"").trim(),
			};
			continue;
		}
		
		// Setext headings
		if (plainLines && reSetextHeading.exec(str)) {
			yield {
				type: {"=": "h1", "-": "h2"}[str.trim().substr(0,1)],
				content: paragraph(plainLines).content,
			}
			plainLines = null;
			continue;
		}
		
		if (reHR.exec(str)) {
			if (plainLines) {
				yield paragraph(plainLines)
				plainLines = null;
			}
			yield {type: "hr"}
			continue lines
		}

		// Lists
		let listMatch = reList.exec(str);
		if (listMatch) {
			if (plainLines) {
				yield paragraph(plainLines)
				plainLines = null;
			}

			let ordered = ("*-+".indexOf(listMatch[1].trim()) == -1);

			listPrefix = (listMatch[1] + listMatch[2]).split('').map((i) => ' ').join('')
			
			console.log(`LM '${listMatch[0]}'`, `\nPF '${listPrefix}'`)
			
			yield {
				type: "list",
				ordered: ordered,
				items: listItems(new ReplaySource(lineSource, [str]), listPrefix),
			}
			continue lines
		}

		if (reTable.exec(str) && plainLines) {
			yield {
				type: "table",
				header: tableFields(paragraph(plainLines).content),
				rows: Array.from(
					// Filter lines
					new Transformer(lineSource, (l) => {
						if (l.trim() === "") {
							return false;
						}
						return l;
					})
				).map((line) => tableFields(line)),
			}
			plainLines = null;
			continue lines
		}

		if (!plainLines && str.substr(0, 4) === '    ') {
			yield {
				type: "code",
				lines: codeLines(new ReplaySource(lineSource, [str]), '    '),
			}
			continue lines
		}

		if (reBlockquote.exec(str)) {
			if (plainLines) {
				yield paragraph(plainLines)
				plainLines = null
			}
			console.log("Is Blockquote")
			yield {
				type: "blockquote",
				content: Array.from(
					parseParts(
						new Transformer(new ReplaySource(lineSource, [str]), (l) => {
							if (l.trim() === "") {
								return false
							}
							let m = reBlockquote.exec(l);
							if (!m) {
								console.log(`BQ No Match on '${l}'`)
								// Is it Lazy?
								if (
									l.trim() === "" // Give up on empty lines
									|| reHR.exec(l)                // HR
									|| reATXHeading.exec(l)     // Heading
									|| reList.exec(l)           // List
									|| l.substr(0,4) === '    ' // Code
								) {
									return false
								}
								console.log("BQ Lazy", l)
								return l;
							}
							console.log("BQ", m)
							return m[1];
						})
					)
				),
			}
			continue
		}

		if (!plainLines) {
			plainLines = []
		}
		plainLines.push(str.trim())

		continue lines;
	}

	if (plainLines) {
		yield paragraph(plainLines)
	}
}

function paragraph(lines) {
	return {
		type: "p",
		content: lines.map((l) => l.trim()).join(" "),
	}
}

function codeLines(lineSource, prefix) {
	let codeLinesIter = new Transformer(lineSource, (l) => {
		if (l.trim() === "") {
			return l.substr(4);
		}
		if (l.substr(0, prefix.length) !== prefix) {
			return false
		}
		return l.substr(prefix.length);
	})

	let codeLines = Array.from(codeLinesIter)
	for (let idx = codeLines.length - 1; idx >= 0; idx--) {
		if (codeLines[idx] === "") {
			codeLines.pop();
		} else {
			break
		}
	}

	return codeLines
}

function listItems(lineSource, listPrefix) {
	let nextItem = new Transformer(lineSource, (l) => {
		if (l.trim() === "") {
			return "";
		}
		let m = reList.exec(l);
		if (!m) {
			return false;
		}
		// HR wins...
		if (reHR.exec(l)) {
			return false
		}
		let txt = listPrefix + m[4];
		return txt
	})
	
	let items = [];

	for (let value of nextItem) {
		let itemSource = new ReplaySource(lineSource, [value])
		let itemPartSource = new Transformer(itemSource, (l) => {
			console.log(`Test line '${l}'`)
			if (l.trim() === "") {
				return "";
			}
			if (l.substr(0, listPrefix.length) !== listPrefix) {
				return false
			}
			console.log(`Pass line '${l.substr(listPrefix.length)}'`)
			return l.substr(listPrefix.length);
		});

		let listItem = Array.from(parseParts(itemPartSource));

		items.push(listItem)
	}

	return items;
}

const tableFields = (str) => {
	if (str.substr(0,1) == "|") {
		str = str.substr(1);
	}
	if (str.substr(str.length - 1, 1) == "|") {
		str = str.substr(0, str.length - 1)
	}
	return str.split("|").map((s) => s.trim())
}

const parse = (src) => {

	let lines = new LineSource(src);

	console.log("Begin")

	let partGenerator = parseParts(lines, "");

	let parts = [];
	while(true) {
		const {value, done} = partGenerator.next()
		if (done) {
			break
		}
		parts.push(value);
	}

	console.log("GOT\n", JSON.stringify(parts, null, ".  "));

	return parts;
}


module.exports = parse;
