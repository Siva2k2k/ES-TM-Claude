/**
 * JWT Token Decoder
 *
 * Decodes the current access token to check its contents
 */

const jwt = require("jsonwebtoken");

function decodeToken() {
  // Check for token in different common locations
  const token =
    process.argv[2] || process.env.ACCESS_TOKEN || "your-token-here";

  if (!token || token === "your-token-here") {
    console.log("❌ No token provided. Usage:");
    console.log("   node decode-token.js <your-access-token>");
    console.log("   or set ACCESS_TOKEN environment variable");
    process.exit(1);
  }

  try {
    // Decode without verification (just to see contents)
    const decoded = jwt.decode(token);

    if (!decoded) {
      console.log("❌ Failed to decode token. Token might be corrupted.");
      process.exit(1);
    }

    console.log("🔍 Token Contents:");
    console.log(JSON.stringify(decoded, null, 2));

    // Check expiration
    if (decoded.exp) {
      const expirationDate = new Date(decoded.exp * 1000);
      const now = new Date();
      const isExpired = now > expirationDate;

      console.log(`\n⏰ Expiration: ${expirationDate.toLocaleString()}`);
      console.log(`   Status: ${isExpired ? "❌ EXPIRED" : "✅ Valid"}`);

      if (!isExpired) {
        const timeLeft = Math.round((expirationDate - now) / 1000 / 60);
        console.log(`   Time left: ${timeLeft} minutes`);
      }
    }

    // Check required fields for user authentication
    console.log("\n📋 Authentication Fields:");
    console.log(`   User ID: ${decoded.id || decoded.userId || "MISSING"}`);
    console.log(`   Email: ${decoded.email || "MISSING"}`);
    console.log(`   Role: ${decoded.role || "MISSING"}`);
    console.log(`   Full Name: ${decoded.full_name || "MISSING"}`);

    // Validation
    console.log("\n✅ Validation:");
    const hasUserId = decoded.id || decoded.userId;
    const hasEmail = decoded.email;
    const hasRole = decoded.role;

    console.log(`   Has User ID: ${hasUserId ? "✅" : "❌"}`);
    console.log(`   Has Email: ${hasEmail ? "✅" : "❌"}`);
    console.log(`   Has Role: ${hasRole ? "✅" : "❌"}`);

    if (hasUserId && hasEmail && hasRole) {
      console.log("\n🎉 Token appears to be valid format!");
    } else {
      console.log("\n⚠️  Token is missing required fields!");
    }
  } catch (error) {
    console.log("❌ Error decoding token:", error.message);
    console.log("\n💡 Common issues:");
    console.log("   - Token is not properly base64 encoded");
    console.log("   - Token is corrupted or truncated");
    console.log("   - Token format is invalid");
  }
}

decodeToken();
