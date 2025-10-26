import mongoose from 'mongoose';

/**
 * ID Parsing and Validation Utilities
 * Centralized helpers for MongoDB ObjectId operations
 */
export class IdUtils {
  /**
   * Parse comma-separated string or array of ID strings
   * Handles both string ("id1,id2,id3") and array (["id1", "id2"]) inputs
   *
   * @param value - String, array, or undefined
   * @returns Array of trimmed, non-empty ID strings
   *
   * @example
   * parseIds("123,456,789") → ["123", "456", "789"]
   * parseIds(["123", "456"]) → ["123", "456"]
   * parseIds(undefined) → []
   */
  static parseIds(value?: string | string[] | unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim()).filter(Boolean);
    }
    return [];
  }

  /**
   * Convert any value to ObjectId string
   * Handles both ObjectId objects and plain strings
   *
   * @param value - Any value that might contain an ID
   * @returns ID string or undefined
   *
   * @example
   * toIdString(new ObjectId("507f1f77bcf86cd799439011")) → "507f1f77bcf86cd799439011"
   * toIdString({ _id: "507f1f77bcf86cd799439011" }) → "507f1f77bcf86cd799439011"
   * toIdString("507f1f77bcf86cd799439011") → "507f1f77bcf86cd799439011"
   * toIdString(null) → undefined
   */
  static toIdString(value: any): string | undefined {
    if (!value) return undefined;
    if (value._id) return value._id.toString();
    if (typeof value === 'string') return value;
    if (typeof value.toString === 'function') return value.toString();
    return undefined;
  }

  /**
   * Validate and convert to MongoDB ObjectId
   * Returns null if invalid instead of throwing
   *
   * @param id - String or ObjectId to validate
   * @returns MongoDB ObjectId or null if invalid
   *
   * @example
   * toObjectId("507f1f77bcf86cd799439011") → ObjectId("507f1f77bcf86cd799439011")
   * toObjectId("invalid") → null
   */
  static toObjectId(id: any): mongoose.Types.ObjectId | null {
    if (!id) return null;
    if (id instanceof mongoose.Types.ObjectId) return id;
    return mongoose.Types.ObjectId.isValid(id)
      ? new mongoose.Types.ObjectId(id)
      : null;
  }

  /**
   * Validate if value is a valid MongoDB ObjectId
   *
   * @param id - Value to validate
   * @returns true if valid ObjectId, false otherwise
   *
   * @example
   * isValidObjectId("507f1f77bcf86cd799439011") → true
   * isValidObjectId("invalid") → false
   */
  static isValidObjectId(id: any): boolean {
    if (!id) return false;
    if (id instanceof mongoose.Types.ObjectId) return true;
    return mongoose.Types.ObjectId.isValid(id);
  }
}
