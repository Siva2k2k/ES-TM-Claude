// Test the report generation API directly
const testReportGeneration = async () => {
  const token = localStorage.getItem("accessToken");
  console.log("Token:", token ? "Present" : "Missing");

  const requestPayload = {
    template_id: "test-template",
    date_range: {
      start: new Date("2024-01-01").toISOString(),
      end: new Date("2024-01-31").toISOString(),
    },
    format: "pdf",
  };

  console.log("Request payload:", JSON.stringify(requestPayload, null, 2));

  try {
    const response = await fetch(
      "http://localhost:3001/api/v1/reports/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(requestPayload),
      }
    );

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log("Response body:", responseText);

    if (!response.ok) {
      console.error("Request failed:", response.status, responseText);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
};

// Run the test
testReportGeneration();
