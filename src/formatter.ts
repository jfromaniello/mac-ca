import * as forge from 'node-forge';
import { asn1 } from './asn1';

export enum Format {
  der = 'der',
  pem = 'pem',
  txt = 'txt',
  asn1 = 'asn1',
  x509 = 'x509',
  fingerprint = 'fingerprint'
};

function myASN(pem: string): asn1 {
  const der = forge.pki.pemToDer(pem);
  const asn1 = forge.asn1;
  // @ts-ignore
  const crt = asn1.fromDer(der.data.toString('binary')).value[0].value;
  const serial = crt[0];
  const hasSerial =
    serial.tagClass === asn1.Class.CONTEXT_SPECIFIC &&
    serial.type === 0 &&
    serial.constructed;
  const slicedCrt = crt.slice(hasSerial);

  return {
    serial: slicedCrt[0],
    issuer: slicedCrt[2],
    valid: slicedCrt[3],
    subject: slicedCrt[4],
  };
}

function txtFormat(pem: string) {
  const crt = myASN(pem);
  const subject = crt.subject.value
    // @ts-ignore
    .map((rdn) => rdn.value[0].value[1].value)
    .join('/');
  const valid = crt.valid.value
    // @ts-ignore
    .map((date) => date.value)
    .join(' - ');

  return [
    `Subject\t${subject}`,
    `Valid\t${valid}`,
    String(pem),
  ].join('\n');
}


export type ConvertResult = string | forge.util.ByteStringBuffer | asn1 | forge.pki.Certificate;

export function convert(pem: string, format: Format.pem | Format.txt | Format.fingerprint): string
export function convert(pem: string, format: Format.der): forge.util.ByteStringBuffer
export function convert(pem: string, format: Format.asn1): asn1
export function convert(pem: string, format: Format.x509): forge.pki.Certificate
export function convert(pem: string, format: Format): string | forge.util.ByteStringBuffer | asn1 | forge.pki.Certificate
export function convert(pem: string, format: Format): ConvertResult {
  switch (format) {
    case Format.der:
      return forge.pki.pemToDer(pem);
    case Format.pem:
      return pem;
    case Format.txt:
      return txtFormat(pem);
    case Format.asn1:
      return myASN(pem);
    case Format.fingerprint:
      const md = forge.md.sha1.create();
      const der = convert(pem, Format.der);
      md.update(der.getBytes());
      return md.digest().toHex();
    case Format.x509:
      return forge.pki.certificateFromPem(pem);
    default:
      throw new Error(`unknown format ${format}`);
  }
};
