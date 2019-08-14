const expect = require('chai').expect;
const parseBlocks = require('../lib/blocks');

context('Basics', () => {
  it('Basic paragraph', () => {
    expect(parseBlocks(
      'hello, world',
    )).to.deep.equal([{
      type: 'p',
      content: 'hello, world',
    }]);
  });
  it('Should continue a paragraph', () => {
    expect(parseBlocks([
      '# Heading 1',
      'content line 1',
      'content line 2',
    ].join('\n')))
      .to.deep.equal([{
        type: 'heading',
        level: 1,
        content: 'Heading 1',
      }, {
        type: 'p',
        content: 'content line 1 content line 2',
      }]);
  });
});

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
      '***',
      '---',
      '___',
    ].join('\n')))
      .to.deep.equal([{
        type: 'hr',
      }, {
        type: 'hr',
      }, {
        type: 'hr',
      }]);
  });

  it('Example 27', () => {
    expect(parseBlocks([
      '- foo',
      '---',
      '- bar',
    ].join('\n')))
      .to.deep.equal([{
        type: 'list',
        ordered: false,
        items: [[{ type: 'p', content: 'foo' }]],
      }, {
        type: 'hr',
      }, {
        type: 'list',
        ordered: false,
        items: [[{ type: 'p', content: 'bar' }]],
      }]);
  });

  it('Example 28', () => {
    expect(parseBlocks([
      'Foo',
      '***',
      'bar',
    ].join('\n')))
      .to.deep.equal([{
        type: 'p',
        content: 'Foo',
      }, {
        type: 'hr',
      }, {
        type: 'p',
        content: 'bar',
      }]);
  });

  it('Example 29 - H2 wins', () => {
    expect(parseBlocks([
      'Foo',
      '---',
      'bar',
    ].join('\n')))
      .to.deep.equal([{
        type: 'heading',
        level: 2,
        content: 'Foo',
      }, {
        type: 'p',
        content: 'bar',
      }]);
  });

  it('Example 30 - Precedence over lists', () => {
    expect(parseBlocks([
      '* Foo',
      '* * *',
      '* Bar',
    ].join('\n')))
      .to.deep.equal([{
        type: 'list',
        ordered: false,
        items: [[{ type: 'p', content: 'Foo' }]],
      }, {
        type: 'hr',
      }, {
        type: 'list',
        ordered: false,
        items: [[{ type: 'p', content: 'Bar' }]],
      }]);
  });


  xit('Example 31 - List specific', () => {
    // Note the thematic break is not interpreted inside the list item, unlike the example.
    expect(parseBlocks([
      '- Foo',
      '- * * *',
    ].join('\n')))
      .to.deep.equal([{
        type: 'list',
        ordered: false,
        items: [[{ type: 'p', content: 'Foo' }], [{ type: 'hr' }]],
      }]);
  });

  ([
    '---',
    '***',
    // EG 17
    ' ---',
    '  ---',
    '   ---',
    '----------------', // 20
    ' - - -', // 21
    ' **  * ** * ** * **', // 22
    '-     -      -      -', // 23
    '- - - -    ', // 24
  ]).forEach(tc => {
    it(`Should be a hr for ${tc}`, () => {
      expect(parseBlocks(tc)).to.deep.equal([{ type: 'hr' }]);
    });
  });

  ([
    'text',
    '+++', // 14
    '===', // 15
    '--', // 16
    '    ---', // 18
    ' *-*', // 26
    '_ _ _ _ a', // 25
    'a------', // 25
    '---a---', // 25
  ]).forEach(tc => {
    it(`Should not be a hr for ${tc}`, () => {
      const got = parseBlocks(tc);
      expect(got[0].type).not.to.equal('hr');
    });
  });
});

