

const fs = require('fs');
let content = fs.readFileSync('biimeta/app/coffee/page.tsx', 'utf8');

// Thay thế chuỗi \\n và \\\" thô thành ký tự xuống dòng và dấu nháy kép thực sự
content = content.replace(/\\n/g, '\n');
content = content.replace(/\\\"/g, '\"');

fs.writeFileSync('biimeta/app/coffee/page.tsx', content, 'utf8');
console.log('Đã xử lý xong tệp!');