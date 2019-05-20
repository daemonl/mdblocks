const expect = require('chai').expect;
const parseBlocks = require('../lib/blocks');

context('Basics', () => {
	it('Basic paragraph', () => {
		expect(parseBlocks(
			"hello, world",
		)).to.deep.equal([{
			type: "p",
			content: "hello, world",
		}])
	})
	it('Should continue a paragraph', () => {
		expect(parseBlocks([
			"# Heading 1",
			"content line 1",
			"content line 2",
		].join("\n")))
		.to.deep.equal([{
			type: "h1",
			content: "Heading 1",
		}, {
			type: "p",
			content: "content line 1 content line 2",
		}])
	})
})

// Tests from https://github.github.com/gfm/
//
// The examples are given in HTML, running both block and inline parsing, so
// they aren't exactly the same:
// - Special characters are not replaced '&thing' -> '&thing', not '&amp;thing'
// - Control characters are not interpreted '*Foo*' -> '*Foo*, not '<em>Foo/<em>'
// - Newlines are replaced with spaces ('<p>Foo\nBar</p>' == 'Foo Bar' with type 'p')

context('4.1 Thematic breaks', () => {
	it('Example 13', () => {
		expect(parseBlocks([
			"***",
			"---",
			"___",
		].join("\n")))
		.to.deep.equal([{
			type: "hr",
		}, {
			type: "hr",
		}, {
			type: "hr",
		}])
	});

	it('Example 27', () => {
		expect(parseBlocks([
			"- foo",
			"---",
			"- bar",
		].join("\n")))
		.to.deep.equal([{
			type: "list",
			ordered: false,
			items: [{text: "foo"}],
		}, {
			type: "hr",
		}, {
			type: "list",
			ordered: false,
			items: [{text: "bar"}],
		}])
	});
	
	it('Example 28', () => {
		expect(parseBlocks([
			"Foo",
			"***",
			"bar",
		].join("\n")))
		.to.deep.equal([{
			type: "p",
			content: "Foo",
		}, {
			type: "hr",
		}, {
			type: "p",
			content: "bar",
		}])
	});
	
	it('Example 29 - H2 wins', () => {
		expect(parseBlocks([
			"Foo",
			"---",
			"bar",
		].join("\n")))
		.to.deep.equal([{
			type: "h2",
			content: "Foo",
		}, {
			type: "p",
			content: "bar",
		}])
	});

	it('Example 30 - Precedence over lists', () => {
		expect(parseBlocks([
			"* Foo",
			"* * *",
			"* Bar",
		].join("\n")))
		.to.deep.equal([{
			type: "list",
			ordered: false,
			items: [{text: "Foo"}],
		}, {
			type: "hr",
		}, {
			type: "list",
			ordered: false,
			items: [{text: "Bar"}],
		}])
	});


	it('Example 31 - List specific', () => {
		// Note the thematic break is not interpreted inside the list item, unlike the example.
		expect(parseBlocks([
			"- Foo",
			"- * * *",
		].join("\n")))
		.to.deep.equal([{
			type: "list",
			ordered: false,
			items: [{text: "Foo"}, {text: "* * *"}],
		}])
	});

	([
		"---",
		"***",
		// EG 17
		" ---",
		"  ---",
		"   ---",
		"----------------", // 20
		" - - -", // 21
		" **  * ** * ** * **", // 22
		"-     -      -      -", // 23
		"- - - -    ", // 24
	]).forEach((tc) => {
		it('Should be a hr for ' + tc, () => {
			expect(parseBlocks(tc)).to.deep.equal([{type: "hr"}])	
		})
	});
	
	([
		"text",
		"+++", // 14
		"===", // 15
		"--", // 16
		"    ---", // 18
		" *-*", // 26
		"_ _ _ _ a", // 25
		"a------", // 25
		"---a---", // 25
	]).forEach((tc) => {
		it('Should not be a hr for ' + tc, () => {
			let got = parseBlocks(tc);
			expect(got[0].type).not.to.equal("hr")
		})
	})
})

