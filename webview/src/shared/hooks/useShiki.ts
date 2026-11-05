import { useEffect, useState } from "react";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import css from "shiki/langs/css.mjs";
import html from "shiki/langs/html.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import markdown from "shiki/langs/markdown.mjs";
import typescript from "shiki/langs/typescript.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";

// Global singleton to avoid re-initializing. Only the languages we actually
// support are bundled — importing from `shiki` pulls in every grammar.
let highlighterInstance: HighlighterCore | null = null;
let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getHighlighter(): Promise<HighlighterCore> {
  if (highlighterInstance) {
    return Promise.resolve(highlighterInstance);
  }

  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [javascript, typescript, json, css, html, markdown],
      engine: createJavaScriptRegexEngine(),
    })
      .then((h) => {
        highlighterInstance = h;
        return h;
      })
      .catch((error) => {
        highlighterPromise = null;
        throw error;
      });
  }

  return highlighterPromise;
}

export function useShiki() {
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(
    highlighterInstance,
  );

  useEffect(() => {
    let disposed = false;
    getHighlighter()
      .then((h) => {
        if (!disposed) {
          setHighlighter(h);
        }
      })
      .catch(() => {
        // errors are logged in getHighlighter
      });

    return () => {
      disposed = true;
    };
  }, []);

  return highlighter;
}
