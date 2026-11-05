import { describe, expect, it } from "vitest";
import { getHighlighter } from "./useShiki";

describe("getHighlighter", () => {
  it("loads exactly the supported languages and themes", async () => {
    const highlighter = await getHighlighter();
    const languages = highlighter.getLoadedLanguages();
    expect(languages).toEqual(
      expect.arrayContaining([
        "css",
        "html",
        "javascript",
        "json",
        "markdown",
        "typescript",
      ]),
    );
    // Large grammars we intentionally do not bundle.
    expect(languages).not.toContain("python");
    expect(languages).not.toContain("rust");
    expect(highlighter.getLoadedThemes().sort()).toEqual(
      ["github-dark", "github-light"].sort(),
    );
  });

  it("tokenizes JavaScript and CSS", async () => {
    const highlighter = await getHighlighter();
    const js = highlighter.codeToTokens("const answer = 42;", {
      lang: "javascript",
      theme: "github-dark",
    });
    expect(js.tokens[0].length).toBeGreaterThan(0);
    expect(js.tokens[0].map((t) => t.content).join("")).toBe(
      "const answer = 42;",
    );

    const css = highlighter.codeToTokens(".a { color: red; }", {
      lang: "css",
      theme: "github-light",
    });
    expect(css.tokens[0].map((t) => t.content).join("")).toBe(
      ".a { color: red; }",
    );
  });
});
