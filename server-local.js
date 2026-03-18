const express = require('express');
const { getCustomers, getCustomerById, getCustomerMetafields } = require('./scripts/getCustomers');


const app = express();
const PORT = process.env.PORT || 3000;

app.get('/customers', async (req, res) => {
    try {
        const customers = await getCustomers();
        res.json(customers);
    } catch (error) {
        res.status(500).send('Error retrieving customers.');
    }
});

// Endpoint para obtener un cliente específico basado en su ID
app.get('/customer/:id', async (req, res) => {
    const customerId = req.params.id;

    const customer = await getCustomerById(customerId);

    if (customer) {
        res.json(customer);
    } else {
        res.status(404).json({ error: 'Customer not found' });
    }
});

// Endpoint para obtener un cliente específico basado en su ID y sus Metacampos unicamente
app.get('/customer-metafields/:customerId', async (req, res) => {
    const customerId = req.params.customerId;
    
    try {
        const metafields = await getCustomerMetafields(customerId);
        
        if (metafields) {
            res.json(metafields);
        } else {
            res.status(404).json({ error: 'Metafields not found for the given customer ID.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
