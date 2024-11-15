/* --------------------------------------------------------------------------------------------
 * Copyright (c) Hershel Theodore Layton. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Curl, Settings } from "./shared";
import { typ, TypeAssert } from "./typ";

export async function validateHackSource(
  document: TextDocument,
  settings: Settings
): Promise<ReturnType<typeof ts>> {
  const curl = new Curl();
  // using settings.uri for backwards compat
  const url = new URL(settings.lintFileUri ?? settings.uri);
  const json = await curl.json(url, ts, { body: document.getText() });

  for (const obj of json) {
    for (const info of obj.relatedInformation ?? []) {
      info.location.uri = document.uri;
    }
  }

  return json;
}

const range = typ.object({
  start: typ.object({ line: typ.number(), character: typ.number() }),
  end: typ.object({ line: typ.number(), character: typ.number() }),
});

const ts = typ.array(
  typ.object({
    range,
    severity: typ.anyOf([1, 2, 3, 4]),
    message: typ.string(),
    relatedInformation: typ.optional(
      typ.array(
        typ.object({
          location: typ.object({
            range,
            uri: typ.forTypescript(typ.string()),
          }),
          message: typ.string(),
        })
      )
    ),
    autofix: typ.optional(
      typ.array(typ.object({ range, replaceWith: typ.string() }))
    ),
    source: typ.optional(typ.string()),
  })
) satisfies TypeAssert<Diagnostic[]>;
