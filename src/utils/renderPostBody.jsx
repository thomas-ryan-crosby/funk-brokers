import { Link } from 'react-router-dom';

/**
 * Find where a property address ends in the text after ^.
 * Uses 5-digit zip code + optional trailing country as boundary.
 */
function findAddressEnd(textAfterCaret) {
  const zipMatch = textAfterCaret.match(/\d{5}/);
  if (!zipMatch) return null;
  let end = zipMatch.index + 5;
  const afterZip = textAfterCaret.slice(end);
  const countryMatch = afterZip.match(/^,?\s*(United States|USA|US)\b/i);
  if (countryMatch) end += countryMatch[0].length;
  return end;
}

/**
 * Parse post body and render inline hyperlinked @mentions, ^properties, #hashtags.
 * Works for all posts — does NOT require propertyTagRawText or userTagMap.
 */
export function renderPostBody(body, post) {
  if (!body) return null;

  const tokens = [];

  // 1) Find ^property tag
  const caretIdx = body.indexOf('^');
  if (caretIdx >= 0 && (post.propertyId || post.propertyAddress)) {
    const afterCaret = body.slice(caretIdx + 1);
    // Try exact stored raw text first
    let tagLen = null;
    if (post.propertyTagRawText && afterCaret.startsWith(post.propertyTagRawText)) {
      tagLen = post.propertyTagRawText.length;
    } else {
      // Fallback: detect address boundary via zip code
      tagLen = findAddressEnd(afterCaret);
    }
    if (tagLen) {
      tokens.push({ start: caretIdx, end: caretIdx + 1 + tagLen, type: 'property' });
    }
  }

  // 2) Find @mentions (single-word — regex is reliable)
  const mentionRe = /@([a-zA-Z0-9_]+)/g;
  let m;
  while ((m = mentionRe.exec(body)) !== null) {
    if (!tokens.some((t) => m.index >= t.start && m.index < t.end)) {
      tokens.push({ start: m.index, end: m.index + m[0].length, type: 'mention', handle: m[1] });
    }
  }

  // 3) Find #hashtags
  const hashRe = /#([a-zA-Z0-9_]+)/g;
  while ((m = hashRe.exec(body)) !== null) {
    if (!tokens.some((t) => m.index >= t.start && m.index < t.end)) {
      tokens.push({ start: m.index, end: m.index + m[0].length, type: 'hashtag', tag: m[1] });
    }
  }

  tokens.sort((a, b) => a.start - b.start);

  const elements = [];
  let pos = 0;
  tokens.forEach((tok, i) => {
    if (tok.start > pos) elements.push(<span key={`t${i}`}>{body.slice(pos, tok.start)}</span>);
    if (tok.type === 'property') {
      const label = post.propertyAddress || body.slice(tok.start + 1, tok.end);
      elements.push(
        post.propertyId
          ? <Link key={`p${i}`} to={`/property/${post.propertyId}`} className="post-inline-tag">{label}</Link>
          : <span key={`p${i}`} className="post-inline-tag">{label}</span>
      );
    } else if (tok.type === 'mention') {
      const uid = post.userTagMap?.[tok.handle];
      elements.push(
        uid
          ? <Link key={`m${i}`} to={`/user/${uid}`} className="post-inline-tag">@{tok.handle}</Link>
          : <span key={`m${i}`} className="post-inline-tag">@{tok.handle}</span>
      );
    } else if (tok.type === 'hashtag') {
      elements.push(<span key={`h${i}`} className="post-inline-hashtag">#{tok.tag}</span>);
    }
    pos = tok.end;
  });
  if (pos < body.length) elements.push(<span key="tail">{body.slice(pos)}</span>);

  return elements;
}
