"""Give every translatable string on the site a key.

Walks the HTML pages, finds the text a visitor actually reads, stamps a
`data-i18n` attribute on the element that holds it, and writes the English
dictionary out to js/lang/en.js.

Two things make this worth automating rather than hand-editing:

  * Keys are derived from the English text, so the same sentence anywhere on
    the site gets the same key. The footer appears on seven pages and is
    translated once.
  * The original files are patched by byte offset, not re-serialised. Nothing
    reformats, attribute order survives, and a run that changes nothing
    produces no diff.

Elements whose children are all text get `data-i18n` and are swapped by
textContent. Elements that mix text with markup (a <p> with a <b> inside) get
`data-i18n-html` instead, so the translator receives the inline tags and the
markup is not thrown away.

    python tools/i18n_extract.py            # patch pages, write en.js
    python tools/i18n_extract.py --dry-run  # report only, touch nothing
"""
import io, os, re, sys, json, hashlib
from html.parser import HTMLParser

PAGES = ['index.html', 'about.html', 'studio.html', 'services.html',
         'projects.html', 'contact.html', 'project.html']

# never translate inside these — script bodies, and SVG geometry that happens
# to contain text nodes
OPAQUE = {'script', 'style', 'svg', 'noscript'}
VOID = {'br', 'img', 'input', 'meta', 'source', 'link', 'hr', 'area', 'base',
        'col', 'embed', 'param', 'track', 'wbr'}
# attributes a visitor can read
ATTRS = ('placeholder', 'aria-label', 'title', 'alt')
# inline tags allowed to survive inside a data-i18n-html value. <a> counts,
# so a sentence with a link in the middle of it stays one sentence.
INLINE = {'b', 'i', 'em', 'strong', 'span', 'small', 'br', 'a', 'sup', 'sub', 'code'}

# ...but a link inside a nav list is a phrase of its own, not part of a
# sentence. These never become a translation unit, so the walk always steps
# past them to the real phrase inside.
CONTAINERS = {'div', 'section', 'main', 'nav', 'aside', 'header', 'footer',
              'ul', 'ol', 'dl', 'form', 'fieldset', 'figure', 'article',
              'table', 'tbody', 'thead', 'tr', 'body', 'html', 'head',
              'picture', 'video', 'select', 'details', 'menu'}

# A translation unit is written back with innerHTML, which destroys and
# rebuilds everything inside it. That must never swallow a form control, or
# switching language halfway through the contact form would wipe what the
# visitor had typed. A label holding an input is therefore never a unit — the
# walk steps past it and translates the caption, the options and the
# placeholder separately.
FORM_CTRL = {'input', 'textarea', 'select', 'option', 'button', 'optgroup'}


def translatable(text):
    """Real prose, not a number, a bullet or a stray symbol."""
    t = text.strip()
    if len(t) < 2:
        return False
    if not any(c.isalpha() for c in t):
        return False
    # drawing numbers, years, "01" and the like carry over untranslated
    if re.fullmatch(r'[\d\W]+', t):
        return False
    return True


def make_key(text):
    """A readable slug plus a hash, so identical text always lands on one key."""
    slug = re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')[:38].strip('_')
    if not slug:
        slug = 'str'
    digest = hashlib.sha1(text.encode('utf-8')).hexdigest()[:4]
    return '%s.%s' % (slug, digest)


class Node:
    __slots__ = ('tag', 'open_lt', 'open_gt', 'close_lt', 'kids', 'has_text', 'has_elem')

    def __init__(self, tag, open_lt, open_gt):
        self.tag = tag
        self.open_lt = open_lt      # offset of '<'
        self.open_gt = open_gt      # offset of the '>' closing the start tag
        self.close_lt = None        # offset of '<' of the end tag
        self.kids = []
        self.has_text = False
        self.has_elem = False