context('4.2 ATX Headings', () => {
  it('Should parseBlocks basic heading', () => {
    expect(parseBlocks([
      '# Heading 1',
      'Content',
    ].join('\n')))
      .to.deep.equal([{
        type: 'heading',
        level: 1,
        content: 'Heading 1',
      }, {
        type: 'p',
        content: 'Content',
      }]);
  });

  it('Should differentiate heading levels', () => {
    expect(parseBlocks([
      '# Heading 1',
      '## Heading 2',
      '###### Heading 6',
      '####### Paragraph',
    ].join('\n')))
      .to.deep.equal([{
        type: 'heading',
        level: 1,
        content: 'Heading 1',
      }, {
        type: 'heading',
        level: 2,
        content: 'Heading 2',
      }, {
        type: 'heading',
        level: 6,
        content: 'Heading 6',
      }, {
        type: 'p',
        content: '####### Paragraph',
      }]);
  });

  it('Requires a space', () => {
    expect(parseBlocks('#5 bolt')).to.deep.equal([
      { type: 'p', content: '#5 bolt' },
    ]);
  });

  it('37. Ignores extra space', () => {
    expect(parseBlocks('#                  foo                     ')).to.deep.equal([
      {
        type: 'heading',
        content: 'foo',
        level: 1,
      },
    ]);
  });

  it('38. Allows leading space', () => {
    expect(parseBlocks('   # foo')).to.deep.equal([
      { type: 'heading', level: 1, content: 'foo' },
    ]);
  });

  it('39. Too much space', () => {
    expect(parseBlocks('    # foo')).to.deep.equal([
      { type: 'code', lines: ['# foo'] },
    ]);
  });

  it('41. Closing', () => {
    expect(parseBlocks([
      '## foo ##',
      '  ###   bar    ###',
    ].join('\n'))).to.deep.equal([
      { type: 'heading', level: 2, content: 'foo' },
      { type: 'heading', level: 3, content: 'bar' },
    ]);
  });

  it('42. Closing long', () => {
    expect(parseBlocks([
      '# foo ############',
      '##### bar  ##',
    ].join('\n'))).to.deep.equal([
      { type: 'heading', level: 1, content: 'foo' },
      { type: 'heading', level: 5, content: 'bar' },
    ]);
  });

  it('43. Closing spaces', () => {
    expect(parseBlocks([
      '## foo ##      ',
    ].join('\n'))).to.deep.equal([
      { type: 'heading', level: 2, content: 'foo' },
    ]);
  });

  it('44. Closing character breaks', () => {
    expect(parseBlocks([
      '### foo ### b',
    ].join('\n'))).to.deep.equal([
      { type: 'heading', level: 3, content: 'foo ### b' },
    ]);
  });

  it('45. Closing hash requires space', () => {
    expect(parseBlocks([
      '# foo#',
    ].join('\n'))).to.deep.equal([
      { type: 'heading', level: 1, content: 'foo#' },
    ]);
  });

  it('46. Escaped closing', () => {
    expect(parseBlocks([
      '### foo \\###',
      '## foo #\\##',
      '# foo \\#',
    ].join('\n'))).to.deep.equal([
      { type: 'heading', level: 3, content: 'foo \\###' },
      { type: 'heading', level: 2, content: 'foo #\\##' },
      { type: 'heading', level: 1, content: 'foo \\#' },
    ]);
  });

  it('49. Can be empty', () => {
    expect(parseBlocks([
      '## ',
      '#',
      '### ###',
    ].join('\n'))).to.deep.equal([
      { type: 'heading', level: 2, content: '' },
      { type: 'heading', level: 1, content: '' },
      { type: 'heading', level: 3, content: '' },
    ]);
  });

  it('Escape', () => {
    // one \, escaped for JS
    // Inlines aren't processed, so the escape remains
    expect(parseBlocks('\\## foo')).to.deep.equal([
      { type: 'p', content: '\\## foo' },
    ]);
  });
});

const example = (name, lines, want) => {
  it(`Example ${name}`, () => {
    expect(parseBlocks(lines.join('\n'))).to.deep.equal(want);
  });
};
const xexample = name => {
  xit(`Example ${name}`, () => {});
};