context('4.2 ATX Headings', () => {
	it('Should parseBlocks basic heading', () => {
		expect(parseBlocks([
			"# Heading 1",
			"Content",
		].join("\n")))
		.to.deep.equal([{
			type: "h1",
			content: "Heading 1",
		}, {
			type: "p",
			content: "Content",
		}]);
	});

	it('Should differentiate heading levels', () => {
		expect(parseBlocks([
			"# Heading 1",
			"## Heading 2",
			"###### Heading 6",
			"####### Paragraph",
		].join("\n")))
		.to.deep.equal([{
			type: "h1",
			content: "Heading 1",
		}, {
			type: "h2",
			content: "Heading 2",
		}, {
			type: "h6",
			content: "Heading 6",
		}, {
			type: "p",
			content: "####### Paragraph",
		}])
	})

	it('Requires a space', () => {
		expect(parseBlocks("#5 bolt")).to.deep.equal([
			{type: "p", content: "#5 bolt"}
		])
	})
	
	it('37. Ignores extra space', () => {
		expect(parseBlocks("#                  foo                     ")).to.deep.equal([
			{type: "h1", content: "foo"}
		])
	})
	
	it('38. Allows leading space', () => {
		expect(parseBlocks("   # foo")).to.deep.equal([
			{type: "h1", content: "foo"}
		])
	})
	
	it('39. Too much space', () => {
		expect(parseBlocks("    # foo")).to.deep.equal([
			{type: "code", lines: ["# foo"]}
		])
	})
	
	it('41. Closing', () => {
		expect(parseBlocks([
			"## foo ##",
			"  ###   bar    ###",
		].join("\n"))).to.deep.equal([
			{type: "h2", content: "foo"},
			{type: "h3", content: "bar"},
		])
	})
	
	it('42. Closing long', () => {
		expect(parseBlocks([
			"# foo ############",
			"##### bar  ##",
		].join("\n"))).to.deep.equal([
			{type: "h1", content: "foo"},
			{type: "h5", content: "bar"},
		])
	})
	
	it('43. Closing spaces', () => {
		expect(parseBlocks([
			"## foo ##      ",
		].join("\n"))).to.deep.equal([
			{type: "h2", content: "foo"},
		])
	})
	
	it('44. Closing character breaks', () => {
		expect(parseBlocks([
			"### foo ### b",
		].join("\n"))).to.deep.equal([
			{type: "h3", content: "foo ### b"},
		])
	})
	
	it('45. Closing hash requires space', () => {
		expect(parseBlocks([
			"# foo#",
		].join("\n"))).to.deep.equal([
			{type: "h1", content: "foo#"},
		])
	})

	it('46. Escaped closing', () => {
		expect(parseBlocks([
			"### foo \\###",
			"## foo #\\##",
			"# foo \\#",
		].join("\n"))).to.deep.equal([
			{type: "h3", content: "foo \\###"},
			{type: "h2", content: "foo #\\##"},
			{type: "h1", content: "foo \\#"},
		])
	})
	
	it('49. Can be empty', () => {
		expect(parseBlocks([
			"## ",
			"#",
			"### ###",
		].join("\n"))).to.deep.equal([
			{type: "h2", content: ""},
			{type: "h1", content: ""},
			{type: "h3", content: ""},
		])

	})

	it('Escape', () => {
		// one \, escaped for JS
		// Inlines aren't processed, so the escape remains
		expect(parseBlocks("\\## foo")).to.deep.equal([
			{type: "p", content: "\\## foo"}
		])
	})
})

const example = (name, lines, want) => {
	it(`Example ${name}`, () => {
		expect(parseBlocks(lines.join("\n"))).to.deep.equal(want);
	})
}
const xexample = (name) => {
	xit(`Example ${name}`, () => {})
}
	
