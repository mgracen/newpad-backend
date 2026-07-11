const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'NewPad', version: '1.0.0' });
});

// ── SEARCH ────────────────────────────────────────────────────────────────────
app.post('/search', async (req, res) => {
  const { zip, radiusMiles = 25, careTypes = [] } = req.body;

  if (!zip) {
    return res.status(400).json({ error: 'zip is required' });
  }

  try {
    const response = await axios.get(
      'https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0',
      {
        params: {
          'limit': 100,
          'offset': 0,
          'conditions[0][property]': 'zip_code',
          'conditions[0][value]': zip.substring(0, 3),
          'conditions[0][operator]': 'STARTS_WITH',
        },
        timeout: 15000,
      }
    );

    const results = response.data.results || response.data || [];

    const facilities = results.map(f => ({
      id: f.cms_certification_number_ccn || f.federal_provider_number,
      name: f.provider_name,
      address: f.provider_address,
      city: f.provider_city,
      state: f.provider_state,
      zip: f.zip_code || f.provider_zip_code,
      phone: f.phone_number || f.provider_phone_number,
