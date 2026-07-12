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

    // Log first record keys so we can see exact column names
    if (allResults.length > 0) {
      console.log('[Search] Column names:', Object.keys(allResults[0]).join(', '));
      console.log('[Search] Sample record:', JSON.stringify(allResults[0]).substring(0, 400));
    }

    // Filter by zip prefix client-side - try multiple possible zip column names
    const filtered = allResults.filter(f => {
      const zipVal = f.zip || f.zip_code || f['zip_code'] || f['zip'] || '';
      return zipVal.toString().startsWith(zipPrefix);
    });

    console.log(`[Search] Filtered to ${filtered.length} for zip prefix ${zipPrefix}`);

    const final = filtered.length > 0 ? filtered : allResults.slice(0, 25);

    // Map using all possible column name variants
    const facilities = final.map(f => ({
      id: f.cms_certification_number_ccn || f.ccn,
      name: f.provider_name,
      address: f.provider_address || f.address,
      city: f.city_town || f.city || f.provider_city,
      state: f.state || f.provider_state,
      zip: f.zip || f.zip_code,
      phone: f.telephone_number || f.phone_number || f.provider_phone_number,
      cms_star_rating: parseInt(f.overall_rating || f.overall_star_rating) || null,
      capacity: parseInt(f.number_of_certified_beds || f.certified_beds) || null,
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
      address: f.provider_address || f.address,
      city: f.city_town || f.city || f.provider_city,
      state: f.state || f.provider_state,
      zip: f.zip || f.zip_code,
      phone: f.telephone_number || f.phone_number,
      cms_star_rating: parseInt(f.overall_rating || f.overall_star_rating) || null,
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
