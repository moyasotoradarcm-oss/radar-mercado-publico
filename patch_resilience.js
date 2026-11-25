const fs = require('fs');

// Patch para server.ts asegurando 0.0.0.0 y soporte de tipos
const serverPath = 'server.ts';
if (fs.existsSync(serverPath)) {
  let content = fs.readFileSync(serverPath, 'utf8');

  // Asegurar lectura de PORT y Host 0.0.0.0
  content = content.replace(/const PORT = .*/, "const PORT = process.env.PORT || 8080;");
  content = content.replace(
    /app\.listen\(([^,)]+)\s*,?\s*([^)]*)\)/g,
    "app.listen(Number(PORT), '0.0.0.0', () => console.log(`Servidor activo en puerto ${PORT}`))"
  );

  fs.writeFileSync(serverPath, content, 'utf8');
  console.log("✅ server.ts actualizado con Host 0.0.0.0 y puerto dinámico.");
}
