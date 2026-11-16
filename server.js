const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Servir archivos estáticos desde la carpeta 'proyecto_unidad3'
app.use(express.static(path.join(__dirname, 'proyecto_unidad3')));
// También permitimos buscar directo en la carpeta view si es necesario
app.use(express.static(path.join(__dirname, 'proyecto_unidad3', 'view')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'proyecto_unidad3', 'view', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});