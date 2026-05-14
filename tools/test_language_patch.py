#!/usr/bin/env python3
"""Diagnostic test for the language patch logic in src/mixins/mapstyle.js.

Ported to Python so we can run it without Node.js installed in the container.
The logic must stay in sync with patchLanguageExpression in src/mixins/mapstyle.js.

Run: python3 tools/test_language_patch.py
"""

import json


def _is_name_get(e):
    """True if e is ['get', '<name|name:*|name_int>']."""
    return (isinstance(e, list) and len(e) == 2 and e[0] == "get"
            and isinstance(e[1], str)
            and (e[1] == "name" or e[1] == "name_int" or e[1].startswith("name:")))


def patch_language_expression(expr, lang):
    if not isinstance(expr, list):
        return expr

    # ["get", "name" | "name:latin" | "name:nonlatin"]
    if len(expr) == 2 and expr[0] == "get":
        field = expr[1]
        if field in ("name", "name:latin", "name:nonlatin"):
            return ["coalesce", ["get", f"name:{lang}"], ["get", "name"]]
        return expr

    # ["concat", ...]: if it joins >=2 name references (e.g. latin + nonlatin)
    # with no structural non-name fields (code/ref/etc), collapse to a single
    # coalesce so we don't render the same name twice.
    if expr[0] == "concat":
        name_refs = 0
        other_non_strings = 0
        for arg in expr[1:]:
            if _is_name_get(arg):
                name_refs += 1
            elif isinstance(arg, list):
                other_non_strings += 1
            # plain strings are separators -- ignored
        if name_refs >= 2 and other_non_strings == 0:
            return ["coalesce", ["get", f"name:{lang}"], ["get", "name"]]

    # ["coalesce", ...]: if any arg references a name field (anywhere in
    # the arg list, not just first), replace the whole coalesce. This fixes
    # the name_int problem where name_int was preferred over the user's lang.
    if expr[0] == "coalesce":
        for arg in expr[1:]:
            if _is_name_get(arg):
                return ["coalesce", ["get", f"name:{lang}"], ["get", "name"]]

    # Recurse into nested expressions
    return [patch_language_expression(item, lang) if isinstance(item, list) else item
            for item in expr]


def patch_string_text_field(text_field, lang):
    if text_field in ("{name}", "name"):
        return ["coalesce", ["get", f"name:{lang}"], ["get", "name"]]
    return text_field


LANG = "ja"

CASES = [
    ("Simple {name} placeholder string", "{name}"),
    ("Plain get name", ["get", "name"]),
    ("get name:latin (used in swisstopo)", ["get", "name:latin"]),
    ("get name:nonlatin", ["get", "name:nonlatin"]),
    ("concat(name:latin, '\\n', name:nonlatin) -- common MapTiler pattern",
     ["concat", ["get", "name:latin"], "\n", ["get", "name:nonlatin"]]),
    ("coalesce(name:latin, name) -- common cloud-style pattern",
     ["coalesce", ["get", "name:latin"], ["get", "name"]]),
    ("coalesce(name_int, name) -- name_int (English international) variant",
     ["coalesce", ["get", "name_int"], ["get", "name"]]),
    ("case-expression with concat fallback (MapTiler Streets style)",
     ["case",
      ["all", ["has", "name:latin"], ["has", "name:nonlatin"]],
      ["concat", ["get", "name:latin"], "\n", ["get", "name:nonlatin"]],
      ["coalesce", ["get", "name_int"], ["get", "name"]]]),
    ("format expression with text-font",
     ["format",
      ["coalesce", ["get", "name:latin"], ["get", "name"]],
      {"font-scale": 1.0}]),
    ("SOTLAS-style concat with code/alt (filtered by layer.id startsWith 'summit' in real code)",
     ["concat", ["get", "name"], "\n", ["get", "code"], "\n",
      ["to-string", ["round", ["*", ["get", "alt"], 3.28084]]], " ft"]),
    ("housenumber (no name reference)", ["get", "housenumber"]),
    ("ref (highway shield)", ["get", "ref"]),
]


def main():
    print(f'=== Language patch diagnostic (lang = "{LANG}") ===\n')
    for name, inp in CASES:
        if isinstance(inp, str):
            out = patch_string_text_field(inp, LANG)
        else:
            out = patch_language_expression(inp, LANG)

        changed = json.dumps(out) != json.dumps(inp)
        flag = "[CHANGED]" if changed else "[unchanged]"

        print(f"-- {name}")
        print(f"   {flag}")
        print(f"   in : {json.dumps(inp, ensure_ascii=False)}")
        print(f"   out: {json.dumps(out, ensure_ascii=False)}")
        print()


if __name__ == "__main__":
    main()
