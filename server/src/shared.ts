/* --------------------------------------------------------------------------------------------
 * Copyright (c) Hershel Theodore Layton. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { Range } from "vscode-languageserver-textdocument";

export type Settings = {
  uri: string;
  fixableSource: string;
};

export function invariant(
  condition: boolean,
  message: () => string
): asserts condition {
  if (!condition) {
    throw new Error(message());
  }
}

function between(subject: number, low: number, high: number) {
  return subject <= high && subject >= low;
}

export function rangeSubsumes(a: Range, b: Range) {
  const aStart = (a.start.line << 16) + a.start.character;
  const bStart = (b.start.line << 16) + b.start.character;
  const aEnd = (a.end.line << 16) + a.end.character;
  const bEnd = (b.end.line << 16) + b.end.character;

  return between(bStart, aStart, aEnd) && between(bEnd, aStart, aEnd);
}

export function jsonify(
  template: TemplateStringsArray,
  ...objects: unknown[]
): string {
  return template
    .map((v, i) => v + (i in objects ? JSON.stringify(objects[i]) : ""))
    .join("");
}

export class Curl {
  constructor() {
    invariant(
      typeof fetch === "function",
      () => "Your vscode build does not have fetch(...)."
    );
  }

  async json<T>(
    uri: URL,
    typeAssert: (mixed: unknown) => T,
    { body = null }: { body?: string | null | undefined } = {}
  ) {
    const res = await fetch(uri, {
      method: body == null ? "GET" : "POST",
      body,
      headers: {
        "User-Agent": "Dead Simple Lint Server Integration",
      },
    }).catch((_) => {
      throw new Error(`Lint server at ${uri} could not be reached.`);
    });

    const text = await res.text();

    invariant(
      res.status === 200,
      () => `Server returned non-OK status code: ${res.status}\n${text}.`
    );

    return typeAssert(JSON.parse(text));
  }
}
