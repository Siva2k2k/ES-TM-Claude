const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

async function testFormatConsistency() {
  console.log('🔍 Testing Report Format Consistency...\n');

  try {
    // Login as manager to get access to team reports
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: 'manager@company.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test template with good data likelihood
    const templateId = 'lead-team-timesheet';
    console.log(`📊 Testing template: ${templateId}\n`);

    // Test all formats
    const formats = ['CSV', 'EXCEL', 'PDF'];
    const results = {};

    for (const format of formats) {
      console.log(`📄 Testing ${format} format...`);
      
      try {
        const reportResponse = await axios.post(
          `${BASE_URL}/api/v1/reports/generate`,
          {
            template_id: templateId,
            format: format,
            filters: {
              date_range: {
                start: '2024-01-01',
                end: '2024-12-31'
              }
            }
          },
          {
            headers,
            responseType: 'arraybuffer'
          }
        );

        const contentType = reportResponse.headers['content-type'];
        const size = reportResponse.data.byteLength;
        
        console.log(`   📡 Status: ${reportResponse.status}`);
        console.log(`   📁 Content-Type: ${contentType}`);
        console.log(`   📏 Size: ${size} bytes`);

        // For CSV, let's check the actual content
        if (format === 'CSV') {
          const csvContent = Buffer.from(reportResponse.data).toString('utf-8');
          console.log(`   📝 CSV Content Preview (first 300 chars):`);
          console.log(`   "${csvContent.substring(0, 300)}..."`);
          
          // Count data rows (excluding metadata lines starting with #)
          const lines = csvContent.split('\n');
          const dataLines = lines.filter(line => line.trim() && !line.startsWith('#'));
          console.log(`   📊 Data lines found: ${dataLines.length}`);
          
          if (dataLines.length > 0) {
            console.log(`   📋 Headers: ${dataLines[0]}`);
            if (dataLines.length > 1) {
              console.log(`   📝 Sample row: ${dataLines[1]}`);
            }
          }
        }

        results[format] = {
          success: true,
          size,
          contentType
        };

        console.log(`   ✅ ${format}: Success\n`);
      } catch (error) {
        console.log(`   ❌ ${format}: Error - ${error.message}\n`);
        results[format] = {
          success: false,
          error: error.message
        };
      }
    }

    // Test preview endpoint for comparison
    console.log(`🔍 Testing Preview endpoint for data structure comparison...`);
    try {
      const previewResponse = await axios.post(
        `${BASE_URL}/api/v1/reports/preview`,
        {
          template_id: templateId,
          filters: {
            date_range: {
              start: '2024-01-01',
              end: '2024-12-31'
            }
          }
        },
        { headers }
      );

      console.log(`   📡 Status: ${previewResponse.status}`);
      console.log(`   📊 Data records: ${previewResponse.data.data?.length || 0}`);
      
      if (previewResponse.data.data?.length > 0) {
        const sampleRecord = previewResponse.data.data[0];
        console.log(`   📝 Sample record keys: ${Object.keys(sampleRecord).join(', ')}`);
        console.log(`   🔍 User data populated: ${sampleRecord.user_id ? 'Yes' : 'No'}`);
        if (sampleRecord.user_id && typeof sampleRecord.user_id === 'object') {
          console.log(`   👤 User name: ${sampleRecord.user_id.full_name || sampleRecord.user_id.name || 'N/A'}`);
        }
      }
      
      console.log(`   ✅ Preview: Success\n`);
    } catch (error) {
      console.log(`   ❌ Preview: Error - ${error.message}\n`);
    }

    // Summary
    console.log('📋 Format Consistency Summary:');
    console.log('================================');
    for (const [format, result] of Object.entries(results)) {
      if (result.success) {
        console.log(`✅ ${format}: ${result.size} bytes (${result.contentType})`);
      } else {
        console.log(`❌ ${format}: ${result.error}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFormatConsistency();