

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
const reHeading = /^ {0,3}(#{1,6})( .*?)??( #*)? *$/


const nextPart = (str, context) => {
	if (str.trim() === "") {
		return null;
	}

	let lastPart = context.building || {type: "none"};

	// Hash Heading Level
	let headingMatch = reHeading.exec(str)
	if (headingMatch) {
		return {
			parts: [{
				type: "h" + headingMatch[1].length,
				content: (headingMatch[2]||"").trim(),
			}]
		}
	}
	
	// Alternate H1 and H2 markers
	if (lastPart && lastPart.type === "p") {
		// 3 or more - or =
		if ((/^[-=]{3,}$/).exec(str)) {
			lastPart.type = {"=": "h1", "-": "h2"}[str.substr(0,1)];
			return {};
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
		lastPart.type = "table"
		lastPart.header = tableFields(lastPart.content)
		delete lastPart.content
		lastPart.rows = [];
		return {
			building: lastPart
		}
	}

	if (lastPart.type == "table") {
		lastPart.rows.push(tableFields(str))
		return {
			building: lastPart
		}
	}



	// Is a paragraph
	if (lastPart && lastPart.type === "p") {
		// Continues the previous paragraph
		lastPart.content += " " + str;
		return {
			building: lastPart,
		};
	}

	// New paragraph
	let part = {
		type: "p",
		content: str,
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
