import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { COMPONENT_SOURCES, lintComponentSource } from "./lib.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const messages = (language, source) =>
  lintComponentSource(language, source).map(({ message }) => message);

test("swift: literal and system colors are reported", () => {
  for (const line of [
    "Color(red: 0.97, green: 0.82, blue: 0.16)",
    "Color(.sRGB, red: 1, green: 0, blue: 0, opacity: 1)",
    'Color("Brand")',
    "Color(hue: 0.1, saturation: 1, brightness: 1)",
    "let fill = Color.white",
    "shape.fill(Color.accentColor)",
    "text.foregroundStyle(.red)",
    "shape.fill(.primary)",
    "view.background(.white)",
    "UIColor.systemBlue",
    "let color = #colorLiteral(red: 1, green: 0, blue: 0, alpha: 1)",
  ]) {
    assert.equal(messages("swift", line).length, 1, line);
  }
});

test("swift: sizes written as numbers are reported", () => {
  for (const line of [
    "RoundedRectangle(cornerRadius: 8)",
    "shape.strokeBorder(color, lineWidth: 1.5)",
    "HStack(spacing: 8) {",
    "label.frame(minHeight: 44)",
    "label.frame(width: 44, height: 44)",
    "Font.system(size: 16, weight: .medium)",
    "label.padding(8)",
    "label.padding(.vertical, 10.5)",
    "label.padding(.horizontal, -4)",
    "label.offset(x: 4)",
    "label.lineSpacing(3)",
  ]) {
    assert.ok(messages("swift", line).length >= 1, line);
  }
});

test("swift: tokens, zero, and unrelated numbers are allowed", () => {
  for (const line of [
    "shape.fill(Color(fill))",
    "label.foregroundStyle(Color(colors.foreground))",
    "RoundedRectangle(cornerRadius: button.radius, style: .continuous)",
    "shape.strokeBorder(Color(border), lineWidth: button.borderWidth)",
    "HStack(spacing: tokens.button.gap) {",
    "label.padding(.horizontal, style.isIconOnly ? 0 : measurements.paddingInline)",
    "label.frame(minWidth: measurements.height, maxWidth: style.isFullWidth ? .infinity : nil)",
    "label.padding(.vertical, text.halfLeading)",
    "label.padding(0)",
    "let lineWidth = size / 8",
    "Circle().inset(by: lineWidth / 2)",
    "Circle().trim(from: 0, to: 0.25)",
    ".rotationEffect(.degrees(isTurning ? 360 : 0))",
    "withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {}",
    "title.fixedSize(horizontal: false, vertical: true)",
    "shape.stroke(style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))",
    "// a comment may say Color.red or padding(8)",
    "/* and so may this one: cornerRadius: 8 */ let radius = button.radius",
  ]) {
    assert.deepEqual(messages("swift", line), [], line);
  }
});

test("problems name the line they are on", () => {
  const source = ["struct Example {", "    // fine", "    let fill = Color.red", "}"].join("\n");
  assert.deepEqual(lintComponentSource("swift", source), [
    { line: 3, text: "let fill = Color.red", message: "names a system color; use a token color" },
  ]);
});

test("the committed components take their colors and sizes from tokens", () => {
  let checked = 0;
  const problems = [];
  for (const { language, dir, extension } of COMPONENT_SOURCES) {
    assert.ok(existsSync(join(repoRoot, dir)), `${dir} is missing`);
    const files = readdirSync(join(repoRoot, dir), { recursive: true }).filter((name) =>
      name.endsWith(extension),
    );
    for (const file of files) {
      checked += 1;
      const source = readFileSync(join(repoRoot, dir, file), "utf8");
      for (const { line, text, message } of lintComponentSource(language, source)) {
        problems.push(`${dir}/${file}:${line} ${message}: ${text}`);
      }
    }
  }
  assert.ok(checked > 0, "expected to find component sources");
  assert.deepEqual(problems, []);
});
