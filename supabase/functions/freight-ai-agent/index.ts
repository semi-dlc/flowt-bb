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
      model = 'openai/gpt-5-mini',
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt
    } = await req.json();
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!lovableApiKey) {
      throw new Error('Lovable AI key not configured');
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

    // Build messages with custom or default system prompt
    const defaultSystemPrompt = `You are an intelligent freight ridesharing AI assistant for a B2B platform. Your role is to help businesses find shipping capacity or shipping needs matches.

Key capabilities:
- Help users find available transport capacity for their shipments
- Help carriers find shipment requests to fill their available capacity
- Provide intelligent matching suggestions based on routes, dates, cargo types, and pricing
- Answer questions about the platform and freight shipping

Current database context (RAG):
${context}

When making recommendations:
1. Consider route compatibility (exact match or nearby cities)
2. Match dates (offers should depart before or on request needed date)
3. Match cargo types
4. Compare pricing expectations
5. Consider weight/volume capacity

Be conversational, helpful, and proactive in suggesting matches. If you find good matches, explain why they're suitable.`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt || defaultSystemPrompt
      },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Calling Lovable AI with context length:', context.length);

    // Call Lovable AI Gateway (using Gemini - it's free!)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Log detailed error SERVER-SIDE ONLY
      console.error('[INTERNAL] Lovable AI Gateway error:', {
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
    const aiResponse = data.choices[0].message.content;

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
