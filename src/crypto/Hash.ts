import * as crypto from 'crypto';

/**
 * Cryptographic hash utilities for blockchain operations
 */
export class Hash {
  /**
   * Calculate SHA-256 hash of input data
   */
  static sha256(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate double SHA-256 hash (Bitcoin-style)
   */
  static doubleSha256(data: string | Buffer): string {
    const firstHash = crypto.createHash('sha256').update(data).digest();
    return crypto.createHash('sha256').update(firstHash).digest('hex');
  }

  /**
   * Calculate RIPEMD-160 hash
   */
  static ripemd160(data: string | Buffer): string {
    return crypto.createHash('ripemd160').update(data).digest('hex');
  }

  /**
   * Calculate hash160 (SHA-256 followed by RIPEMD-160)
   */
  static hash160(data: string | Buffer): string {
    const sha256Hash = crypto.createHash('sha256').update(data).digest();
    return crypto.createHash('ripemd160').update(sha256Hash).digest('hex');
  }

  /**
   * Generate random bytes for cryptographic operations
   */
  static randomBytes(size: number): Buffer {
    return crypto.randomBytes(size);
  }

  /**
   * Create Merkle root from array of transaction hashes
   */
  static calculateMerkleRoot(transactions: string[]): string {
    if (transactions.length === 0) {
      return Hash.sha256('');
    }

    if (transactions.length === 1) {
      return Hash.sha256(transactions[0]);
    }

    let level = transactions.map(tx => Hash.sha256(tx));

    while (level.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          // Pair exists
          const combined = level[i] + level[i + 1];
          nextLevel.push(Hash.sha256(combined));
        } else {
          // Odd number of elements, duplicate the last one
          const combined = level[i] + level[i];
          nextLevel.push(Hash.sha256(combined));
        }
      }
      
      level = nextLevel;
    }

    return level[0];
  }

  /**
   * Verify if a hash meets the difficulty target
   */
  static meetsDifficulty(hash: string, difficulty: number): boolean {
    const target = '0'.repeat(difficulty);
    return hash.substring(0, difficulty) === target;
  }

  /**
   * Calculate difficulty adjustment based on time taken
   */
  static adjustDifficulty(
    currentDifficulty: number,
    timeExpected: number,
    timeActual: number
  ): number {
    const ratio = timeActual / timeExpected;
    
    // Limit adjustment to prevent dramatic changes
    if (ratio > 4) return Math.max(1, currentDifficulty - 1);
    if (ratio < 0.25) return currentDifficulty + 1;
    
    return currentDifficulty;
  }
}
