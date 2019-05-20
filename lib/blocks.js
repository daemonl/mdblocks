

// Matches any leading spaces, then -+*, or numbers, followed by space, then anything
const reList = /^( {0,})([-+*]|[0-9]+.) (.*)$/

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

const nextPart = (str, context) => {
	
	let lastPart = context.building || {type: "none"};
	
	if (str.trim() === "") {
		if (lastPart.type === "code") {
			lastPart.lines.push(str.substr(4));
			return {
				building: lastPart,
			}
		}
		return {}
	}


	// ATX (Hash) Heading
	let headingMatch = reATXHeading.exec(str)
	if (headingMatch) {
		return {
			parts: [{
				type: "h" + headingMatch[1].length,
				content: (headingMatch[2]||"").trim(),
			}]
		}
	}
	
	// Setext headings
	if (lastPart && lastPart.type === "p") {
		// Last part is the actual heading line, we are looking at the
		// underline on the next line.
		
		if (reSetextHeading.exec(str)) {
			// Promote the last entry
			lastPart.type = {"=": "h1", "-": "h2"}[str.trim().substr(0,1)];
			return {}
		}
	}
	
	if (reHR.exec(str)) {
		return {
			parts: [{type: "hr"}]
		}
	}

	// Lists
	let listMatch = reList.exec(str);
	if (listMatch) {
		let prefix = listMatch[1];
		let ordered = ("*-+".indexOf(listMatch[2]) == -1);
		let text = listMatch[3];

		if (lastPart.type == "none") {
			// Start a new list
			let part = {
				type: "list",
				ordered: ordered,
				items: [{
					text: text,
				}],
			}
			return {
				building: {
					prefix: prefix,
					type: "list",
					nestLevel: 0,
					items: part.items,
					lastItem: part.items[0],
				},
				parts: [part],
			}
		}

		if (lastPart.type === "list") {
			if (prefix.length > lastPart.prefix.length) {
				// Sub list
				let item = {
					text: text,
				}
				lastPart.lastItem.ordered = ordered;
				lastPart.lastItem.items = [item];
				return {
					building: {
						prefix: prefix,
						type: "list",
						nestLevel: lastPart.nestLevel + 1,
						parent: lastPart,
						items: lastPart.lastItem.items,
						lastItem: item,
					},
				}
			} else if (prefix.length < lastPart.prefix.length) {
				// Continue last parent list
				while (lastPart) {
					lastPart = lastPart.parent;
					if (lastPart.type != "list" || lastPart.prefix == prefix) {
						break
					}
				}
				
				let item = {
					text: listMatch[3],
				}
				lastPart.items.push(item);
				lastPart.lastItem = item;
				return {
					building: lastPart,
				}

			} else {
				// Continue last list
				let item = {
					text: listMatch[3],
				}
				lastPart.items.push(item);
				lastPart.lastItem = item
				return {
					building: lastPart,
				}
			}
		}
	}

	if (reTable.exec(str) && lastPart.type === "p") {
		lastPart.type = "table";
		lastPart.header = tableFields(lastPart.content);
		lastPart.rows = [];
		delete lastPart["content"];
		return {
			building: lastPart,
		}
	}

	if (lastPart.type == "table") {
		lastPart.rows.push(tableFields(str))
		return {
			building: lastPart
		}
	}

	if (lastPart.type == "none" && str.substr(0, 4) === '    ') {
		let building = {
			type: "code",
			lines: [str.substr(4)],
		}
		return {
			building: building,
			parts: [building],
		}
	}

	if (lastPart.type === "code") {
		if (str.substr(0, 4) === '    '){
			lastPart.lines.push(str.substr(4));
			return {
				building: lastPart,
			}
		}

		//lastPart.type = "p"
		//lastPart.content = lastPart.lines.map((l) => l.trim()).join(" ")
		//delete lastPart['lines'];
	}

	// Is a paragraph
	if (lastPart && lastPart.type === "p") {
		// Continues the previous paragraph
		lastPart.content += " " + str.trim();
		return {
			building: lastPart,
		};
	}

	// New paragraph
	let part = {
		type: "p",
		content: str.trim(),
	}
	return {
		building: part,
		parts: [part],
	}
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

	let lines = src.split("\n");

	let parts = [];

	let context = {};

	lines.forEach((str) => {
		let result = nextPart(str, context);
		context = result;
		if (result.parts != null) {
			parts = parts.concat(result.parts)
		}
	})

	return parts;
}


module.exports = parse;
