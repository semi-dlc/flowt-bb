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
    const { message, conversationHistory } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!openAIApiKey) {
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
      // Search for available offers
      const { data: offers, error: offersError } = await supabase
        .from('shipment_offers')
        .select(`
          *,
          profiles:user_id (company_name, email, phone)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!offersError && offers) {
        context += '\n\nAvailable Shipping Capacity:\n';
        offers.forEach((offer: any) => {
          context += `- From ${offer.origin_city}, ${offer.origin_country} to ${offer.destination_city}, ${offer.destination_country}\n`;
          context += `  Company: ${offer.profiles?.company_name}\n`;
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
      // Search for shipping requests
      const { data: requests, error: requestsError } = await supabase
        .from('shipment_requests')
        .select(`
          *,
          profiles:user_id (company_name, email, phone)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!requestsError && requests) {
        context += '\n\nShipping Needs:\n';
        requests.forEach((request: any) => {
          context += `- From ${request.origin_city}, ${request.origin_country} to ${request.destination_city}, ${request.destination_country}\n`;
          context += `  Company: ${request.profiles?.company_name}\n`;
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

    // Build messages for OpenAI with RAG context
    const messages = [
      {
        role: 'system',
        content: `You are an intelligent freight ridesharing AI assistant for a B2B platform. Your role is to help businesses find shipping capacity or shipping needs matches.

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

Be conversational, helpful, and proactive in suggesting matches. If you find good matches, explain why they're suitable.`
      },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Calling OpenAI with context length:', context.length);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: messages,
        max_completion_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in freight-ai-agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
