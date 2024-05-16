/* --------------------------------------------------------------------------------------------
 * Copyright (c) Hershel Theodore Layton. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

export type Settings = {
  uri: string;
};

export async function validateHackSource(
  document: TextDocument,
  settings: Settings
): Promise<Diagnostic[]> {
  try {
    if (typeof fetch !== "function") {
      throw new Error(
        "Your vscode is built with a node version that does not have fetch(...)."
      );
    }

    let res = await fetch(settings.uri, {
      method: "POST",
      body: document.getText(),
      headers: {
        "User-Agent": "Dead Simple Lint Server Integration",
      },
    }).catch((_) => {
      throw new Error(`Lint server at ${settings.uri} could not be reached.`);
    });

    if (res.status !== 200) {
      throw new Error(
        `Server returned non-OK status code: ${
          res.status
        }\n${await res.text()}.`
      );
    }

    const json = await res.json();

    if (!Array.isArray(json)) {
      throw new Error(
        `Server returned something other than an array of lints: ${await res.text()}.`
      );
    }

    for (const diag of json) {
      if (
        typeof diag !== "object" ||
        diag === null ||
        !("severity" in diag) ||
        !("range" in diag) ||
        !("message" in diag)
      ) {
        throw new Error(
          "The server returned an object that doesn't match the vscode Diagnostic type."
        );
      }

      for (const rel of diag.relatedInformation ?? []) {
        rel.location.uri = document.uri;
      }
    }

    return json;
  } catch (e) {
    const err = e as Error;
    return [
      {
        severity: DiagnosticSeverity.Warning,
        range: {
          start: document.positionAt(0),
          end: document.positionAt(3),
        },
        message: `${err.message} This file will not be linted.`,
        source: "JavaScript in the Extension",
      },
    ];
  }
}
