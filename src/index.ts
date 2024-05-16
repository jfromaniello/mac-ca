import { globalAgent } from 'https';
import { rootCertificates } from 'tls';
import { spawnSync } from 'child_process';
import * as forge from 'node-forge';
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { Format, convert } from './formatter';
import { asn1 } from './asn1';

const isMac = process.platform === 'darwin';

type GetParams = {
  /**
   * The keychain to search.
   * Defaults to "all".
   */
  keychain?: 'all' | 'current' | 'SystemRootCertificates',

  /**
   * remove duplicated certificates
   * Defaults to true
   */
  unique?: Boolean,

  /**
   * Exclude node.js bundled root certificates.
   * Defaults to true.
   */
  excludeBundled?: Boolean,

  /**
   * The format to retrieve them
   * Defaults to "pem".
   */
  format?: Format
};

const getParamsDefaults: GetParams = {
  keychain: 'all',
  unique: true,
  excludeBundled: true,
  format: Format.pem
};

export function get(params?: GetParams & { format: Format.pem | Format.txt | Format.fingerprint }): string[]
export function get(params?: GetParams & { format: Format.der }): forge.util.ByteStringBuffer[]
export function get(params?: GetParams & { format: Format.asn1 }): asn1[]
export function get(params?: GetParams & { format: Format.x509 }): forge.pki.Certificate[]
export function get(): string[]
export function get(params: GetParams = getParamsDefaults): string[] | forge.util.ByteStringBuffer[] | asn1[] | forge.pki.Certificate[] {
  if (!isMac) { return []; }

  params = { ...getParamsDefaults, ...params };

  const splitPattern = /(?=-----BEGIN\sCERTIFICATE-----)/g;
  const args = ['find-certificate', '-a', '-p'];

  let result: string[] = [];

  if (params.keychain === 'all' || params.keychain === 'SystemRootCertificates') {
    const systemRootCertsPath =
      '/System/Library/Keychains/SystemRootCertificates.keychain';

    const root = spawnSync('/usr/bin/security', args.concat(systemRootCertsPath))
      .stdout.toString()
      .split(splitPattern)
      .map(c => c.trim());

    result = [...result, ...root];
  }

  if (params.keychain === 'all' || params.keychain === 'SystemRootCertificates') {
    const trusted = spawnSync('/usr/bin/security', args)
      .stdout.toString()
      .split(splitPattern)
      .map(c => c.trim());

    result = [...result, ...trusted];
  }

  if (params.unique || params.excludeBundled) {
    const fingerprints = result.map(c => convert(c, Format.fingerprint));
    const nodeFingerprints = params.excludeBundled ?
      rootCertificates.map(c => convert(c, Format.fingerprint)) :
      [];

    result = result.filter((pem, index) => {
      const fingerprint = fingerprints[index];
      if (params.unique && index !== fingerprints.indexOf(fingerprint)) {
        return false;
      }
      if (params.excludeBundled && nodeFingerprints.includes(fingerprint)) {
        return false;
      }
      return true;
    });
  }

  return result.map(c => convert(c, params.format)) as
    string[] | forge.util.ByteStringBuffer[] | asn1[] | forge.pki.Certificate[];
};

const originalCA = globalAgent.options.ca;

type AddToGAType = Exclude<GetParams, 'format'>;

export const addToGlobalAgent = (params: AddToGAType = getParamsDefaults) => {
  if (!isMac) { return; }
  let cas: (string | Buffer)[];
  if (!Array.isArray(originalCA)) {
    cas = typeof originalCA !== 'undefined' ? [originalCA] : [];
  } else {
    cas = Array.from(originalCA);
  }

  get({ ...getParamsDefaults, ...params, format: Format.pem })
    .forEach((cert) => cas.push(cert));

  globalAgent.options.ca = cas;

  setGlobalDispatcher(new Agent({
    connect: {
      ca: cas
    }
  }));
};

export { Format, convert };