context('4.3 Setext headings', () => {
  example('50', [
    'Heading 1',
    '=========',

    'Heading 2',
    '----------',
  ], [{
    type: 'heading',
    level: 1,
    content: 'Heading 1',
  }, {
    type: 'heading',
    level: 2,
    content: 'Heading 2',
  }]);

  example('51. Span multiple lines', [
    'Foo *bar',
    'baz*',
    '====',
  ], [{
    type: 'heading',
    level: 1,
    content: 'Foo *bar baz*',
    // Text is joined without the newline, and the ** is
    // not interpreted at all
  }]);

  example('52. Trim space', [
    '  Foo *bar',
    'baz*\t',
    '====',
  ], [{
    type: 'heading',
    level: 1,
    content: 'Foo *bar baz*',
  }]);

  example('53. Any length underline', [
    'Foo',
    '-------------------------',
    '',
    'Foo',
    '=',
  ], [{
    type: 'heading',
    level: 2,
    content: 'Foo',
  }, {
    type: 'heading',
    level: 1,
    content: 'Foo',
  }]);

  example('54. Indenting', [
    '   Foo',
    '---',
    '',
    '  Foo',
    '-----',
    '',
    '  Foo',
    '  ===',
  ], [{
    type: 'heading',
    level: 2,
    content: 'Foo',
  }, {
    type: 'heading',
    level: 2,
    content: 'Foo',
  }, {
    type: 'heading',
    level: 1,
    content: 'Foo',
  }]);

  example('55. Too much indenting', [
    '    Foo',
    '    ---',
    '',
    '    Foo',
    '---',
  ], [{
    type: 'code',
    lines: ['Foo', '---', '', 'Foo'],
  }, {
    type: 'hr',
  }]);

  example('56. Underline indent', [
    'Foo',
    '   ----      ',
  ], [{
    type: 'heading',
    level: 2,
    content: 'Foo',
  }]);

  example('57. Too much underline indent', [
    'Foo',
    '    ---',
  ], [{
    type: 'p',
    content: 'Foo ---',
  }]);

  example('58. No spaces inside', [
    'Foo',
    '= =',
    '',
    'Foo',
    '--- -',
  ], [{
    type: 'p',
    content: 'Foo = =',
  }, {
    type: 'p',
    content: 'Foo',
  }, {
    type: 'hr',
  }]);

  example('59. Spaces after', [
    'Foo  ',
    '-----',
  ], [{
    type: 'heading',
    level: 2,
    content: 'Foo',
  }]);

  example('60. Escape after', [
    'Foo\\',
    '-----',
  ], [{
    type: 'heading',
    level: 2,
    content: 'Foo\\',
  }]);

  example('61. Inlines processed after blocks', [
    '`Foo',
    '----',
    '`',
    '',
    '<a title="a lot',
    '---',
    'of dashes"/>',
  ], [{
    type: 'heading',
    level: 2,
    content: '`Foo',
  }, {
    type: 'p',
    content: '`',
  },
  // inlines not processed at all, so " and <> are verbatem
  {
    type: 'heading',
    level: 2,
    content: '<a title="a lot',
  }, {
    type: 'p',
    content: 'of dashes"/>',
  }]);

  example('62. Lazy continuation', [
    '> Foo',
    '---',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'p',
      content: 'Foo',
    }],
  }, {
    type: 'hr',
  }]);

  // Other rules contradict, this parsing of 'paragraph continuation' is incorrect
  xexample('63. More Lazy continuation', [
    '> foo',
    'bar',
    '===',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'p',
      content: 'foo bar ===',
    }],
  }]);

  example('64. Even more lazy continuation', [
    '- Foo',
    '---',
  ], [{
    type: 'list',
    ordered: false,
    items: [[{
      type: 'p',
      content: 'Foo',
    }]],
  }, {
    type: 'hr',
  }]);

  example('65. newline before', [
    'Foo',
    'Bar',
    '---',
  ], [{
    type: 'heading',
    level: 2,
    content: 'Foo Bar',
  }]);

  example('66. But only after paragraphs', [
    '---',
    'Foo',
    '---',
    'Bar',
    '---',
    'Baz',
  ], [
    { type: 'hr' },
    { type: 'heading', level: 2, content: 'Foo' },
    { type: 'heading', level: 2, content: 'Bar' },
    { type: 'p', content: 'Baz' },
  ]);

  example('67. Cannot be empty', [
    '',
    '====',
  ], [{
    type: 'p', content: '====',
  }]);

  example('68. Must be a paragraph-like thing', [
    '---',
    '---',
  ], [
    { type: 'hr' },
    { type: 'hr' },
  ]);

  example("69. Lists don't become headings", [
    '- foo',
    '-----',
  ], [{
    type: 'list',
    ordered: false,
    items: [[{ type: 'p', content: 'foo' }]],
  }, {
    type: 'hr',
  }]);

  example("70. Code doesn't become a heading", [
    '    foo',
    '---',
  ], [{
    type: 'code',
    lines: ['foo'],
  }, {
    type: 'hr',
  }]);

  example("71. Blockquote doesn't become a heading", [
    '> foo',
    '-----',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'p',
      content: 'foo',
    }],
  }, {
    type: 'hr',
  }]);

  example('72. Escaped blockquote', [
    '\\> foo',
    '------',
  ], [{
    type: 'heading',
    level: 2,
    content: '\\> foo',
  }]);

  example('73. Empty line A', [
    'Foo',
    '',
    'bar',
    '---',
    'baz',
  ], [
    { type: 'p', content: 'Foo' },
    { type: 'heading', level: 2, content: 'bar' },
    { type: 'p', content: 'baz' },
  ]);

  example('74. Empty line B', [
    'Foo',
    'bar',
    '',
    '---',
    '',
    'baz',
  ], [
    { type: 'p', content: 'Foo bar' },
    { type: 'hr' },
    { type: 'p', content: 'baz' },
  ]);

  example('75. Empty line C', [
    'Foo',
    'bar',
    '***',
    'baz',
  ], [
    { type: 'p', content: 'Foo bar' },
    { type: 'hr' },
    { type: 'p', content: 'baz' },
  ]);

  example('76. Empty line D', [
    'Foo',
    'bar',
    '\\---',
    'baz',
  ], [
    { type: 'p', content: 'Foo bar \\--- baz' },
  ]);
});

