const _ = require('lodash');

const reParts = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|!?\[[^\]]+\]\([^)]+\))/g;
// `code`
// **bold**
// *italic*
// ![image](href)
// [link](href)
const reLink = /^\[([^\]]+)\]\(([^)]+)\)/;

const splitInline = raw => {
  const parts = raw.split(reParts);
  return parts.map((p, idx) => {
    if (_.startsWith(p, '`')) {
      return {
        type: 'inline-code',
        text: p.substr(1, p.length - 2),
      };
    }
    if (_.startsWith(p, '**')) {
      return {
        type: 'text',
        style: 'bold',
        text: p.substr(2, p.length - 4),
      };
    }
    if (_.startsWith(p, '*')) {
      return {
        type: 'text',
        style: 'italic',
        text: p.substr(1, p.length - 2),
      };
    }

    if (_.startsWith(p, '!')) {
      const [, text, href] = reLink.exec(p.substr(1));
      return {
        type: 'image',
        href,
        alt: text,
      };
    }
    if (_.startsWith(p, '[')) {
      const [, text, href] = reLink.exec(p);
      const external = (_.startsWith(href, 'http://') || _.startsWith(href, 'https://'));
      return {
        type: 'link',
        href,
        external,
        text,
      };
    }
    if (p === '') {
      return null;
    }
    return {
      type: 'text',
      text: p,
    };
  }).filter(c => c != null);
};

const mapBlock = src => {
  switch (src.type) {
    case 'p': {
      const content = splitInline(src.content);
      if (content.length === 1) {
        if (content[0].type === 'image') {
          return content[0];
        }
      }
      return {
        type: 'p',
        content,
      };
    }
    case 'code':
      return {
        type: 'code',
        content: src.lines.join('\n'),
      };
    case 'heading':
      return {
        type: 'heading',
        level: src.level,
        content: splitInline(src.content),
      };
    case 'list': {
      return {
        type: 'list',
        ordered: src.ordered || false,
        items: src.items.map(item => item.map(mapBlock)),
      };
    }
    case 'blockquote':
      return {
        type: 'blockquote',
        content: src.content.map(mapBlock),
      };

    default:
      throw new Error(`Unknown block ${JSON.stringify(src)}`);
  }
};

module.exports = mapBlock;
