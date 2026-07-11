const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Set these in Railway environment variables
const CMS_BASE = 'https://data.cms.gov/provider-data/api/1';

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'NewPad', version: '1.0.0' });
});

// ── SEARCH ────────────────────────────────────────────────────────────────────
// POST /search
// Body: { zip, radiusMiles, careTypes, budgetMin, budgetMax }
// Returns: array of matching facilities sorted by distance
app.post('/search', async (req, res) => {
  const { zip, radiusMiles = 25, careTypes = [], budgetMin, budgetMax } = req.body;

  if (!zip) {
    return res.status(400).json({ error: 'zip is required' });
  }

  try {
    // Fetch from Medicare Care Compare API - free, no key required
    const params = {
      '$limit': 100,
      '$where': `provider_zip_code like '${zip.substring(0, 3)}%'`,
      '$order': 'provider_name ASC',
    };

    // Filter by care type if provided
    if (careTypes.length > 0) {
      const typeFilter = careTypes
        .map(t => `provider_type like '%${t.replace(/_/g, ' ')}%'`)
        .join(' OR ');
      params['$where'] += ` AND (${typeFilter})`;
    }

    const response = await axios.get(
      `${CMS_BASE}/dataset/4pq5-n9py/data`,
      { params, timeout: 15000 }
    );

    const facilities = response.data.map(f => ({
      id: f.federal_provider_number || f.provider_id,
      name: f.provider_name,
      address: f.provider_address,
      city: f.provider_city,
      state: f.provider_state,
      zip: f.provider_zip_code,
      phone: f.provider_phone_number,
      care_types: [f.provider_type || 'skilled_nursing'],
      cms_star_rating: parseInt(f.overall_rating) || null,
      state_license_status: 'active',
      capacity: parseInt(f.number_of_certified_beds) || null,
    })).filter(f => f.name); // remove any blank records

    res.json({
      results: facilities,
      count: facilities.length,
      zip,
      radiusMiles,
    });

  } catch (err) {
    console.error('[Search] Error:', err.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// ── FACILITY DETAIL ───────────────────────────────────────────────────────────
// GET /facility/:id
// Returns full detail + inspection history for one facility
app.get('/facility/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(
      `${CMS_BASE}/dataset/xubh-q36u/data`,
      {
        params: { '$where': `federal_provider_number = '${id}'`, '$limit': 1 },
        timeout: 10000,
      }
    );

    if (!response.data.length) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const f = response.data[0];

    res.json({
      id: f.federal_provider_number,
      name: f.provider_name,
      address: f.provider_address,
      city: f.provider_city,
      state: f.provider_state,
      zip: f.provider_zip_code,
      phone: f.provider_phone_number,
      care_types: [f.provider_type || 'skilled_nursing'],
      cms_star_rating: parseInt(f.overall_rating) || null,
      staffing_rating: parseInt(f.staffing_rating) || null,
      quality_rating: parseInt(f.quality_measure_rating) || null,
      capacity: parseInt(f.number_of_certified_beds) || null,
      cms_provider_id: f.federal_provider_number,
      medicare_link: `https://www.medicare.gov/care-compare/details/nursing-home/${f.federal_provider_number}`,
    });

  } catch (err) {
    console.error('[Facility] Error:', err.message);
    res.status(500).json({ error: 'Could not load facility details.' });
  }
});

// ── CLAIM INTEREST ────────────────────────────────────────────────────────────
// POST /claim-interest
// Captures facility contact email for future paid tier waitlist
app.post('/claim-interest', (req, res) => {
  const { facilityId, facilityName, email } = req.body;
  // Log for now - wire to database when facility tier launches
  console.log(`[ClaimInterest] ${facilityName} (${facilityId}) - ${email}`);
  res.json({ success: true, message: "We'll be in touch when the facility portal launches." });
});

app.listen(PORT, () => {
  console.log(`NewPad backend running on port ${PORT}`);
});
