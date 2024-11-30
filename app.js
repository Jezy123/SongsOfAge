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
const uri = process.env.MongoDb; // Accede a la variable segura
const client = new MongoClient(uri);
app.use(express.static(path.join(__dirname, 'public')));



const createSession = async (req, res) => {
  //const { fullName, phone, addressLine1, addressLine2, city, state, country, postalCode, deliveryInstructions,productType, personalizado } = req.body;

  /*try {
    // Guardar datos temporalmente en la base de datos
    const client = new MongoClient(process.env.MongoDb);
    await client.connect();
    const database = client.db('Envios');
    const collection = database.collection('Pedidos');
    const envioData = {
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
      personalizado,
      createdAt: new Date(),
      status: 'pending',
    };
    const result = await collection.insertOne(envioData);

    // Obtener el ID del pedido recién creado
    const orderId = result.insertedId.toString();
   
    let productData;
    let unitAmount;
    
   */
    let productType="simple"
    console.log('Creacion de la peticion de pago segun url')
    if (productType === 'simple') {
      productData = {
        name: "Producto Simple",
        description: "Un producto básico para Beat Quest",
        images: ["http://beatquest.site/caja.png"], // Para desarrollo local

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
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: productData,
            unit_amount: unitAmount, // El precio se establece aquí
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/success?id=${orderId}`,
      cancel_url: `${req.protocol}://${req.get('host')}/cancel?id=${orderId}`,
    });

    res.json({ url: session.url });
  /*} catch (error) {
    console.error('Error al crear sesión de Stripe:', error);
    res.status(500).json({ error: 'No se pudo crear la sesión de pago' });
  }*/
};

app.post('/create-checkout', express.json(), createSession);


// Configurar middleware

app.get('/success',async(req,res)=>{
  const orderId = req.query.id;

  try {
    const client = new MongoClient(process.env.MongoDb);
    await client.connect();
    const database = client.db('Envios');
    const collection = database.collection('Pedidos');

    // Buscar los datos del pedido con el ID proporcionado
    const order = await collection.findOne({ _id: new ObjectId(orderId) });
    const updateResult = await collection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: 'paid', paymentDate: new Date() } } // Actualiza el status a "paid"
    );
 
    if (!order) {
      return res.status(404).send('No se encontraron datos para este pedido.');
    }

    res.render('success', { order });
  } catch (error) {
    console.error('Error al recuperar los datos del pedido:', error);
    res.status(500).send('Error al recuperar los datos del pedido.');
  }
})

app.get('/cancel', async (req, res) => {
  const orderId = req.query.id; // Captura el ID del pedido si está disponible en la consulta

  try {
    if (orderId) {
      const client = new MongoClient(process.env.MongoDb);
      await client.connect();
      const database = client.db('Envios');
      const collection = database.collection('Pedidos');

      // Eliminar el pedido de la base de datos
      const deleteResult = await collection.deleteOne({ _id: new ObjectId(orderId) });

      if (deleteResult.deletedCount === 0) {
        console.log(`No se encontró el pedido con ID: ${orderId} para eliminar.`);
      } else {
        console.log(`Pedido con ID: ${orderId} eliminado correctamente.`);
      }
    }

    res.render('cancel');
  } catch (error) {
    console.error('Error al borrar el pedido cancelado:', error);
    res.status(500).send('Error al procesar la cancelación del pedido.');
  }
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
