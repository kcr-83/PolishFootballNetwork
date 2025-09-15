/**
 * League types enumeration matching backend LeagueType enum
 */
export enum LeagueType {
  Ekstraklasa = 'Ekstraklasa',
  Fortuna1Liga = 'Fortuna1Liga',
  EuropeanClub = 'EuropeanClub',
}

/**
 * Connection types enumeration matching backend ConnectionType enum
 */
export enum ConnectionType {
  Alliance = 'Alliance',
  Rivalry = 'Rivalry',
  Friendship = 'Friendship',
}

/**
 * Connection strength enumeration matching backend ConnectionStrength enum
 */
export enum ConnectionStrength {
  Weak = 'Weak',
  Medium = 'Medium',
  Strong = 'Strong',
}

/**
 * User roles enumeration matching backend UserRole enum
 */
export enum UserRole {
  Admin = 'Admin',
  SuperAdmin = 'SuperAdmin',
  ClubAdmin = 'ClubAdmin',
}

/**
 * File types enumeration matching backend FileType enum
 */
export enum FileType {
  LOGO_SVG = 'LOGO_SVG',
  IMAGE_PNG = 'IMAGE_PNG',
  IMAGE_JPG = 'IMAGE_JPG',
  IMAGE_WEBP = 'IMAGE_WEBP',
}