class Walker(HTMLParser):
    """Builds a tree that remembers where every tag sits in the source."""

    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        # line -> offset of that line's first character, for getpos()
        self.line_off = [0]
        for line in src.split('\n'):
            self.line_off.append(self.line_off[-1] + len(line) + 1)
        self.root = Node('#root', -1, -1)
        self.stack = [self.root]
        self.opaque_depth = 0
        self.found = []             # (node, kind, text)
        self.attr_hits = []         # (offset_of_value, value, name)

    def off(self):
        line, col = self.getpos()
        return self.line_off[line - 1] + col

    def _end_of_start_tag(self, start):
        """Scan for the '>' that closes this start tag, skipping quoted values."""
        i, quote = start + 1, None
        while i < len(self.src):
            ch = self.src[i]
            if quote:
                if ch == quote:
                    quote = None
            elif ch in '"\'':
                quote = ch
            elif ch == '>':
                return i
            i += 1
        return len(self.src) - 1

    def handle_starttag(self, tag, attrs):
        lt = self.off()
        gt = self._end_of_start_tag(lt)
        node = Node(tag, lt, gt)
        parent = self.stack[-1]
        parent.kids.append(node)
        if tag not in INLINE:
            parent.has_elem = True

        if not self.opaque_depth:
            raw = self.src[lt:gt + 1]
            for name in ATTRS:
                for m in re.finditer(r'\b%s\s*=\s*"([^"]*)"' % name, raw):
                    if translatable(m.group(1)):
                        self.attr_hits.append((lt + m.start(1), m.group(1), name))

        if tag in OPAQUE:
            self.opaque_depth += 1
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in OPAQUE and self.opaque_depth:
            self.opaque_depth -= 1
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack[i].close_lt = self.off()
                del self.stack[i:]
                return

    def handle_data(self, data):
        if self.opaque_depth:
            return
        if translatable(data):
            self.stack[-1].has_text = True

    def handle_entityref(self, name):
        self.stack[-1].has_text = True

    def handle_charref(self, name):
        self.stack[-1].has_text = True


def owns_text(node):
    """Text this element is responsible for — its own, plus any in inline kids.

    A headline wrapper holds no text directly; all of it sits in the coloured
    spans inside. It still owns the sentence.
    """
    if node.tag in OPAQUE:
        return False
    if node.has_text:
        return True
    return any(k.tag in INLINE and owns_text(k) for k in node.kids)


def collect(node, src, out):
    """Outermost-first: claim the largest element that holds one whole phrase.

    Going the other way — marking the innermost element — shreds a headline
    like "As you <em>dream</em>" into "As you" and "dream", which no language
    that reorders the verb can put back together. Claiming the outermost
    element keeps the sentence whole and hands over the inline markup with it.
    """
    if node.tag in OPAQUE:
        return

    blocked = any((k.tag not in INLINE and owns_text(k)) or k.tag in FORM_CTRL
                  for k in node.kids)
    claimable = (node.open_gt is not None and node.close_lt is not None
                 and node.tag not in CONTAINERS and owns_text(node) and not blocked)

    if claimable:
        inner = src[node.open_gt + 1:node.close_lt]
        if translatable(re.sub(r'<[^>]+>', '', inner)):
            # html mode only when inline children carry part of the phrase.
            # A button that is just a word next to an icon stays text mode, so
            # the SVG never lands in the dictionary — the runtime swaps the
            # text nodes and leaves the icon where it is.
            # Any inline child at all forces html mode, even one holding no
            # translatable text of its own. A phone number is not translatable,
            # but "call the studio on <a>+1 …</a>." still has to keep the link
            # between the words and the full stop after it — text mode would
            # move the full stop to the wrong side.
            inline_text = any(k.tag in INLINE for k in node.kids)
            if inline_text:
                # Icons become {{0}}, {{1}}… so no SVG path data reaches a
                # translator, and so a right-to-left language can move the
                # arrow to the other side of the words by moving the token.
                n = [0]

                def token(_m):
                    n[0] += 1
                    return '{{%d}}' % (n[0] - 1)

                value = re.sub(r'<svg\b.*?</svg>|<img\b[^>]*>', token,
                               inner.strip(), flags=re.S | re.I)
                out.append((node, 'html', re.sub(r'\s+', ' ', value).strip()))
            else:
                # Only this element's OWN text. Sweeping up a child's text too
                # would double it at runtime: the swap rewrites the text nodes
                # but leaves the child alone, so "About the project <i>*</i>"
                # would come back as "About the project * *".
                own = inner
                for kid in sorted(node.kids, key=lambda k: -k.open_lt):
                    if kid.close_lt is not None:
                        end = src.find('>', kid.close_lt) + 1
                    else:
                        end = kid.open_gt + 1
                    a = kid.open_lt - (node.open_gt + 1)
                    b = end - (node.open_gt + 1)
                    if 0 <= a < b <= len(own):
                        own = own[:a] + ' ' + own[b:]
                own = re.sub(r'<[^>]+>', ' ', own)
                out.append((node, 'text', re.sub(r'\s+', ' ', own).strip()))
            return                      # claimed — its children are inside it

    for kid in node.kids:
        collect(kid, src, out)


