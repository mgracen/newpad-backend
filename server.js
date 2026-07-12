const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'NewPad', version: '1.0.0' });
});

app.post('/search', async (req, res) => {
  const { zip } = req.body;
  if (!zip) return res.status(400).json({ error: 'zip is required' });
  try {
    const zipPrefix = zip.substring(0, 3);
    const response = await axios.get(
      'https://data.cms.gov/data-api/v1/dataset/4pq5-n9py/data',
      {
        params: {
          'filter[condition][path]': 'zip_code',
          'filter[condition][operator]': 'STARTS_WITH',
          'filter[condition][value]': zipPrefix,
          'page[size]': 50,
        },
        timeout: 15000,
      }
    );
    const results = Array.isArray(response.data) ? response.data : [];
    const facilities = results.map(f => ({
      id: f.cms_certification_number_ccn,
      name: f.provider_name,
      address: f.provider_address,
      city: f.provider_city,
      state: f.provider_state,
      zip: f.zip_code,
      phone: f.phone_number,
      cms_star_rating: parseInt(f.overall_rating) || null,
      capacity: parseInt(f.number_of_certified_beds) || null,
    })).filter(f => f.name);
    console.log(`[Search] zip=${zip} prefix=${zipPrefix} found=${facilities.length}`);
    res.json({ results: facilities, count: facilities.length, zip });
  } catch (err) {
    console.error('[Search] Error:', err.message);
    if (err.response) console.error('[Search] Data:', JSON.stringify(err.response.data).substring(0, 500));
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

app.get('/facility/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(
      'https://data.cms.gov/data-api/v1/dataset/4pq5-n9py/data',
      {
        params: {
          'filter[condition][path]': 'cms_certification_number_ccn',
          'filter[condition][operator]': '=',
          'filter[condition][value]': id,
        },
        timeout: 10000,
      }
    );
    const results = Array.isArray(response.data) ? response.data : [];
    if (!results.length) return res.status(404).json({ error: 'Facility not found' });
    const f = results[0];
    res.json({
      id: f.cms_certification_number_ccn,
      name: f.provider_name,
      address: f.provider_address,
      city: f.provider_city,
      state: f.provider_state,
      zip: f.zip_code,
      phone: f.phone_number,
      cms_star_rating: parseInt(f.overall_rating) || null,
      capacity: parseInt(f.number_of_certified_beds) || null,
      medicare_link: `https://www.medicare.gov/care-compare/details/nursing-home/${f.cms_certification_number_ccn}`,
    });
  } catch (err) {
    console.error('[Facility] Error:', err.message);
    res.status(500).json({ error: 'Could not load facility details.' });
  }
});

app.post('/claim-interest', (req, res) => {
  const { facilityId, facilityName, email } = req.body;
  console.log(`[ClaimInterest] ${facilityName} (${facilityId}) - ${email}`);
  res.json({ success: true, message: "We'll be in touch." });
});

app.listen(PORT, () => {
  console.log(`NewPad backend running on port ${PORT}`);
});
