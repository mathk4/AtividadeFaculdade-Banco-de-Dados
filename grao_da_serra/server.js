require('dotenv').config();         
const app = require('./app');

const porta = process.env.PORT || 3000;
app.listen(porta, function () {
  console.log('Servidor no ar: http://localhost:' + porta);
});
