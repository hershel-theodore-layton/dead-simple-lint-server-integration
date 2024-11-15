# Dead Simple Lint Server Integration

_Display squiggles in your IDE by making calls to a lint server._

### Security Considerations

This extension sends POST requests with the source code you are editing to
the value of the `lintServer.uri` configuration setting. This should be a url
you control and a server you trust. The server owner may be able to reconstruct
your Software.

**If you enter evil.example.com, you are curling your Hack source code to evil.example.com!**

### Usage

Configure `"lintServer.uri": "http://localhost:port-number/a-path-of-your-choosing"` in your vscode settings.

Host a lint server (on that uri) that speaks the following protocol:

```HTTP
POST /a-path-of-your-choosing HTTP 1.1
Content-Type: text/plain
Host: ...
Content-Length: ...

some source code in plain text
```

The server should respond with json in the shape found in the `ts` constant in
[validateHackSource.ts](server/src/validateHackSource.ts)

This extension was written to integrate with [portable-hack-ast-linters](https://github.com/hershel-theodore-layton/portable-hack-ast-linters).

You can find a server for this extension in [portable-hack-ast-linters-server](https://github.com/hershel-theodore-layton/portable-hack-ast-linters-server/blob/master/src/main.hack).

### Software Quality

This is Hackathon quality (it is dead simple). If this Software does not fulfill
your requirements, consider replacing it. It is not very featureful and
takes shortcuts at every corner.

### Credits

This extension is based on [vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples).
This set of samples is licensed under the MIT license by the Microsoft Corporation.
It was a great starting point and allowed me to skip a whole lot of tedium.
