const express = require('express');
const app = express();
const port = 3000;

// Configurar el motor de plantillas
app.set('view engine', 'ejs');
app.set('views', './views');
const jsonData = require('./contenido.json');


// Configurar middleware
app.use(express.static('public'));  // Para servir archivos estáticos

// Ruta principal que renderiza la vista índice
app.get('/:title', (req, res) => {
    let titulo = req.params.title;
    const index = jsonData.findIndex(item => item.title === titulo);

    
  res.render('index', { url : jsonData[index].url});  // Renderiza el archivo 'index.ejs' en el directorio 'views'
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
