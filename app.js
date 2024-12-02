const express = require('express');
const app = express();
const path = require('path');
const port = 3000;
require('dotenv').config();

// Configurar el motor de plantillas
app.use(express.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
const stripe = require('stripe')(process.env.STRIPE_KEY_TEST);
const jsonData = require('./contenido.json');
const { MongoClient, ObjectId  } = require('mongodb');
app.use(express.static(path.join(__dirname, 'public')));

let db; 
const connectDB = async () => {
  if (!db) {
    const uri = process.env.MongoDb;
    const client = new MongoClient(uri);
    try {
      await client.connect();
      db = client.db('Envios'); // Nombre de la base de datos
      console.log('Conexión a MongoDB establecida');
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error);
      process.exit(1);
    }
  }
  return db;
};

// Crear una sesión de pago
app.post('/create-checkout-session', async (req, res) => {
  const {
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    country,
    postalCode,
    deliveryInstructions,
    productType,
  } = req.body;

  try {
    let productData;
    let unitAmount;

    // Configuración del producto según el tipo
    if (productType === 'simple') {
      productData = {
        name: "Producto Simple",
        description: "Un producto básico para Beat Quest",
        images: ["http://beatquest.site/caja.png"],
      };
      unitAmount = 2000; // 20 EUR
    } else if (productType === 'personalizado') {
      productData = {
        name: "Producto Personalizado",
        description: "Personaliza tu Beat Quest",
        images: ["https://beatquest.site/caja-personalizada.png"],
      };
      unitAmount = 3000; // 30 EUR
    } else {
      return res.status(400).json({ error: 'Producto no válido' });
    }

    // Crear sesión de Stripe con metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: productData,
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
      metadata: {
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        postalCode,
        deliveryInstructions,
        productType,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error al crear sesión de pago:', error);
    res.status(500).json({ error: 'Error al crear la sesión de pago' });
  }
});

// Endpoint de éxito
app.get('/success', async (req, res) => {

  const sessionId = req.query.session_id;

  try {
    // Obtener detalles de la sesión desde Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Guardar datos en MongoDB
      const newOrder = {
        fullName: session.metadata.fullName,
        phone: session.metadata.phone,
        addressLine1: session.metadata.addressLine1,
        addressLine2: session.metadata.addressLine2,
        city: session.metadata.city,
        state: session.metadata.state,
        country: session.metadata.country,
        postalCode: session.metadata.postalCode,
        deliveryInstructions: session.metadata.deliveryInstructions,
        productType: session.metadata.productType,
        createdAt: new Date(),
        status: 'completed',
      };
      const database = await connectDB(); // Reutilizamos la conexión

      await database.collection('Pedidos').insertOne(newOrder);
      console.log('Pedido guardado exitosamente en MongoDB:', newOrder);

      res.redirect('/gracias'); // Redirigir a la página de agradecimiento
    } else {
      res.status(400).send('El pago no fue exitoso.');
    }
  } catch (error) {
    console.error('Error al procesar /success:', error);
    res.status(500).send('Error al verificar el pago.');
  }
});

// Página de agradecimiento
app.get('/gracias', (req, res) => {
  res.render('success');
});

app.get('/cancel', async (req, res) => {
    res.render('cancel');

});

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

app.post('/reportar-problema', async (req, res) => {
  const { name, email, subject, description, priority } = req.body;

  try {
      // Validaciones simples
      if (!name || !email || !subject || !description || !priority) {
          return res.status(400).json({ message: 'Todos los campos son obligatorios' });
      }

      // Conexión a MongoDB
      const client = new MongoClient(process.env.MongoDb);
      await client.connect();
      const database = client.db('Envios');
      const collection = database.collection('Problemas');

      // Crear documento
      const problema = {
          name,
          email,
          subject,
          description,
          priority,
          createdAt: new Date(),
          status: 'pendiente', // Estado inicial
      };

      // Insertar en la colección
      await collection.insertOne(problema);

      res.status(201).json({ message: 'Problema reportado correctamente' });
  } catch (error) {
      console.error('Error al reportar el problema:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.get('/problemas',(req,res)=>{
  res.render('problemas');
})

app.get('/comprar-productos',(req,res)=>{
  res.render('comprar-productos');
})
app.get('/formulario-de-compras/:product',(req,res)=>{
  const productType = req.params.product;
  res.render('formulario-de-compras', { product: productType });
})

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
