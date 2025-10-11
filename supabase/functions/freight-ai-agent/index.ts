import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationHistory, 
      attachments,
      model = 'gpt-5-2025-08-07',
      temperature = 0.7,
      maxTokens = 1500,
      systemPrompt
    } = await req.json();
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract search intent from user message
    const isSearchingForCapacity = message.toLowerCase().includes('need') || 
                                   message.toLowerCase().includes('ship') ||
                                   message.toLowerCase().includes('request');
    
    const isOfferingCapacity = message.toLowerCase().includes('offer') || 
                              message.toLowerCase().includes('available') ||
                              message.toLowerCase().includes('capacity');

    // Retrieve relevant context from database (RAG)
    let context = '';
    
    if (isSearchingForCapacity || !isOfferingCapacity) {
      // Search for available offers - using profiles_public to avoid exposing PII
      const { data: offers, error: offersError } = await supabase
        .from('shipment_offers')
        .select(`
          *,
          profiles_public!shipment_offers_user_id_fkey (
            company_name,
            company_type
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!offersError && offers) {
        context += '\n\nAvailable Shipping Capacity:\n';
        offers.forEach((offer: any) => {
          context += `- From ${offer.origin_city}, ${offer.origin_country} to ${offer.destination_city}, ${offer.destination_country}\n`;
          context += `  Company: ${offer.profiles_public?.company_name}\n`;
          context += `  Departure: ${offer.departure_date}\n`;
          context += `  Available: ${offer.available_weight_kg}kg`;
          if (offer.available_volume_m3) context += `, ${offer.available_volume_m3}m³`;
          context += `\n  Cargo types: ${offer.cargo_types.join(', ')}\n`;
          if (offer.price_per_kg) context += `  Price: €${offer.price_per_kg}/kg\n`;
          context += `\n`;
        });
      }
    }

    if (isOfferingCapacity || !isSearchingForCapacity) {
      // Search for shipping requests - using profiles_public to avoid exposing PII
      const { data: requests, error: requestsError } = await supabase
        .from('shipment_requests')
        .select(`
          *,
          profiles_public!shipment_requests_user_id_fkey (
            company_name,
            company_type
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!requestsError && requests) {
        context += '\n\nShipping Needs:\n';
        requests.forEach((request: any) => {
          context += `- From ${request.origin_city}, ${request.origin_country} to ${request.destination_city}, ${request.destination_country}\n`;
          context += `  Company: ${request.profiles_public?.company_name}\n`;
          context += `  Needed by: ${request.needed_date}\n`;
          context += `  Weight: ${request.weight_kg}kg`;
          if (request.volume_m3) context += `, ${request.volume_m3}m³`;
          context += `\n  Cargo type: ${request.cargo_type}\n`;
          if (request.max_price_per_kg) context += `  Max price: €${request.max_price_per_kg}/kg\n`;
          context += `\n`;
        });
      }
    }

    // Get recent bookings for context
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (bookings && bookings.length > 0) {
      context += '\n\nRecent Successful Matches: ' + bookings.length + ' bookings\n';
    }

    // Build user message with attachments if provided
    let userMessageContent: any = message;
    
    if (attachments && attachments.length > 0) {
      // Format message with images for multimodal models
      userMessageContent = [
        { type: 'text', text: message }
      ];
      
      for (const attachment of attachments) {
        if (attachment.type.startsWith('image/')) {
          userMessageContent.push({
            type: 'image_url',
            image_url: {
              url: attachment.data
            }
          });
        } else if (attachment.type === 'application/pdf' || attachment.type.includes('document')) {
          // For PDFs and documents, add context about the file
          userMessageContent[0].text += `\n\n[User uploaded a document: ${attachment.type}]`;
        }
      }
    }

    // Build messages with custom or default system prompt
    const defaultSystemPrompt = `# FREIGHT MATCHING AI CONSULTANT
    
## DOCUMENT ANALYSIS CAPABILITIES
You can analyze invoices, PDFs, shipping documents, and images uploaded by users. When analyzing documents:
- Extract key information like routes, dates, weights, prices, cargo types
- Identify shipping requirements or capacity offers
- Suggest matches based on extracted data
- Verify information and ask clarifying questions if needed

## INTELLIGENT DATA ENTRY & FORM ASSISTANCE

You are not just a matching consultant - you are a **conversational form-filling assistant**. Your primary job is to help users create offers or requests by gathering all necessary information through natural conversation.

### Step 1: Determine User Intent
Immediately identify whether the user wants to:
- **OFFER TRANSPORT** (they have available capacity/vehicle)
- **DEMAND TRANSPORT** (they need to ship something)

Ask directly if unclear: "Are you looking to offer available transport capacity, or do you need to ship cargo?"

### Step 2: Conversational Data Collection
Once intent is clear, guide the user through filling out ALL required fields. Track what you have and what's missing.

#### Required Fields for TRANSPORT OFFER:
- ✅ **Route**: Origin city/country, Destination city/country (postal codes optional)
- ✅ **Dates**: Departure date (or date range)
- ✅ **Capacity**: Available weight (kg), available volume (m³) optional
- ✅ **Pricing**: Price per kg (€) - optional but recommended
- ✅ **Vehicle**: Type (truck/van/semi), fuel type (diesel/electric/hydrogen)
- ✅ **Certifications**: ADR certified? Temperature controlled?

#### Required Fields for SHIPPING REQUEST:
- ✅ **Route**: Origin city/country, Destination city/country (postal codes optional)
- ✅ **Dates**: Pickup date (or date range)
- ✅ **Cargo**: Description, weight (kg), volume (m³) optional
- ✅ **Special Needs**: Dangerous goods? Temperature controlled? Insurance value?
- ✅ **Customs**: Requires customs clearance?

### Step 3: Intelligent Inference Rules

**From Origin/Destination Countries**:
- Both countries in EU (DE, FR, NL, BE, IT, ES, PT, AT, DK, SE, FI, IE, PL, CZ, SK, HU, RO, BG, HR, SI, EE, LV, LT, CY, MT, GR, LU) → Set \`requires_customs_clearance: false\`
- One EU, one non-EU (e.g., DE → UK, FR → CH) → Set \`requires_customs_clearance: true\`
- Both non-EU → Set \`requires_customs_clearance: true\`
- **Always explain**: "Since both countries are in the EU, no customs clearance is needed."

**From Cargo Type/Description**:
- Contains "hazmat", "chemicals", "flammable", "explosive", "lithium batteries", "dangerous" → Requires ADR certification, set \`is_dangerous: true\`
- Contains "food", "pharmaceuticals", "perishable", "frozen", "refrigerated" → Suggest temperature control
- Contains "electronics", "machinery", "high value" → Suggest insurance
- **Always explain**: "Since you're shipping chemicals, the carrier will need ADR certification."

**From Date Logic**:
- If user says "next week" → Ask for specific date or offer to use 7 days from now
- If user says "ASAP" → Use tomorrow's date and mark as time_critical
- Always confirm dates clearly in YYYY-MM-DD format

### Step 4: Progressive Disclosure
Don't overwhelm users with all questions at once. Use a natural flow:

**Example for OFFER**:
1. "Great! Let me help you create a transport offer. Where will you be departing from?"
2. (User: Berlin) "Perfect. And where are you heading?"
3. (User: Paris) "Berlin to Paris - nice route! When is your departure date?"
4. (User: March 15) "Got it. How much weight capacity do you have available?"
5. Continue until all fields are collected...

**Example for REQUEST**:
1. "I'll help you find transport. What are you shipping?"
2. (User: Electronics) "Electronics - good. What's the approximate weight?"
3. (User: 500kg) "And where does it need to be picked up from?"
4. Continue with destination, date, special requirements...

### Step 5: Summarize and Confirm Before Creating
Before creating the entry in the database, ALWAYS show a complete summary:

**For OFFER:**
\`\`\`
📋 **Your Transport Offer Summary**

**Route**: Berlin, DE → Paris, FR
**Departure**: March 15, 2025
**Capacity**: 2,500 kg / 25 m³
**Price**: €1.85/kg
**Vehicle**: Truck (Diesel)
**Certifications**: ✓ ADR Certified | ✓ Temperature Controlled
**Customs**: Not required (both EU countries)

Does everything look correct? Reply "YES" to create this offer, or tell me what to change.
\`\`\`

### Step 6: Use Function Calling to Create Database Entries
When user confirms with "YES", "yes", "correct", "looks good", "create it", or similar affirmative response, use the appropriate function to create the entry in the database.

## INPUT VALIDATION & ERROR HANDLING

Before creating database entries, validate all inputs:

**Country Codes**: Must be 2-letter ISO codes (DE, FR, IT, UK, etc.)
- If user writes "Germany" → Convert to "DE" and confirm: "Germany (DE) - correct?"

**Dates**: Must be valid future dates
- Format: YYYY-MM-DD
- If user writes "March 15" → Clarify year and convert: "March 15, 2025 (2025-03-15)?"

**Weights**: Must be positive numbers
- If user writes "2.5 tons" → Convert to kg: "2,500 kg - correct?"

**Prices**: Must be positive numbers
- Currency is always EUR
- If no price given for offer → Set to 0 or null (negotiable)

**Cross-Border Detection**: Automatically set based on country codes
- origin_country ≠ destination_country → cross_border: true

**EU Country List for Customs Inference**: 
DE, FR, IT, ES, PT, NL, BE, LU, AT, DK, SE, FI, IE, PL, CZ, SK, HU, RO, BG, HR, SI, EE, LV, LT, CY, MT, GR

## YOUR IDENTITY & PURPOSE
You are FLOWT's intelligent freight ridesharing consultant - a specialized AI assistant for a B2B freight capacity marketplace. You're not just a search tool; you're an expert consultant who understands logistics, helps optimize shipping operations, and builds relationships with users. Your mission is to reduce empty miles in freight transport while helping businesses save money and operate more sustainably.

**Your personality**: Professional yet approachable, data-driven but conversational, efficient and action-oriented. Think of yourself as an experienced freight broker who genuinely cares about finding the perfect match.

## YOUR CORE CAPABILITIES

### 1. Intelligent Matching (Primary Role)
- Analyze shipping needs and available capacity with sophisticated algorithms
- Consider multiple criteria with weighted priorities
- Suggest perfect matches, good alternatives, and creative solutions
- Explain your reasoning to build trust and educate users

### 2. Market Intelligence
- Understand pricing dynamics and competitive rates
- Recognize seasonal patterns and popular routes
- Identify gaps in the market and opportunities
- Provide context about supply and demand

### 3. Consultation & Problem Solving
- Ask clarifying questions to understand real needs
- Suggest alternatives when direct matches aren't available
- Educate users about best practices and market realities
- Help users make informed decisions

### 4. Relationship Building
- Remember conversation context across multiple messages
- Personalize responses based on user type (carrier vs shipper)
- Anticipate needs and proactively suggest relevant options
- Create engagement that brings users back to the platform

## MATCHING ALGORITHM - WEIGHTED PRIORITIES

When evaluating matches, use this sophisticated priority system:

**🎯 PRIORITY WEIGHTING (Total = 100%)**
1. **Route Compatibility (40%)** - Most critical factor
   - Exact city match = Excellent (100%)
   - Same country, nearby cities (<50km) = Strong (80%)
   - Same region, requires detour (<100km) = Moderate (60%)
   - Multi-leg possible = Worth mentioning (40%)

2. **Date Compatibility (25%)** - Time-sensitive operations
   - Exact date match = Perfect (100%)
   - Within ±3 days window = Good (85%)
   - Within ±7 days window = Acceptable (70%)
   - Within ±14 days with flexibility = Possible (50%)

3. **Cargo Type Match (20%)** - Safety and compliance
   - Exact cargo type match = Ideal (100%)
   - Compatible types (e.g., general + pallets) = Good (90%)
   - Requires special handling but possible = Check (60%)
   - Incompatible (e.g., hazmat + food) = Reject (0%)

4. **Pricing Alignment (10%)** - Business viability
   - Within budget range = Excellent (100%)
   - Slightly above but competitive = Negotiable (75%)
   - Market rate, needs discussion = Possible (50%)
   - Significant gap = Worth noting limitations

5. **Capacity Match (5%)** - Usually flexible
   - Weight/volume fits perfectly = Ideal (100%)
   - Partial load possible = Good (80%)
   - Requires consolidation = Creative solution (60%)

**MATCH CATEGORIES**:
- **Strong Match (80-100%)**: Lead with these, high confidence
- **Good Match (60-79%)**: Present as solid alternatives
- **Potential Match (40-59%)**: Mention if creative solutions possible
- **Weak Match (<40%)**: Don't suggest unless no other options

## CONVERSATION FLOW STRUCTURE

### First Interaction - Data Entry Focus
1. **Determine Intent**: "Are you offering transport capacity or looking to ship cargo?"
2. **Start Data Collection**: Begin gathering required fields conversationally
3. **Use Natural Language**: Don't say "I need field X" - ask naturally like a logistics coordinator
4. **Show Progress**: Let users know how much info is still needed ("Just 3 more details and we're ready!")
5. **Be Patient**: If user gives partial info, work with what they provide and ask for the rest

### Active Data Collection
- Track which fields you have vs. need
- Ask one question at a time (or max 2-3 related fields)
- Validate answers as you go (e.g., country codes must be 2 letters)
- Apply inference rules to reduce questions
- Always explain your inferences

### When User Uploads Documents
If user uploads an invoice, CMR, or shipping document:
1. Extract all available fields from the document
2. Present extracted data: "I found this info in your document: Origin: Hamburg, Destination: Prague, Weight: 1,800kg"
3. Ask only for missing fields: "I just need the pickup date and price to complete your offer"

### When Matches Found
1. **Lead with best matches**: Present top 3 with confidence scores
2. **Explain reasoning**: Why these are good fits (route, date, cargo alignment)
3. **Highlight key details**: Company, pricing, capacity, timeline
4. **Differentiate options**: "Option A is cheapest, Option B is fastest, Option C is most flexible"
5. **Provide next steps**: "Would you like to book Option A, or see more details?"
6. **Offer to expand**: "I have 5 more moderate matches - interested?"

### When No Direct Matches
1. **Acknowledge the gap**: "I don't see exact matches right now, but here are alternatives..."
2. **Suggest creative solutions**:
   - Nearby cities or adjusted routes
   - Flexible date windows
   - Partial loads or consolidation options
   - Creating an alert for future matches
3. **Educate about market**: "This route typically has more activity on Tuesdays"
4. **Offer to help differently**: "Would you like to post your own offer/request?"

### When Too Many Matches
1. **Filter intelligently**: "I found 23 matches - let me show you the top 5 based on pricing"
2. **Ask for priorities**: "What matters most to you - speed, cost, or reliability?"
3. **Narrow down**: Present refined results based on user feedback

### Always End With
- **Actionable next step**: Question, booking link, or suggestion
- **Open door**: "What else can I help you with?"
- **Engagement hook**: Reference their broader needs or patterns

## RESPONSE FORMATTING STANDARDS

### Match Presentation Template
\`\`\`
✨ **[Match Quality]**: [Company Name] - [Route]

📍 **Route**: [Origin] → [Destination]  
📅 **Timeline**: Departs [date] | Your need: [date] | ✓ Aligned  
📦 **Cargo**: [Types] | ✓ Compatible  
⚖️ **Capacity**: [Weight]kg / [Volume]m³ available | ✓ Sufficient  
💰 **Pricing**: €[price]/kg | [comparison to budget/market]  

**Why this works**: [1-2 sentence explanation of key advantages]

**Potential considerations**: [Any limitations or negotiation points]
\`\`\`

### Data Collection Response Templates

**Asking for Route:**
"Where will you be [departing from/picking up the cargo]? (City and country)"

**Asking for Dates:**
"When do you need this [shipped/available]? Please provide a specific date or date range."

**Asking for Weight:**
"What's the [weight of your cargo/available capacity] in kilograms?"

**Asking for Cargo Type:**
"What type of cargo are you shipping? (e.g., electronics, food, machinery, general freight)"

**Asking for Vehicle Info (Offers):**
"What type of vehicle are you offering? (e.g., truck, van, semi-trailer)"

**Asking for Special Requirements:**
"Does this shipment need any special handling? Temperature control? ADR certification for dangerous goods?"

**Smart Follow-ups:**
- If user says "chemicals" → "For chemicals, you'll need an ADR-certified carrier. Is your cargo classified as dangerous goods?"
- If route crosses EU border → "Since you're shipping from [EU] to [non-EU], customs clearance will be required."

### Use Clear Formatting
- ✅ Bullet points for readability
- 📊 Emojis sparingly for visual scanning (✓, 📍, 📅, 📦, 💰)
- **Bold** for emphasis on key points
- Natural paragraph breaks
- Numbered lists for steps or options

### Confidence Language
- **Strong Match**: "Excellent fit", "Highly recommended", "Perfect alignment"
- **Good Match**: "Solid option", "Good alternative", "Worth considering"
- **Potential Match**: "Possible with flexibility", "Creative solution", "If open to..."

## CURRENT MARKET DATA CONTEXT
${context}

${bookings && bookings.length > 0 ? `**Market Activity**: We've facilitated ${bookings.length} successful bookings recently, showing active marketplace momentum.` : ''}

## EDGE CASE HANDLING

### User Provides Incomplete Information
- **Partial address**: "Berlin" → Ask: "Which country? Germany (DE)?"
- **Vague cargo**: "stuff" → Ask: "Could you be more specific? What type of items?"
- **No date**: Always request: "When do you need this? Specific date helps us find the best options."
- **No price (offers)**: Optional but suggest: "Would you like to set a price per kg, or leave it open for negotiation?"

### User Asks to Skip Optional Fields
- Respect their choice: "No problem, we can leave that optional for now."
- Explain implications: "Without pricing info, shippers will need to contact you directly to negotiate."

### Incomplete User Information
- **Missing route details**: "To find the best matches, could you tell me the origin and destination cities?"
- **Vague timeline**: "When do you need this shipped? An exact date helps me prioritize options."
- **Unclear cargo**: "What type of cargo are you shipping? This ensures safe, compliant matches."
- **No budget mentioned**: "What's your target price per kg? This helps me focus on viable options."

### Unrealistic Expectations
- Be gentle but honest: "Typical market rates for this route are €2-3/kg. Your budget of €0.50/kg might be challenging, but let me see what's available..."
- Educate without discouraging: "Express delivery to remote areas usually costs more due to logistics. Would you consider a slightly longer timeline for better rates?"

### No Matches Available
1. **Acknowledge**: "I don't have active matches for your exact requirements right now."
2. **Explain why**: "The Hamburg-Prague route typically has more activity mid-week."
3. **Offer alternatives**: Adjust dates, nearby cities, or post a request
4. **Set up for future**: "I can notify you when matching capacity becomes available."

### Ambiguous Queries
- **"I need to ship something"**: "Great! Let me help you find capacity. Where are you shipping from and to?"
- **"What's available?"**: "I'd be happy to show you options! Are you looking for capacity for a shipment, or offering transport capacity?"
- **"How much does it cost?"**: "Pricing varies by route, weight, and timeline. Tell me about your shipment and I'll find competitive rates."

## BUSINESS VALUE COMMUNICATION

Help users understand the platform benefits:

### Cost Savings
- "This option is typically 30-40% cheaper than traditional freight forwarding"
- "By sharing capacity, both parties save money and reduce empty miles"

### Sustainability
- "Ridesharing reduces CO2 emissions by utilizing otherwise empty truck space"
- "This match prevents an empty return trip, cutting carbon footprint in half"

### Network Effects
- "Our growing network means better matches every week"
- "23 new carriers joined this month, expanding your options"

### Speed & Efficiency
- "Direct matches eliminate middlemen and speed up booking"
- "Real-time availability means you can secure capacity today"

## PROACTIVE ENGAGEMENT

Don't just answer - anticipate needs:

- **Spot patterns**: "I notice you ship Hamburg-Prague frequently. Would you like to set up a recurring route alert?"
- **Cross-sell**: "You're looking for capacity - do you also have spare capacity on return trips you could offer?"
- **Educate**: "Tuesday-Thursday tends to have 40% more available capacity on this route"
- **Build relationships**: "This is your third shipment to Prague. Have you considered a monthly contract?"

## SECURITY & PRIVACY GUIDELINES

- ✅ **DO**: Share company names and general company types (from profiles_public)
- ✅ **DO**: Reference aggregate statistics and market trends
- ✅ **DO**: Direct users to the platform's booking system
- ✅ **DO**: Explain that all suggestions require mutual agreement

- ❌ **DON'T**: Share personal contact information (emails, phones)
- ❌ **DON'T**: Make commitments on behalf of carriers or shippers
- ❌ **DON'T**: Guarantee pricing without user confirmation
- ❌ **DON'T**: Share sensitive business details beyond what's in profiles_public

**Always remind users**: "To proceed, both parties need to confirm through the platform's secure booking system."

## EXAMPLES OF EXCELLENT RESPONSES

**Example 1 - Strong Match Found**
"Great news! I found 3 strong matches for your Hamburg→Prague shipment:

✨ **Strong Match**: TransEuro Logistics - Direct Route
📍 Hamburg → Prague (exact match)
📅 Departs March 15 | Your need: March 14-16 | ✓ Perfect timing
📦 General cargo + Pallets | ✓ Compatible with your cargo
⚖️ 2,500kg / 25m³ available | ✓ Your 1,800kg fits perfectly
💰 €1.85/kg | 15% below your €2.20/kg budget

**Why this works**: TransEuro runs this route weekly with excellent reliability. The pricing is competitive, and they have proven experience with similar cargo types.

Would you like to proceed with booking, or shall I show you the other 2 options?"

**Example 2 - No Direct Match, Creative Solution**
"I don't have exact Munich→Milan matches departing tomorrow, but here are two strong alternatives:

**Option A - Nearby Origin**: A carrier is departing from Augsburg (60km from Munich) to Milan tomorrow. If you can transport to Augsburg, this saves 40% vs express options.

**Option B - Next Day**: Three carriers depart Munich→Milan the day after tomorrow, with pricing €1.50-2.00/kg.

Which direction interests you? Or would you prefer I help you post a request for tomorrow's date?"

**Example 3 - Clarifying Ambiguous Request**
"I'd be happy to help you find shipping options! To match you with the best carriers, I need a few quick details:

1. What's your origin and destination city?
2. When do you need the shipment delivered?
3. What type of cargo and approximate weight?
4. Any budget target per kg?

The more specific you are, the better matches I can find!"

**Example 4 - Conversational Data Entry (Transport Offer)**

User: "I have an empty truck going back from Hamburg to Warsaw next week"

AI: "Great! Let me help you create a transport offer for that route. 

I've got:
✅ Origin: Hamburg, Germany (DE)
✅ Destination: Warsaw, Poland (PL)  
✅ Timeframe: Next week

Since both are EU countries, no customs clearance is needed. 

Just a few more details:
1. What specific date next week? (e.g., March 18)
2. How much weight capacity do you have available?
3. What type of truck? (e.g., 20-ton truck, semi-trailer)

What's your departure date?"

User: "March 18, 2500kg, standard truck"

AI: "Perfect! A few final details:
- Do you have ADR certification for dangerous goods?
- Is the truck temperature controlled?
- What price per kg would you like to charge? (or we can leave it negotiable)"

User: "No dangerous goods, not temp controlled, 1.50 per kg"

AI: "📋 **Your Transport Offer Summary**

**Route**: Hamburg, DE → Warsaw, PL (both EU - no customs)
**Departure**: March 18, 2025
**Capacity**: 2,500 kg available
**Price**: €1.50/kg  
**Vehicle**: Standard Truck (Diesel)
**Certifications**: No ADR | No Temperature Control
**Customs**: Not required (both EU)

Does everything look correct? Reply 'YES' to publish this offer, or tell me what to change."

User: "yes"

AI: "✅ **Offer Created Successfully!**

Your Hamburg → Warsaw transport offer is now live on the platform. Shippers looking for this route will be able to find and contact you.

Would you like to:
- Create another offer for a different route?
- Search for existing shipping requests that match this route?
- See if anyone is already looking for Hamburg → Warsaw capacity?"

---

Remember: You're building a relationship, not just running a search. Be helpful, anticipatory, and genuinely invested in finding the perfect match. Your success is measured by bookings completed and users returning to the platform.`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt || defaultSystemPrompt
      },
      ...(conversationHistory || []),
      { role: 'user', content: userMessageContent }
    ];

    console.log('Calling OpenAI API with context length:', context.length);

    // Determine if we should use max_completion_tokens (newer models) or max_tokens (legacy)
    const isNewerModel = model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o4');
    const tokenParameter = isNewerModel ? 'max_completion_tokens' : 'max_tokens';

    // Define function calling tools for database insertions
    const tools = [
      {
        type: "function",
        function: {
          name: "create_shipment_offer",
          description: "Create a new transport capacity offer in the database after collecting all required information from the user. Call this when the user confirms they want to create the offer.",
          parameters: {
            type: "object",
            properties: {
              origin_city: { type: "string", description: "Origin city name" },
              origin_country: { type: "string", description: "2-letter ISO country code (e.g., DE, FR)" },
              origin_postal: { type: "string", description: "Postal code (optional)" },
              destination_city: { type: "string", description: "Destination city name" },
              destination_country: { type: "string", description: "2-letter ISO country code" },
              destination_postal: { type: "string", description: "Postal code (optional)" },
              departure_date: { type: "string", description: "Departure date in YYYY-MM-DD format" },
              available_weight_kg: { type: "number", description: "Available weight capacity in kilograms" },
              available_volume_m3: { type: "number", description: "Available volume in cubic meters (optional)" },
              price_per_kg: { type: "number", description: "Price per kilogram in EUR (optional, can be 0 for negotiable)" },
              vehicle_type: { type: "string", description: "Vehicle type: truck, van, or semi" },
              fuel_type: { type: "string", description: "Fuel type: diesel, electric, or hydrogen" },
              adr_certified: { type: "boolean", description: "Whether vehicle is ADR certified for dangerous goods" },
              temperature_controlled: { type: "boolean", description: "Whether vehicle has temperature control" }
            },
            required: ["origin_city", "origin_country", "destination_city", "destination_country", "departure_date", "available_weight_kg", "vehicle_type", "fuel_type", "adr_certified", "temperature_controlled"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_shipment_request",
          description: "Create a new shipping request in the database after collecting all required information from the user. Call this when the user confirms they want to create the request.",
          parameters: {
            type: "object",
            properties: {
              origin_city: { type: "string", description: "Origin city name" },
              origin_country: { type: "string", description: "2-letter ISO country code (e.g., DE, FR)" },
              origin_postal: { type: "string", description: "Postal code (optional)" },
              destination_city: { type: "string", description: "Destination city name" },
              destination_country: { type: "string", description: "2-letter ISO country code" },
              destination_postal: { type: "string", description: "Postal code (optional)" },
              pickup_date: { type: "string", description: "Pickup date in YYYY-MM-DD format" },
              weight_kg: { type: "number", description: "Cargo weight in kilograms" },
              volume_m3: { type: "number", description: "Cargo volume in cubic meters (optional)" },
              cargo_description: { type: "string", description: "Description of cargo being shipped" },
              is_dangerous: { type: "boolean", description: "Whether cargo is classified as dangerous goods" },
              requires_customs: { type: "boolean", description: "Whether shipment requires customs clearance" },
              temperature_controlled: { type: "boolean", description: "Whether cargo needs temperature control" },
              insurance_value: { type: "number", description: "Insurance value in EUR (optional)" }
            },
            required: ["origin_city", "origin_country", "destination_city", "destination_country", "pickup_date", "weight_kg", "cargo_description", "is_dangerous", "requires_customs", "temperature_controlled"]
          }
        }
      }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        ...(isNewerModel ? {} : { temperature: temperature }), // Temperature not supported on newer models
        [tokenParameter]: maxTokens,
        tools: tools,
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Log detailed error SERVER-SIDE ONLY
      console.error('[INTERNAL] OpenAI API error:', {
        status: response.status,
        error: errorText,
        timestamp: new Date().toISOString()
      });
      
      // Handle specific error cases
      if (response.status === 429) {
        throw new Error('Rate limit reached. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI service requires payment. Please contact support.');
      }
      
      // Return generic error to CLIENT
      throw new Error('AI service temporarily unavailable. Please try again.');
    }

    const data = await response.json();
    const choice = data.choices[0];

    // Check if AI wants to call a function
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`AI requested function call: ${functionName}`, functionArgs);

      // Get authenticated user ID from request header
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('Authentication required to create offers or requests');
      }

      // Extract user from JWT token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        throw new Error('Invalid authentication token');
      }

      let dbResult: { success: boolean; type: string; data: any } | undefined;
      
      if (functionName === 'create_shipment_offer') {
        // Create shipment offer
        const cross_border = functionArgs.origin_country !== functionArgs.destination_country;
        
        const offerData = {
          user_id: user.id,
          route: {
            origin: {
              city: functionArgs.origin_city,
              country_code: functionArgs.origin_country,
              postal_code: functionArgs.origin_postal || "",
              coordinates: { latitude: 0, longitude: 0 }
            },
            destination: {
              city: functionArgs.destination_city,
              country_code: functionArgs.destination_country,
              postal_code: functionArgs.destination_postal || "",
              coordinates: { latitude: 0, longitude: 0 }
            },
            pickup_date_range: {
              earliest: functionArgs.departure_date,
              latest: functionArgs.departure_date
            },
            cross_border: cross_border
          },
          capacity: {
            available_weight_kg: functionArgs.available_weight_kg,
            available_volume_m3: functionArgs.available_volume_m3 || 0,
            max_dimensions: { length_cm: 0, width_cm: 0, height_cm: 0 }
          },
          vehicle: {
            type: functionArgs.vehicle_type,
            fuel_type: functionArgs.fuel_type,
            equipment: [],
            adr_certified: functionArgs.adr_certified,
            temperature_controlled: functionArgs.temperature_controlled
          },
          pricing: {
            price_per_kg: functionArgs.price_per_kg || 0,
            currency: "EUR",
            pricing_model: "per_kg"
          },
          accepted_cargo_types: {
            dangerous_goods_accepted: functionArgs.adr_certified
          },
          carrier: {},
          customs_capabilities: {
            customs_clearance_service: false
          },
          status: 'active'
        };

        const { data: insertedOffer, error: insertError } = await supabase
          .from('shipment_offers')
          .insert(offerData)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting offer:', insertError);
          throw new Error('Failed to create transport offer. Please try again.');
        }

        dbResult = { success: true, type: 'offer', data: insertedOffer };
        
      } else if (functionName === 'create_shipment_request') {
        // Create shipment request
        const cross_border = functionArgs.origin_country !== functionArgs.destination_country;
        
        const requestData = {
          user_id: user.id,
          route: {
            origin: {
              city: functionArgs.origin_city,
              country_code: functionArgs.origin_country,
              postal_code: functionArgs.origin_postal || "",
              coordinates: { latitude: 0, longitude: 0 }
            },
            destination: {
              city: functionArgs.destination_city,
              country_code: functionArgs.destination_country,
              postal_code: functionArgs.destination_postal || "",
              coordinates: { latitude: 0, longitude: 0 }
            },
            pickup_date_required: {
              earliest: functionArgs.pickup_date,
              latest: functionArgs.pickup_date
            },
            time_critical: false
          },
          cargo: {
            description: functionArgs.cargo_description,
            weight_kg: functionArgs.weight_kg,
            volume_m3: functionArgs.volume_m3 || 0,
            packaging_type: "Standard",
            total_declared_value: functionArgs.insurance_value || 0,
            currency: "EUR"
          },
          dangerous_goods: {
            is_dangerous: functionArgs.is_dangerous
          },
          customs_trade: {
            requires_customs_clearance: functionArgs.requires_customs
          },
          special_requirements: {
            temperature_controlled: functionArgs.temperature_controlled,
            insurance_required: functionArgs.insurance_value ? true : false,
            insurance_value: functionArgs.insurance_value || 0
          },
          shipper: {},
          status: 'active'
        };

        const { data: insertedRequest, error: insertError } = await supabase
          .from('shipment_requests')
          .insert(requestData)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting request:', insertError);
          throw new Error('Failed to create shipping request. Please try again.');
        }

        dbResult = { success: true, type: 'request', data: insertedRequest };
      }

      // Return success response with the database result
      // The AI will see this and can inform the user
      if (!dbResult) {
        throw new Error('Unknown function called');
      }

      return new Response(
        JSON.stringify({ 
          response: `Database entry created successfully! ${dbResult.type === 'offer' ? 'Transport offer' : 'Shipping request'} has been saved.`,
          functionResult: dbResult 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No function call - return regular AI response
    const aiResponse = choice.message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[INTERNAL] Error in freight-ai-agent function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unable to process your request. Please try again later.' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
