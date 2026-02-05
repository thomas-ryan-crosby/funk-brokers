/** GET ?propertyId=  PUT upsert */
const { query } = require('../_db');
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function parseBody(req) {
  const raw = req.body;
  if (!raw) return {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}
function mapRow(r) {
  if (!r) return null;
  return {
    id: r.property_id,
    propertyId: r.property_id,
    step1LegalAuthority: r.step1_legal_authority,
    step2TitleOwnership: r.step2_title_ownership,
    step3ListingStrategy: r.step3_listing_strategy,
    step4Disclosures: r.step4_disclosures,
    step5PropertyPrep: r.step5_property_prep,
    step6MarketingAssets: r.step6_marketing_assets,
    step7ShowingsOffers: r.step7_showings_offers,
    updatedAt: r.updated_at,
  };
}
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query || {};
  if (req.method === 'GET') {
    const propertyId = (q.propertyId || '').trim();
    if (!propertyId) return res.status(400).json({ error: 'Missing propertyId' });
    const result = await query('SELECT * FROM pre_listing_checklists WHERE property_id = $1', [propertyId]);
    const row = result.rows[0];
    if (!row) return res.status(200).json(null);
    return res.status(200).json(mapRow(row));
  }
  if (req.method === 'PUT') {
    const body = parseBody(req);
    const propertyId = (body.propertyId || body.property_id || '').trim();
    if (!propertyId) return res.status(400).json({ error: 'Missing propertyId' });
    await query(
      `INSERT INTO pre_listing_checklists (property_id, step1_legal_authority, step2_title_ownership, step3_listing_strategy, step4_disclosures, step5_property_prep, step6_marketing_assets, step7_showings_offers, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, now())
       ON CONFLICT (property_id) DO UPDATE SET
         step1_legal_authority = COALESCE(EXCLUDED.step1_legal_authority, pre_listing_checklists.step1_legal_authority),
         step2_title_ownership = COALESCE(EXCLUDED.step2_title_ownership, pre_listing_checklists.step2_title_ownership),
         step3_listing_strategy = COALESCE(EXCLUDED.step3_listing_strategy, pre_listing_checklists.step3_listing_strategy),
         step4_disclosures = COALESCE(EXCLUDED.step4_disclosures, pre_listing_checklists.step4_disclosures),
         step5_property_prep = COALESCE(EXCLUDED.step5_property_prep, pre_listing_checklists.step5_property_prep),
         step6_marketing_assets = COALESCE(EXCLUDED.step6_marketing_assets, pre_listing_checklists.step6_marketing_assets),
         step7_showings_offers = COALESCE(EXCLUDED.step7_showings_offers, pre_listing_checklists.step7_showings_offers),
         updated_at = now()`,
      [
        propertyId,
        JSON.stringify(body.step1LegalAuthority || body.step1_legal_authority || {}),
        JSON.stringify(body.step2TitleOwnership || body.step2_title_ownership || {}),
        JSON.stringify(body.step3ListingStrategy || body.step3_listing_strategy || {}),
        JSON.stringify(body.step4Disclosures || body.step4_disclosures || {}),
        JSON.stringify(body.step5PropertyPrep || body.step5_property_prep || {}),
        JSON.stringify(body.step6MarketingAssets || body.step6_marketing_assets || {}),
        JSON.stringify(body.step7ShowingsOffers || body.step7_showings_offers || {}),
      ]
    );
    return res.status(200).json({ propertyId });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
