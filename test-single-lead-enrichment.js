#!/usr/bin/env node
/**
 * Test script to verify single lead enrichment with the new Google Maps detail extraction
 * Usage: node test-single-lead-enrichment.js [leadId]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Lead } = require('./dist/models/Lead');
const { leadEnrichmentOrchestrator } = require('./dist/enrichment');

async function testSingleLeadEnrichment(leadId) {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    if (!leadId) {
      // Find a lead with missing fields for testing
      console.log('🔍 Looking for a lead with missing Google Maps fields...');
      const testLead = await Lead.findOne({
        $or: [
          { phone: { $in: [null, ''] } },
          { address: { $in: [null, ''] } },
          { category: { $in: [null, ''] } },
          { rating: { $in: [null, 0] } },
          { website: null },
        ],
        $and: [
          {
            $or: [
              { placeId: { $exists: true, $nin: [null, ''] } },
              { sourceUrl: { $exists: true, $nin: [null, ''] } }
            ]
          }
        ]
      }).select('_id companyName phone address category rating website placeId sourceUrl');

      if (!testLead) {
        console.log('❌ No test lead found with missing fields');
        return;
      }

      leadId = testLead._id.toString();
      console.log('📋 Found test lead:', {
        id: leadId,
        companyName: testLead.companyName,
        phone: testLead.phone || 'MISSING',
        address: testLead.address || 'MISSING',
        category: testLead.category || 'MISSING',
        rating: testLead.rating || 'MISSING',
        website: testLead.website || 'MISSING',
        placeId: testLead.placeId,
        sourceUrl: testLead.sourceUrl
      });
    }

    console.log(`\n🚀 Starting enrichment for lead: ${leadId}`);
    console.log('=' * 50);

    const startTime = Date.now();
    const result = await leadEnrichmentOrchestrator.enrichLead(leadId);
    const duration = Date.now() - startTime;

    console.log('\n📊 ENRICHMENT RESULT:');
    console.log('=' * 50);
    console.log(`✅ Success: ${result.success}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📝 Fields Updated: ${result.fieldsUpdated.length}`);
    console.log(`❌ Errors: ${result.errors.length}`);

    if (result.fieldsUpdated.length > 0) {
      console.log('\n🔄 UPDATED FIELDS:');
      console.log(result.fieldsUpdated.map(f => `  • ${f}`).join('\n'));
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      console.log(result.errors.map(e => `  • ${e}`).join('\n'));
    }

    // Fetch the updated lead to show the results
    const updatedLead = await Lead.findById(leadId).select(
      'companyName phone address category rating website email ' +
      'area city state country pincode latitude longitude ' +
      'businessStatus workingHours plusCode ownerClaimed totalPhotos ' +
      'enrichmentStatus enrichmentCompletedAt'
    );

    console.log('\n🏢 UPDATED LEAD DATA:');
    console.log('=' * 50);
    console.log(`Company: ${updatedLead.companyName}`);
    console.log(`Phone: ${updatedLead.phone || 'N/A'}`);
    console.log(`Email: ${updatedLead.email || 'N/A'}`);
    console.log(`Address: ${updatedLead.address || 'N/A'}`);
    console.log(`City: ${updatedLead.city || 'N/A'}`);
    console.log(`State: ${updatedLead.state || 'N/A'}`);
    console.log(`Category: ${updatedLead.category || 'N/A'}`);
    console.log(`Rating: ${updatedLead.rating || 'N/A'}`);
    console.log(`Website: ${updatedLead.website || 'N/A'}`);
    console.log(`Business Status: ${updatedLead.businessStatus || 'N/A'}`);
    console.log(`Working Hours: ${updatedLead.workingHours || 'N/A'}`);
    console.log(`Coordinates: ${updatedLead.latitude ? `${updatedLead.latitude}, ${updatedLead.longitude}` : 'N/A'}`);
    console.log(`Enrichment Status: ${updatedLead.enrichmentStatus}`);
    console.log(`Completed At: ${updatedLead.enrichmentCompletedAt || 'N/A'}`);

    console.log('\n🎯 WEBSITE FIELD VERIFICATION:');
    if (updatedLead.website === null) {
      console.log('✅ Website field is correctly null (no website found)');
    } else if (updatedLead.website && updatedLead.website.length > 0) {
      console.log(`✅ Website field populated: ${updatedLead.website}`);
    } else {
      console.log('⚠️  Website field is empty string or undefined (should be null)');
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Get leadId from command line arguments
const leadId = process.argv[2];

console.log('🧪 SINGLE LEAD ENRICHMENT TEST');
console.log('================================');

testSingleLeadEnrichment(leadId)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });