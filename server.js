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
    const zipPrefix = zip.replace(/\D/g, '').substring(0, 3);
    const firstDigit = zipPrefix.charAt(0);
    const stateMap = {
      '0': 'CT', '1': 'NY', '2': 'VA', '3': 'FL',
      '4': 'OH', '5': 'MN', '6': 'IL', '7': 'TX',
      '8': 'CO', '9': 'CA'
    };
    const state = stateMap[firstDigit] || 'FL';

    console.log(`[Search] zip=${zip} prefix=${zipPrefix} state=${state}`);

    const response = await axios.get(
      'https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0',
      {
        params: {
          'conditions[0][property]': 'state',
          'conditions[0][value]': state,
          'conditions[0][operator]': '=',
          'limit': 500,
          'offset': 0,
          'results': 'true',
          'format': 'json',
        },
        timeout: 20000,
      }
    );

    const allResults = response.data.results || [];

    const filtered = allResults.filter(f =>
      f.zip_code && f.zip_code.toString().startsWith(zipPrefix)
    );

    console.log(`[Search] Got ${allResults.length} total, ${filtered.length} for zip prefix ${zipPrefix}`);
    if (filtered.length > 0) {
      const types = [...new Set(filtered.map(f => f.provider_type))];
      console.log(`[Search] Provider types found: ${types.join(', ')}`);
    }

    const final = filtered.length > 0 ? filtered : allResults.slice(0, 25);

    const facilities = final.map(f => ({
      id: f.cms_certification_number_ccn,
      name: f.provider_name,
      address: f.provider_address,
      city: f.citytown,
      state: f.state,
      zip: f.zip_code,
      phone: f.telephone_number,
      cms_star_rating: f.overall_rating ? parseInt(f.overall_rating) : null,
      capacity: f.number_of_certified_beds ? parseInt(f.number_of_certified_beds) : null,
      provider_type: f.provider_type || null,
      ownership_type: f.ownership_type || null,
      lat: f.latitude ? parseFloat(f.latitude) : null,
      lng: f.longitude ? parseFloat(f.longitude) : null,
    })).filter(f => f.name);

    res.json({ results: facilities, count: facilities.length, zip });

  } catch (err) {
    console.error('[Search] Error:', err.message);
    if (err.response) {
      console.error('[Search] Status:', err.response.status);
      console.error('[Search] Data:', JSON.stringify(err.response.data).substring(0, 500));
    }
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

app.get('/facility/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(
      'https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0',
      {
        params: {
          'conditions[0][property]': 'cms_certification_number_ccn',
          'conditions[0][value]': id,
          'conditions[0][operator]': '=',
          'limit': 1,
          'results': 'true',
          'format': 'json',
        },
        timeout: 10000,
      }
    );
    const results = response.data.results || [];
    if (!results.length) return res.status(404).json({ error: 'Facility not found' });
    const f = results[0];
    res.json({
      id: f.cms_certification_number_ccn,
      name: f.provider_name,
      address: f.provider_address,
      city: f.citytown,
      state: f.state,
      zip: f.zip_code,
      phone: f.telephone_number,
      cms_star_rating: f.overall_rating ? parseInt(f.overall_rating) : null,
      capacity: f.number_of_certified_beds ? parseInt(f.number_of_certified_beds) : null,
      staffing_rating: f.staffing_rating ? parseInt(f.staffing_rating) : null,
      health_inspection_rating: f.health_inspection_rating ? parseInt(f.health_inspection_rating) : null,
      ownership_type: f.ownership_type,
      lat: f.latitude ? parseFloat(f.latitude) : null,
      lng: f.longitude ? parseFloat(f.longitude) : null,
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