context('4.3 Setext headings', () => {
	example("50", [
		"Heading 1",
		"=========",

		"Heading 2",
		"----------",
	], [{
		type: "h1",
		content: "Heading 1",
	}, {
		type: "h2",
		content: "Heading 2",
	}])

	example("51. Span multiple lines", [
		"Foo *bar",
		"baz*",
		"====",
	], [{
		type: "h1",
		content: "Foo *bar baz*",
		// Text is joined without the newline, and the ** is
		// not interpreted at all
	}])

	example("52. Trim space", [
		"  Foo *bar",
		"baz*\t",
		"====",
	], [{
		type: "h1",
		content: "Foo *bar baz*",
	}])

	example("53. Any length underline", [
		"Foo",
		"-------------------------",
		"",
		"Foo",
		"=",
	], [{
		type: "h2",
		content: "Foo",
	}, {
		type: "h1",
		content: "Foo",
	}])

	example("54. Indenting", [
		"   Foo",
		"---",
		"",
		"  Foo",
		"-----",
		"",
		"  Foo",
		"  ===",
	], [{
		type: "h2",
		content: "Foo",
	}, {
		type: "h2",
		content: "Foo",
	}, {
		type: "h1",
		content: "Foo",
	}])

	example("55. Too much indenting", [
		"    Foo",
		"    ---",
		"",
		"    Foo",
		"---",
	], [{
		type: "code",
		lines: ["Foo", "---", "", "Foo"],
	}, {
		type: "hr",
	}])

	example("56. Underline indent", [
		"Foo",
		"   ----      ",
	], [{
		type: "h2",
		content: "Foo",
	}])
	
	example("57. Too much underline indent", [
		"Foo",
		"    ---",
	], [{
		type: "p",
		content: "Foo ---",
	}])
		
	example("58. No spaces inside", [
		"Foo",
		"= =",
		"",
		"Foo",
		"--- -",
	], [{
		type: "p",
		content: "Foo = =",
	}, {
		type: "p",
		content: "Foo"
	}, {
		type: "hr",
	}])

	example("59. Spaces after", [
		"Foo  ",
		"-----",
	], [{
		type: "h2",
		content: "Foo",
	}])

	example("60. Escape after", [
		"Foo\\",
		"-----",
	], [{
		type: "h2",
		content: "Foo\\",
	}])
	
	example("61. Inlines processed after blocks", [
		'`Foo',
		'----',
		'`',
		'',
		'<a title="a lot',
		'---',
		'of dashes"/>',
	], [{
		type: "h2",
		content: "`Foo",
	}, {
		type: "p",
		content: "`",
	},
	// inlines not processed at all, so " and <> are verbatem
	{
		type: "h2",
		content: '<a title="a lot',
	}, {
		type: "p",
		content: 'of dashes"/>',
	}])

	xexample("62. Lazy continuation", [
		"> Foo",
		"---",
	], [{
		type: "blockquote",
		content: [{
			type: "p",
			content: "Foo",
		}],
	}, {
		type: "hr",
	}])

	xexample("63. More Lazy continuation", [
		"> foo",
		"bar",
		"===",
	], [{
		type: "blockquote",
		content: [{
			type: "p",
			content: "foo bar ===",
		}]
	}])

	xexample("64. Even more lazy continuation", [
		"- Foo",
		"---",
	], [{
		type: "list",
		ordered: false,
		items: [{
			content: "Foo"	
		}]
	}, {
		type: "hr",
	}])

	example("65. newline before", [
		"Foo",
		"Bar",
		"---",
	], [{
		type: "h2",
		content: "Foo Bar",
	}])

	example("66. But only after paragraphs", [
		"---",
		"Foo",
		"---",
		"Bar",
		"---",
		"Baz",
	], [
		{ type: "hr" },
		{ type: "h2", content: "Foo" },
		{ type: "h2", content: "Bar" },
		{ type: "p", content: "Baz" },
	])

	example("67. Cannot be empty", [
		"",
		"====",
	], [{
		type: "p", content: "====",
	}])

	example("68. Must be a paragraph-like thing", [
		"---",
		"---",
	], [
		{ type: "hr" },
		{ type: "hr" },
	])

	example("69. Lists don't become headings", [
		"- foo",
		"-----",
	], [{
		type: "list",
		ordered: false,
		items: [{ text: "foo" }],
	}, {
		type: "hr",
	}])

	example("70. Code doesn't become a heading", [
		"    foo",
		"---",
	], [{
		type: "code",
		lines: ["foo"],
	}, {
		type: "hr",
	}])

	xexample("71. Blockquote doesn't become a heading", [
		"> foo",
		"-----",
	], [{
		type: "blockquote",
		content: [{
			type: "p",
			content: "foo",
		}],
	}, {
		type: "hr",
	}])

	example("72. Escaped blockquote", [
		"\> foo",
		"------",
	], [{
		type: "h2",
		content: "> foo",
	}])

	example("73. Empty line A", [
		"Foo",
		"",
		"bar",
		"---",
		"baz",
	], [
		{ type: "p", content: "Foo" },
		{ type: "h2", content: "bar" },
		{ type: "p", content: "baz" },
	])

	example("74. Empty line B", [
		"Foo",
		"bar",
		"",
		"---",
		"",
		"baz",
	], [
		{ type: "p", content: "Foo bar" },
		{ type: "hr" },
		{ type: "p", content: "baz" },
	])
	
	example("75. Empty line C", [
		"Foo",
		"bar",
		"***",
		"baz",
	], [
		{ type: "p", content: "Foo bar" },
		{ type: "hr" },
		{ type: "p", content: "baz" },
	])
	
	example("76. Empty line D", [
		"Foo",
		"bar",
		"\\---",
		"baz",
	], [
		{ type: "p", content: "Foo bar \\--- baz" },
	])
})

