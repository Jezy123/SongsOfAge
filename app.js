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
    res.render('inicio');
})
app.get('/instrucciones',(req,res)=>{
  res.render('instrucciones');
})

app.get('/faqs',(req,res)=>{
  res.render('faqs');
})


app.get('/listarcanciones',(req,res)=>{
  res.render('listarCanciones',{canciones : jsonData});
})

app.get('/download', (req, res) => {
  // Ruta al archivo APK en tu servidor
  const filePath = './public/BeatQuest.apk';

  // Enviar el archivo para su descarga
  res.download(filePath, (err) => {
    if (err) {
      console.error('Error al descargar el archivo:', err);
      res.status(500).send('Error al descargar el archivo');
    }
  });
});


app.get('/:title', async (req, res) => {
  try {
      let titulo = req.params.title;

      // No es necesario hacer await aquí ya que jsonData ya está disponible
      const index = jsonData.findIndex(item => item.title === titulo);

      if (index === -1) {
          // Si no se encuentra el elemento, enviar una respuesta 404
          return res.status(404).send('No se encontró el título');
      }

      let urlD = jsonData[index].url;

      // Renderizar la página solo después de asegurar que se encontró la URL
      res.render('index', { url: urlD });

  } catch (error) {
      // Manejar cualquier error inesperado
      console.error(error);
      res.status(500).send('Ocurrió un error en el servidor');
  }
})

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
