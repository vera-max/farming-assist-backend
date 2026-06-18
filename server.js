const app = require('./src/app');
const sequelize = require('./src/config/db');

const PORT = process.env.PORT || 5000;

sequelize.sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`AGRILINK backend running on port ${PORT}`);
    });
  })
  .catch(err => console.error('Database sync failed:', err));
