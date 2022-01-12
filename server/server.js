const express = require('express');
const cors = require('cors');




const app = express();

app.use(express.json());
app.use(cors());


app.get('/', (req, res) => {
    return res.json({ 'message': '🦸' })
})


app.listen(3000, () => {
    console.log('listening on port 3000')
});