context('4.4 Indented Code Blocks', () => {
  it('Should interpret a single line of code', () => {
    expect(parseBlocks('    content')).to.deep.equal([{
      type: 'code',
      lines: ['content'],
    }]);
  });

  example('77. Simple indented code block', [
    '    a simple',
    '      indented code block',
  ], [{
    type: 'code',
    lines: [
      'a simple',
      '  indented code block',
    ],
  }]);

  example('78. Lists win', [
    '  - foo',
    '',
    '    bar',
  ], [{
    type: 'list',
    ordered: false,
    items: [[{
      type: 'p',
      content: 'foo',
    }, {
      type: 'p',
      content: 'bar',
    }]],
  }]);

  example('80. No parsing', [
    '    <a/>',
    '    *hi*',
    '',
    '    - one',
  ], [{
    type: 'code',
    lines: ['<a/>', '*hi*', '', '- one'],
  }]);

  example('81. Continue blank lines', [
    '    chunk1',
    '',
    '    chunk2',
    '  ',
    ' ',
    ' ',
    '    chunk3',
  ], [{
    type: 'code',
    lines: [
      'chunk1',
      '',
      'chunk2',
      '',
      '',
      '',
      'chunk3',
    ],
  }]);

  example('82. Continue indenting', [
    '    chunk1',
    '      ',
    '      chunk2',
  ], [{
    type: 'code',
    lines: [
      'chunk1',
      '  ',
      '  chunk2',
    ],
  }]);

  example('83. Cannot interrupt a paragraph', [
    'Foo',
    '    bar',
  ], [{ type: 'p', content: 'Foo bar' }]);

  example('84. Can be innterrupted by a paragraph', [
    '    foo',
    'bar',
  ], [
    { type: 'code', lines: ['foo'] },
    { type: 'p', content: 'bar' },
  ]);

  example('85. Next to other types', [
    '# Heading',
    '    foo',
    'Heading',
    '------',
    '    foo',
    '----',
  ], [
    { type: 'heading', level: 1, content: 'Heading' },
    { type: 'code', lines: ['foo'] },
    { type: 'heading', level: 2, content: 'Heading' },
    { type: 'code', lines: ['foo'] },
    { type: 'hr' },
  ]);

  example('86. Beginning with more indent', [
    '        foo',
    '    bar',
  ], [{
    type: 'code',
    lines: ['    foo', 'bar'],
  }]);

  example('87. Drop leading and trailing empty lines', [
    '',
    '    ',
    '    foo',
    '    ',
  ], [{
    type: 'code',
    lines: ['foo'],
  }]);

  example("88. Don't drop trailing spaces", [
    '    foo  ',
  ], [{
    type: 'code',
    lines: ['foo  '],
  }]);
});

