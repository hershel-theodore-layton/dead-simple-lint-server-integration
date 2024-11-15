/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Modifications made by Copyright (c) Hershel Theodore Layton.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  DocumentDiagnosticReportKind,
  TextDocumentEdit,
  TextEdit,
  CodeActionTriggerKind,
  CodeAction,
  CodeActionKind,
  DiagnosticSeverity,
  DocumentDiagnosticReport,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { validateHackSource } from "./validateHackSource";
import { invariant, jsonify, rangeSubsumes, Settings } from "./shared";

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    diagnosticProvider: {
      interFileDependencies: false,
      workspaceDiagnostics: false,
    },
    workspace: {
      workspaceFolders: {
        supported: true,
      },
    },
    codeActionProvider: true,
  },
}));

connection.onInitialized(() => {
  connection.client.register(
    DidChangeConfigurationNotification.type,
    undefined
  );
});

const documentSettings: Map<string, Thenable<Settings>> = new Map();

connection.onDidChangeConfiguration(() => {
  documentSettings.clear();
  connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<Settings> {
  const result =
    documentSettings.get(resource) ??
    connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "lintServer",
    });
  documentSettings.set(resource, result);
  return result;
}

documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

connection.languages.diagnostics.on(
  async (params): Promise<DocumentDiagnosticReport> => {
    const document = documents.get(params.textDocument.uri);

    if (document === undefined) {
      return {
        kind: DocumentDiagnosticReportKind.Full,
        items: [],
      };
    }

    const settings = await getDocumentSettings(document.uri);

    try {
      const lintErrors = await validateHackSource(document, settings);

      return {
        kind: DocumentDiagnosticReportKind.Full,
        items: lintErrors,
      };
    } catch (e) {
      invariant(e instanceof Error, () => jsonify`Expected Error, got ${e}`);
      return {
        kind: DocumentDiagnosticReportKind.Full,
        items: [
          {
            severity: DiagnosticSeverity.Warning,
            range: {
              start: document.positionAt(0),
              end: document.positionAt(3),
            },
            message: `${e.message} This file will not be linted.`,
            source: "JavaScript in the Extension",
          },
        ],
      };
    }
  }
);

connection.onCodeAction(async (params): Promise<CodeAction[]> => {
  const document = documents.get(params.textDocument.uri);

  if (document === undefined) {
    return [];
  }

  const settings = await getDocumentSettings(document.uri);

  try {
    const { triggerKind, diagnostics } = params.context;

    if (
      triggerKind === CodeActionTriggerKind.Automatic ||
      !diagnostics.some((d) => d.source === settings.fixableSource)
    ) {
      return [];
    }

    const lintErrors = await validateHackSource(document, settings);

    const fixable = lintErrors.find(
      (e) => e.autofix?.length && rangeSubsumes(e.range, params.range)
    );

    const fixes =
      fixable?.autofix?.map((x) => TextEdit.replace(x.range, x.replaceWith)) ??
      [];

    if (fixes.length === 0) {
      return [];
    }

    return [
      CodeAction.create(
        "Autofix lint error",
        {
          documentChanges: [
            TextDocumentEdit.create(
              { uri: document.uri, version: document.version },
              fixes
            ),
          ],
        },
        CodeActionKind.QuickFix
      ),
    ];
  } catch (e) {
    debugger;
    console.error(e);
    return [];
  }
});

documents.listen(connection);

connection.listen();
