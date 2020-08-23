const blocks = require('./blocks');
const inline = require('./inline');

module.exports = {
  parseBlocks: blocks,
  parseAll: src => blocks(src).map(inline),
  parseInline: inline,
};
