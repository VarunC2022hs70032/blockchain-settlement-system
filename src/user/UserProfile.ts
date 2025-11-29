import crypto from 'crypto';
export interface UserProfileData {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
  isActive: boolean;
  preferences: UserPreferences;
  walletAddresses: string[];
  totalBalance: number;
  transactionCount: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  currency: 'BTC' | 'USD' | 'EUR' | 'JPY';
  notifications: {
    email: boolean;
    push: boolean;
    transactionAlerts: boolean;
    miningUpdates: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showBalance: boolean;
    showTransactions: boolean;
  };
}

export interface UserAccount {
  address: string;
  label: string;
  balance: number;
  createdAt: number;
  isDefault: boolean;
}

export interface UserTransaction {
  id: string;
  type: 'sent' | 'received' | 'mined';
  amount: number;
  fee: number;
  fromAddress: string;
  toAddress: string;
  timestamp: number;
  blockHeight: number;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * User Profile Management System
 */
export class UserProfile {
  private data: UserProfileData;

  constructor(profileData: Partial<UserProfileData> & { username: string; email: string }) {
    const { username, email, displayName, ...otherData } = profileData;
    
    this.data = {
      id: this.generateUserId(),
      username,
      email,
      displayName: displayName || username,
      avatarUrl: otherData.avatarUrl,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isActive: true,
      preferences: this.getDefaultPreferences(),
      walletAddresses: [],
      totalBalance: 0,
      transactionCount: 0,
      ...otherData
    };
  }

  private generateUserId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      currency: 'BTC',
      notifications: {
        email: true,
        push: true,
        transactionAlerts: true,
        miningUpdates: false
      },
      privacy: {
        publicProfile: false,
        showBalance: false,
        showTransactions: false
      }
    };
  }

  // Getters
  public getId(): string { return this.data.id; }
  public getUsername(): string { return this.data.username; }
  public getEmail(): string { return this.data.email; }
  public getDisplayName(): string { return this.data.displayName; }
  public getAvatarUrl(): string | undefined { return this.data.avatarUrl; }
  public getCreatedAt(): number { return this.data.createdAt; }
  public getLastLoginAt(): number { return this.data.lastLoginAt; }
  public isActiveUser(): boolean { return this.data.isActive; }
  public getPreferences(): UserPreferences { return this.data.preferences; }
  public getWalletAddresses(): string[] { return this.data.walletAddresses; }
  public getTotalBalance(): number { return this.data.totalBalance; }
  public getTransactionCount(): number { return this.data.transactionCount; }

  // Profile Management
  public updateProfile(updates: Partial<Pick<UserProfileData, 'displayName' | 'avatarUrl' | 'email'>>): void {
    if (updates.displayName !== undefined) this.data.displayName = updates.displayName;
    if (updates.avatarUrl !== undefined) this.data.avatarUrl = updates.avatarUrl;
    if (updates.email !== undefined) this.data.email = updates.email;
  }

  public updatePreferences(preferences: Partial<UserPreferences>): void {
    this.data.preferences = { ...this.data.preferences, ...preferences };
  }

  public updateLastLogin(): void {
    this.data.lastLoginAt = Date.now();
  }

  public deactivateAccount(): void {
    this.data.isActive = false;
  }

  public reactivateAccount(): void {
    this.data.isActive = true;
  }

  // Wallet Management
  public addWalletAddress(address: string): void {
    if (!this.data.walletAddresses.includes(address)) {
      this.data.walletAddresses.push(address);
    }
  }

  public removeWalletAddress(address: string): void {
    this.data.walletAddresses = this.data.walletAddresses.filter(addr => addr !== address);
  }

  public updateBalance(totalBalance: number): void {
    this.data.totalBalance = totalBalance;
  }

  public incrementTransactionCount(): void {
    this.data.transactionCount++;
  }

  // Export/Import
  public toJSON(): UserProfileData {
    return { ...this.data };
  }

  public static fromJSON(data: UserProfileData): UserProfile {
    const profile = new UserProfile({ username: data.username, email: data.email });
    profile.data = data;
    return profile;
  }

  // Validation
  public validateProfile(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.data.username || this.data.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!this.data.email || !this.isValidEmail(this.data.email)) {
      errors.push('Valid email address is required');
    }

    if (!this.data.displayName || this.data.displayName.length < 1) {
      errors.push('Display name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Security
  public generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  public verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
}

/**
 * User Profile Manager for handling multiple users
 */
export class UserProfileManager {
  protected profiles: Map<string, UserProfile> = new Map();
  protected usersByUsername: Map<string, string> = new Map();
  protected usersByEmail: Map<string, string> = new Map();

  public createProfile(userData: { username: string; email: string; password: string; displayName?: string }): UserProfile {
    // Check for existing username
    if (this.usersByUsername.has(userData.username)) {
      throw new Error('Username already exists');
    }

    // Check for existing email
    if (this.usersByEmail.has(userData.email)) {
      throw new Error('Email already exists');
    }

    const profile = new UserProfile({
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName
    });

    const validation = profile.validateProfile();
    if (!validation.isValid) {
      throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`);
    }

    this.profiles.set(profile.getId(), profile);
    this.usersByUsername.set(userData.username, profile.getId());
    this.usersByEmail.set(userData.email, profile.getId());

    return profile;
  }

  public getProfile(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  public getProfileByUsername(username: string): UserProfile | undefined {
    const userId = this.usersByUsername.get(username);
    return userId ? this.profiles.get(userId) : undefined;
  }

  public getProfileByEmail(email: string): UserProfile | undefined {
    const userId = this.usersByEmail.get(email);
    return userId ? this.profiles.get(userId) : undefined;
  }

  public deleteProfile(userId: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    this.profiles.delete(userId);
    this.usersByUsername.delete(profile.getUsername());
    this.usersByEmail.delete(profile.getEmail());

    return true;
  }

  public getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  public getActiveProfiles(): UserProfile[] {
    return this.getAllProfiles().filter(profile => profile.isActiveUser());
  }

  public searchProfiles(query: string): UserProfile[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllProfiles().filter(profile => 
      profile.getUsername().toLowerCase().includes(lowercaseQuery) ||
      profile.getDisplayName().toLowerCase().includes(lowercaseQuery) ||
      profile.getEmail().toLowerCase().includes(lowercaseQuery)
    );
  }

  public getUserStats(): {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    totalWalletAddresses: number;
  } {
    const profiles = this.getAllProfiles();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalUsers: profiles.length,
      activeUsers: profiles.filter(p => p.isActiveUser()).length,
      newUsersToday: profiles.filter(p => p.getCreatedAt() >= today.getTime()).length,
      totalWalletAddresses: profiles.reduce((sum, p) => sum + p.getWalletAddresses().length, 0)
    };
  }

  // Export/Import all profiles
  public exportProfiles(): UserProfileData[] {
    return this.getAllProfiles().map(profile => profile.toJSON());
  }

  public importProfiles(profilesData: UserProfileData[]): void {
    for (const data of profilesData) {
      const profile = UserProfile.fromJSON(data);
      this.profiles.set(profile.getId(), profile);
      this.usersByUsername.set(profile.getUsername(), profile.getId());
      this.usersByEmail.set(profile.getEmail(), profile.getId());
    }
  }
}
