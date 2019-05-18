const expect = require('chai').expect;
const parse = require('../lib/parse');


context('4.2 ATX Headings', () => {
	it('Should parse basic heading', () => {
		expect(parse([
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
		expect(parse([
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
		expect(parse("#5 bolt")).to.deep.equal([
			{type: "p", content: "#5 bolt"}
		])
	})
	
	it('37. Ignores extra space', () => {
		expect(parse("#                  foo                     ")).to.deep.equal([
			{type: "h1", content: "foo"}
		])
	})
	
	it('38. Allows leading space', () => {
		expect(parse("   # foo")).to.deep.equal([
			{type: "h1", content: "foo"}
		])
	})
	
	it('39. Too much space', () => {
		expect(parse("    # foo")).to.deep.equal([
			{type: "p", content: "    # foo"}
		])
	})
	
	it('41. Closing', () => {
		expect(parse([
			"## foo ##",
			"  ###   bar    ###",
		].join("\n"))).to.deep.equal([
			{type: "h2", content: "foo"},
			{type: "h3", content: "bar"},
		])
	})
	
	it('42. Closing long', () => {
		expect(parse([
			"# foo ############",
			"##### bar  ##",
		].join("\n"))).to.deep.equal([
			{type: "h1", content: "foo"},
			{type: "h5", content: "bar"},
		])
	})
	
	it('43. Closing spaces', () => {
		expect(parse([
			"## foo ##      ",
		].join("\n"))).to.deep.equal([
			{type: "h2", content: "foo"},
		])
	})
	
	it('44. Closing character breaks', () => {
		expect(parse([
			"### foo ### b",
		].join("\n"))).to.deep.equal([
			{type: "h3", content: "foo ### b"},
		])
	})
	
	it('45. Closing hash requires space', () => {
		expect(parse([
			"# foo#",
		].join("\n"))).to.deep.equal([
			{type: "h1", content: "foo#"},
		])
	})

	it('46. Escaped closing', () => {
		expect(parse([
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
		expect(parse([
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
		expect(parse("\\## foo")).to.deep.equal([
			{type: "p", content: "\\## foo"}
		])
	})
})
	
it('Should accept alternate h1 and h2 marks', () => {
	expect(parse([
		"Heading 1",
		"=========",
		"Heading 2",
		"----------",
	].join("\n")))
	.to.deep.equal([{
		type: "h1",
		content: "Heading 1",
	}, {
		type: "h2",
		content: "Heading 2",
	}])
})


it('Should continue a paragraph', () => {
	expect(parse([
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

it('Should find list types', () => {
	expect(parse([
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
	
	expect(parse([
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
	let got = parse([
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
	checkTable(parse([
		'Field A | Field B | Field C',
		'--------|---------|--------',
		'A1      | B1      | C1     ',
		'A2      | B2      | C2     ',
	].join("\n")))
})

it('Table with outside pipes', () => {
	checkTable(parse([
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

context('4.1 Thematic breaks', () => {
	it('Example 13', () => {
		expect(parse([
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
		expect(parse([
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
		expect(parse([
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
		expect(parse([
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
		expect(parse([
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
		expect(parse([
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
			expect(parse(tc)).to.deep.equal([{type: "hr"}])	
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
			let got = parse(tc);
			expect(got[0].type).not.to.equal("hr")
		})
	})
})
