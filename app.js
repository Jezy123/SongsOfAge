const express = require('express');
const app = express();
const path = require('path');
const port = 3000;

// Configurar el motor de plantillas
app.use(express.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const jsonData = require('./contenido.json');



// Configurar middleware
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal que renderiza la vista índice
app.get('/',(req,res)=>{
    res.send('Contenido protegido');
})
app.get('/:title', (req, res) => {
    let titulo = req.params.title;
    const index = jsonData.findIndex(item => item.title === titulo);
  res.render('index', { url : jsonData[index].url});  // Renderiza el archivo 'index.ejs' en el directorio 'views'
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
