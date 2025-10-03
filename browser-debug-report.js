// Copy and paste this into browser console to debug the 400 error
// Make sure you're logged in first

(async function debugReportGeneration() {
  console.log("🔍 Debugging Report Generation 400 Error");

  // Check if user is logged in
  const token = localStorage.getItem("accessToken");
  console.log("1. Authentication:", token ? "✅ Token present" : "❌ No token");

  if (!token) {
    console.log("Please login first and run this again");
    return;
  }

  // First, get available templates
  console.log("\n2. Fetching available templates...");
  try {
    const templatesResponse = await fetch(
      "http://localhost:3001/api/v1/reports/templates",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("Templates status:", templatesResponse.status);

    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      console.log("Available templates:", templatesData.templates?.length || 0);

      if (templatesData.templates?.length > 0) {
        const firstTemplate = templatesData.templates[0];
        console.log(
          "Using template:",
          firstTemplate.template_id,
          "-",
          firstTemplate.name
        );

        // Now test report generation with a real template
        console.log("\n3. Testing report generation...");

        const requestPayload = {
          template_id: firstTemplate.template_id,
          date_range: {
            start: new Date("2024-01-01").toISOString(),
            end: new Date("2024-01-31").toISOString(),
          },
          format: "pdf",
        };

        console.log(
          "Request payload:",
          JSON.stringify(requestPayload, null, 2)
        );

        const reportResponse = await fetch(
          "http://localhost:3001/api/v1/reports/generate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestPayload),
          }
        );

        console.log("Report generation status:", reportResponse.status);

        if (!reportResponse.ok) {
          const errorText = await reportResponse.text();
          console.log("Error response:", errorText);

          try {
            const errorJson = JSON.parse(errorText);
            console.log("Parsed error:", errorJson);
          } catch {
            console.log("Raw error text:", errorText);
          }
        } else {
          console.log("✅ Report generation successful!");
          const contentType = reportResponse.headers.get("content-type");
          console.log("Response content-type:", contentType);
        }
      } else {
        console.log("❌ No templates available");
      }
    } else {
      const errorText = await templatesResponse.text();
      console.log("Templates error:", errorText);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
})();