context("4.4 Indented Code Blocks", () => {

	it("Should interpret a single line of code", () => {
		expect(parseBlocks("    content")).to.deep.equal([{
			type: "code",
			lines: ["content"],
		}])
	})

	example("77. Simple indented code block", [
		"    a simple",
		"      indented code block",
	], [{
		type: "code",
		lines: [
			"a simple",
			"  indented code block",
		],
	}])

	xexample("78. Lists win", [
		"  - foo",
		"",
		"    bar",
	], [{
		type: "list",
		ordered: false,
		items: [{
			text: "Foo bar",
		}],
	}])

	example("80. No parsing", [
		"    <a/>",
		"    *hi*",
		"",
		"    - one",
	], [{
		type: "code",
		lines: ["<a/>", "*hi*", "", "- one"],
	}])

	example("81. Continue blank lines", [
		"    chunk1",
		"",
		"    chunk2",
		"  ",
		" ",
		" ",
		"    chunk3",
	], [{
		type: "code",
		lines: [
			"chunk1",
			"",
			"chunk2",
			"",
			"",
			"",
			"chunk3",
		],
	}])

	example("82. Continue indenting", [
		"    chunk1",
		"      ",
		"      chunk2",
	], [{
		type: "code",
		lines: [
			"chunk1",
			"  ",
			"  chunk2",
		],
	}])

	example("83. Cannot interrupt a paragraph", [
		"Foo",
		"    bar",
	], [{type: "p", content: "Foo bar"}])
	
	example("84. Can be innterrupted by a paragraph", [
		"    foo",
		"bar",
	], [
		{ type: "code", lines: ["foo"] },
		{ type: "p", content: "bar" },
	])

	example("85. Next to other types", [
		"# Heading",
		"    foo",
		"Heading",
		"------",
		"    foo",
		"----",
	], [
		{ type: "h1", content: "Heading" },
		{ type: "code", lines: ["foo"] },
		{ type: "h2", content: "Heading" },
		{ type: "code", lines: ["foo"] },
		{ type: "hr" },
	])

	example("86. Beginning with more indent", [
		"        foo",
		"    bar",
	], [{
		type: "code",
		lines: ["    foo", "bar"],
	}])

	example("87. Drop leading and trailing empty lines", [
		"",
		"    ",
		"    foo",
		"    ",
	], [{
		type: "code",
		lines: ["foo"],
	}])

	example("88. Don't drop trailing spaces", [
		"    foo  "
	], [{
		type: "code",
		lines: ["foo  "],
	}])
})

it('Should find list types', () => {
	expect(parseBlocks([
		"- Item 1",
		"- Item 2",
		"- Item 3",
	].join("\n")))
	.to.deep.equal([{
		type: "list",
		ordered: false,
		items: [{
			text: "Item 1",
		}, {
			text: "Item 2",
		}, {
			text: "Item 3",
		}],
	}])
	
	expect(parseBlocks([
		"1. Item 1",
		"7. Item 2",
	].join("\n")))
	.to.deep.equal([{
		type: "list",
		ordered: true,
		items: [{
			text: "Item 1",
		}, {
			text: "Item 2",
		}],
	}])
})

it('Should find nested lists', () => {
	let got = parseBlocks([
		"- Item 0",
		"- Item 1",
		"  - Sub 1",
		"  - Sub 2",
		"    1. SS1",
		"    1. SS2",
		"- Item 2",
	].join("\n"))
	expect(got)
	.to.deep.equal([{
		type: "list",
		ordered: false,
		items: [{
			text: "Item 0",
		}, {
			text: "Item 1",
			ordered: false,
			items: [{
				text: "Sub 1",
			}, {
				text: "Sub 2",
				ordered: true,
				items: [{
					text: "SS1",
				}, {
					text: "SS2",
				}]
			}]
		}, {
			text: "Item 2",
		}]
	}]);
})

// Various representations of the same table
function checkTable(got) {
	expect(got).to.have.length(1);
	let t = got[0];
	expect(t.type).to.equal("table");
	expect(t)
	.to.deep.equal({
		type: "table",
		header: ["Field A", "Field B", "Field C"],
		rows: [["A1", "B1", "C1"], ["A2", "B2", "C2"]],
	})
}

it('Table no outside', () => {
	checkTable(parseBlocks([
		'Field A | Field B | Field C',
		'--------|---------|--------',
		'A1      | B1      | C1     ',
		'A2      | B2      | C2     ',
	].join("\n")))
})

it('Table with outside pipes', () => {
	checkTable(parseBlocks([
		'| Field A | Field B | Field C|',
		'|---------|---------|--------|',
		'| A1      | B1      | C1     |',
		'| A2      | B2      | C2     |',
	].join("\n")))
})

// 2.2 Tabs

// 2.3 Insecure characters 
// For security reasons, the Unicode character U+0000 must be replaced with the REPLACEMENT CHARACTER (U+FFFD).


context('3. Blocks and inlines', () => {

})

