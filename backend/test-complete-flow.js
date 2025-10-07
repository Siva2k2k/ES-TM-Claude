// Complete test of delete/restore/hard-delete flow
const axios = require("axios");

const API_BASE = "http://localhost:3001/api/v1";
const adminCredentials = {
  email: "admin@company.com",
  password: "admin123",
};

let accessToken = "";

async function login() {
  const response = await axios.post(`${API_BASE}/auth/login`, adminCredentials);
  accessToken = response.data.tokens.accessToken;
  console.log("✅ Logged in successfully");
}

async function testCompleteFlow() {
  console.log("🧪 Testing Complete Delete/Restore/Hard Delete Flow...\n");

  await login();

  // 1. Get deleted users
  console.log("1️⃣ Getting deleted users...");
  const deletedResponse = await axios.get(`${API_BASE}/users/deleted`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const deletedUsers = deletedResponse.data.users;
  console.log(`   Found ${deletedUsers.length} deleted users`);

  if (deletedUsers.length === 0) {
    console.log("❌ No deleted users to test with");
    return;
  }

  const testUser = deletedUsers[0];
  console.log(`   Test user: ${testUser.full_name} (${testUser.id})`);

  // 2. Test restore
  console.log("\n2️⃣ Testing restore functionality...");
  const restoreResponse = await axios.post(
    `${API_BASE}/users/${testUser.id}/restore`,
    {},
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  console.log(
    `   Restore result: ${restoreResponse.data.success ? "SUCCESS" : "FAILED"}`
  );

  // 3. Verify user is no longer in deleted list
  console.log("\n3️⃣ Verifying user is restored...");
  const verifyResponse = await axios.get(`${API_BASE}/users/deleted`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log(
    `   Deleted users after restore: ${verifyResponse.data.users.length}`
  );

  // 4. Soft delete the user again
  console.log("\n4️⃣ Re-deleting user for hard delete test...");
  const softDeleteResponse = await axios.post(
    `${API_BASE}/users/${testUser.id}/soft-delete`,
    {
      reason: "Testing hard delete functionality",
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  console.log(
    `   Soft delete result: ${
      softDeleteResponse.data.success ? "SUCCESS" : "FAILED"
    }`
  );

  // 5. Test hard delete
  console.log("\n5️⃣ Testing hard delete functionality...");
  const hardDeleteResponse = await axios.post(
    `${API_BASE}/users/${testUser.id}/hard-delete`,
    {},
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  console.log(
    `   Hard delete result: ${
      hardDeleteResponse.data.success ? "SUCCESS" : "FAILED"
    }`
  );

  // 6. Verify user is permanently gone
  console.log("\n6️⃣ Verifying user is permanently deleted...");
  const finalResponse = await axios.get(`${API_BASE}/users/deleted`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log(
    `   Deleted users after hard delete: ${finalResponse.data.users.length}`
  );

  console.log("\n✅ Complete flow test finished!");
}

testCompleteFlow().catch((error) => {
  console.error("❌ Test failed:", error.response?.data || error.message);
});
