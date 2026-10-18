"""Exact scoped exception to the frozen pre-color stylesheet, not a new baseline.

All old hashes stay intact. Only the enumerated owner-selected environment
substitutions can be inverted; typography, geometry, animation, product paints,
URLs, scripts, and every other byte still meet the original immutable digest.
"""
import hashlib
import json
import re

ORIGINAL = '5c256e180daca7710b0debcaeefe196143ec66db8330bb32ebf6166f9dd17a50'


def restore_approved_environment(root, data):
    contract = json.loads((root / 'website/cool-neutral-white.json').read_text())
    if contract['baseline_sha256'] != ORIGINAL:
        raise AssertionError('cold-neutral: immutable original baseline changed')
    if hashlib.sha256(data).hexdigest() != contract['selected_sha256']:
        raise AssertionError('cold-neutral: stylesheet is not the exact selected colors')
    text = data.decode('utf-8')
    marker = contract['marker']
    if text.count(marker) != 1:
        raise AssertionError('cold-neutral: missing or repeated material owner')
    prefix, finish = text.split(marker, 1)
    changes = contract['substitutions']
    if len(changes) != 14:
        raise AssertionError('cold-neutral: the approved substitution scope changed')
    first_before = ':root {\n  --harmony-paper:#ffffff;'
    first_after = ':root {\n  /* Owner-selected A cold-neutral white: environment only; product colors stay. */\n  --bg:#ffffff;\n  --harmony-paper:#ffffff;'
    if changes[0]['before'] != first_before or changes[0]['after'] != first_after:
        raise AssertionError('cold-neutral: only the approved page variable may be added')
    for change in changes[1:]:
        strip_colors = lambda value: re.sub(r'#[0-9a-fA-F]{3,8}\b', '#COLOR', value)
        if strip_colors(change['before']) != strip_colors(change['after']):
            raise AssertionError('cold-neutral: selector, geometry or non-color change')
    for change in reversed(changes):
        if change['occurrences'] != 1 or finish.count(change['after']) != 1:
            raise AssertionError('cold-neutral: scoped color substitution is ambiguous')
        finish = finish.replace(change['after'], change['before'], 1)
    restored = (prefix + marker + finish).encode('utf-8')
    if hashlib.sha256(restored).hexdigest() != ORIGINAL:
        raise AssertionError('cold-neutral: an unapproved non-color byte changed')
    return restored