context('4.5 Fenced code blocks', () => {
  example('89. Basic backtick block', [
    '```',
    '<',
    ' >',
    '```',
  ], [{
    type: 'code',
    lines: ['<', ' >'],
  }]);
});

context('5.1 Block Quotes', () => {
  example('206. Basic block quote', [
    '> # Foo',
    '> bar',
    '> baz',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'heading',
      level: 1,
      content: 'Foo',
    }, {
      type: 'p',
      content: 'bar baz',
    }],
  }]);

  example('207. space after > is optional', [
    '># Foo',
    '>bar',
    '> baz',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'heading',
      level: 1,
      content: 'Foo',
    }, {
      type: 'p',
      content: 'bar baz',
    }],
  }]);

  example('208. Leading spaces are optional', [
    '   > # Foo',
    '   > bar',
    ' > baz',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'heading',
      level: 1,
      content: 'Foo',
    }, {
      type: 'p',
      content: 'bar baz',
    }],
  }]);

  example('209. 4 spaces is a code block', [
    '    > # Foo',
    '    > bar',
    '    > baz',
  ], [{
    type: 'code',
    lines: ['> # Foo', '> bar', '> baz'],
  }]);

  example('210. Lazy clause', [
    '> # Foo',
    '> bar',
    'baz',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'heading',
      level: 1,
      content: 'Foo',
    }, {
      type: 'p',
      content: 'bar baz',
    }],
  }]);

  example('211. Lazy clause in the middle', [
    '> bar',
    'baz',
    '> foo',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'p',
      content: 'bar baz foo',
    }],
  }]);

  example('212. No lazy for hr semantics', [
    '> foo',
    '---',
  ], [{
    type: 'blockquote',
    content: [{ type: 'p', content: 'foo' }],
  }, {
    type: 'hr',
  }]);

  example('213. No lazy for list semantics', [
    '> - foo',
    '- bar',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'list',
      ordered: false,
      items: [[{ type: 'p', content: 'foo' }]],
    }],
  }, {
    type: 'list',
    ordered: false,
    items: [[{ type: 'p', content: 'bar' }]],
  }]);

  example('214. No lazy for code', [
    '>     foo',
    '    bar',
  ], [{
    type: 'blockquote',
    content: [{ type: 'code', lines: ['foo'] }],
  }, {
    type: 'code',
    lines: ['bar'],
  }]);

  xexample('215. No lazy for fenced code');

  // This one seems like a back-worked spec from a bug in a reference
  // implementation.
  xexample("216. Looks like a list, but isn't, a list", [
    '> foo',
    '    - bar',
  ], [{
    type: 'blockquote',
    content: [{ type: 'p', content: 'foo - bar' }],
  }]);

  example('217. Empty', ['>'], [
    { type: 'blockquote', content: [] },
  ]);

  example('218. Multi Empty', ['>', '>  ', '> '], [
    { type: 'blockquote', content: [] },
  ]);

  example('219. Pad with empty lines', ['>', '> foo', '>  '], [
    {
      type: 'blockquote',
      content: [{ type: 'p', content: 'foo' }],
    },
  ]);

  example('220. Split blockquotes with empty lines', [
    '> foo',
    '',
    '> bar',
  ], [
    {
      type: 'blockquote',
      content: [{ type: 'p', content: 'foo' }],
    }, {
      type: 'blockquote',
      content: [{ type: 'p', content: 'bar' }],
    },
  ]);

  example('222. Continue blockquotes with empty >', [
    '> foo',
    '>',
    '> bar',
  ], [
    {
      type: 'blockquote',
      content: [
        { type: 'p', content: 'foo' },
        { type: 'p', content: 'bar' },
      ],
    },
  ]);

  example('223. Can interrupt paragraphs', [
    'foo',
    '> bar',
  ], [
    { type: 'p', content: 'foo' },
    {
      type: 'blockquote',
      content: [
        { type: 'p', content: 'bar' },
      ],
    },
  ]);

  example('224. No blank lines required', [
    '> aaa',
    '***',
    '> bbb',
  ], [
    {
      type: 'blockquote',
      content: [
        { type: 'p', content: 'aaa' },
      ],
    },
    { type: 'hr' },
    {
      type: 'blockquote',
      content: [
        { type: 'p', content: 'bbb' },
      ],
    },
  ]);
});


