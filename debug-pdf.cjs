const fetch = require('node-fetch');
const fs = require('fs');

async function testSinglePDF() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@company.com', password: 'password123' })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.tokens?.accessToken;
    
    console.log('✅ Logged in successfully');
    
    // Generate PDF
    console.log('📄 Generating PDF...');
    const response = await fetch('http://localhost:3001/api/v1/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        template_id: 'manager-project-financial',
        date_range: {
          start: '2025-09-01T00:00:00.000Z',
          end: '2025-10-31T23:59:59.999Z'
        },
        filters: {},
        format: 'pdf'
      })
    });
    
    console.log('📡 Response Status:', response.status);
    console.log('📁 Content-Type:', response.headers.get('content-type'));
    console.log('📎 Content-Disposition:', response.headers.get('content-disposition'));
    
    const buffer = await response.buffer();
    console.log('📄 Response size:', buffer.length, 'bytes');
    console.log('🔍 First 10 bytes:', Array.from(buffer.slice(0, 10)));
    console.log('📝 Starts with PDF:', buffer.slice(0, 4).toString() === '%PDF');
    
    if (buffer.slice(0, 4).toString() !== '%PDF') {
      console.log('❌ Not a PDF! Content preview:');
      console.log(buffer.slice(0, 500).toString());
    } else {
      console.log('✅ Valid PDF generated!');
      
      // Save the PDF
      const filename = `debug_pdf_${Date.now()}.pdf`;
      fs.writeFileSync(filename, buffer);
      console.log(`💾 Saved as: ${filename}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSinglePDF();