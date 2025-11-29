import Database from 'better-sqlite3';
import { UserProfile, UserProfileData, UserProfileManager } from '../user/UserProfile';

export interface UserSession {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActiveAt: number;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

/**
 * Profile Storage using SQLite database
 */
export class ProfileStorage {
  private db: Database.Database;

  constructor(dbPath: string = './profiles.db') {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // User profiles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        created_at INTEGER NOT NULL,
        last_login_at INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        preferences TEXT NOT NULL,
        wallet_addresses TEXT NOT NULL,
        total_balance REAL NOT NULL DEFAULT 0,
        transaction_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    // User sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES user_profiles (id) ON DELETE CASCADE
      )
    `);

    // User passwords table (separate for security)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_passwords (
        user_id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_profiles_username ON user_profiles (username);
      CREATE INDEX IF NOT EXISTS idx_profiles_email ON user_profiles (email);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions (user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions (is_active);
    `);
  }

  // Profile CRUD operations
  public saveProfile(profile: UserProfile): void {
    const profileData = profile.toJSON();
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_profiles (
        id, username, email, display_name, avatar_url, created_at,
        last_login_at, is_active, preferences, wallet_addresses,
        total_balance, transaction_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      profileData.id,
      profileData.username,
      profileData.email,
      profileData.displayName,
      profileData.avatarUrl || null,
      profileData.createdAt,
      profileData.lastLoginAt,
      profileData.isActive ? 1 : 0,
      JSON.stringify(profileData.preferences),
      JSON.stringify(profileData.walletAddresses),
      profileData.totalBalance,
      profileData.transactionCount
    );
  }

  public getProfile(userId: string): UserProfile | null {
    const stmt = this.db.prepare('SELECT * FROM user_profiles WHERE id = ?');
    const row = stmt.get(userId) as any;

    if (!row) return null;

    const profileData: UserProfileData = {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      isActive: row.is_active === 1,
      preferences: JSON.parse(row.preferences),
      walletAddresses: JSON.parse(row.wallet_addresses),
      totalBalance: row.total_balance,
      transactionCount: row.transaction_count
    };

    return UserProfile.fromJSON(profileData);
  }

  public getProfileByUsername(username: string): UserProfile | null {
    const stmt = this.db.prepare('SELECT * FROM user_profiles WHERE username = ?');
    const row = stmt.get(username) as any;

    if (!row) return null;

    const profileData: UserProfileData = {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      isActive: row.is_active === 1,
      preferences: JSON.parse(row.preferences),
      walletAddresses: JSON.parse(row.wallet_addresses),
      totalBalance: row.total_balance,
      transactionCount: row.transaction_count
    };

    return UserProfile.fromJSON(profileData);
  }

  public getProfileByEmail(email: string): UserProfile | null {
    const stmt = this.db.prepare('SELECT * FROM user_profiles WHERE email = ?');
    const row = stmt.get(email) as any;

    if (!row) return null;

    const profileData: UserProfileData = {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      isActive: row.is_active === 1,
      preferences: JSON.parse(row.preferences),
      walletAddresses: JSON.parse(row.wallet_addresses),
      totalBalance: row.total_balance,
      transactionCount: row.transaction_count
    };

    return UserProfile.fromJSON(profileData);
  }

  public getAllProfiles(): UserProfile[] {
    const stmt = this.db.prepare('SELECT * FROM user_profiles ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => {
      const profileData: UserProfileData = {
        id: row.id,
        username: row.username,
        email: row.email,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        isActive: row.is_active === 1,
        preferences: JSON.parse(row.preferences),
        walletAddresses: JSON.parse(row.wallet_addresses),
        totalBalance: row.total_balance,
        transactionCount: row.transaction_count
      };
      return UserProfile.fromJSON(profileData);
    });
  }

  public deleteProfile(userId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM user_profiles WHERE id = ?');
    const result = stmt.run(userId);
    return result.changes > 0;
  }

  // Password management
  public savePassword(userId: string, passwordHash: string): void {
    const [salt, hash] = passwordHash.split(':');
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_passwords (
        user_id, password_hash, salt, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(userId, hash, salt, now, now);
  }

  public getPasswordHash(userId: string): string | null {
    const stmt = this.db.prepare('SELECT password_hash, salt FROM user_passwords WHERE user_id = ?');
    const row = stmt.get(userId) as any;

    if (!row) return null;
    return `${row.salt}:${row.password_hash}`;
  }

  // Session management
  public createSession(session: UserSession): void {
    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (
        session_id, user_id, created_at, last_active_at,
        ip_address, user_agent, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.sessionId,
      session.userId,
      session.createdAt,
      session.lastActiveAt,
      session.ipAddress,
      session.userAgent,
      session.isActive ? 1 : 0
    );
  }

  public getSession(sessionId: string): UserSession | null {
    const stmt = this.db.prepare('SELECT * FROM user_sessions WHERE session_id = ? AND is_active = 1');
    const row = stmt.get(sessionId) as any;

    if (!row) return null;

    return {
      sessionId: row.session_id,
      userId: row.user_id,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      isActive: row.is_active === 1
    };
  }

  public updateSessionActivity(sessionId: string): void {
    const stmt = this.db.prepare('UPDATE user_sessions SET last_active_at = ? WHERE session_id = ?');
    stmt.run(Date.now(), sessionId);
  }

  public invalidateSession(sessionId: string): void {
    const stmt = this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE session_id = ?');
    stmt.run(sessionId);
  }

  public invalidateAllUserSessions(userId: string): void {
    const stmt = this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?');
    stmt.run(userId);
  }

  public getUserSessions(userId: string): UserSession[] {
    const stmt = this.db.prepare('SELECT * FROM user_sessions WHERE user_id = ? AND is_active = 1 ORDER BY last_active_at DESC');
    const rows = stmt.all(userId) as any[];

    return rows.map(row => ({
      sessionId: row.session_id,
      userId: row.user_id,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      isActive: row.is_active === 1
    }));
  }

  // Statistics
  public getProfileStats(): {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    totalSessions: number;
    activeSessions: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const totalUsers = this.db.prepare('SELECT COUNT(*) as count FROM user_profiles').get() as { count: number };
    const activeUsers = this.db.prepare('SELECT COUNT(*) as count FROM user_profiles WHERE is_active = 1').get() as { count: number };
    const newUsersToday = this.db.prepare('SELECT COUNT(*) as count FROM user_profiles WHERE created_at >= ?').get(todayTimestamp) as { count: number };
    const totalSessions = this.db.prepare('SELECT COUNT(*) as count FROM user_sessions').get() as { count: number };
    const activeSessions = this.db.prepare('SELECT COUNT(*) as count FROM user_sessions WHERE is_active = 1').get() as { count: number };

    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      newUsersToday: newUsersToday.count,
      totalSessions: totalSessions.count,
      activeSessions: activeSessions.count
    };
  }

  // Search and filtering
  public searchProfiles(query: string, limit: number = 50): UserProfile[] {
    const stmt = this.db.prepare(`
      SELECT * FROM user_profiles 
      WHERE username LIKE ? OR email LIKE ? OR display_name LIKE ?
      ORDER BY last_login_at DESC
      LIMIT ?
    `);

    const searchPattern = `%${query}%`;
    const rows = stmt.all(searchPattern, searchPattern, searchPattern, limit) as any[];

    return rows.map(row => {
      const profileData: UserProfileData = {
        id: row.id,
        username: row.username,
        email: row.email,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        isActive: row.is_active === 1,
        preferences: JSON.parse(row.preferences),
        walletAddresses: JSON.parse(row.wallet_addresses),
        totalBalance: row.total_balance,
        transactionCount: row.transaction_count
      };
      return UserProfile.fromJSON(profileData);
    });
  }

  // Cleanup old sessions
  public cleanupOldSessions(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - maxAgeMs;
    const stmt = this.db.prepare('DELETE FROM user_sessions WHERE last_active_at < ?');
    const result = stmt.run(cutoffTime);
    return result.changes;
  }

  // Database management
  public close(): void {
    this.db.close();
  }

  public vacuum(): void {
    this.db.exec('VACUUM');
  }

  public backup(backupPath: string): void {
    this.db.backup(backupPath);
  }
}

/**
 * Enhanced Profile Manager with persistent storage
 */
export class PersistentProfileManager extends UserProfileManager {
  private storage: ProfileStorage;

  constructor(dbPath?: string) {
    super();
    this.storage = new ProfileStorage(dbPath);
    this.loadProfilesFromStorage();
  }

  private loadProfilesFromStorage(): void {
    const profiles = this.storage.getAllProfiles();
    for (const profile of profiles) {
      const id = profile.getId();
      this.profiles.set(id, profile);
      this.usersByUsername.set(profile.getUsername(), id);
      this.usersByEmail.set(profile.getEmail(), id);
    }
  }

  public override createProfile(userData: { 
    username: string; 
    email: string; 
    password: string; 
    displayName?: string 
  }): UserProfile {
    const profile = super.createProfile(userData);
    
    // Save to persistent storage
    this.storage.saveProfile(profile);
    this.storage.savePassword(profile.getId(), profile.hashPassword(userData.password));
    
    return profile;
  }

  public override deleteProfile(userId: string): boolean {
    const success = super.deleteProfile(userId);
    if (success) {
      this.storage.deleteProfile(userId);
    }
    return success;
  }

  public authenticateUser(username: string, password: string): UserProfile | null {
    const profile = this.getProfileByUsername(username);
    if (!profile) return null;

    const passwordHash = this.storage.getPasswordHash(profile.getId());
    if (!passwordHash) return null;

    if (profile.verifyPassword(password, passwordHash)) {
      profile.updateLastLogin();
      this.storage.saveProfile(profile);
      return profile;
    }

    return null;
  }

  public updateProfile(userId: string, updates: any): boolean {
    const profile = this.getProfile(userId);
    if (!profile) return false;

    profile.updateProfile(updates);
    this.storage.saveProfile(profile);
    return true;
  }

  public getStorage(): ProfileStorage {
    return this.storage;
  }

  public close(): void {
    this.storage.close();
  }
}