STAMP = re.compile(r' data-i18n(?:-html|-attr-[a-z-]+)?="[^"]*"')


def process(path, dictionary, dry):
    src = io.open(path, encoding='utf-8').read()
    # Every run starts from clean markup. Skipping elements that already carry
    # a stamp would mean a change to the grouping rules could never take
    # effect, and a second run would quietly emit a dictionary holding only
    # whatever happened to be new.
    src = STAMP.sub('', src)
    w = Walker(src)
    w.feed(src)
    w.close()

    hits = []
    collect(w.root, src, hits)

    patches = []                       # (offset, text_to_insert)
    for node, kind, value in hits:
        if re.search(r'\bdata-i18n(-html)?\s*=', src[node.open_lt:node.open_gt + 1]):
            continue
        key = make_key(value)
        dictionary[key] = value
        attr = ' data-i18n-html="%s"' % key if kind == 'html' else ' data-i18n="%s"' % key
        # sits just before the '>' — or before '/>' on a self-closed tag
        at = node.open_gt
        if src[at - 1] == '/':
            at -= 1
        patches.append((at, attr))

    for offset, value, name in w.attr_hits:
        key = make_key(value)
        dictionary[key] = value
        tag_start = src.rfind('<', 0, offset)
        if re.search(r'\bdata-i18n-attr\s*=', src[tag_start:offset]):
            continue
        end = src.index('>', offset)
        at = end - 1 if src[end - 1] == '/' else end
        patches.append((at, ' data-i18n-attr-%s="%s"' % (name, key)))

    if dry:
        return len(patches)

    # apply back to front so earlier offsets stay valid
    for offset, text in sorted(patches, key=lambda p: -p[0]):
        src = src[:offset] + text + src[offset:]
    io.open(path, 'w', encoding='utf-8', newline='').write(src)
    return len(patches)


def main():
    dry = '--dry-run' in sys.argv
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)

    dictionary = {}
    total = 0
    for page in PAGES:
        if not os.path.exists(page):
            print('  %-15s missing, skipped' % page)
            continue
        n = process(page, dictionary, dry)
        total += n
        print('  %-15s %3d keys stamped' % (page, n))

    # The project copy is rendered from JS after the page is parsed, so it
    # never carries an attribute. Fold it in under the same scheme.
    try:
        import subprocess
        raw = subprocess.run(['node', 'tools/i18n-data.mjs'],
                             capture_output=True, check=True).stdout.decode('utf-8')
        data_strings = json.loads(raw)
        added = 0
        for text in data_strings:
            key = make_key(text)
            if key not in dictionary:
                dictionary[key] = text
                added += 1
        print('  %-15s %3d keys from the JS sources' % ('projects-data.js', added))
    except Exception as exc:                       # node missing, or data moved
        print('  js sources       skipped (%s)' % exc)

    print('-' * 46)
    print('  %d stamps, %d unique strings' % (total, len(dictionary)))

    if dry:
        print('\ndry run — nothing written')
        return

    os.makedirs('js/lang', exist_ok=True)
    body = json.dumps(dict(sorted(dictionary.items())), ensure_ascii=False, indent=2)
    io.open('js/lang/en.js', 'w', encoding='utf-8', newline='').write(
        '/* English — the source copy, generated by tools/i18n_extract.py.\n'
        '   Edit the HTML and re-run the tool rather than editing this file. */\n'
        'window.DE_I18N = window.DE_I18N || {};\n'
        'window.DE_I18N.en = %s;\n' % body)
    print('  js/lang/en.js written')


if __name__ == '__main__':
    main()
