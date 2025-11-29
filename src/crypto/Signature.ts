import { ec as EC } from 'elliptic';
import { Hash } from './Hash';

const secp256k1 = new EC('secp256k1');

/**
 * Digital signature utilities for blockchain transactions
 */
export class Signature {
  /**
   * Generate a new key pair for wallet creation
   */
  static generateKeyPair(): { privateKey: string; publicKey: string } {
    const keyPair = secp256k1.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');
    
    return { privateKey, publicKey };
  }

  /**
   * Get public key from private key
   */
  static getPublicKey(privateKey: string): string {
    const keyPair = secp256k1.keyFromPrivate(privateKey, 'hex');
    return keyPair.getPublic('hex');
  }

  /**
   * Sign data with private key
   */
  static sign(data: string, privateKey: string): string {
    const keyPair = secp256k1.keyFromPrivate(privateKey, 'hex');
    const hash = Hash.sha256(data);
    const signature = keyPair.sign(hash);
    return signature.toDER('hex');
  }

  /**
   * Verify signature with public key
   */
  static verify(data: string, signature: string, publicKey: string): boolean {
    try {
      const keyPair = secp256k1.keyFromPublic(publicKey, 'hex');
      const hash = Hash.sha256(data);
      return keyPair.verify(hash, signature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate address from public key (Bitcoin-style)
   */
  static publicKeyToAddress(publicKey: string): string {
    const hash160 = Hash.hash160(Buffer.from(publicKey, 'hex'));
    return '1' + hash160; // Simple prefix for demonstration
  }

  /**
   * Verify if an address is valid
   */
  static isValidAddress(address: string): boolean {
    return address.length === 41 && address.startsWith('1');
  }

  /**
   * Create deterministic signature for transaction ordering
   */
  static createDeterministicSignature(
    data: string,
    privateKey: string,
    nonce: number
  ): string {
    const deterministicData = data + nonce.toString();
    return this.sign(deterministicData, privateKey);
  }

  /**
   * Multi-signature verification (m-of-n)
   */
  static verifyMultiSig(
    data: string,
    signatures: string[],
    publicKeys: string[],
    requiredSigs: number
  ): boolean {
    if (signatures.length < requiredSigs) {
      return false;
    }

    let validSigs = 0;
    for (let i = 0; i < Math.min(signatures.length, publicKeys.length); i++) {
      if (this.verify(data, signatures[i], publicKeys[i])) {
        validSigs++;
      }
    }

    return validSigs >= requiredSigs;
  }

  /**
   * Create a recoverable signature (ECDSA with recovery)
   */
  static signRecoverable(data: string, privateKey: string): {
    signature: string;
    recovery: number;
  } {
    const keyPair = secp256k1.keyFromPrivate(privateKey, 'hex');
    const hash = Hash.sha256(data);
    const signature = keyPair.sign(hash, { canonical: true });
    
    return {
      signature: signature.toDER('hex'),
      recovery: signature.recoveryParam || 0
    };
  }

  /**
   * Recover public key from signature
   */
  static recoverPublicKey(
    _data: string,
    _signature: string,
    _recovery: number
  ): string | null {
    try {
      // Simple recovery - in production use proper ECDSA recovery
      return null; // Placeholder for recovery functionality
    } catch (error) {
      return null;
    }
  }
}