context('Lists', () => {
  it('Should find list types', () => {
    expect(parseBlocks([
      '- Item 1',
      '- Item 2',
      '- Item 3',
    ].join('\n')))
      .to.deep.equal([{
        type: 'list',
        ordered: false,
        items: [[{
          type: 'p',
          content: 'Item 1',
        }], [{
          type: 'p',
          content: 'Item 2',
        }], [{
          type: 'p',
          content: 'Item 3',
        }]],
      }]);

    expect(parseBlocks([
      '1. Item 1',
      '7. Item 2',
    ].join('\n')))
      .to.deep.equal([{
        type: 'list',
        ordered: true,
        items: [[{
          type: 'p',
          content: 'Item 1',
        }], [{
          type: 'p',
          content: 'Item 2',
        }]],
      }]);
  });

  it('Continued Lines', () => {
    const got = parseBlocks([
      '- Item 0',
      '- Line 1',
      '  Line 2',
      '- Item 2',
    ].join('\n'));

    expect(got)
      .to.deep.equal([{
        type: 'list',
        ordered: false,
        items: [
          [{ type: 'p', content: 'Item 0' }],
          [
            { type: 'p', content: 'Line 1 Line 2' },
          ],
          [{ type: 'p', content: 'Item 2' }],
        ],
      }]);
  });

  it('Nested List Lines', () => {
    const got = parseBlocks([
      '- Item 0',
      '- Item 1 Root',
      '  - Item 1 Sub',
      '- Item 2',
    ].join('\n'));

    expect(got)
      .to.deep.equal([{
        type: 'list',
        ordered: false,
        items: [
          [{ type: 'p', content: 'Item 0' }],
          [
            { type: 'p', content: 'Item 1 Root' },
            {
              type: 'list',
              ordered: false,
              items: [[
                { type: 'p', content: 'Item 1 Sub' },
              ]],
            },
          ],
          [{ type: 'p', content: 'Item 2' }],
        ],
      }]);
  });

  it('Should find nested lists 2', () => {
    const got = parseBlocks([
      '- Item 0',
      '- Item 1',
      '  - Sub 1',
      '    1. SS0',
      '  - Sub 2',
      '    1. SS1',
      '    1. SS2',
      '- Item 2',
    ].join('\n'));
    expect(got)
      .to.deep.equal([{
        type: 'list',
        ordered: false,
        items: [
          [
            {
              type: 'p',
              content: 'Item 0',
            },
          ], [
            {
              type: 'p',
              content: 'Item 1',
            }, {
              type: 'list',
              ordered: false,
              items: [
                [
                  {
                    type: 'p',
                    content: 'Sub 1',
                  }, {
                    type: 'list',
                    ordered: true,
                    items: [
                      [{ type: 'p', content: 'SS0' }],
                    ],
                  },
                ], [
                  {
                    type: 'p',
                    content: 'Sub 2',
                  }, {
                    type: 'list',
                    ordered: true,
                    items: [
                      [{ type: 'p', content: 'SS1' }],
                      [{ type: 'p', content: 'SS2' }],
                    ],
                  },
                ],
              ],
            },
          ], [
            { type: 'p', content: 'Item 2' },
          ],
        ],
      }]);
  });


  xexample('232. Complicated List content', [
    '1.  A paragraph',
    '    with two lines.',
    '',
    '        indented code',
    '',
    '    > A block quote.',
  ], [{
    type: 'list',
    ordered: true,
    items: [[
      { type: 'p', content: 'A paragraph with two lines.' },
      { type: 'code', lines: ['indented code'] },
      {
        type: 'blockquote',
        content: [
          { type: 'p', content: 'A block quote.' },
        ],
      },
    ]],
  }]);

  example('233. Not Enough Indent', [
    '- one',
    '',
    ' two',
  ], [{
    type: 'list',
    ordered: false,
    items: [[{ type: 'p', content: 'one' }]],
  }, {
    type: 'p',
    content: 'two',
  }]);

  example('234. Enough Indent', [
    '- one',
    '',
    '  two',
  ], [{
    type: 'list',
    ordered: false,
    items: [[
      { type: 'p', content: 'one' },
      { type: 'p', content: 'two' },
    ]],
  }]);


  xexample('235. Not enough, but heaps of whitespace', [
    ' -    one',
    '',
    '     two',
  ], [{
    type: 'list',
    ordered: false,
    items: [[
      { type: 'p', content: 'one' },
    ]],
  }, {
    type: 'code',
    lines: [' two'],
  }]);

  example('236. And just enough again', [
    ' -    one',
    '',
    '      two',
  ], [{
    type: 'list',
    ordered: false,
    items: [[
      { type: 'p', content: 'one' },
      { type: 'p', content: 'two' },
    ]],
  }]);

  example('237. Column disproof', [
    '   > > 1.  one',
    '>>',
    '>>     two',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'blockquote',
      content: [{
        type: 'list',
        ordered: true,
        items: [[
          { type: 'p', content: 'one' },
          { type: 'p', content: 'two' },
        ]],
      }],
    }],
  }]);

  example('238. Conversely...', [
    '>>- one',
    '>>',
    '  >  > two',
  ], [{
    type: 'blockquote',
    content: [{
      type: 'blockquote',
      content: [{
        type: 'list',
        ordered: false,
        items: [[
          { type: 'p', content: 'one' },
        ]],
      }, {
        type: 'p',
        content: 'two',
      }],
    }],
  }]);

  example("240. Blank lines don't break list items", [
    '- foo',
    '',
    '  bar',
  ], [{
    type: 'list',
    ordered: false,
    items: [[
      { type: 'p', content: 'foo' },
      { type: 'p', content: 'bar' },
    ]],
  }]);

  example('243. Numbering to 9 chars', [
    '123456789. ok',
  ], [{
    type: 'list',
    ordered: true,
    items: [[{ type: 'p', content: 'ok' }]],
  }]);

  example('244. Numbering beyond 9 chars', [
    '1234567890. not ok',
  ], [{
    type: 'p',
    content: '1234567890. not ok',
  }]);

  example('245. Numbering 0', [
    '0. ok',
  ], [{
    type: 'list',
    ordered: true,
    items: [[{ type: 'p', content: 'ok' }]],
  }]);

  example('245. Numbering leading 0s', [
    '003. ok',
  ], [{
    type: 'list',
    ordered: true,
    items: [[{ type: 'p', content: 'ok' }]],
  }]);

  example('244. Numbering negative', [
    '-1. not ok',
  ], [{
    type: 'p',
    content: '-1. not ok',
  }]);

  xexample('252. Indented Code', [
    '1.      indented code',
    '',
    '   paragraph',
    '',
    '       more code',
  ], [{
    type: 'list',
    ordered: true,
    items: [[{
      type: 'code',
      lines: [' indented code'],
    }, {
      type: 'p',
      content: 'paragraph',
    }, {
      type: 'code',
      lines: ['more code'],
    }]],
  }]);
});

context('Tables', () => {
  // Various representations of the same table
  function checkTable(got) {
    expect(got).to.have.length(1);
    const t = got[0];
    expect(t.type).to.equal('table');
    expect(t)
      .to.deep.equal({
        type: 'table',
        header: ['Field A', 'Field B', 'Field C'],
        rows: [['A1', 'B1', 'C1'], ['A2', 'B2', 'C2']],
      });
  }

  it('Table no outside', () => {
    checkTable(parseBlocks([
      'Field A | Field B | Field C',
      '--------|---------|--------',
      'A1      | B1      | C1     ',
      'A2      | B2      | C2     ',
    ].join('\n')));
  });

  it('Table with outside pipes', () => {
    checkTable(parseBlocks([
      '| Field A | Field B | Field C|',
      '|---------|---------|--------|',
      '| A1      | B1      | C1     |',
      '| A2      | B2      | C2     |',
    ].join('\n')));
  });
});
