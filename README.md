# mac-ca

Get MacOS System certificates into [Node.js][].

## Rationale

> Node uses a
> [statically compiled, manually updated, hardcoded list][node.pem]
> of certificate authorities,
> rather than relying on the system's trust store...
> [Read more][node/4175]

This is most of the time ok, but there are cases where you might for example want to use TLS in development with self signed certificates for which you have a root certificate in your local store. Eg: [mkcert](https://github.com/FiloSottile/mkcert)

This package is intended to fetch Root CAs from MacOS "SystemRootCertificates.keychain" and the user's keychain into [Node.js].

### Advantages

- No internet access is required at all
- MacOS store is updated automatically (in most modern environments)
- Manually installed Root certificates are used
- Enterpise trusted certificates (GPO etc.) are made available too

## Usage

Install with

```
npm install --save mac-ca
```

And then use it as follows:

```
require('mac-ca').addToGlobalAgent();
//or
require('mac-ca/register');
```

You can also do:

```
node --require mac-ca/register app.js
```

If called in other operative systems the method will just do nothing.

## API

After `require('mac-ca').addToGlobalAgent()` MacOs' Root CAs are found, deduplicated and installed to `https.globalAgent.options.ca` so they are automatically used for all requests with Node.js' https module and any higher-level library like axios, node-fetch or request.

For use in other places, these certificates are also available via `.get()` method.

```js
let ca = require("mac-ca");
let forge = require("node-forge");

for (let pem of ca.get()) console.log(pem);
```

You can also specify the format as follows:

```js
ca.get({ format: ca.Format.der });
```

Available values for `format` are:

| Constant  | Value | Meaning                                       |
| --------- | ----: | --------------------------------------------- |
| der2.der  |     0 | DER-format (binary, Node's [Buffer][])        |
| der2.pem  |     1 | PEM-format (text, Base64-encoded)             |
| der2.txt  |     2 | PEM-format plus some info as text             |
| der2.asn1 |     3 | ASN.1-parsed certificate                      |
| \*        |    \* | Certificate in `node-forge` format (RSA only) |

Other options for `get`:

- `keychain` (defaults to `all`): it could be `all`, `current` or `SystemRootCertificates`.
- `unique` (defaults to `true`): exclude duplicated certificates found.
- `excludeBundled` (defaults to `true`): exclude certificates found in node.js's `tls.rootCertificates`.

## Credits

Uses [node-forge][] and is heavily inspired by **Stas Ukolov**'s [win-ca][].

See also [OpenSSL::Win::Root][].

[win-ca]: https://github.com/ukoloff/win-ca
[mkcert]: https://github.com/FiloSottile/mkcert
[node-forge]: https://github.com/digitalbazaar/forge
[OpenSSL::Win::Root]: https://github.com/ukoloff/openssl-win-root
[Node.js]: http://nodejs.org/
[Buffer]: https://nodejs.org/api/buffer.html
[node.pem]: https://github.com/nodejs/node/blob/master/src/node_root_certs.h
[node/4175]: https://github.com/nodejs/node/issues/4175
[OpenSSL]: https://www.openssl.org/
